// Wspólne funkcje: token Google, strefa czasowa, wolne terminy.
// Zmienne środowiskowe w Vercel:
//   GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GOOGLE_REFRESH_TOKEN  – dostęp do Kalendarza Google
//   GOOGLE_CALENDAR_ID (opcjonalnie, domyślnie "primary")

const TZ = 'Europe/Warsaw';
const DURATION_MIN = 30;                 // długość spotkania
const BUFFER_MIN = 15;                   // przerwa przed i po spotkaniu
const TIMES = ['9:00','9:30','10:00','10:30','11:00','11:30','12:30','13:00','13:30','14:00','14:30','15:00'];
const MIN_LEAD_HOURS = 20;               // najwcześniej ~następnego dnia
const MAX_DAYS_AHEAD = 28;

function configured() {
  const e = process.env;
  return !!(e.GOOGLE_CLIENT_ID && e.GOOGLE_CLIENT_SECRET && e.GOOGLE_REFRESH_TOKEN);
}

async function accessToken() {
  const e = process.env;
  const r = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: e.GOOGLE_CLIENT_ID,
      client_secret: e.GOOGLE_CLIENT_SECRET,
      refresh_token: e.GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    }),
  });
  const j = await r.json();
  if (!r.ok || !j.access_token) throw new Error('Google token error: ' + JSON.stringify(j));
  return j.access_token;
}

function tzOffsetMin(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-US', {
    timeZone: TZ, hour12: false, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  }).formatToParts(date).map((x) => [x.type, x.value]));
  const asUTC = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return Math.round((asUTC - date.getTime()) / 60000);
}

// "2026-09-28" + "10:00" (czas polski) -> Date (UTC)
function warsawToDate(dateStr, timeStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  let t = guess - tzOffsetMin(new Date(guess)) * 60000;
  t = guess - tzOffsetMin(new Date(t)) * 60000; // korekta przy zmianie czasu
  return new Date(t);
}

function ymd(date) {
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' })
    .formatToParts(date).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

function addDays(dateStr, n) {
  const [y, m, d] = dateStr.split('-').map(Number);
  const t = new Date(Date.UTC(y, m - 1, d + n));
  return t.toISOString().slice(0, 10);
}

function weekday(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay(); // 0 = niedziela
}

async function busyIntervals(token, from, to) {
  const cal = process.env.GOOGLE_CALENDAR_ID || 'primary';
  const r = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ timeMin: from.toISOString(), timeMax: to.toISOString(), timeZone: TZ, items: [{ id: cal }] }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error('freeBusy error: ' + JSON.stringify(j));
  const c = j.calendars && j.calendars[cal];
  return (c && c.busy ? c.busy : []).map((b) => [new Date(b.start).getTime(), new Date(b.end).getTime()]);
}

function slotFree(start, busy) {
  const s = start.getTime() - BUFFER_MIN * 60000;
  const e = start.getTime() + (DURATION_MIN + BUFFER_MIN) * 60000;
  return !busy.some(([bs, be]) => bs < e && be > s);
}

function slotAllowed(dateStr, timeStr, now = new Date()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr) || !TIMES.includes(timeStr)) return false;
  const wd = weekday(dateStr);
  if (wd === 0 || wd === 6) return false;
  const start = warsawToDate(dateStr, timeStr);
  const lead = (start - now) / 3600000;
  return lead >= MIN_LEAD_HOURS && lead <= MAX_DAYS_AHEAD * 24 + 24;
}

module.exports = { TZ, DURATION_MIN, TIMES, MAX_DAYS_AHEAD, configured, accessToken, warsawToDate, ymd, addDays, busyIntervals, slotFree, slotAllowed };
