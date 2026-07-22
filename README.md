# Eldi's Apartment Website

Static vacation-rental website hosted on Cloudflare Pages.

## Project structure

```text
index.html
assets/
  css/
    style.css
  js/
    config.js
    utils.js
    booking.js
    contact.js
robots.txt
sitemap.xml
manifest.webmanifest
```

## JavaScript responsibilities

- `config.js`: public frontend configuration, including the contact Worker URL.
- `utils.js`: shared date helpers.
- `booking.js`: date restrictions and stay-duration calculation.
- `contact.js`: Turnstile token handling and booking-form submission.

## Services

- Hosting: Cloudflare Pages
- Contact API: Cloudflare Worker
- Email delivery: Resend
- Bot protection: Cloudflare Turnstile

The Worker secrets are configured in Cloudflare and must never be committed to this repository.
