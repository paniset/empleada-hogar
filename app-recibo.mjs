// Generador del recibo de salarios mensual (art. 8.6 RD 1620/2011).
import { recibo, prepararSiguiente, eur, DATOS } from './calculo.mjs';
import { h, memoria, conectarRecordar, leerForm, rellenarForm, mostrarModo, listaAvisos, hoyISO, fechaLarga } from './ui.mjs';

const form = document.getElementById('form');
const hojas = document.getElementById('hojas');
const ul = document.getElementById('avisos');
const aviso = document.getElementById('aviso-memoria');
const mem = memoria('recibo');
const guardado = mem.leer();
if (guardado) rellenarForm(form, guardado);
if (!form.periodo.value) form.periodo.value = hoyISO().slice(0, 7);
const guardar = conectarRecordar(document.getElementById('recordar'), mem, () => leerForm(form), aviso);

const o = v => v || '—';

function tabla(titulo, filas, total, etiquetaTotal) {
  return h('table', { class: 'tabla-recibo' },
    h('thead', {}, h('tr', {}, h('th', { scope: 'col' }, titulo), h('th', { scope: 'col', class: 'num' }, 'Importe'))),
    h('tbody', {}, filas.map(f => h('tr', {}, h('td', {}, f.concepto), h('td', { class: 'num' }, eur(f.importe))))),
    h('tfoot', {}, h('tr', {}, h('th', { scope: 'row' }, etiquetaTotal), h('td', { class: 'num' }, eur(total)))));
}

function pintar() {
  mostrarModo(form);
  const d = leerForm(form);
  const r = recibo(d);
  listaAvisos(ul, r.avisos);
  const c = r.cuotas;
  hojas.replaceChildren(h('article', { class: 'hoja recibo', 'aria-label': `Recibo de ${r.nombreMes}` },
    h('header', { class: 'hoja-cab' }, h('h3', {}, 'Recibo individual justificativo del pago de salarios'),
      h('p', {}, h('span', {}, `Periodo: ${r.nombreMes}`), h('span', {}, `${r.dias} días`))),
    h('div', { class: 'partes' },
      h('dl', {}, h('dt', {}, 'Persona empleadora'), h('dd', {}, o(d.empleador)), h('dt', {}, 'NIF'), h('dd', {}, o(d.empleadorNif)),
        h('dt', {}, 'Código de cuenta de cotización'), h('dd', {}, o(d.ccc)), h('dt', {}, 'Domicilio'), h('dd', {}, o(d.domicilio))),
      h('dl', {}, h('dt', {}, 'Persona trabajadora'), h('dd', {}, o(d.trabajadora)), h('dt', {}, 'NIF / NIE'), h('dd', {}, o(d.trabajadoraNif)),
        h('dt', {}, 'Afiliación a la Seguridad Social'), h('dd', {}, o(d.naf)), h('dt', {}, 'Antigüedad'), h('dd', {}, d.antiguedad ? fechaLarga(d.antiguedad) : '—'))),
    tabla('Devengos', r.devengos, r.total, 'Total devengado'),
    tabla('Deducciones: Seguridad Social de la trabajadora', r.deducciones, r.totalDeducciones, 'Total a deducir'),
    h('p', { class: 'liquido' }, h('span', {}, r.especie ? 'Líquido a percibir en dinero (devengado − especie − deducciones)' : 'Líquido a percibir'), h('strong', {}, eur(r.liquido))),
    h('p', { class: 'nota-hoja' }, `Base de cotización: ${eur(r.base)}${r.baseManual ? ' (indicada por la persona empleadora)' : ` (tramo ${r.tramo.numero}.º)`}. `
      + `Aportación de la persona empleadora a la Seguridad Social: ${eur(c.empresa)} (no se descuenta del sueldo). `
      + 'Sin retención de IRPF: un hogar particular no es retenedor.'),
    h('div', { class: 'firmas' }, h('p', {}, 'Firma de la persona empleadora'), h('p', {}, 'Recibí. Fecha y firma de la persona trabajadora')),
    h('p', { class: 'pie-hoja' }, `Orientativo, con las cifras oficiales de ${DATOS.anio}. No es asesoramiento laboral.`)));
  guardar();
}

form.addEventListener('input', pintar);
form.addEventListener('change', pintar);
form.addEventListener('submit', e => e.preventDefault());
document.getElementById('imprimir').addEventListener('click', () => window.print());
document.getElementById('siguiente').addEventListener('click', () => {
  rellenarForm(form, prepararSiguiente(leerForm(form)));
  pintar();
  aviso.textContent = `Preparado el recibo de ${form.periodo.value.split('-').reverse().join('/')}: revisa las horas y lo que cambie este mes.`;
});
pintar();
