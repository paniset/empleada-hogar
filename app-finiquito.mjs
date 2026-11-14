// Finiquito orientativo de la empleada del hogar (art. 11 RD 1620/2011).
import { finiquito, eur, DATOS } from './calculo.mjs';
import { h, memoria, conectarRecordar, leerForm, rellenarForm, mostrarModo, listaAvisos, fechaLarga, hoyISO } from './ui.mjs';

const form = document.getElementById('form');
const hojas = document.getElementById('hojas');
const ul = document.getElementById('avisos');
const mem = memoria('finiquito');
const guardado = mem.leer();
if (guardado) rellenarForm(form, guardado);
if (!form.fin.value) form.fin.value = hoyISO();
const guardar = conectarRecordar(document.getElementById('recordar'), mem, () => leerForm(form), document.getElementById('aviso-memoria'));

const CAUSA = {
  'causas-hogar': 'Extinción por una causa del art. 11.2 del RD 1620/2011',
  'baja-voluntaria': 'Baja voluntaria de la persona trabajadora',
  'fin-temporal': 'Fin del contrato temporal',
  otra: 'Otra causa',
};

function pintar() {
  mostrarModo(form);
  const d = leerForm(form);
  const r = finiquito(d);
  if (r.errores.length) {
    listaAvisos(ul, r.errores);
    hojas.replaceChildren(h('p', { class: 'vacio' }, 'Indica las fechas para ver el finiquito.'));
    guardar();
    return;
  }
  listaAvisos(ul, r.avisos);
  hojas.replaceChildren(h('article', { class: 'hoja recibo', 'aria-label': 'Finiquito' },
    h('header', { class: 'hoja-cab' }, h('h3', {}, 'Liquidación y finiquito'),
      h('p', {}, h('span', {}, CAUSA[r.causa]), h('span', {}, `${r.antiguedadDias} días de antigüedad`))),
    h('p', {}, `${d.empleador || 'La persona empleadora'} y ${d.trabajadora || 'la persona trabajadora'}: relación del ${fechaLarga(d.inicio)} al ${fechaLarga(d.fin)}.`),
    h('table', { class: 'tabla-recibo' },
      h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, 'Concepto'), h('th', { scope: 'col', class: 'num' }, 'Importe bruto'))),
      h('tbody', {}, r.lineas.length
        ? r.lineas.map(l => h('tr', {}, h('td', {}, l.concepto), h('td', { class: 'num' }, eur(l.importe))))
        : h('tr', {}, h('td', { colspan: 2 }, 'No hay importes pendientes.'))),
      h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, 'Total bruto'), h('td', { class: 'num' }, eur(r.total))))),
    r.causa === 'causas-hogar'
      ? h('p', { class: 'nota-hoja' }, `Salario diario de referencia: ${eur(r.diario)}. La extinción se comunica por escrito, con su causa, y la indemnización se pone a disposición a la vez. Preaviso mínimo: ${r.preavisoDebido} días.`)
      : null,
    h('p', { class: 'nota-hoja' }, 'De los importes salariales se descuenta la Seguridad Social de la trabajadora; las vacaciones pagadas al terminar se cotizan aparte (art. 147.1 LGSS).'),
    h('div', { class: 'firmas' }, h('p', {}, 'Firma de la persona empleadora'), h('p', {}, 'Recibí. Fecha y firma de la persona trabajadora')),
    h('p', { class: 'pie-hoja' }, `Orientativo, con las reglas del ${DATOS.fuentes.rd1620.titulo}. No es asesoramiento laboral.`)));
  guardar();
}

form.addEventListener('input', pintar);
form.addEventListener('change', pintar);
form.addEventListener('submit', e => e.preventDefault());
document.getElementById('imprimir').addEventListener('click', () => window.print());
pintar();
