#!/usr/bin/env bash
# Wrapper around import_statement.py.
#
# The venv lives OUTSIDE the vault on purpose: a venv inside the vault would be
# picked up by git and pushed to OneDrive by Remotely Save. Override the
# location with FINANCE_VENV if you keep your envs somewhere else.
set -euo pipefail

VENV="${FINANCE_VENV:-$HOME/.venvs/finance}"
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ ! -x "$VENV/bin/python" ]; then
  echo "Setting up the import environment in $VENV (one time only)…"
  python3 -m venv "$VENV"
  "$VENV/bin/python" -m pip install --quiet --upgrade pip
  "$VENV/bin/python" -m pip install --quiet pdfplumber
fi

exec "$VENV/bin/python" "$HERE/import_statement.py" "$@"
