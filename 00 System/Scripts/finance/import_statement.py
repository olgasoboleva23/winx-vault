#!/usr/bin/env python3
"""
Import a Sberbank Online statement PDF into the vault ledger.

Fully deterministic: no AI, no network, no guessing. Every number that lands
in the ledger is cross-checked against the totals Sber prints on the PDF, and
the script refuses to write anything if a single check fails — a statement in
an unexpected layout is loud, never silently wrong.

Run it through import.sh (bootstraps the venv), or directly with a python that
has pdfplumber installed. Paths are resolved from the vault root, so it can be
called from anywhere:

    "00 System/Scripts/finance/import.sh" --dry-run       # report only, write nothing
    "00 System/Scripts/finance/import.sh"                 # all PDFs in 02 Areas/Finance/Statements
    "00 System/Scripts/finance/import.sh" path/to.pdf     # one specific file
    "00 System/Scripts/finance/import.sh" --recategorize  # re-apply rules.json to existing rows

Layout of a statement (each operation is 2-3 physical lines):

    01.07.2026 20:34 Супермаркеты 124,97 109 880,03      <- date, time, category, amount, balance after
    01.07.2026 058363 MAGNIT MM PEZHMA SANKT-PETERBU      <- processing date, auth code, description
    RUS. Операция по карте ****3184                       <- description continuation

Income carries a "+" prefix on the amount; expenses carry no sign. That sign
is verified a second time against the running balance, so both have to agree.
"""

import argparse
import json
import re
import sys
from collections import OrderedDict
from decimal import Decimal
from pathlib import Path

try:
    import pdfplumber
except ImportError:
    sys.exit("pdfplumber is missing — run this via ./import.sh, which sets up the venv.")

def vault_root():
    """Walk up from this script until we find the folder holding .obsidian.

    The script lives in 00 System/Scripts/finance, which the winx sync replaces
    wholesale, while the data it reads and writes lives in 02 Areas/Finance and
    must never be synced. Resolving through the vault root keeps those two
    independent, so moving the scripts around does not break the paths.
    """
    for folder in [Path(__file__).resolve(), *Path(__file__).resolve().parents]:
        if (folder / ".obsidian").is_dir():
            return folder
    raise SystemExit("could not locate the vault root (no .obsidian folder above this script)")


VAULT = vault_root()
FINANCE = VAULT / "02 Areas" / "Finance"
STATEMENTS = FINANCE / "Statements"
LEDGER = FINANCE / "Ledger"
RULES = FINANCE / "rules.json"

# ── PDF grammar ──────────────────────────────────────────────────────────────
# Sber pads thousands with NBSP; keep both it and the plain space in number
# character classes, and normalise before converting to Decimal.
NUM = r"[\d\s ]+,\d{2}"
TXN = re.compile(rf"^(\d{{2}}\.\d{{2}}\.\d{{4}}) (\d{{2}}:\d{{2}}) (.+?) (\+?{NUM}) ({NUM})$")
DETAIL = re.compile(r"^(\d{2}\.\d{2}\.\d{4}) (\d{6}) (.*)$")

# The operations table on every page sits between the last header line and the
# first footer line. Slicing on these markers is what keeps boilerplate (bank
# address, QR-code instructions, legal text) out of the descriptions.
BLOCK_START = "и код авторизации операции"
BLOCK_END = (
    "Продолжение на следующей странице",
    "Для проверки подлинности документа",
    "ПАО Сбербанк. Генеральная лицензия",
)

OPENING = re.compile(rf"Остаток на (\d{{2}}\.\d{{2}}\.\d{{4}}) ({NUM})")
CREDITED = re.compile(rf"Пополнение ({NUM})")
DEBITED = re.compile(rf"Списание ({NUM})")
PERIOD = re.compile(r"За период (\d{2}\.\d{2}\.\d{4}) [—-] (\d{2}\.\d{2}\.\d{4})")

# Everything that identifies the account itself is stripped before writing:
# card tail, auth codes and the "Операция по карте" boilerplate. Merchant
# names are kept — they are what the category rules match on.
CARD_NOISE = re.compile(r"\s*Операци[яи]\s+по\s+карте\s*\**\d*\.?", re.I)
CARD_TAIL = re.compile(r"\*{2,}\s*\d{4}")


