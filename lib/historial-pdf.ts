import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import fs from 'fs';
import path from 'path';

export interface Zone {
  name: string;
  fot: string;
  power: string;
}

export interface SessionData {
  session_date: string;
  zones: Zone[];
  observations?: string;
  adverse_reactions?: Record<string, boolean>;
}

export interface ClientInfo {
  name: string;
  apellidos?: string | null;
  phone?: string | null;
  fecha_nacimiento?: string | null;
  dni?: string | null;
}

// 6 zone row y-baselines, 20pt spacing from first measured row y=455
const ZONE_ROWS = [455, 435, 415, 395, 375, 355];

// Session column x: measured SES.1 at x=206, each column 33pts wide
function colX(sesNum: number): number {
  return 206 + (sesNum - 1) * 33;
}

// Adverse reaction checkbox y-baselines
// Measured: square 1 at x=201, y=237, w=36, h=17 → center_y=245.5 → text baseline=242
// Each row 17pts apart going down
const REACTION_Y: Record<string, number> = {
  sun_exposure: 242,
  wax:          225,
  accutane:     208,
  herpes:       191,
  bronzers:     174,
  bleaching:    157,
  cosmetics:    140,
  chloasma:     123,
};

export function normalizeZones(formData: Record<string, unknown>): Zone[] {
  if (Array.isArray(formData.zones)) {
    return (formData.zones as Zone[]).filter(z => z.name?.trim());
  }
  // Backward compat: old single-zone format
  if (formData.zonas) {
    return [{
      name: String(formData.zonas),
      fot: String(formData.fot || ''),
      power: String(formData.power || ''),
    }];
  }
  return [];
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getFullYear()).slice(-2)}`;
}

export async function generateHistorialPDF(
  client: ClientInfo,
  sessions: SessionData[],
): Promise<Uint8Array> {
  const pdfPath = path.join(process.cwd(), 'public', 'forms', 'HISTORIALASER_form.pdf');
  const pdfBytes = fs.readFileSync(pdfPath);
  const pdfDoc = await PDFDocument.load(pdfBytes, { throwOnInvalidObject: false });
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const page = pdfDoc.getPages()[0];
  const black = rgb(0, 0, 0);

  const birthYear = client.fecha_nacimiento
    ? String(new Date(client.fecha_nacimiento).getFullYear())
    : '';

  // ── Header ──
  page.drawText(client.name,                  { x: 119, y: 694, size: 10, font, color: black });
  if (client.apellidos)
    page.drawText(client.apellidos,           { x: 317, y: 693, size: 10, font, color: black });
  if (client.dni)
    page.drawText(client.dni,                 { x: 100, y: 663, size: 10, font, color: black });
  if (birthYear)
    page.drawText(birthYear,                  { x: 286, y: 665, size: 10, font, color: black });
  if (client.phone)
    page.drawText(client.phone,               { x: 403, y: 664, size: 10, font, color: black });

  // ── Unified zone list (unique names in order of first appearance) ──
  const allZoneNames: string[] = [];
  sessions.forEach(s =>
    s.zones.forEach(z => {
      if (z.name && !allZoneNames.includes(z.name)) allZoneNames.push(z.name);
    })
  );

  // Write zone labels + FOT (from first session that provides each zone)
  allZoneNames.slice(0, 6).forEach((zoneName, rowIdx) => {
    const y = ZONE_ROWS[rowIdx];
    page.drawText(zoneName.slice(0, 18),      { x: 83, y, size: 7, font, color: black });
    for (const s of sessions) {
      const z = s.zones.find(z => z.name === zoneName);
      if (z?.fot) {
        page.drawText(String(z.fot),          { x: 170, y, size: 7, font, color: black });
        break;
      }
    }
  });

  // ── Per-session data (max 9 columns) ──
  sessions.slice(0, 9).forEach((session, idx) => {
    const sesNum = idx + 1;
    const cx = colX(sesNum);

    // Date in FECHA row
    page.drawText(formatDate(session.session_date), { x: cx, y: 502, size: 6, font, color: black });

    // Power per zone row
    session.zones.forEach(zone => {
      const rowIdx = allZoneNames.indexOf(zone.name);
      if (rowIdx >= 0 && rowIdx < 6 && zone.power) {
        page.drawText(String(zone.power), { x: cx, y: ZONE_ROWS[rowIdx], size: 7, font, color: black });
      }
    });

    // Adverse reactions — X centered in checkbox
    // Checkbox SES.1 center_x = 201 + 36/2 = 219; each col +33pts
    if (session.adverse_reactions) {
      const xText = 216 + (sesNum - 1) * 33;
      for (const [key, active] of Object.entries(session.adverse_reactions)) {
        if (active && REACTION_Y[key] !== undefined) {
          page.drawText('X', { x: xText, y: REACTION_Y[key], size: 9, font, color: black });
        }
      }
    }
  });

  // ── Observations — long blue line, measured at x=100 y=70 w=411 ──
  const obsParts = sessions
    .map((s, i) => s.observations ? `${i + 1}. ${s.observations}` : null)
    .filter(Boolean) as string[];

  if (obsParts.length) {
    const fullText = obsParts.join(' · ');
    const words = fullText.split(' ');
    const maxChars = 80;
    let line = '';
    let obsY = 73;
    for (const word of words) {
      if ((line + word).length > maxChars) {
        page.drawText(line.trim(), { x: 103, y: obsY, size: 7, font, color: black });
        line = word + ' ';
        obsY += 10;
        if (obsY > 120) break;
      } else {
        line += word + ' ';
      }
    }
    if (line.trim()) page.drawText(line.trim(), { x: 103, y: obsY, size: 7, font, color: black });
  }

  return pdfDoc.save();
}
