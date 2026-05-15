const { runPromotionStatusTransitions } = require("../controllers/admin/promotionsController");

const PROMOTION_JOB_INTERVAL_MS = 60 * 1000;

function startPromotionStatusJob() {
  let timer = null;
  let running = false;

  const tick = async () => {
    if (running) return;
    running = true;
    try {
      const result = await runPromotionStatusTransitions();
      const changed =
        (result?.ended || 0) +
        (result?.scheduled || 0) +
        (result?.activated || 0) +
        (result?.draft || 0);
      if (changed > 0) {
        console.log(
          `[promotions-job] ended=${result.ended || 0} scheduled=${result.scheduled || 0} active=${result.activated || 0} draft=${result.draft || 0}`
        );
      }
    } catch (err) {
      console.error("[promotions-job] tick failed:", err.message || err);
    } finally {
      running = false;
    }
  };

  // Run once at startup, then interval.
  void tick();
  timer = setInterval(() => {
    void tick();
  }, PROMOTION_JOB_INTERVAL_MS);

  return () => {
    if (timer) clearInterval(timer);
    timer = null;
  };
}

module.exports = {
  startPromotionStatusJob,
};
