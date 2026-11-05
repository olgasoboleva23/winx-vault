// The writes of the weight card: today's weight in Weight.md, today's level and reasons in the body
// log.
import { todayYmd } from "../core/dates.js";
import { edit } from "../core/files.js";
import { amount } from "../core/format.js";
import { BodyLog } from "../models/bodyLog.js";
import { WeightLog } from "../models/weightLog.js";
import { LOG_PATH, PATH } from "../widgets/body/weight.js";

export const weightActions = () => ({
  // today's weight from what was typed; false when it isn't a weight
  async logWeight(typed) {
    const kg = amount(typed);

    if (!kg || kg <= 0) return false;
    await edit(PATH, c => new WeightLog(c).set(todayYmd(), kg));
    return true;
  },
  logBody: (level, reasons) => edit(LOG_PATH, c => new BodyLog(c).set(todayYmd(), level, reasons)),
});
