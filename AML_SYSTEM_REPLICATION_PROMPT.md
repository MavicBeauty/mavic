# AML/KYC Form System - Complete Replication Guide

## System Overview
This is a complete AML (Anti-Money Laundering) / KYC (Know Your Customer) compliance form system built in PHP that generates, reviews, and submits DOCX documents. Users fill out a form, review the generated document, and submit it. Admins can download and manage submissions.

## Architecture Flow
```
formularioaml.php (Form Entry)
         ↓
    aml-process.php (Generate DOCX)
         ↓
   aml-review.php (Review & Download)
         ↓
   aml-submit.php (Final Submission)
         ↓
   /submissions/ (Storage)
         ↓
   aml-admin.php (Admin Dashboard)
```

---

## File Structure Required
```
/formularioaml.php          # Main form page
/aml-process.php            # DOCX generation & validation
/aml-review.php             # Review page before submission
/aml-submit.php             # Final submission handler
/aml-admin.php              # Admin dashboard
/aml-download-temp.php      # Download draft document
/root.php                   # Config, DB connection, session setup
/submissions/               # Directory for final documents (auto-created)
  └── index.json           # Log of all submissions (auto-created)
/temp/                      # Directory for temporary DOCX files (auto-created)
/BLANK-WAYLLET-AML.docx    # Template DOCX file (must exist!)
/css/clean.css             # Styling (can reuse or customize)
```

---

## Part 1: formularioaml.php - The Form Entry Page

