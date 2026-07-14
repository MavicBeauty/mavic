// Formato compartido del módulo Registro (VentasPanel, RegistroStats,
// RegistroPanel, config). Antes cada componente tenía su propia copia.

export const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

// El espacio antes del € es NBSP: el símbolo nunca se separa de la cifra
// aunque la tarjeta o celda se quede sin ancho.
export function fmtEuros(n: number) {
  return `${n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`;
}

export function fmtFecha(fecha: string) {
  const [y, m, d] = fecha.split('-');
  return `${d}/${m}/${y}`;
}

export function fmtFechaHora(ts: string) {
  return new Date(ts).toLocaleString('es-ES', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit',
  });
}

export function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export function plural(n: number, sing: string, plur: string) {
  return `${n} ${n === 1 ? sing : plur}`;
}
