# Prompt to Replicate AML/KYC System for Another Site

**Copy this entire prompt into a new Claude Code session, replacing [YOUR_SITE] placeholders, then ask Claude to build the system.**

---

## Context & Task

I need you to build a complete AML/KYC (Know Your Customer) compliance form system for [YOUR_SITE], based on an existing system from another site. The system should:

1. **Form entry page** - Collect personal, employment, and financial data
2. **Document generation** - Create a DOCX file from a template with user data
3. **Review page** - Let users review and download before submitting
4. **Submission handler** - Save documents and create a log
5. **Admin dashboard** - Manage and download submissions

---

## How the System Works

**User Flow:**
1. User fills form → validates on client & server
2. Server generates DOCX from template, stores in temp
3. User reviews data on confirmation page
4. User can edit (goes back) or submit
5. On submit, file moves to permanent storage
6. Admin can download/delete submissions

**Admin Flow:**
1. Password login with brute-force protection
2. View all submissions in a table
3. Download individual DOCX files
4. Delete submissions (removes file & log)

---

## File Structure to Create

```
[root]/
  ├── formularioaml.php           # Main form entry
  ├── aml-process.php             # Generate DOCX via ZipArchive
  ├── aml-review.php              # Review before submit
  ├── aml-submit.php              # Final submission
  ├── aml-admin.php               # Admin dashboard
  ├── aml-download-temp.php       # Download draft DOCX
  ├── root.php                    # Session setup, DB config
  ├── BLANK-WAYLLET-AML.docx      # Template file (you provide)
  ├── submissions/                # Storage directory (auto-created)
  │   └── index.json             # Submission log (auto-created)
  └── temp/                       # Temp DOCX files (auto-created)
```

---

## Form Fields (All Required)

- **nombre** - Full name (min 5 chars)
- **dni** - Spanish ID (format: 12345678A)
- **fecha_nacimiento** - Birth date (must be 18+)
- **nacionalidad** - Nationality
- **direccion** - Residential address
- **telefono** - Phone (min 9 digits)
- **email** - Email
- **ocupacion** - Job title
- **empleador** - Employer name
- **dir_empleador** - Employer address
- **ingresos** - Income (toggle monthly/annual)
- **monto** - Amount to invest (currency)

**Client-side validation:** Real-time on blur, error messages below fields
**Server-side validation:** All fields re-validated before DOCX generation

---

## Key Features

