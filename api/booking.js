// POST /api/booking  { date, time, name, email, org, website }
// Tworzy wydarzenie w Kalendarzu Google z linkiem Google Meet i wysyła zaproszenie klientowi.
const g = require('./_lib/gcal');
const crypto = require('crypto');
const hits = new Map();

const clean = (v, max = 200) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ ok: false }); }
  if (!g.configured()) return res.status(503).json({ ok: false, message: 'Kalendarz nie jest podłączony' });

  const b = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
  if (b.website) return res.status(200).json({ ok: true }); // bot

  const date = clean(b.date, 10), time = clean(b.time, 5);
  const name = clean(b.name), email = clean(b.email), org = clean(b.org);
  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return res.status(422).json({ ok: false, message: 'Uzupełnij imię i poprawny e-mail.' });
  if (!g.slotAllowed(date, time)) return res.status(422).json({ ok: false, message: 'Ten termin jest niedostępny. Wybierz inny.' });

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  if (hits.has(ip) && Date.now() - hits.get(ip) < 60000) return res.status(429).json({ ok: false, message: 'Spróbuj ponownie za minutę.' });

  try {
    const token = await g.accessToken();
    const start = g.warsawToDate(date, time);
    const end = new Date(start.getTime() + g.DURATION_MIN * 60000);
    const busy = await g.busyIntervals(token, new Date(start.getTime() - 3600000), new Date(end.getTime() + 3600000));
    if (!g.slotFree(start, busy)) return res.status(409).json({ ok: false, message: 'Ten termin został właśnie zajęty. Wybierz inny.' });

    const cal = encodeURIComponent(process.env.GOOGLE_CALENDAR_ID || 'primary');
    const r = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${cal}/events?conferenceDataVersion=1&sendUpdates=all`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        summary: `Konsultacja online McART – ${name}${org ? ' (' + org + ')' : ''}`,
        description: `Spotkanie umówione przez stronę mcart.com.pl\n\nImię i nazwisko: ${name}\nE-mail: ${email}\nPlacówka: ${org || '–'}`,
        start: { dateTime: start.toISOString(), timeZone: g.TZ },
        end: { dateTime: end.toISOString(), timeZone: g.TZ },
        attendees: [{ email, displayName: name }],
        reminders: { useDefault: false, overrides: [{ method: 'email', minutes: 1440 }, { method: 'popup', minutes: 15 }] },
        conferenceData: { createRequest: { requestId: crypto.randomUUID(), conferenceSolutionKey: { type: 'hangoutsMeet' } } },
      }),
    });
    const ev = await r.json();
    if (!r.ok) throw new Error('insert error: ' + JSON.stringify(ev));
    hits.set(ip, Date.now());
    const meet = ev.hangoutLink || (ev.conferenceData && ev.conferenceData.entryPoints && (ev.conferenceData.entryPoints.find((x) => x.entryPointType === 'video') || {}).uri) || '';
    return res.status(200).json({ ok: true, meet, eventLink: ev.htmlLink });
  } catch (e) {
    console.error(e);
    return res.status(502).json({ ok: false, message: 'Nie udało się zarezerwować spotkania. Zadzwoń: 42 636 55 94.' });
  }
};
