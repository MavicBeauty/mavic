# Mavic Beauty & Nails — Web Platform

Website and admin panel for Mavic Beauty & Nails, a beauty and laser hair removal salon.

---

## What it does

**Public side**
- Landing page with services, pricing, promotions, and booking CTA
- Booksy integration (dialog mode) for online appointment booking
- Gift card request form

**Admin panel** (`/admin`)
- Client management: create clients, view full history
- Consent form generation: fills a PDF template with client data, stores it in Supabase Storage
- Clinical session tracking: registers laser sessions, stamps data into the HISTORIAL PDF template, stores per session
- Services & pricing CRUD: manage what's displayed on the public site
- Promotions CRUD: manage active special offers
- Gift card management: review requests, assign GC numbers, mark as sent
- Employee timesheet tracking

---

## Tech stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (`client-documents`, `gift-cards`) |
| PDF generation | `pdf-lib` — stamps text over scanned PDF templates |
| i18n | `next-intl` — Spanish (default) / Catalan |
| Deployment | Vercel |

---

## Project structure

```
app/
  [locale]/           Public landing page (ES/CA)
  admin/
    login/            Admin login
    dashboard/        Overview
    clientes/         Client list, profiles, new client
      [id]/
        nueva-sesion/ Register a new laser session
    servicios/        Services & pricing CRUD
    ofertas/          Promotions CRUD
    tarjetas-regalo/  Gift card management
    empleados/        Employee timesheets
  api/
    clients/          Client create/read/delete
    consent/          Consent PDF generation + upload
    sessions/         Clinical session PDF generation + upload
    services/         Services CRUD
    promotions/       Promotions CRUD
    gift-cards/       Gift card requests
    timesheets/       Timesheet save/read
components/
  public/             Landing page sections
  admin/              Admin UI components
lib/
  supabase/           Supabase client (browser + server)
public/
  forms/              PDF templates (CONSENTIMIENTO_form.pdf, HISTORIALASER_form.pdf)
```

---

## PDF generation

Both PDF templates (`CONSENTIMIENTO_form.pdf` and `HISTORIALASER_form.pdf`) are scanned flat images with no AcroForm fields. Data is stamped by drawing text at fixed coordinates over the image using `pdf-lib`.

- Page size: 595.32 × 841.92 pts (A4)
- Image embedded as CMYK JPEG at 2481 × 3508 px
- Coordinate scale: `pdf_x = pixel_x × 0.2399`, `pdf_y = 841.9 − (pixel_y × 0.2399)`

Generated PDFs are uploaded to Supabase Storage and linked to the client record.

---

## Environment variables

```
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
```

---

## Development

```bash
npm install
npm run dev
```

Admin login requires a Supabase Auth account with a matching `profiles` row (`role = 'owner'` or `'employee'`).
