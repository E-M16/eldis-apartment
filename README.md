# Eldi's Apartment – Booking.com Availability Integration

## Overview

This version replaces the native HTML date inputs with a professional booking calendar powered by **Flatpickr**.

The calendar synchronizes automatically with your Booking.com iCal feed through the existing Cloudflare Worker.

No manual calendar updates are required.

---

# Features

- Automatic Booking.com availability synchronization
- Professional booking calendar (Flatpickr)
- Booked dates are disabled (greyed out)
- Impossible to select unavailable check-in dates
- Impossible to select checkout before check-in
- Impossible to select a stay overlapping an existing reservation
- Checkout automatically limited to the next available booking
- Works consistently on:
  - Chrome
  - Firefox
  - Edge
  - Safari
  - Android
  - iPhone
- Existing booking form preserved
- Existing email notifications preserved
- Existing Turnstile protection preserved
- Existing Cloudflare Worker preserved

---

# Files

Replace the following files:

```
worker.js
index.html
assets/js/booking.js
assets/js/config.js
```

No other files need to be modified.

---

# Cloudflare Worker

The Worker now exposes:

```
GET /availability
```

The endpoint:

- Reads the private Booking.com iCal URL from the Worker secret
- Downloads the latest calendar
- Parses all VEVENT reservations
- Returns unavailable dates as JSON
- Caches results to reduce Booking.com requests
- Validates bookings before processing the contact request

Example response:

```json
{
  "success": true,
  "ranges": [
    {
      "start": "2026-07-10",
      "end": "2026-07-15"
    }
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

---

# Worker Secrets

Required secrets:

```
RESEND_API_KEY
TURNSTILE_SECRET_KEY
BOOKING_ICAL_URL
```

No additional secrets are required.

---

# Booking Calendar

The website no longer relies on the browser's native HTML `<input type="date">`.

Instead, it uses a dedicated booking calendar that provides:

- Disabled booked dates
- Range selection
- Automatic checkout validation
- Cross-browser consistency
- Better mobile experience

---

# Booking Validation

Validation occurs in two places.

## Client-side

The calendar prevents users from:

- selecting booked check-in dates
- selecting booked checkout dates
- crossing unavailable reservations
- selecting checkout before check-in

The stay duration is updated automatically.

---

## Server-side

Before sending an email, the Cloudflare Worker:

- downloads the latest availability
- checks for overlaps
- rejects invalid bookings

This prevents race conditions if another reservation is made while a visitor still has the page open.

---

# Cache

Availability is cached by the Worker for **15 minutes**.

This reduces requests to Booking.com while keeping the calendar reasonably up to date.

---

# Deployment

1. Deploy the updated Cloudflare Worker.
2. Verify the Worker is reachable:

```
https://your-worker-domain/availability
```

3. Upload:

```
index.html
assets/js/booking.js
assets/js/config.js
```

4. Clear any CDN/browser cache if applicable.

---

# Testing Checklist

Verify the following:

- Worker returns valid availability JSON.
- Booked dates appear disabled.
- Booked dates cannot be selected.
- Checkout cannot be before check-in.
- Checkout cannot extend into another reservation.
- Stay duration updates correctly.
- Booking form submits successfully.
- Turnstile validation works.
- Contact emails continue to be delivered.
- Server rejects overlapping bookings.

---

# Future Improvements

Possible enhancements include:

- Minimum stay rules
- Seasonal pricing
- Cleaning fee calculations
- Dynamic nightly rates
- Multiple apartment support
- Airbnb iCal synchronization
- Calendar loading indicator
- Admin dashboard for availability
- Availability prefetching for faster page loads
- Multi-language calendar localization
