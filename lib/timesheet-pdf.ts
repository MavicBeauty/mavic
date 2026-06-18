import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// A4 dimensions (points)
const W = 595.28;

// Left/right limits
const L = 30;
const R = 565;

// Column layout: x = left edge, w = width. Total = R - L = 535.
const COLS = {
  dia:      { x: L,   w: 24 },
  ent1:     { x: 54,  w: 59 },
  sal1:     { x: 113, w: 59 },
  ent2:     { x: 172, w: 59 },
  sal2:     { x: 231, w: 59 },
  tot:      { x: 290, w: 44 },
  ent_comp: { x: 334, w: 50 },
  sal_comp: { x: 384, w: 50 },
  ausencia: { x: 434, w: 81 },
  firma:    { x: 515, w: 50 },
} as const;

const EMPRESA = {
  nombre:   'BOHREY PARTNERS SL',
  domicilio:'PZ DE LA IGLESIA Nº 11',
  ciudad:   '08110 MONTCADA I REIXAC',
  nif:      'B22599591',
  ccc:      '08233945939',
};

const MONTH_NAMES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

const ABSENCE_LABELS: Record<string, string> = {
  morning:   'Manana',
  afternoon: 'Tarde',
  all:       'Dia completo',
};

export interface DayEntry {
  day: number;
  entry1: string; exit1: string;
  entry2: string; exit2: string;
  absence: 'none' | 'morning' | 'afternoon' | 'all';
  notes: string;
  ent_comp?: string;
  sal_comp?: string;
}

export interface EmployeeInfo {
  nombre_completo: string;
  nif: string;
  num_afiliacion_ss?: string;
  puesto_trabajo?: string;
  categoria?: string;
  grupo_cotizacion?: string;
  fecha_antiguedad?: string;
}

export interface TimesheetPDFParams {
  employee: EmployeeInfo;
  month: number;
  year: number;
  days: DayEntry[];
  totalHours: number;
  observations?: string;
  employeeSignature?: Uint8Array;
  employerSignature?: Uint8Array;
  employeeSignedAt?: string;
  employerSignedAt?: string;
}

function calcDailyHours(d: DayEntry): number {
  if (d.absence === 'all' || !d.entry1 || !d.exit1) return 0;
  const [h1, m1] = d.entry1.split(':').map(Number);
  const [h2, m2] = d.exit1.split(':').map(Number);
  let h = h2 - h1 + (m2 - m1) / 60;
  if (d.entry2 && d.exit2) {
    const [h3, m3] = d.entry2.split(':').map(Number);
    const [h4, m4] = d.exit2.split(':').map(Number);
    h += h4 - h3 + (m4 - m3) / 60;
  }
  return Math.max(0, h);
}

