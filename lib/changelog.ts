export interface ChangelogEntry {
  id: string;
  date: string; // ISO date, YYYY-MM-DD
  title: string;
  description: string;
  why: string;
  tag: 'nuevo' | 'mejora' | 'arreglo';
}

// Newest first. Add a new entry here whenever we ship something worth telling María about —
// plain language, no jargon, always say why it changed.
export const CHANGELOG: ChangelogEntry[] = [
  {
    id: '2026-07-04-gestoria-aviso-firmas',
    date: '2026-07-04',
    title: 'El botón de enviar a la gestoría avisa si falta alguna firma',
    description: 'El botón "Enviar a gestoría" ahora está siempre visible. Si intentas enviar un registro que todavía no está firmado por las dos partes (empleada y empresa), aparece un aviso indicando qué firma falta, en vez de enviarlo a medias.',
    why: 'Antes el botón simplemente no aparecía si faltaba una firma, sin explicar por qué. Ahora queda claro qué falta para poder enviarlo.',
    tag: 'mejora',
  },
  {
    id: '2026-07-04-firma-empresa-primero',
    date: '2026-07-04',
    title: 'Ahora puedes firmar el registro de horas antes que la empleada',
    description: 'Antes, la empleada tenía que firmar primero. Ahora tú puedes revisar y firmar como empresa en cualquier momento: en cuanto firmas, ese mes queda bloqueado (ni tú ni ella podéis seguir editándolo) hasta que la empleada firme también, o hasta que anules tu firma.',
    why: 'Encaja con la forma de trabajar donde la empleada rellena sus horas, tú las revisas y firmas para "cerrar" el mes, y ella firma después para confirmar que está de acuerdo, sin poder cambiar nada más.',
    tag: 'nuevo',
  },
  {
    id: '2026-07-04-autoguardado-horarios',
    date: '2026-07-04',
    title: 'El registro de horas ahora se guarda solo',
    description: 'Ya no hace falta acordarse de pulsar "Guardar" cada vez. Si rellenas o corriges horas y dejas de escribir un momento, el sistema guarda los cambios automáticamente. El botón "Guardar" sigue ahí por si quieres guardar al instante.',
    why: 'Antes, si alguien cerraba la pestaña sin pulsar "Guardar", esos cambios se perdían. Ahora eso ya no puede pasar.',
    tag: 'mejora',
  },
];
