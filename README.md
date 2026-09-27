# McART – strona www (Vercel)

Statyczna strona (8 podstron) + funkcja `api/kontakt.js` obsługująca formularz.

## Wdrożenie
1. Wrzuć zawartość tego folderu do repozytorium GitHub albo użyj `vercel` z terminala w tym folderze.
2. W Vercel: **Add New → Project → Import**. Framework: **Other**. Build command i output zostaw puste.
3. W **Settings → Environment Variables** dodaj:
   - `RESEND_API_KEY` – klucz z https://resend.com (darmowy plan wystarcza)
   - `CONTACT_TO` – `biuro@mcart.com.pl`
   - `CONTACT_FROM` – np. `McART formularz <formularz@mcart.com.pl>` (domena musi być zweryfikowana w Resend)
4. Zrób ponowny deploy po dodaniu zmiennych.
5. **Settings → Domains**: podepnij `mcart.com.pl` i `www.mcart.com.pl` i ustaw rekordy DNS według instrukcji Vercel.

Bez zmiennych środowiskowych strona działa normalnie, a formularz pokazuje komunikat z numerem telefonu zamiast wysyłki.

## Rezerwacja spotkań Google Meet (podstrona Umów spotkanie)
Kalendarz na stronie łączy się z Kalendarzem Google przez funkcje `api/availability.js` (wolne terminy)
i `api/booking.js` (tworzy wydarzenie z linkiem Meet i wysyła zaproszenie klientowi).
Bez kluczy Google działa w trybie pokazowym. Godziny, długość spotkania i przerwy: `api/_lib/gcal.js`.

### Podłączenie konta Google (jednorazowo, ok. 15 min)
1. https://console.cloud.google.com → utwórz projekt, np. „McART strona”.
2. APIs & Services → Library → włącz **Google Calendar API**.
3. OAuth consent screen: typ **External**, nazwa aplikacji, e-mail. Zakresy (scopes):
   `https://www.googleapis.com/auth/calendar.events` oraz `https://www.googleapis.com/auth/calendar.freebusy`.
   Dodaj swój adres jako użytkownika testowego, a na końcu kliknij **Publish app** (status „In production”),
   inaczej token wygaśnie po 7 dniach.
4. Credentials → Create credentials → **OAuth client ID** → typ **Web application** →
   Authorized redirect URI: `https://developers.google.com/oauthplayground`. Zapisz Client ID i Client secret.
5. https://developers.google.com/oauthplayground → koło zębate → zaznacz „Use your own OAuth credentials” →
   wklej Client ID i secret → w polu na dole wpisz oba zakresy z punktu 3 → **Authorize APIs** →
   zaloguj się kontem, na którym ma być kalendarz (przy ostrzeżeniu: Zaawansowane → Przejdź do aplikacji) →
   **Exchange authorization code for tokens** → skopiuj **Refresh token**.
6. Vercel → Settings → Environment Variables:
   `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_REFRESH_TOKEN`, opcjonalnie `GOOGLE_CALENDAR_ID` (domyślnie główny kalendarz).
   Potem **Redeploy**.
7. Test: otwórz `https://twoja-domena/api/availability` – powinien pokazać listę dni z wolnymi godzinami.

Przełączenie na kalendarz szefa: powtórz punkt 5 logując się jego kontem i podmień `GOOGLE_REFRESH_TOKEN`.