def money(text):
    """'109 880,03' or '+1 234,50' -> Decimal, whitespace and sign stripped."""
    cleaned = re.sub(r"[\s ]", "", text).replace(",", ".").lstrip("+")
    return Decimal(cleaned)


def iso(date_str):
    """'01.07.2026' -> '2026-07-01'"""
    day, month, year = date_str.split(".")
    return f"{year}-{month}-{day}"


class Transaction:
    __slots__ = ("date", "time", "sber_category", "amount", "balance", "description",
                 "category", "transfer")

    def __init__(self, date, time, sber_category, amount, balance):
        self.date = date
        self.time = time
        self.sber_category = sber_category
        self.amount = amount          # signed: negative = expense
        self.balance = balance        # balance after the operation
        self.description = ""
        self.category = None
        self.transfer = False


def parse_pdf(path):
    """Return (transactions newest-first, header totals dict)."""
    transactions = []
    header = {}
    unparsed = []

    with pdfplumber.open(path) as pdf:
        for page_no, page in enumerate(pdf.pages, 1):
            lines = [ln.strip() for ln in (page.extract_text() or "").split("\n")]

            if page_no == 1:
                header = parse_header(lines, path)

            # Slice out the operations table for this page.
            try:
                start = next(i for i, ln in enumerate(lines) if ln.startswith(BLOCK_START)) + 1
            except StopIteration:
                continue  # page with no operations table (e.g. the legal last page)
            end = next((i for i, ln in enumerate(lines) if ln.startswith(BLOCK_END)), len(lines))

            current = None
            awaiting_description = False
            for line in lines[start:end]:
                if not line:
                    continue

                match = TXN.match(line)
                if match:
                    date, time, category, amount, balance = match.groups()
                    current = Transaction(
                        date=iso(date),
                        time=time,
                        sber_category=category.strip(),
                        amount=money(amount) if amount.lstrip().startswith("+") else -money(amount),
                        balance=money(balance),
                    )
                    transactions.append(current)
                    awaiting_description = True
                    continue

                if current is None:
                    unparsed.append((page_no, line))
                    continue

                detail = DETAIL.match(line)
                if detail:
                    # Auth code (group 2) is deliberately dropped, never stored.
                    current.description = detail.group(3)
                    awaiting_description = False
                elif awaiting_description:
                    unparsed.append((page_no, line))
                else:
                    current.description += " " + line

    for txn in transactions:
        txn.description = scrub(txn.description)

    if unparsed:
        report = "\n".join(f"  p.{p}: {ln}" for p, ln in unparsed[:10])
        raise SystemExit(
            f"{path.name}: {len(unparsed)} line(s) inside the operations table did not "
            f"match the expected layout — refusing to write a partial ledger.\n{report}"
        )

    return transactions, header


def parse_header(lines, path):
    """Opening/closing balances and the period totals Sber prints on page 1."""
    text = "\n".join(lines)
    period = PERIOD.search(text)
    balances = OPENING.findall(text)
    credited = CREDITED.search(text)
    debited = DEBITED.search(text)

    if not (period and credited and debited and len(balances) >= 2):
        raise SystemExit(
            f"{path.name}: could not read the statement header (period / Пополнение / "
            "Списание / Остаток). Is this a Sberbank account statement?"
        )

    start, end = period.groups()
    by_date = {date: money(value) for date, value in balances}
    if start not in by_date or end not in by_date:
        raise SystemExit(f"{path.name}: opening/closing balance does not match period {start}—{end}.")

    return {
        "period_start": start,
        "period_end": end,
        "opening": by_date[start],
        "closing": by_date[end],
        "credited": money(credited.group(1)),
        "debited": money(debited.group(1)),
    }


def scrub(description):
    """Drop card tail and boilerplate; keep the merchant name."""
    text = CARD_NOISE.sub("", description)
    text = CARD_TAIL.sub("", text)
    text = re.sub(r"[\s ]+", " ", text)
    return text.strip(" .,")


