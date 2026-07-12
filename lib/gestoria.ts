// Directorio de contactos de la Gestoria Galtés (Sumand) para el envío de
// registros de jornada. Fuente: directorio relevado por departamento, 2026-07-05.
// Los emails "habituales" son los destinatarios por defecto del selector.

export interface GestoriaContact {
  name: string;
  email: string;
  department: string;
}

export const GESTORIA_CONTACTS: GestoriaContact[] = [
  { name: 'Montse Mercadé', email: 'montse.mercade@sumand.cat', department: 'Laboral — nóminas y registro de jornada' },
  { name: 'Laboral (buzón del departamento)', email: 'laboral2@gestoriagaltes.com', department: 'Laboral — buzón general' },
  { name: 'Ian Junyent', email: 'ian.junyent@sumand.cat', department: 'Laboral — nóminas y registro de jornada (contacto anterior)' },
  { name: 'María Miserachs', email: 'maria.miserachs@sumand.cat', department: 'Contacto principal — temas importantes y urgencias' },
  { name: 'Aroa Fresnedoso', email: 'aroa.fresnedoso@sumand.cat', department: 'Laboral — nóminas, vacaciones' },
  { name: 'Gemma Masagué', email: 'gemma.masague@sumand.cat', department: 'Fiscal — IVA, extractos bancarios' },
  { name: 'Ana Bercial', email: 'ana.bercial@sumand.cat', department: 'Impuestos, urgencias, facturas' },
  { name: 'Oficina de Piera', email: 'piera@sumand.cat', department: 'Facturas de la gestoría' },
  { name: 'Dolors Miret', email: 'dolors.miret@sumand.cat', department: 'Facturas' },
  { name: 'Gemma Mateu', email: 'gemma.mateu@sumand.cat', department: 'Pagos, certificado digital' },
  { name: 'Olga Torras', email: 'olga.torras@sumand.cat', department: 'Facturas' },
  { name: 'Administración', email: 'administracio@gestoriagaltes.com', department: 'Administración general' },
];

// Destinatarios habituales del registro de jornada (pre-seleccionados en el modal).
export const COMMON_GESTORIA_EMAILS = [
  'montse.mercade@sumand.cat',
  'laboral2@gestoriagaltes.com',
];

export const GESTORIA_EMAIL_SET = new Set(GESTORIA_CONTACTS.map(c => c.email));
