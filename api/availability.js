// GET /api/availability?start=YYYY-MM-DD&days=28  ->  { days: { "2026-09-28": ["9:00", ...] } }
const g = require('./_lib/gcal');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (!g.configured()) return res.status(503).json({ ok: false, message: 'Kalendarz nie jest podłączony' });
  try {
    const now = new Date();
    const start = /^\d{4}-\d{2}-\d{2}$/.test(req.query.start || '') ? req.query.start : g.ymd(now);
    const days = Math.min(g.MAX_DAYS_AHEAD, Math.max(1, parseInt(req.query.days, 10) || 28));
    const from = g.warsawToDate(start, '0:00');
    const to = g.warsawToDate(g.addDays(start, days), '0:00');
    const token = await g.accessToken();
    const busy = await g.busyIntervals(token, from, to);
    const out = {};
    for (let i = 0; i < days; i++) {
      const d = g.addDays(start, i);
      const free = g.TIMES.filter((t) => g.slotAllowed(d, t, now) && g.slotFree(g.warsawToDate(d, t), busy));
      if (free.length) out[d] = free;
    }
    return res.status(200).json({ ok: true, tz: g.TZ, duration: g.DURATION_MIN, days: out });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, message: 'Nie udało się pobrać terminów' });
  }
};