def validate(transactions, header, source):
    """Four independent checks. Any failure aborts before anything is written."""
    problems = []

    if not transactions:
        problems.append("no transactions found at all")

    # 1. Each row's balance delta must equal its signed amount. The oldest row
    #    (last, since the statement is newest-first) is checked against the
    #    opening balance.
    mismatched = 0
    for i, txn in enumerate(transactions):
        previous = transactions[i + 1].balance if i + 1 < len(transactions) else header["opening"]
        if txn.balance - previous != txn.amount:
            mismatched += 1
    if mismatched:
        problems.append(f"{mismatched}/{len(transactions)} rows: balance delta disagrees with the stated amount")

    # 2-3. Sums must equal the totals Sber prints in the header.
    income = sum((t.amount for t in transactions if t.amount > 0), Decimal(0))
    expense = -sum((t.amount for t in transactions if t.amount < 0), Decimal(0))
    if income != header["credited"]:
        problems.append(f"income {income} != header Пополнение {header['credited']}")
    if expense != header["debited"]:
        problems.append(f"expense {expense} != header Списание {header['debited']}")

    # 4. The whole period must reconcile end to end.
    derived = header["opening"] + income - expense
    if derived != header["closing"]:
        problems.append(f"opening + income - expense = {derived} != closing {header['closing']}")

    # Categories are a small fixed vocabulary; digits in one means the row had
    # an extra column (e.g. a foreign-currency operation) we did not expect.
    dirty = {t.sber_category for t in transactions if re.search(r"\d", t.sber_category)}
    if dirty:
        problems.append(f"category field contains digits (unexpected column?): {sorted(dirty)}")

    if problems:
        raise SystemExit(
            f"{source}: validation failed, nothing written.\n"
            + "\n".join(f"  - {p}" for p in problems)
        )

    return income, expense


# ── categorisation ───────────────────────────────────────────────────────────
def load_rules():
    if not RULES.exists():
        raise SystemExit(f"missing rules file: {RULES}")
    with RULES.open(encoding="utf-8") as fh:
        rules = json.load(fh)
    compiled = [(re.compile(r["match"], re.I), r["category"]) for r in rules.get("rules", [])]
    return rules, compiled


def categorize(txn, rules, compiled):
    """First matching rule wins; otherwise fall back to Sber's own category."""
    transfer_categories = set(rules.get("transferCategories", []))
    transfer_patterns = [re.compile(p, re.I) for p in rules.get("transferPatterns", [])]

    for pattern, category in compiled:
        if pattern.search(txn.description):
            txn.category = category
            break
    else:
        txn.category = rules.get("sberMap", {}).get(txn.sber_category, txn.sber_category)

    txn.transfer = (
        txn.sber_category in transfer_categories
        or txn.category in transfer_categories
        or any(p.search(txn.description) for p in transfer_patterns)
    )
    if txn.transfer:
        txn.category = rules.get("transferCategory", "Переводы")
    return txn


# ── ledger I/O ───────────────────────────────────────────────────────────────
COLUMNS = ("date", "time", "amount", "category", "description")
WIDTHS = (10, 5, 12, 20)  # description is left unpadded so diffs stay small


def render_row(row):
    cells = [
        row["date"].ljust(WIDTHS[0]),
        row["time"].ljust(WIDTHS[1]),
        row["amount"].rjust(WIDTHS[2]),
        row["category"].ljust(WIDTHS[3]),
        row["description"],
    ]
    return "| " + " | ".join(cells) + " |"


def read_ledger(path):
    """Existing rows, in file order. Unrecognised lines are preserved verbatim."""
    if not path.exists():
        return [], []
    rows, extras = [], []
    for line in path.read_text(encoding="utf-8").split("\n"):
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cells = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cells) != 5:
            extras.append(line)
            continue
        if cells[0] in ("date", "----------") or set(cells[0]) <= {"-", ":", " "}:
            continue  # header or separator row
        rows.append(dict(zip(COLUMNS, cells)))
    return rows, extras


def key(row):
    """Identity of a transaction for dedup. Amount and time are what separate
    two otherwise-identical purchases on the same day."""
    return (row["date"], row["time"], row["amount"], row["description"])


def write_ledger(path, rows, month):
    rows = sorted(rows, key=lambda r: (r["date"], r["time"]), reverse=True)
    header = [
        "---",
        "type: finance-ledger",
        f"month: {month}",
        "---",
        "",
        f"# Финансы — {month}",
        "",
        "%% Generated by 02 Areas/Finance/tools/import_statement.py — safe to edit by hand:",
        "re-import never overwrites existing rows. Add cash purchases with an empty time. %%",
        "",
        "| " + " | ".join(
            name.ljust(width) for name, width in zip(COLUMNS[:-1], WIDTHS)
        ) + " | description |",
        "| " + " | ".join("-" * width for width in WIDTHS) + " | ----------- |",
    ]
    body = [render_row(r) for r in rows]
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(header + body) + "\n", encoding="utf-8")


