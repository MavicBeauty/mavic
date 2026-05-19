# Changelog

## [Unreleased]

## 2026-05-19
- Session form: power and FOT fields changed to select dropdowns (14/16/18/20 J and 30/100)
- Session form: now stamps DNI and birth year (not age) from client record into PDF
- Session PDF: updated coordinate estimates for header fields and treatment grid

## 2026-05-18
- Homepage: TPO badge repositioned to corner, removed logo/wax/tagline, updated service copy
- Booksy: switched to dialog mode with custom trigger button (cleaner UX, no inline widget)
- Booksy: fixed widget URL (`widget-2021/code.js`), fixed CSP headers (`style-src`, `unsafe-eval`)

## Earlier
- Admin panel: client management, consent PDF generation, clinical session PDF, services CRUD
- Supabase Storage integration for client documents
- PDF consent form stamping with exact field coordinates
- Nail gallery images migrated to Supabase Storage
- Employee timesheet save/read
- i18n setup (Spanish default, Catalan)
- Initial project setup: Next.js 14, Tailwind, Supabase, Vercel deployment
