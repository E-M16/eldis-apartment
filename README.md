# Eldi's Apartment — Booking.com availability synchronization

## Included files

- `worker.js` — existing contact/booking Worker plus `GET /availability` and server-side overlap protection.
- `index.html` — unchanged website page and layout.
- `assets/js/booking.js` — loads availability, validates selected dates, and preserves the existing duration/date rules.
- `assets/js/config.js` — keeps `contactWorkerUrl` and adds `availabilityWorkerUrl`.

## Deployment

1. Deploy `worker.js` to the same Cloudflare Worker currently used by the website.
2. Keep the Worker route/domain unchanged, or update both URLs in `assets/js/config.js` if the Worker URL changes.
3. Upload `index.html`, `assets/js/booking.js`, and `assets/js/config.js` to the website using their existing paths.
4. Purge the Cloudflare website cache after deployment so browsers receive the updated JavaScript.

The current configured Worker base URL is:

`https://eldis-apartment-contact.eldi-1291.workers.dev/`

The availability endpoint is:

`https://eldis-apartment-contact.eldi-1291.workers.dev/availability`

## Worker secrets

The Worker expects these existing Cloudflare secrets:

- `RESEND_API_KEY`
- `TURNSTILE_SECRET_KEY`
- `BOOKING_ICAL_URL`

`BOOKING_ICAL_URL` must contain the private Booking.com iCal export URL. Do not place that URL in frontend files or commit it to source control.

Example Wrangler commands:

```bash
wrangler secret put RESEND_API_KEY
wrangler secret put TURNSTILE_SECRET_KEY
wrangler secret put BOOKING_ICAL_URL
wrangler deploy
```

## How availability synchronization works

1. The browser requests `GET /availability` when the booking form page loads.
2. The Worker reads the private `BOOKING_ICAL_URL` secret and downloads the Booking.com calendar.
3. It unfolds iCalendar continuation lines and parses each `VEVENT` `DTSTART` and `DTEND`.
4. `DTEND` is treated as an exclusive checkout date, following iCalendar all-day event behavior.
5. The Worker returns both reservation ranges and individual unavailable nights.
6. Results are cached for 15 minutes using the Cloudflare Cache API and fetch caching.
7. `booking.js` immediately rejects selected stays containing unavailable nights while retaining the existing minimum-date and stay-duration behavior.
8. Every POST booking request is checked again by the Worker before Resend emails are sent. Overlapping requests return HTTP `409` with code `DATES_UNAVAILABLE`.
9. If the Worker cannot verify the calendar during submission, it returns HTTP `503` instead of sending an unverified booking inquiry.

## Testing

### Availability endpoint

Open the endpoint in a browser or run:

```bash
curl -i https://eldis-apartment-contact.eldi-1291.workers.dev/availability
```

Expected JSON structure:

```json
{
  "success": true,
  "ranges": [
    { "start": "2026-07-10", "end": "2026-07-15" }
  ],
  "unavailableDates": [
    "2026-07-10",
    "2026-07-11",
    "2026-07-12",
    "2026-07-13",
    "2026-07-14"
  ]
}
```

### Website checks

1. Load the website and open browser developer tools.
2. Confirm `/availability` returns HTTP `200`.
3. Choose a Booking.com-reserved check-in date. The field should be cleared and an unavailable-date message shown.
4. Choose a stay that crosses a reserved night. The checkout should be cleared and a clear message shown.
5. Choose free dates. The existing stay-duration message should still appear.
6. Submit free dates and confirm the existing Turnstile and both Resend email flows still work.
7. Attempt to POST overlapping dates directly to the Worker. It should return HTTP `409` and must not send email.

### CORS checks

Requests from these production origins remain allowed:

- `https://eldis-apartment.com`
- `https://www.eldis-apartment.com`

The Worker continues to support `OPTIONS`, the existing POST endpoint, Turnstile hostname validation, and Resend delivery.