export async function generateTimesheetPDF({
  employee, month, year, days, totalHours, observations = '',
  employeeSignature, employerSignature, employeeSignedAt, employerSignedAt,
}: TimesheetPDFParams): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const page = doc.addPage([W, 841.89]);
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  const black   = rgb(0, 0, 0);
  const gray    = rgb(0.5, 0.5, 0.5);
  const lgray   = rgb(0.92, 0.92, 0.92);
  const white   = rgb(1, 1, 1);

  // ── Helpers ──────────────────────────────────────────────────────────────

  type Col = { x: number; w: number };

  const cText = (text: string, f: typeof font, size: number, col: Col, y: number) => {
    const tw = f.widthOfTextAtSize(text, size);
    page.drawText(text, { x: col.x + (col.w - tw) / 2, y, size, font: f, color: black });
  };

  const lText = (text: string, f: typeof font, size: number, x: number, y: number, color = black) => {
    page.drawText(text, { x, y, size, font: f, color });
  };

  const hLine = (y: number, x1 = L, x2 = R, thick = 0.5) =>
    page.drawLine({ start: { x: x1, y }, end: { x: x2, y }, thickness: thick, color: black });

  const vLine = (x: number, y1: number, y2: number, thick = 0.5) =>
    page.drawLine({ start: { x, y: y1 }, end: { x, y: y2 }, thickness: thick, color: black });

  const rect = (x: number, y: number, w: number, h: number, fill = white, bw = 0.5) =>
    page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: black, borderWidth: bw });

  // ── Derived values ────────────────────────────────────────────────────────

  const daysInMonth = new Date(year, month, 0).getDate();
  const monthName   = MONTH_NAMES[month - 1];

  // Layout y anchors (from top of page downward)
  const TITLE_Y    = 808;
  const LEGAL_Y    = 795;
  const HB_TOP     = 783;   // header box top
  const HB_BOT     = 718;   // header box bottom
  const HB_MID     = 296;   // vertical divider in header
  const PER_TOP    = HB_BOT;
  const PER_BOT    = PER_TOP - 15;
  const CH_TOP     = PER_BOT;      // column header section top
  const CH_H       = 32;           // height of column headers
  const DATA_TOP   = CH_TOP - CH_H; // top edge of day-1 row
  const ROW_H      = 15.2;
  const GRID_BOT   = DATA_TOP - 31 * ROW_H;
  const TOT_BOT    = GRID_BOT - ROW_H;
  const OBS_TOP    = TOT_BOT - 6;
  const OBS_BOT    = OBS_TOP - 20;
  const LEGAL_TOP  = OBS_BOT - 4;
  const LEGAL_BOT  = LEGAL_TOP - 22;
  const SIG_TOP    = LEGAL_BOT - 4;
  const SIG_BOT    = SIG_TOP - 70;

  // ── Title ─────────────────────────────────────────────────────────────────

  const title = 'REGISTRO DE LA JORNADA DE LOS TRABAJADORES';
  lText(title, bold, 11, (W - bold.widthOfTextAtSize(title, 11)) / 2, TITLE_Y);

  const legal = 'En cumplimiento de la obligación establecida en el Artículo 12.4.c, 34.9 y 35.5 del Estatuto de los Trabajadores';
  lText(legal, font, 7, (W - font.widthOfTextAtSize(legal, 7)) / 2, LEGAL_Y, gray);

  // ── EMPRESA / TRABAJADOR header box ──────────────────────────────────────

  rect(L, HB_BOT, R - L, HB_TOP - HB_BOT, white, 0.7);
  vLine(HB_MID, HB_BOT, HB_TOP, 0.5);

  // EMPRESA column
  lText('EMPRESA',          bold, 8,  L + 3, HB_TOP - 11);
  lText(EMPRESA.nombre,     font, 8,  L + 3, HB_TOP - 22);
  lText('Domicilio:',       bold, 7,  L + 3, HB_TOP - 33);
  lText(EMPRESA.domicilio,  font, 7,  L + 45, HB_TOP - 33);
  lText(EMPRESA.ciudad,     font, 7,  L + 3, HB_TOP - 43);
  lText('N.I.F.:',          bold, 7,  L + 3, HB_TOP - 53);
  lText(EMPRESA.nif,        font, 7,  L + 33, HB_TOP - 53);
  lText('Cod. cta. SS:',    bold, 7,  L + 3, HB_TOP - 63);
  lText(EMPRESA.ccc,        font, 7,  L + 60, HB_TOP - 63);

  // TRABAJADOR column
  lText('TRABAJADOR',               bold, 8, HB_MID + 3, HB_TOP - 11);
  lText(employee.nombre_completo,   font, 8, HB_MID + 3, HB_TOP - 22);
  lText('N.I.F.:',                  bold, 7, HB_MID + 3, HB_TOP - 33);
  lText(employee.nif,               font, 7, HB_MID + 33, HB_TOP - 33);
  if (employee.num_afiliacion_ss) {
    lText('Num. afil. SS:',         bold, 7, HB_MID + 3, HB_TOP - 43);
    lText(employee.num_afiliacion_ss, font, 7, HB_MID + 60, HB_TOP - 43);
  }
  if (employee.puesto_trabajo) {
    lText('Puesto:',                bold, 7, HB_MID + 3, HB_TOP - 53);
    lText(employee.puesto_trabajo,  font, 7, HB_MID + 38, HB_TOP - 53);
  }
  const catParts: string[] = [];
  if (employee.categoria)       catParts.push('Categoria: ' + employee.categoria);
  if (employee.grupo_cotizacion)catParts.push('Grupo: ' + employee.grupo_cotizacion);
  if (employee.fecha_antiguedad)catParts.push('Antig.: ' + employee.fecha_antiguedad);
  if (catParts.length)
    lText(catParts.join('   '), font, 6.5, HB_MID + 3, HB_TOP - 63);

  // ── Período ───────────────────────────────────────────────────────────────

  rect(L, PER_BOT, R - L, PER_TOP - PER_BOT);
  const perLabel = 'Periodo:';
  const perLabelW = bold.widthOfTextAtSize(perLabel, 8);
  lText(perLabel, bold, 8, L + 3, PER_BOT + 4);
  lText(`Del 1 de ${monthName} al ${daysInMonth} de ${monthName} de ${year}`, font, 8, L + 3 + perLabelW + 4, PER_BOT + 4);

  // ── Column headers ────────────────────────────────────────────────────────

  rect(L, CH_TOP - CH_H, R - L, CH_H, lgray);

  // Midline only crosses the grouped sections — not DIA, AUSENCIA or FIRMA
  const H_MID_Y   = CH_TOP - 17;
  const ORD_RIGHT  = COLS.tot.x + COLS.tot.w;          // right edge of HORAS ORDINARIAS group
  const COMP_RIGHT = COLS.sal_comp.x + COLS.sal_comp.w; // right edge of COMP/EXTRA group
  hLine(H_MID_Y, COLS.ent1.x, COMP_RIGHT, 0.4);

  // Y positions
  const SEC_Y      = CH_TOP - 11;   // section label baseline (top half of grouped cells)
  const COL_Y      = CH_TOP - 26;   // column label baseline (bottom half of grouped cells)
  const FULL_CTR_Y = CH_TOP - 20;   // baseline for full-height single cells

  // Full-height single-cell labels: DIA, AUSENCIA, FIRMA
  const hFull = (text: string, col: Col, sz: number) =>
    lText(text, bold, sz, col.x + (col.w - bold.widthOfTextAtSize(text, sz)) / 2, FULL_CTR_Y);

  hFull('DIA',      COLS.dia,      7.5);
  hFull('AUSENCIA', COLS.ausencia, 7);
  hFull('FIRMA',    COLS.firma,    7.5);

  // Section labels in top half of grouped cells
  const hSec = (text: string, x1: number, x2: number) =>
    lText(text, bold, 6, x1 + ((x2 - x1) - bold.widthOfTextAtSize(text, 6)) / 2, SEC_Y);

  hSec('HORAS ORDINARIAS', COLS.ent1.x, ORD_RIGHT);
  hSec('COMP / EXTRA',     COLS.ent_comp.x, COMP_RIGHT);

  // Column labels in bottom half of grouped cells
  const hCol = (text: string, col: Col) =>
    lText(text, bold, 5.5, col.x + (col.w - bold.widthOfTextAtSize(text, 5.5)) / 2, COL_Y);

  hCol('ENTRADA', COLS.ent1);
  hCol('SALIDA',  COLS.sal1);
  hCol('ENTRADA', COLS.ent2);
  hCol('SALIDA',  COLS.sal2);
  hCol('TOTAL',   COLS.tot);
  hCol('ENTRADA', COLS.ent_comp);
  hCol('SALIDA',  COLS.sal_comp);

  // ── Grid: horizontal lines ────────────────────────────────────────────────

  hLine(CH_TOP, L, R, 0.7);           // top of headers
  hLine(DATA_TOP, L, R, 0.7);         // below headers
  for (let i = 1; i <= 32; i++) {     // 31 data rows + total row
    hLine(DATA_TOP - i * ROW_H);
  }

  // Vertical lines
  const VL_TOP = CH_TOP;

  // Outer border — runs full height including total row
  vLine(L, TOT_BOT, VL_TOP, 0.5);
  vLine(R, TOT_BOT, VL_TOP, 0.5);

  // Internal group boundaries — stop at GRID_BOT so they don't enter the total row
  ([
    [COLS.ent1.x,                          0.5],
    [COLS.ent_comp.x,                      1.2],
    [COLS.ausencia.x,                      0.5],
    [COLS.ausencia.x + COLS.ausencia.w,    0.5],
  ] as [number, number][]).forEach(([x, thick]) => vLine(x, GRID_BOT, VL_TOP, thick));

  // Sub-column vLines — stop at GRID_BOT (bottom half of header only)
  [COLS.sal1.x, COLS.ent2.x, COLS.sal2.x, COLS.tot.x, COLS.sal_comp.x]
    .forEach(x => vLine(x, GRID_BOT, H_MID_Y));

  // ── Data rows ─────────────────────────────────────────────────────────────

  for (let i = 0; i < 31; i++) {
    const dayNum = i + 1;
    const rowTop = DATA_TOP - i * ROW_H;
    const rowBot = rowTop - ROW_H;
    const textY  = rowBot + 4;

    const isOutOfRange = dayNum > daysInMonth;
    if (isOutOfRange) continue;

    const dow = new Date(year, month - 1, dayNum).getDay();

    const DOW_LETTER = ['D','L','M','X','J','V','S'];
    const entry = days.find(d => d.day === dayNum);

    // "Todo el día" — shade the row, then redraw its borders so the grid stays intact
    if (entry?.absence === 'all') {
      page.drawRectangle({ x: L, y: rowBot, width: R - L, height: ROW_H, color: lgray });
      hLine(rowTop);
      hLine(rowBot);
    }

    // Day number drawn after shading so it's always visible
    cText(`${dayNum} ${DOW_LETTER[dow]}`, font, 6.5, COLS.dia, textY);

    if (entry) {
      if (entry.absence === 'all') {
        // Full-day absence: label goes in the AUSENCIA column only
        cText(ABSENCE_LABELS.all, font, 6, COLS.ausencia, textY);
      } else {
        // Normal row or partial absence: show time columns + hours
        if (entry.entry1) cText(entry.entry1, font, 6.5, COLS.ent1, textY);
        if (entry.exit1)  cText(entry.exit1,  font, 6.5, COLS.sal1,  textY);
        if (entry.entry2) cText(entry.entry2, font, 6.5, COLS.ent2,  textY);
        if (entry.exit2)  cText(entry.exit2,  font, 6.5, COLS.sal2,  textY);
        const hrs = calcDailyHours(entry);
        if (hrs > 0) cText(hrs.toFixed(1) + 'h', bold, 8.5, COLS.tot, textY);
        if (entry.ent_comp) cText(entry.ent_comp, font, 6.5, COLS.ent_comp, textY);
        if (entry.sal_comp) cText(entry.sal_comp, font, 6.5, COLS.sal_comp, textY);
        // Partial absence label in the AUSENCIA column
        if (entry.absence !== 'none') {
          cText(ABSENCE_LABELS[entry.absence] || '', font, 6, COLS.ausencia, textY);
        }
      }
    }
  }

  // ── Total row ─────────────────────────────────────────────────────────────

  // Solid background covers full width — no internal column dividers in this row
  page.drawRectangle({ x: L, y: TOT_BOT, width: R - L, height: ROW_H, color: lgray });
  const totTextY = TOT_BOT + 4;
  lText('TOTAL HORAS MES', bold, 7.5, L + 3, totTextY);
  cText(totalHours.toFixed(1) + 'h', bold, 8, COLS.tot, totTextY);

  // ── Observations ──────────────────────────────────────────────────────────

  rect(L, OBS_BOT, R - L, OBS_TOP - OBS_BOT);
  lText('Observaciones:', bold, 7, L + 3, OBS_TOP - 11);
  if (observations) lText(observations, font, 7, L + 6, OBS_TOP - 16);

  // ── Legal declaration ─────────────────────────────────────────────────────

  rect(L, LEGAL_BOT, R - L, LEGAL_TOP - LEGAL_BOT);
  const legalLines = [
    'El presente registro ha sido elaborado y firmado de conformidad con los art. 12.4.c, 34.9 y 35.5 del Estatuto de los',
    'Trabajadores. Las firmas digitales de ambas partes acreditan la veracidad de los datos y tienen plena validez juridica.',
  ];
  legalLines.forEach((line, i) =>
    lText(line, font, 6, L + 3, LEGAL_TOP - 8 - i * 9, gray)
  );

  // ── Signature block ───────────────────────────────────────────────────────

  const SIG_W    = R - L;
  const SIG_COL  = SIG_W / 3;
  const SIG_MID1 = L + SIG_COL;
  const SIG_MID2 = L + 2 * SIG_COL;

  rect(L, SIG_BOT, R - L, SIG_TOP - SIG_BOT);
  vLine(SIG_MID1, SIG_BOT, SIG_TOP);
  vLine(SIG_MID2, SIG_BOT, SIG_TOP);

  const sigTY = SIG_TOP - 8;
  lText('POR LA EMPRESA',    bold, 7, L + 3,        sigTY);
  lText('POR EL TRABAJADOR', bold, 7, SIG_MID2 + 3, sigTY);

  // Center: period end date
  const fechaStr = `Fecha: ${String(daysInMonth).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
  lText(fechaStr, font, 7, SIG_MID1 + (SIG_COL - font.widthOfTextAtSize(fechaStr, 7)) / 2, sigTY);

  // Helper: format ISO timestamp → DD/MM/YYYY HH:MM
  const fmtTs = (iso: string) => {
    const d = new Date(iso);
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const hh = String(d.getHours()).padStart(2, '0');
    const mi = String(d.getMinutes()).padStart(2, '0');
    return `${dd}/${mm}/${d.getFullYear()} ${hh}:${mi}`;
  };

  // Employer signature image + timestamp
  if (employerSignature) {
    try {
      const img   = await doc.embedPng(employerSignature);
      const maxW  = SIG_COL - 12;
      const scale = Math.min(maxW / img.width, 38 / img.height);
      const iW    = img.width * scale;
      const iH    = img.height * scale;
      page.drawImage(img, {
        x: L + (SIG_COL - iW) / 2,
        y: SIG_BOT + 18,
        width: iW, height: iH,
      });
    } catch { /* skip if corrupt */ }
  }
  if (employerSignedAt) {
    lText(fmtTs(employerSignedAt), font, 5.5, L + 3, SIG_BOT + 10, gray);
  }

  // Employee signature image + timestamp
  if (employeeSignature) {
    try {
      const img   = await doc.embedPng(employeeSignature);
      const maxW  = SIG_COL - 12;
      const scale = Math.min(maxW / img.width, 38 / img.height);
      const iW    = img.width * scale;
      const iH    = img.height * scale;
      page.drawImage(img, {
        x: SIG_MID2 + (SIG_COL - iW) / 2,
        y: SIG_BOT + 18,
        width: iW, height: iH,
      });
    } catch { /* skip if corrupt */ }
  }
  if (employeeSignedAt) {
    lText(fmtTs(employeeSignedAt), font, 5.5, SIG_MID2 + 3, SIG_BOT + 10, gray);
  }

  return await doc.save();
}
