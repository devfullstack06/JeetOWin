const { runReferralAccrualTick } = require("../services/referralAccrualService");

const REFERRAL_JOB_INTERVAL_MS = 60 * 60 * 1000;

function startReferralAccrualJob() {
  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runReferralAccrualTick();
      if (result?.ok) {
        console.log(
          `[referral-accrual-job] month=${result.monthYm} rows=${result.rowsWritten || 0}`
        );
      }
    } catch (err) {
      console.error("[referral-accrual-job] tick failed:", err.message || err);
    } finally {
      running = false;
    }
  };

  void tick();
  timer = setInterval(() => {
    void tick();
  }, REFERRAL_JOB_INTERVAL_MS);

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}

module.exports = {
  startReferralAccrualJob,
};
