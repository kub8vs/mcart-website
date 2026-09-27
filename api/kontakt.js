// Formularz kontaktowy McART – funkcja serwerowa Vercel.
// Wysyła maila przez Resend (https://resend.com). Wymagane zmienne środowiskowe w Vercel:
//   RESEND_API_KEY  – klucz API z Resend
//   CONTACT_TO      – adres odbiorcy, np. biuro@mcart.com.pl
//   CONTACT_FROM    – nadawca z domeny zweryfikowanej w Resend, np. "McART formularz <formularz@mcart.com.pl>"

const hits = new Map(); // prosty limit: 1 wiadomość / 30 s z jednego IP (w obrębie instancji)

const clean = (v, max = 200) =>
  String(v ?? '').replace(/[\r\n]+/g, ' ').trim().slice(0, max);
const esc = (s) =>
  s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, message: 'Metoda niedozwolona' });
  }

  const b = req.body || {};
  if (b.website) return res.status(200).json({ ok: true }); // pułapka na boty

  const name = clean(b.name);
  const org = clean(b.organization);
  const email = clean(b.email);
  const phone = clean(b.phone, 40);
  const topic = clean(b.topic);
  const message = String(b.message ?? '').trim().slice(0, 5000);
  const consent = !!b.consent;

  if (!name || !message || !consent || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
    return res.status(422).json({ ok: false, message: 'Brak wymaganych danych' });
  }

  const ip = String(req.headers['x-forwarded-for'] || '').split(',')[0] || 'x';
  const now = Date.now();
  if (hits.has(ip) && now - hits.get(ip) < 30000) {
    return res.status(429).json({ ok: false, message: 'Za dużo prób' });
  }
  hits.set(ip, now);

  const { RESEND_API_KEY, CONTACT_TO = 'biuro@mcart.com.pl', CONTACT_FROM } = process.env;
  if (!RESEND_API_KEY || !CONTACT_FROM) {
    return res.status(500).json({ ok: false, message: 'Formularz nie jest skonfigurowany' });
  }

  const rows = [
    ['Imię i nazwisko', name], ['Placówka / firma', org], ['E-mail', email],
    ['Telefon', phone], ['Temat', topic],
  ];
  const html =
    '<h2 style="font-family:Arial">Nowa wiadomość ze strony mcart.com.pl</h2><table style="font-family:Arial;font-size:14px">' +
    rows.map(([k, v]) => `<tr><td style="color:#56647f;padding:4px 12px 4px 0">${k}</td><td><b>${esc(v || '–')}</b></td></tr>`).join('') +
    `</table><p style="font-family:Arial;font-size:14px;white-space:pre-wrap;border-left:3px solid #1f56e0;padding-left:12px">${esc(message)}</p>` +
    '<p style="font-family:Arial;font-size:12px;color:#8492ad">Zgoda na przetwarzanie danych: TAK</p>';

  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: CONTACT_FROM,
        to: [CONTACT_TO],
        reply_to: email,
        subject: `Formularz www: ${topic || 'zapytanie'} – ${name}`,
        html,
        text: rows.map(([k, v]) => `${k}: ${v || '–'}`).join('\n') + '\n\n' + message,
      }),
    });
    if (!r.ok) throw new Error(await r.text());
    return res.status(200).json({ ok: true });
  } catch (e) {
    console.error('Resend error', e);
    return res.status(502).json({ ok: false, message: 'Błąd wysyłki' });
  }
};
