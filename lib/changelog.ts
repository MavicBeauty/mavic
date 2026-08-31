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
    id: '2026-08-31-vacaciones-horario',
    date: '2026-08-31',
    title: 'Nueva opción "Vacaciones" en Control de horarios',
    description: 'En "Control de horarios", al marcar la ausencia de un día, ahora hay una opción "Vacaciones" además de "Mañana", "Tarde" y "Todo el día". Al elegirla, bloquea el día completo igual que "Todo el día" (no se pueden anotar horas de entrada/salida), y en el PDF generado aparece la palabra "VACACIONES" en esa fila.',
    why: 'Para poder distinguir a simple vista, tanto en el portal como en el PDF que se envía a la gestoría, los días que una empleada está de vacaciones de otros días de ausencia sin especificar el motivo.',
    tag: 'nuevo',
  },
  {
    id: '2026-07-14-registro-completo',
    date: '2026-07-14',
    title: 'Registro renovado: servicios vendidos, pagos a empleadas y estadísticas',
    description: 'La sección "Registro" se ha rehecho por completo y sustituye a la hoja de Excel que se usaba hasta ahora — a partir de ahora todo se anota aquí. Tiene tres partes: "Servicios vendidos", donde se anota cada servicio con su precio, cómo se cobró (efectivo o datáfono) y la comisión de la empleada; "Estadísticas", con el resumen del mes, cuánto queda pendiente de cobrar y cómo entró el dinero; y "Movimientos" (solo tú), el registro de caja de siempre, ahora con un botón de "Cierre de caja" que te dice cuánto debería haber y te deja anotar lo que cuentas de verdad, guardando la diferencia si la hay. Al pagar a una empleada eliges si el dinero sale de la caja o de otro sitio (Booksy, banco), y puedes pagar a todas las que tengan algo pendiente con un solo botón. Si te equivocas al anotar una venta, puedes corregirla y queda un historial de qué se cambió y cuándo. Las empleadas solo ven sus propios servicios y su comisión pendiente, nunca los de las demás. También se ha renovado el aspecto de toda la sección para que sea más fácil de leer, con un estilo más parecido al de un banco. Para empezar a usarlo: cuenta el dinero que hay ahora mismo en la caja y anota un primer movimiento por ese importe con la nota "saldo inicial" (pestaña Movimientos → botón "Nuevo movimiento"). A partir de ahí, sigue anotando cada entrada y salida como siempre.',
    why: 'Antes todo el dinero de caja se anotaba a mano en un único listado o en Excel, sin saber qué parte era de la empresa y qué parte de cada empleada, ni si ya se le había pagado. Ahora cada venta lleva su comisión calculada, sabes en todo momento quién tiene pendiente de cobrar, puedes comprobar que lo que hay en el cajón coincide con lo que debería haber, y queda constancia de cualquier corrección.',
    tag: 'nuevo',
  },
  {
    id: '2026-07-14-perfiles-tarjetas-permisos',
    date: '2026-07-14',
    title: 'Fichas de empleadas más claras, con todos los permisos en un solo sitio',
    description: 'La página de "Perfiles de Empleadas" se ha rediseñado. Ahora cada empleada aparece en una tarjeta pequeña con un color propio, su email y si ya confirmó su cuenta. Al pulsar "Gestionar" se abre una ventana con dos pestañas: "Datos laborales" (la ficha de siempre) y "Cuenta y permisos", donde puedes controlar todo lo de su cuenta del portal: qué secciones ve (Control de horarios, Nóminas y Registro), si puede editar su horario o solo verlo, cambiarle el email o la contraseña, y reenviarle la invitación si aún no la confirmó.',
    why: 'Antes cada ficha mostraba todos los datos y botones a la vez y era fácil perderse. Ahora lo importante se ve de un vistazo, y todos los permisos de cada empleada se cambian desde un único sitio — tú misma puedes dar o quitar acceso a cualquier sección del portal sin pedir ayuda.',
    tag: 'mejora',
  },
  {
    id: '2026-07-12-gestoria-selector-contactos',
    date: '2026-07-12',
    title: 'Elige a quién de la gestoría enviar el registro de horas',
    description: 'Al pulsar "Enviar a gestoría", ahora aparece la lista de contactos de la gestoría para marcar a quién quieres enviar el registro (una o varias personas). Los dos contactos habituales (Montse de laboral y el buzón del departamento) ya vienen marcados, y con "+ Otros contactos" puedes ver al resto de personas de la gestoría por si algún mes hay que enviarlo a alguien más.',
    why: 'Antes el registro se enviaba siempre a los mismos dos correos, fijos, y no se podían cambiar sin tocar la configuración interna. Ahora, si la gestoría cambia de persona de contacto o hace falta copiar a alguien más, se elige directamente al enviar.',
    tag: 'mejora',
  },
  {
    id: '2026-07-07-registro-nuevo',
    date: '2026-07-07',
    title: 'Nuevo: sección de Registro en el portal',
    description: 'Dentro del portal de empleadas (donde se registra el horario) hay ahora una sección "Registro" para anotar cada entrada o salida de caja: fecha, importe, categoría y una nota si hace falta. Arriba se ve el saldo actual, y debajo la lista de movimientos del mes, filtrable por mes y año.',
    why: 'Para dejar de depender de la memoria a la hora de saber cuánto hay en caja y de dónde salió cada pago — todo el que tiene acceso al portal puede anotar un movimiento y todos ven el mismo saldo.',
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
