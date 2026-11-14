// Calculadora «cuánto cuesta de verdad».
import { coste, eur, coma, pct, DATOS } from './calculo.mjs';
import { h, memoria, conectarRecordar, leerForm, rellenarForm, mostrarModo } from './ui.mjs';

const form = document.getElementById('form');
const salida = document.getElementById('salida');
const mem = memoria('coste');
const guardado = mem.leer();
if (guardado) rellenarForm(form, guardado);
const pedido = new URLSearchParams(location.search).get('modo');
if (!guardado && ['horas', 'mensual', 'interna'].includes(pedido)) rellenarForm(form, { modo: pedido, horasSemana: pedido === 'horas' ? '10' : '40' });
const guardar = conectarRecordar(document.getElementById('recordar'), mem, () => leerForm(form), document.getElementById('aviso-memoria'));

function fila(concepto, valor, clase) {
  return h('tr', { class: clase }, h('th', { scope: 'row' }, concepto), h('td', { class: 'num' }, valor));
}

function pintar() {
  const modo = mostrarModo(form);
  const r = coste(leerForm(form));
  const c = r.cuotas;
  const fuente = DATOS.fuentes.orden;
  const resumen = h('table', { class: 'tabla-guia resumen' }, h('tbody', {},
    fila(modo === 'horas' ? `Sueldo del mes (${coma(r.entrada.horasMes)} h)` : 'Sueldo bruto de un mes normal', eur(r.brutoMes)),
    fila('Seguridad Social que paga la familia', eur(c.empresa)),
    fila('Coste de un mes normal', eur(r.costeMes), 'total'),
    r.pagaMes ? fila('Coste de junio y diciembre (con paga extra)', eur(r.costeMesPaga), 'total') : null,
    fila('Lo que cobra ella un mes normal (neto)', eur(r.netoMes)),
    r.especieMes ? fila('Además, manutención y alojamiento (en especie)', eur(r.especieMes)) : null,
    fila(`Coste total del año ${DATOS.anio}`, eur(r.anual), 'total'),
    fila('Media al mes', eur(r.mediaMensual))));
  const detalle = h('table', { class: 'tabla-guia' },
    h('caption', {}, `Tramo ${r.tramo.numero}.º: retribución de ${eur(Math.max(r.retribucion, r.minima))} → base de ${eur(c.base)}`),
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Concepto'), h('th', { scope: 'col' }, 'Familia'), h('th', { scope: 'col' }, 'Rebaja'), h('th', { scope: 'col' }, 'Trabajadora'))),
    h('tbody', {}, c.lineas.map(l => h('tr', {},
      h('th', { scope: 'row' }, `${l.concepto} (${pct(l.tipoEmpresa)}${l.tipoTrabajador ? ` + ${pct(l.tipoTrabajador)}` : ''})`),
      h('td', { class: 'num' }, eur(l.empresa)), h('td', { class: 'num' }, l.bonificacion ? `− ${eur(l.bonificacion)}` : '—'), h('td', { class: 'num' }, l.trabajadora ? eur(l.trabajadora) : '—'))),
    h('tr', { class: 'total' }, h('th', { scope: 'row' }, 'Total al mes'), h('td', { class: 'num' }, eur(c.empresaBruta)), h('td', { class: 'num' }, `− ${eur(c.bonificacion)}`), h('td', { class: 'num' }, eur(c.trabajadora)))));
  const notas = [
    modo === 'horas' ? `El precio por hora incluye pagas, vacaciones, domingos y festivos (art. 4.2 del RD 126/2026): no hay paga aparte.` : `Las vacaciones (${DATOS.vacacionesDias} días naturales) se cobran con el sueldo normal: ya están en el coste del año.`,
    r.retribucion < r.minima ? `La retribución está por debajo del mínimo; la Seguridad Social cotiza al menos por ${eur(r.minima)} (art. 15.2 de la Orden PJC/297/2026).` : null,
    'Estimación: la cuota exacta la liquida la Seguridad Social con los datos del alta.',
  ].filter(Boolean);
  salida.replaceChildren(
    r.avisos.length ? h('ul', { class: 'avisos' }, r.avisos.map(t => h('li', {}, t))) : '',
    resumen, h('div', { class: 'desliza' }, detalle),
    h('ul', { class: 'mini' }, notas.map(t => h('li', {}, t))),
    h('p', { class: 'mini' }, 'Tipos y tramos: ', h('a', { href: fuente.url, rel: 'noopener' }, fuente.titulo), `, comprobados el ${DATOS.verificado.split('-').reverse().join('/')}.`));
  guardar();
}

form.addEventListener('input', pintar);
form.addEventListener('change', pintar);
form.addEventListener('submit', e => e.preventDefault());
pintar();
