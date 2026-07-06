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
    id: '2026-07-07-caja-b-nueva',
    date: '2026-07-07',
    title: 'Nuevo: registro de Caja B en el portal',
    description: 'Dentro del portal de empleadas (donde se registra el horario) hay ahora una sección "Caja B" para anotar cada entrada o salida de ese efectivo: fecha, importe, categoría (pago a Yuranny, pago a Angelica, nómina de los socios, gastos varios u otro) y una nota si hace falta. Arriba se ve el saldo actual, y debajo la lista de movimientos del mes, filtrable por mes y año.',
    why: 'Para dejar de depender de la memoria a la hora de saber cuánto hay en la Caja B y de dónde salió cada pago — todo el que tiene acceso al portal (José, María, Angelica, Kelly, Keren) puede anotar un movimiento y todos ven el mismo saldo.',
    tag: 'nuevo',
  },
  {
    id: '2026-07-06-invitacion-empleadas-arreglada',
    date: '2026-07-06',
    title: 'Arreglado: el correo para activar la cuenta de una empleada',
    description: 'El correo que recibe una empleada para crear su contraseña y entrar al portal ahora tiene un diseño más cuidado (con el logo de Mavic) y el enlace dura 24 horas de verdad. Si hace falta reenviarlo, hay un botón nuevo de "Reenviar confirmación" en la ficha de la empleada.',
    why: 'Al dar de alta a dos empleadas, el enlace del correo aparecía como caducado aunque se abriera rápido: el correo decía "24 horas" pero en realidad caducaba en solo 1 hora. Tampoco había forma de reenviarlo, solo de cambiar el email de la cuenta.',
    tag: 'arreglo',
  },
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
