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
}

function calcDailyHours(d: DayEntry): number {
  if (d.absence !== 'none' || !d.entry1 || !d.exit1) return 0;
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
  const ROW_H      = 15.8;
  const GRID_BOT   = DATA_TOP - 31 * ROW_H;  // bottom of day-31 row
  const TOT_BOT    = GRID_BOT - ROW_H;        // bottom of total row
  const OBS_TOP    = TOT_BOT - 6;
  const OBS_BOT    = OBS_TOP - 30;
  const SIG_TOP    = OBS_BOT - 6;
  const SIG_BOT    = SIG_TOP - 55;

  // ── Title ─────────────────────────────────────────────────────────────────

  const title = 'REGISTRO DE LA JORNADA DE LOS TRABAJADORES';
  lText(title, bold, 11, (W - bold.widthOfTextAtSize(title, 11)) / 2, TITLE_Y);

  const legal = 'En cumplimiento de la obligacion establecida en el Articulo 34.9 del Estatuto de los Trabajadores';
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
  const VL_BOT = TOT_BOT;

  // Group-boundary vLines — full height through header and all data rows
  const groupBounds: [number, number][] = [
    [L,                                        0.5],
    [COLS.ent1.x,                              0.5],   // DIA right / HORAS group left
    [COLS.ent_comp.x,                          1.2],   // HORAS group right / COMP group left (thick)
    [COLS.ausencia.x,                          0.5],   // COMP group right / AUSENCIA left
    [COLS.ausencia.x + COLS.ausencia.w,        0.5],   // AUSENCIA right / FIRMA left
    [R,                                        0.5],   // right edge
  ];
  groupBounds.forEach(([x, thick]) => vLine(x, VL_BOT, VL_TOP, thick));

  // Sub-column vLines — data rows + bottom half of header only (stop at H_MID_Y)
  [COLS.sal1.x, COLS.ent2.x, COLS.sal2.x, COLS.tot.x, COLS.sal_comp.x]
    .forEach(x => vLine(x, VL_BOT, H_MID_Y));

  // ── Data rows ─────────────────────────────────────────────────────────────

  for (let i = 0; i < 31; i++) {
    const dayNum = i + 1;
    const rowTop = DATA_TOP - i * ROW_H;
    const rowBot = rowTop - ROW_H;
    const textY  = rowBot + 4;

    const isOutOfRange = dayNum > daysInMonth;
    if (isOutOfRange) continue;

    const dow = new Date(year, month - 1, dayNum).getDay();

    // Day number + day-of-week letter
    const DOW_LETTER = ['D','L','M','X','J','V','S'];
    cText(`${dayNum} ${DOW_LETTER[dow]}`, font, 6.5, COLS.dia, textY);

    const entry = days.find(d => d.day === dayNum);
    if (entry) {
      if (entry.absence !== 'none') {
        const absLabel = ABSENCE_LABELS[entry.absence] || '';
        cText(absLabel, font, 6, COLS.ent1, textY);
      } else {
        if (entry.entry1) cText(entry.entry1, font, 6.5, COLS.ent1, textY);
        if (entry.exit1)  cText(entry.exit1,  font, 6.5, COLS.sal1,  textY);
        if (entry.entry2) cText(entry.entry2, font, 6.5, COLS.ent2,  textY);
        if (entry.exit2)  cText(entry.exit2,  font, 6.5, COLS.sal2,  textY);
        const hrs = calcDailyHours(entry);
        if (hrs > 0) cText(hrs.toFixed(1) + 'h', bold, 8.5, COLS.tot, textY);
      }
    }
  }

  // ── Total row ─────────────────────────────────────────────────────────────

  const totTextY = TOT_BOT + 4;
  lText('TOTAL HORAS MES', bold, 7.5, L + 3, totTextY);
  cText(totalHours.toFixed(1) + 'h', bold, 8, COLS.tot, totTextY);

  // ── Observations ──────────────────────────────────────────────────────────

  rect(L, OBS_BOT, R - L, OBS_TOP - OBS_BOT);
  lText('Observaciones:', bold, 7, L + 3, OBS_TOP - 11);
  if (observations) lText(observations, font, 7, L + 3, OBS_TOP - 22);

  // ── Signature block ───────────────────────────────────────────────────────

  rect(L, SIG_BOT, R - L, SIG_TOP - SIG_BOT);
  const SIG_W   = R - L;
  const SIG_MID1 = L + SIG_W / 3;
  const SIG_MID2 = L + 2 * SIG_W / 3;
  vLine(SIG_MID1, SIG_BOT, SIG_TOP);
  vLine(SIG_MID2, SIG_BOT, SIG_TOP);

  const sigTY = SIG_TOP - 11;
  lText('POR LA EMPRESA',      bold, 8,  L + 3,       sigTY);
  lText('Firma y sello',       font, 7,  L + 3,       sigTY - 14);

  const fechaStr = `Fecha: ${String(daysInMonth).padStart(2,'0')}/${String(month).padStart(2,'0')}/${year}`;
  const fechaW   = font.widthOfTextAtSize(fechaStr, 8);
  lText(fechaStr, font, 8, SIG_MID1 + ((SIG_MID2 - SIG_MID1) - fechaW) / 2, sigTY);

  lText('POR EL TRABAJADOR',   bold, 8,  SIG_MID2 + 3, sigTY);
  lText('Firma',               font, 7,  SIG_MID2 + 3, sigTY - 14);

  return await doc.save();
}