**Key Features:**
- Responsive form with 2-column grid layout (mobile responsive)
- Client-side validation with real-time feedback
- Income calculation (monthly to annual conversion)
- Green theme styling (#10b981 primary color)
- Info banner with compliance messaging
- Pre-fills form if coming back from validation error
- Session error display

**Form Fields (all required):**
- Nombre (Full Name) - min 5 chars
- DNI/NIE/Pasaporte - Spanish format (12345678A, Y1234567X)
- Fecha de Nacimiento (Birth Date) - must be 18+
- Nacionalidad (Nationality)
- Dirección de Residencia (Address)
- Teléfono (Phone) - min 9 digits
- Email - standard email validation
- Ocupación / Cargo (Job Title)
- Nombre del Empleador (Employer Name)
- Dirección del Empleador (Employer Address)
- Ingresos (Income) - with radio toggle for monthly/annual
- Monto a Invertir (Amount to Invest) - currency

**Client-side Validation Rules:**
- nombre: min 5 characters
- dni: regex `/^[0-9XYZ][0-9]{6,7}[A-Z0-9]$/i`
- fecha_nacimiento: must be at least 18 years old
- telefono: regex `/^\+?[0-9\s\-\.]{9,20}$/`
- email: standard email format
- ingresos & monto: must be > 0
- Income display updates live based on monthly/annual toggle

**Styling Approach:**
- Use Poppins font (from Google Fonts)
- Green gradient buttons (#10b981 to #059669)
- Light gradient hero (#f0fdf4 to #eff6ff)
- Form labels bold, inputs with focus states
- Error states: red borders, error messages below fields
- Loading spinner on submit button

**Redirect:** On submit → POST to aml-process.php

---

## Part 2: aml-process.php - Document Generation

**This is the core processor. Key steps:**

### 1. Clean Up Old Temp Files
```php
foreach (glob($tempDir . 'AML_*.docx') as $f) {
    if (filemtime($f) < time() - 3600) {
        @unlink($f);
    }
}
```

### 2. Collect & Sanitize POST Data
- Use `sanitizeText()` helper: trim + mb_substr(255)
- Keys: nombre, dni, fecha_nacimiento, nacionalidad, direccion, telefono, email, ocupacion, empleador, dir_empleador, ingresos, periodo_ingresos, monto

### 3. Server-side Validation
Validate all fields with specific rules:
- nombre: min 5 chars
- dni: custom regex validation
- fecha_nacimiento: must exist, age must be 18+
- telefono: custom regex
- email: FILTER_VALIDATE_EMAIL
- ingresos & monto: numeric, positive, max limits (10M for income, 1M for amount)
- periodo_ingresos: must be 'mensual' or 'anual'

**If validation fails:** Store error in session['aml_form_error'], redirect to /formularioaml?error=1

### 4. Calculate Annual Income
```php
if ($data['periodo_ingresos'] === 'mensual') {
    $ingresos_anuales *= 12;
}
$data['ingresos_anuales'] = number_format($ingresos_anuales, 0, ',', '.');
```

### 5. Auto-Generate Fields (for variation)
Use CRC32 hashes of name/DNI to randomly select from predefined arrays:
- **naturaleza_fondos**: "Ahorros personales de salario"
- **descripcion_fondos**: (3 variations based on occupation/income)
- **documentacion**: (3 variations of documentation types)
- **transaccion**: "Compra de USDT por {monto}€"
- **fecha_hoy**: Today's date (d/m/Y)

### 6. DOCX Generation Using ZipArchive
- Open BLANK-WAYLLET-AML.docx as ZIP
- Extract word/document.xml
- Replace placeholders (in specific order to avoid conflicts):
  - 43-char blank: `___________________________________________`
  - 38-char blank (appears 3x): `______________________________________`
  - 30-char blank (appears 3x): `______________________________`
  - Field labels + values (e.g., "Fecha de nacimiento:" → "Fecha de nacimiento: 01/01/1990")
  - Signature blocks (FIRMA, DOCUMENTO DE IDENTIDAD, FECHA appear 3 times each)

**Important:** Use `xmlEscape()` to escape XML special chars in user data

### 7. Store in Session & Redirect
```php
$_SESSION['aml_data'] = $allData;
$_SESSION['aml_temp_file'] = $outputPath;
$_SESSION['aml_filename'] = sanitized filename
$_SESSION['aml_nonce'] = bin2hex(random_bytes(16));
$_SESSION['aml_submitted'] = false;
```

Redirect to /aml-review.php

**Error Handling:** Any exception → store error in session['aml_form_error'] → redirect back to form

---

## Part 3: aml-review.php - Review Page

**Display all collected data in organized sections:**

1. **Información Personal** (2-column grid)
   - Nombre, DNI, Fecha de Nacimiento, Nacionalidad, Dirección, Teléfono, Email

2. **Información Laboral** (2-column grid)
   - Ocupación, Ingresos Anuales, Nombre del Empleador, Dirección del Empleador

3. **Información Financiera**
   - Monto a Invertir
   - Auto-generated fields (in gray box):
     - Naturaleza de Fondos
     - Descripción de Fondos
     - Documentación
     - Transacción

**Three Action Buttons:**
- "Editar Datos" → redirects back to form (with data pre-filled from session)
- "Descargar Borrador" → aml-download-temp.php (downloads temp DOCX)
- "Envia el documento..." → POST form to aml-submit.php with nonce

**Security:** Include hidden nonce field from session['aml_nonce']

---

## Part 4: aml-submit.php - Final Submission

**Validation Chain:**
1. POST request only
2. Verify session['aml_data'], session['aml_temp_file'], session['aml_nonce'] exist
3. Verify nonce matches POST['nonce']
4. Check if already submitted in session (prevent duplicates)
5. Verify temp file exists

**On Success:**
1. Generate permanent filename: `AML_{sanitized_name}_{dni}_{timestamp}.docx`
2. Move temp file to /submissions/ directory
3. Create metadata object:
   ```php
   [
       'id' => bin2hex(random_bytes(8)),
       'nombre' => $data['nombre'],
       'dni' => $data['dni'],
       'email' => $data['email'],
       'telefono' => $data['telefono'],
       'fecha_submit' => date('Y-m-d H:i:s'),
       'filename' => $permanentFilename,
       'ip' => $_SERVER['REMOTE_ADDR']
   ]
   ```
4. Load /submissions/index.json, append metadata, save with file locking
5. Clear all AML session vars
6. Show confirmation page with success icon and submitted details

**Confirmation Page Layout:**
- Success icon (✓ check-circle)
- "¡Documento Enviado!" heading
- Submitted details in box (Nombre, DNI, Monto, Fecha Envío)
- "Nos pondremos en contacto contigo pronto" message
- "Volver al Inicio" button

---

## Part 5: aml-admin.php - Admin Dashboard

**Three-tier Protection:**

### Login Page
- Simple password-only form
- Password hash (use PHP password_hash)
- Brute-force protection: 5 attempts → 5 min lockout
- Show remaining time on lockout screen

### Admin Dashboard (after auth)
**Display:**
- Header with green gradient background, stat counter (# of documents)
- Logout button
- Table with columns: Nombre, DNI, Email, Teléfono, Fecha Envío, Acciones
- Each row has: Download button + Delete button (with confirmation)
- Empty state if no submissions

**CSRF Protection:**
- Generate token in session['admin_csrf'] on first view
- Require token for delete operations

**Features:**
- Sort submissions by date (newest first)
- Download link serves file with proper headers
- Delete removes both file and JSON entry
- Search/filter optional but nice-to-have

---

## Part 6: aml-download-temp.php - Draft Download

**Simple file server:**
- Check session['aml_temp_file'] exists
- Serve with proper DOCX headers
- Content-Disposition: attachment

---

## Part 7: root.php - Foundation

**Minimum requirements:**
```php
// DB connection (optional, can skip if not using)
try {
    $db = new MYSQLI("localhost", "user", "pass", "dbname");
} catch (Exception $e) {
    $db = null;
}

// Session start
error_reporting(E_ALL ^ E_NOTICE);
SESSION_START();

// Server vars
$IP = $_SERVER['REMOTE_ADDR'];

// Timezone
date_default_timezone_set('Europe/Madrid');
```

---

## Key Security Practices Implemented

1. **Input Validation:** Server-side validation of all fields (don't trust client)
2. **XML Escaping:** All user data escaped before inserting into DOCX XML
3. **Session-based State:** Nonce tokens prevent CSRF
4. **Password Hashing:** Admin password uses password_hash/verify
5. **File Locking:** JSON writes use flock for concurrent access safety
6. **File Path Validation:** No arbitrary file paths from user input
7. **Rate Limiting:** Login brute-force protection
8. **Cleanup:** Old temp files auto-deleted (1 hour expiry)
9. **Sanitization:** Text trimmed and length-limited

---

## Template File (BLANK-WAYLLET-AML.docx)

**Critical:** You need the DOCX template file that contains:

**Blanks to Replace (by character count):**
- 43-char blank: appears once (for transaction description)
- 38-char blank: appears 3 times (for nombre)
- 30-char blank: appears 3 times (for dni)

**Field Label Placeholders:**
- "Fecha de nacimiento:" (and all other field labels)

**Signature Section (appears 3 times each):**
- "FIRMA:"
- "DOCUMENTO DE IDENTIDAD:"
- "FECHA:"

**How to Create:**
1. Open Word, create AML/KYC declaration document
2. Replace sections with blank underscores (_) of exact character count
3. Save as .docx
4. Test with aml-process.php to verify all placeholders are found

---

## Customization Points for New Site

### To adapt for your other site:

1. **Change branding:**
   - Company name, logo, WhatsApp number
   - Color scheme (adjust #10b981 throughout)
   - Hero gradient colors

2. **Adjust form fields:**
   - Add/remove fields as needed
   - Validation rules can be customized
   - Income period options (monthly/annual) or remove

3. **Customize auto-generated content:**
   - Modify descripcion_fondos arrays (3 variations)
   - Modify documentacion arrays (3 variations)
   - Adjust transaccion template

4. **Template DOCX:**
   - Use your company's AML template
   - Keep same placeholder structure (blank underscores)
   - Add company letterhead, headers/footers as needed

5. **Admin password:**
   - Generate new hash: `php -r "echo password_hash('your-new-password', PASSWORD_DEFAULT);"`
   - Replace ADMIN_PASSWORD_HASH in aml-admin.php

6. **File paths:**
   - /submissions/ directory must be writable
   - /temp/ directory must be writable
   - Adjust CSS path if different

---

## Testing Checklist

- [ ] Form validation (client-side)
- [ ] Form validation (server-side) 
- [ ] Back button from review (data pre-fills)
- [ ] Download draft DOCX (opens in Word, content correct)
- [ ] Submit document (confirmation page shows)
- [ ] Admin login (accepts password)
- [ ] Admin brute-force lockout (5 attempts)
- [ ] Download from admin (file downloads)
- [ ] Delete from admin (file and log updated)
- [ ] Session expiry (temp file cleanup works)
- [ ] Mobile responsive (form on phone)
- [ ] XSS protection (special chars in names don't break)

---

## Database Notes

The root.php includes database connection code, but the AML system doesn't strictly require it. If you're adding to an existing site with DB, you can use it. Otherwise, file-based storage (JSON log) works fine for submissions management.

---

## Deployment Notes

1. Ensure PHP has ZipArchive extension enabled
2. Create /submissions/ and /temp/ directories with 755 permissions
3. Upload BLANK-WAYLLET-AML.docx to root
4. Set appropriate file permissions (web server must read/write)
5. Test file permissions: verify /submissions/index.json can be written
6. Adjust timezone in root.php for your region
7. Update links/URLs if site structure differs (e.g., /formularioaml is absolute path)

---

## Session Variables Used

```php
$_SESSION['aml_data']           // Full collected form data
$_SESSION['aml_temp_file']      // Path to temp DOCX
$_SESSION['aml_filename']       // Display filename
$_SESSION['aml_nonce']          // CSRF token for submit
$_SESSION['aml_submitted']      // Flag to prevent double-submit
$_SESSION['aml_form_error']     // Error message to display
$_SESSION['aml_form_data']      // Form data for re-fill on error

$_SESSION['aml_admin_auth']     // Admin authenticated flag
$_SESSION['admin_attempts']     // Failed login count
$_SESSION['admin_lockout_time'] // When lockout expires
$_SESSION['admin_csrf']         // CSRF token for delete operations
```

---

## Additional Notes

- The system is language-specific (Spanish). For other languages, translate all labels, field names, error messages, and button text.
- Income calculation handles both monthly and annual inputs automatically.
- Auto-generated fields use name/DNI hashes to provide natural variation without randomness.
- File cleanup runs on every process.php load (removes files > 1 hour old).
- The system gracefully handles missing database extension (for local testing).

---

## Quick Start for New Developer

1. Read this entire guide
2. Review the source code in order: formularioaml.php → aml-process.php → aml-review.php → aml-submit.php → aml-admin.php
3. Understand the ZipArchive DOCX manipulation logic in aml-process.php (core complexity)
4. Create your template DOCX with correct placeholder structure
5. Adapt field names, validation rules, and branding
6. Test the complete flow end-to-end
7. Test admin login and submission management
8. Deploy with correct file permissions