### formularioaml.php
- Responsive 2-column form (mobile: 1 column)
- Green theme (#10b981 primary color)
- Income field with monthly/annual toggle → auto-converts to annual
- Pre-fill form if returning from validation error
- Clean CSS styling with Poppins font
- Loading spinner on submit

### aml-process.php
- Server-side validation of ALL fields
- Auto-cleanup of temp files older than 1 hour
- Uses PHP ZipArchive to modify DOCX:
  - Opens template as ZIP
  - Extracts word/document.xml
  - Replaces blanks & field labels with user data
  - Creates new DOCX in /temp/
- Auto-generates fields based on CRC32(name) hash:
  - naturaleza_fondos: "Ahorros personales de salario"
  - descripcion_fondos: (3 variations by occupation)
  - documentacion: (3 variations of doc types)
  - transaccion: "Compra de USDT por {monto}€"
  - fecha_hoy: today's date
- Stores session vars: aml_data, aml_temp_file, aml_filename, aml_nonce
- Redirects to aml-review.php on success
- Redirects back to form with error on validation failure

### aml-review.php
- Displays all data in organized sections:
  - Información Personal (name, DNI, etc)
  - Información Laboral (job, employer, income)
  - Información Financiera (amount, auto-fields)
- 3 action buttons:
  - "Editar Datos" → back to form with data pre-filled
  - "Descargar Borrador" → download temp DOCX
  - "Envia el documento" → POST to aml-submit.php with nonce

### aml-submit.php
- Validates nonce (CSRF protection)
- Checks for duplicate submission
- Moves temp file to /submissions/{AML_name_dni_timestamp.docx}
- Creates submission metadata entry
- Appends to /submissions/index.json with file locking
- Shows confirmation page with success icon & details
- Clears all AML session vars

### aml-admin.php
- **Login:** Password form with 5-attempt brute-force lockout (5 min)
- **Dashboard:** (after auth)
  - Table: Nombre, DNI, Email, Teléfono, Fecha Envío, Actions
  - Actions: Download file + Delete with confirmation
  - Sort by newest first
  - Empty state message if no docs
  - Stats: "X documento(s) recibido(s)"
  - Logout button

### aml-download-temp.php
- Simple file server for temp DOCX
- Validates session['aml_temp_file'] exists
- Serves with Content-Disposition: attachment

---

## DOCX Template Requirements

You must provide: **BLANK-WAYLLET-AML.docx**

The template needs these placeholders:
- **43-char blank** (one): `___________________________________________` → transaction description
- **38-char blank** (3x): `______________________________________` → name
- **30-char blank** (3x): `______________________________` → DNI
- **Field labels** (e.g., "Fecha de nacimiento:" → "Fecha de nacimiento: 01/01/1990")
- **Signature blocks** (3 sections, each has):
  - "FIRMA:" → "FIRMA: {name}"
  - "DOCUMENTO DE IDENTIDAD:" → "DOCUMENTO DE IDENTIDAD: {dni}"
  - "FECHA:" → "FECHA: {today}"

**Creating the template:**
1. Use your AML/KYC template Word doc
2. Create underscores of exact lengths for blanks
3. Keep field labels as anchors
4. Save as .docx

---

## Validation Rules

### Client-side (javascript):
- nombre: min 5 characters
- dni: regex `/^[0-9XYZ][0-9]{6,7}[A-Z0-9]$/i`
- fecha_nacimiento: at least 18 years old
- telefono: regex `/^\+?[0-9\s\-\.]{9,20}$/`
- email: standard email format
- ingresos & monto: number > 0

### Server-side (PHP):
Same rules as client + additional checks:
- ingresos: 0 < value <= 10,000,000
- monto: 0 < value <= 1,000,000
- periodo_ingresos: only 'mensual' or 'anual'
- edad >= 18 years
- All required fields present

---

## Session Variables

```php
// Form data
$_SESSION['aml_data']           // All form fields + auto-generated
$_SESSION['aml_temp_file']      // Path to temp DOCX file
$_SESSION['aml_filename']       // Display filename
$_SESSION['aml_nonce']          // CSRF token for submit
$_SESSION['aml_submitted']      // Prevent double-submit

// Error handling
$_SESSION['aml_form_error']     // Error to show on form
$_SESSION['aml_form_data']      // Form data to pre-fill after error

// Admin auth
$_SESSION['aml_admin_auth']     // true if logged in
$_SESSION['admin_attempts']     // Failed login count
$_SESSION['admin_lockout_time'] // Unix timestamp of lockout end
$_SESSION['admin_csrf']         // CSRF token for deletes
```

---

## Security Practices

- ✅ Server-side validation (don't trust client)
- ✅ XML escape all user data before DOCX insertion
- ✅ Nonce/CSRF tokens on state-changing forms
- ✅ Password hash with password_hash/verify
- ✅ File locking on JSON writes (concurrent access safety)
- ✅ Rate limiting on login (5 attempts, 5 min lockout)
- ✅ Auto-cleanup of temp files (1 hour expiry)
- ✅ No arbitrary file paths from user input
- ✅ htmlspecialchars on all echo output

---

## Styling & Theme

- **Primary color:** #10b981 (emerald green)
- **Dark gradient:** #10b981 → #059669
- **Light gradient:** #f0fdf4 → #eff6ff
- **Font:** Poppins (Google Fonts)
- **Icons:** Font Awesome 6.4.0
- **Mobile:** Responsive grid (2 col → 1 col at 768px)
- **Component styling:**
  - Forms: 1px #e5e7eb borders, rounded corners
  - Error: Red (#ef4444) text/borders
  - Success: Green (#10b981) text/borders
  - Buttons: Gradient, hover transform, shadow

---

## Customization Points

For [YOUR_SITE]:

1. **Branding:** Company name, logo path, colors, WhatsApp link
2. **Form fields:** Add/remove fields as needed, adjust validation
3. **Auto-generated text:** Change descripcion_fondos & documentacion arrays
4. **Admin password:** Generate new hash with PHP
5. **Language:** Currently Spanish, translate if needed
6. **CSS:** Use existing site CSS or customize

---

## Testing Steps

1. Create form page → fill form → validate (client + server)
2. Review page shows data correctly
3. Download draft DOCX → open in Word → content filled
4. Go back from review → edit data → resubmit
5. Final submit → confirmation page shows
6. Check /submissions/ directory → files exist, index.json created
7. Admin login → view submissions → download file
8. Delete submission → file & log entry removed
9. Brute-force test → 5 wrong passwords → locked out 5 min
10. Mobile test → form responsive, usable on phone

---

## Root.php Essentials

```php
<?php
// Session & timezone
SESSION_START();
date_default_timezone_set('Europe/Madrid'); // Adjust to your timezone

// Database (optional, can skip if file-based only)
try {
    $db = new MYSQLI("localhost", "user", "pass", "dbname");
} catch (Exception $e) {
    $db = null;
}

// Server vars
$IP = $_SERVER['REMOTE_ADDR'];
```

---

## Submission Metadata Format

Each entry in /submissions/index.json:
```json
{
  "id": "a1b2c3d4e5f6g7h8",
  "nombre": "Juan García",
  "dni": "12345678A",
  "email": "juan@example.com",
  "telefono": "+34 624 442 673",
  "fecha_submit": "2026-05-07 14:35:22",
  "filename": "AML_Juan_Garcia_12345678A_20260507_143522.docx",
  "ip": "192.168.1.1"
}
```

---

## Deployment Checklist

- [ ] PHP ZipArchive extension enabled
- [ ] /submissions/ directory exists, 755 permissions
- [ ] /temp/ directory exists, 755 permissions
- [ ] BLANK-WAYLLET-AML.docx uploaded to root
- [ ] root.php database config correct (or disabled)
- [ ] Admin password hash generated and set
- [ ] CSS file path correct (or use inline styles)
- [ ] Test file write permissions (index.json creation)
- [ ] Test DOCX generation (open file in Word)
- [ ] Test admin login (brute-force after 5 attempts)

---

## Key Complexity Notes

**The trickiest part:** DOCX manipulation via ZipArchive

- DOCX is a ZIP file containing XML
- Must extract word/document.xml
- Replace placeholders in correct order (longest first to avoid conflicts)
- XML-escape all user data
- Repack into new DOCX

Implementation is in `aml-process.php` lines ~195-276. Study this section carefully.

---

## Now You're Ready

Copy the guide file `/home/greennell/projects/CAMBIOSJVV/.claude/AML_SYSTEM_REPLICATION_PROMPT.md` for detailed implementation help.

**Next step:** Create the files in order:
1. root.php (foundation)
2. formularioaml.php (form)
3. aml-process.php (generator)
4. aml-review.php (review)
5. aml-submit.php (submission)
6. aml-download-temp.php (download)
7. aml-admin.php (admin)

Then test the complete flow end-to-end.