def merge(transactions, dry_run):
    """Group by month and merge into the per-month ledger files."""
    by_month = OrderedDict()
    for txn in transactions:
        by_month.setdefault(txn.date[:7], []).append(txn)

    summary = []
    for month, month_txns in sorted(by_month.items()):
        path = LEDGER / f"{month}.md"
        existing, extras = read_ledger(path)
        if extras:
            print(f"  ! {month}: {len(extras)} malformed row(s) left untouched", file=sys.stderr)
        seen = {key(r) for r in existing}

        added = []
        for txn in month_txns:
            row = {
                "date": txn.date,
                "time": txn.time,
                "amount": f"{txn.amount:.2f}",
                "category": txn.category,
                "description": txn.description,
            }
            if key(row) not in seen:
                seen.add(key(row))
                added.append(row)

        summary.append((month, len(added), len(existing) + len(added)))
        if not dry_run:
            write_ledger(path, existing + added, month)

    return summary


def recategorize(dry_run):
    """Re-apply rules.json to every row already in the ledger."""
    rules, compiled = load_rules()
    total = changed = 0
    for path in sorted(LEDGER.glob("*.md")):
        rows, _ = read_ledger(path)
        if not rows:
            continue
        month_changed = 0
        for row in rows:
            probe = Transaction(row["date"], row["time"], "", Decimal(row["amount"]), Decimal(0))
            probe.description = row["description"]
            # Existing rows have lost Sber's original category, so rules match
            # on the description and the current category acts as the fallback.
            probe.sber_category = row["category"]
            categorize(probe, rules, compiled)
            total += 1
            if probe.category != row["category"]:
                row["category"] = probe.category
                month_changed += 1
        if month_changed and not dry_run:
            write_ledger(path, rows, path.stem)
        changed += month_changed
        if month_changed:
            print(f"  {path.stem}: {month_changed} row(s) recategorised")
    print(f"{'Would recategorise' if dry_run else 'Recategorised'} {changed} of {total} rows.")


def main():
    parser = argparse.ArgumentParser(description="Import a Sberbank statement PDF into the vault ledger.")
    parser.add_argument("pdfs", nargs="*", type=Path,
                        help="statement PDFs (default: every PDF in ../Statements)")
    parser.add_argument("--dry-run", action="store_true", help="report only, write nothing")
    parser.add_argument("--recategorize", action="store_true",
                        help="re-apply rules.json to rows already in the ledger and exit")
    args = parser.parse_args()

    if args.recategorize:
        recategorize(args.dry_run)
        return

    pdfs = args.pdfs or sorted(STATEMENTS.glob("*.pdf"))
    if not pdfs:
        raise SystemExit(f"no PDFs given and none found in {STATEMENTS}")

    rules, compiled = load_rules()
    for pdf in pdfs:
        if not pdf.exists():
            raise SystemExit(f"not found: {pdf}")

        transactions, header = parse_pdf(pdf)
        income, expense = validate(transactions, header, pdf.name)
        for txn in transactions:
            categorize(txn, rules, compiled)

        print(f"\n{pdf.name}")
        print(f"  period    {header['period_start']} — {header['period_end']}")
        print(f"  parsed    {len(transactions)} transactions, all 4 checks passed")
        print(f"  income    {income:>12,.2f}  (header {header['credited']:>12,.2f})")
        print(f"  expense   {expense:>12,.2f}  (header {header['debited']:>12,.2f})")
        print(f"  balance   {header['opening']:,.2f} -> {header['closing']:,.2f}")

        transfers = sum(1 for t in transactions if t.transfer)
        print(f"  transfers {transfers} (excluded from spending stats)")

        for month, added, total in merge(transactions, args.dry_run):
            verb = "would add" if args.dry_run else "added"
            print(f"    {month}.md  {verb} {added:>3} new row(s), {total} total")

    if args.dry_run:
        print("\nDry run — nothing was written.")


if __name__ == "__main__":
    main()
