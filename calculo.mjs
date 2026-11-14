// Cálculos de la empleada del hogar (Sistema Especial para Empleados de Hogar). Sin DOM: se prueban en Node.
// Las cifras salen de datos2026.mjs, que escribe generar.py con su fuente y su fecha de verificación.
// generar.py repite estos cálculos en Python para los ejemplos de las páginas; las pruebas comprueban que coinciden.
import { DATOS } from './datos2026.mjs';

export { DATOS };

/** Redondeo a céntimos, medio céntimo hacia arriba, sin errores de coma flotante (36,895 → 36,90; 1,005 → 1,01). */
export function r2(x) {
  return Math.round(Number((Number(x) * 100).toFixed(6))) / 100;
}

export function eur(x) {
  return `${r2(x).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: 'always' })} €`;
}

export function coma(x) {
  return String(x).replace('.', ',');
}

/** Porcentaje con dos decimales: 23,60 %. */
export function pct(x) {
  return `${Number(x).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
}

function num(v, def = 0) {
  if (v === '' || v === null || v === undefined) return def;
  if (typeof v === 'string') {
    v = v.replace(/[\s€]/g, '');
    // «1.221,50» y «1.500» son formato español; «9.55» se lee como 9,55.
    if (v.includes(',')) v = v.replace(/\./g, '').replace(',', '.');
    else if (/^\d{1,3}(\.\d{3})+$/.test(v)) v = v.replace(/\./g, '');
  }
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : def;
}

/** Tramo de cotización (art. 15.1 de la Orden de cotización) según la retribución mensual. */
export function tramoDe(retribucion, datos = DATOS) {
  const r = r2(retribucion);
  const tramos = datos.cotizacion.tramos;
  for (let i = 0; i < tramos.length; i += 1) {
    const t = tramos[i];
    if (t.hasta === null || r <= t.hasta) {
      return { numero: i + 1, desde: t.desde, hasta: t.hasta, base: r2(t.base === null ? r : t.base) };
    }
  }
  throw new Error('Tabla de tramos sin último tramo abierto');
}

/** Horas al mes a partir de las horas semanales (52 semanas / 12 meses). */
export function horasMes(horasSemana) {
  return r2(num(horasSemana) * 52 / 12);
}

/** Tipos que se aplican a la base: contingencias comunes, desempleo (según el contrato), FOGASA, MEI y AT/EP. */
export function tiposDe(contrato = 'indefinido', datos = DATOS) {
  const t = datos.cotizacion.tipos;
  const desempleo = contrato === 'temporal' ? t.desempleoTemporal : t.desempleoIndefinido;
  return [
    { id: 'cc', concepto: 'Contingencias comunes', ...t.cc, rebaja: 'cc' },
    { id: 'desempleo', concepto: contrato === 'temporal' ? 'Desempleo (contrato temporal)' : 'Desempleo', ...desempleo, rebaja: 'desempleo' },
    { id: 'fogasa', concepto: 'FOGASA', ...t.fogasa, rebaja: 'desempleo' },
    { id: 'mei', concepto: 'Mecanismo de equidad intergeneracional (MEI)', ...t.mei, rebaja: null },
    { id: 'at', concepto: 'Accidentes de trabajo y enfermedades profesionales', ...t.at, rebaja: null },
  ];
}

/**
 * Cuotas de un mes completo sobre una base de cotización.
 * opciones.reduccion: 'general' (20 % de la aportación empresarial por contingencias comunes),
 * 'familia-numerosa' (45 %, hay que pedirla) o 'ninguna'. opciones.contrato: 'indefinido' o 'temporal'.
 * La bonificación del 80 % en desempleo y FOGASA se aplica siempre (es automática).
 */
export function cuotas(base, opciones = {}, datos = DATOS) {
  const b = r2(base);
  const bon = datos.bonificaciones;
  const reduccionCC = { general: bon.general, 'familia-numerosa': bon.familiaNumerosa, ninguna: 0 }[opciones.reduccion ?? 'general'] ?? 0;
  const lineas = tiposDe(opciones.contrato, datos).map(t => {
    const empresa = r2(b * t.empresa / 100);
    const trabajadora = r2(b * t.trabajador / 100);
    const pct = t.rebaja === 'cc' ? reduccionCC : (t.rebaja === 'desempleo' ? bon.desempleoFogasa : 0);
    const bonificacion = r2(empresa * pct);
    return { id: t.id, concepto: t.concepto, tipoEmpresa: t.empresa, tipoTrabajador: t.trabajador, empresa, bonificacion, trabajadora, pctBonificacion: pct };
  });
  const suma = k => r2(lineas.reduce((s, l) => s + l[k], 0));
  const empresaBruta = suma('empresa');
  const bonificacion = suma('bonificacion');
  return { base: b, lineas, empresaBruta, bonificacion, empresa: r2(empresaBruta - bonificacion), trabajadora: suma('trabajadora') };
}

const MODOS = ['horas', 'mensual', 'interna'];

/**
 * Normaliza lo que escribe el usuario.
 * modo: 'horas' (externa por horas: el precio incluye pagas y vacaciones), 'mensual' (externa con sueldo) o 'interna'.
 */
export function normalizar(e = {}, datos = DATOS) {
  const modo = MODOS.includes(e.modo) ? e.modo : 'horas';
  const horasSemana = Math.min(60, num(e.horasSemana, modo === 'horas' ? 10 : 40));
  const proporcion = Math.min(1, horasSemana / datos.jornadaCompleta);
  const n = {
    modo,
    horasSemana,
    proporcion,
    horasMes: Math.min(400, num(e.horasMes, horasMes(horasSemana))),
    precioHora: num(e.precioHora, datos.smi.horaHogar),
    salario: num(e.salario, modo === 'horas' ? 0 : r2(datos.smi.mensual * proporcion)),
    especie: modo === 'interna' ? num(e.especie) : 0,
    prorrata: modo !== 'horas' && (e.prorrata === true || e.prorrata === 'si'),
    paga: null,
    presenciaHoras: num(e.presenciaHoras),
    presenciaPrecio: num(e.presenciaPrecio),
    otros: num(e.otros),
    reduccion: ['general', 'familia-numerosa', 'ninguna'].includes(e.reduccion) ? e.reduccion : 'general',
    contrato: e.contrato === 'temporal' ? 'temporal' : 'indefinido',
  };
  n.paga = modo === 'horas' ? 0 : num(e.paga, n.salario);
  return n;
}

function extraMes(n) {
  return r2(n.presenciaHoras * n.presenciaPrecio + n.otros);
}

/** Retribución mensual que decide el tramo: dinero + especie + pagas prorrateadas (art. 147.1 LGSS), o precio × horas. */
export function retribucionCotizable(n, datos = DATOS) {
  if (n.modo === 'horas') return r2(n.horasMes * n.precioHora + extraMes(n));
  return r2(n.salario + n.especie + n.paga * datos.pagasExtra / 12 + extraMes(n));
}

/** Retribución mínima para elegir el tramo (art. 15.2 de la Orden): SMI con pagas, en proporción a la jornada, o 9,55 € × horas. */
export function retribucionMinima(n, datos = DATOS) {
  if (n.modo === 'horas') return r2(datos.smi.horaHogar * n.horasMes);
  return r2(datos.smi.anual / 12 * n.proporcion);
}

/** Avisos de mínimos legales: SMI, salario en especie, precio por hora y jornada. */
/** Aviso cuando el periodo no es del año de las cifras cargadas. */
export function otroAnio(anio, datos = DATOS) {
  return `Las cifras son de ${datos.anio}; las de ${anio} pueden ser otras (salario mínimo, tramos y tipos). Compruébalas en la Seguridad Social.`;
}

export function avisos(n, datos = DATOS) {
  const lista = [];
  if (n.modo === 'horas') {
    if (n.precioHora + 0.004 < datos.smi.horaHogar) lista.push(`El precio por hora está por debajo del mínimo de ${eur(datos.smi.horaHogar)} por hora trabajada en ${datos.anio}.`);
    if (n.horasMes <= 0) lista.push('Indica las horas que trabaja.');
  } else {
    const smiMes = r2(datos.smi.mensual * n.proporcion);
    const smiAnual = r2(datos.smi.anual * n.proporcion);
    if (n.salario + 0.004 < smiMes) lista.push(`El sueldo en dinero (${eur(n.salario)}) no llega al salario mínimo de ${datos.anio} para ${coma(n.horasSemana)} h a la semana (${eur(smiMes)} al mes). La manutención y el alojamiento no cuentan para llegar a ese mínimo.`);
    const efectivoAnual = r2(n.salario * 12 + n.paga * datos.pagasExtra);
    if (efectivoAnual + 0.004 < smiAnual) lista.push(`Lo que cobra en dinero al año, con las dos pagas (${eur(efectivoAnual)}), no llega al mínimo anual de ${eur(smiAnual)}.`);
    if (n.especie > 0) {
      const maximo = r2((n.salario + n.especie) * datos.especieMax);
      if (n.especie > maximo + 0.004) lista.push(`La manutención y el alojamiento (${eur(n.especie)}) superan el ${Math.round(datos.especieMax * 100)} % del salario total (${eur(maximo)} como máximo).`);
    }
  }
  if (n.horasSemana > datos.jornadaCompleta) lista.push(`La jornada máxima es de ${datos.jornadaCompleta} horas semanales de trabajo efectivo; el tiempo de presencia va aparte.`);
  return lista;
}

/** Base de cotización del mes: la indicada por el usuario o la del tramo (con el mínimo del art. 15.2). */
export function baseDe(n, datos = DATOS, baseManual = 0) {
  const retribucion = retribucionCotizable(n, datos);
  const minima = retribucionMinima(n, datos);
  const tramo = tramoDe(Math.max(retribucion, minima), datos);
  return { retribucion, minima, tramo, base: baseManual > 0 ? r2(baseManual) : tramo.base, manual: baseManual > 0 };
}

/** Coste de un mes normal, de un mes con paga extra y del año completo. */
export function coste(entrada, datos = DATOS) {
  const n = normalizar(entrada, datos);
  const b = baseDe(n, datos);
  const c = cuotas(b.base, { reduccion: n.reduccion, contrato: n.contrato }, datos);
  const extra = extraMes(n);
  let brutoMes; let pagaMes = 0;
  if (n.modo === 'horas') brutoMes = r2(n.horasMes * n.precioHora + extra);
  else if (n.prorrata) brutoMes = r2(n.salario + r2(n.paga * datos.pagasExtra / 12) + extra);
  else { brutoMes = r2(n.salario + extra); pagaMes = n.paga; }
  const anualSalario = r2(brutoMes * 12 + pagaMes * datos.pagasExtra);
  const anualCuotaEmpresa = r2(c.empresa * 12);
  const anual = r2(anualSalario + anualCuotaEmpresa);
  return {
    entrada: n, retribucion: b.retribucion, minima: b.minima, tramo: b.tramo, cuotas: c, brutoMes, pagaMes,
    netoMes: r2(brutoMes - c.trabajadora), netoMesPaga: r2(brutoMes + pagaMes - c.trabajadora),
    costeMes: r2(brutoMes + c.empresa), costeMesPaga: r2(brutoMes + pagaMes + c.empresa),
    anualSalario, anualCuotaEmpresa, anualCuotaTrabajadora: r2(c.trabajadora * 12), anual, mediaMensual: r2(anual / 12),
    especieMes: n.especie, avisos: avisos(n, datos),
  };
}

export const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

export function periodoValido(p) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p));
}

export function nombreMes(periodo) {
  const [a, m] = String(periodo).split('-').map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export function diasDelMes(periodo) {
  const [a, m] = String(periodo).split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

export function mesSiguiente(periodo) {
  let [a, m] = String(periodo).split('-').map(Number);
  m += 1;
  if (m > 12) { m = 1; a += 1; }
  return `${a}-${String(m).padStart(2, '0')}`;
}

/**
 * Recibo de salarios de un mes (art. 8.6 RD 1620/2011). Las pagas sin prorratear se cobran en junio y diciembre.
 * dias: días trabajados si no es el mes entero (el sueldo mensual se reparte por días; la cuota no se toca: avisa).
 * baseManual: la base que cobra la Seguridad Social, si se conoce. Un hogar no retiene IRPF.
 */
export function recibo(entrada, datos = DATOS) {
  const n = normalizar(entrada, datos);
  const periodo = periodoValido(entrada.periodo) ? entrada.periodo : `${datos.anio}-01`;
  const mes = Number(periodo.slice(5));
  const diasMes = diasDelMes(periodo);
  const dias = n.modo !== 'horas' && num(entrada.dias) > 0 ? Math.min(diasMes, Math.max(1, Math.round(num(entrada.dias)))) : diasMes;
  const parcial = dias < diasMes;
  const f = dias / diasMes;
  const devengos = [];
  if (n.modo === 'horas') {
    devengos.push({ concepto: `Horas trabajadas: ${coma(n.horasMes)} h × ${eur(n.precioHora)}`, importe: r2(n.horasMes * n.precioHora), especie: false });
  } else {
    devengos.push({ concepto: parcial ? `Salario base (${dias} de ${diasMes} días)` : 'Salario base', importe: r2(n.salario * f), especie: false });
    if (n.especie > 0) devengos.push({ concepto: 'Salario en especie: manutención y alojamiento', importe: r2(n.especie * f), especie: true });
    if (n.prorrata) devengos.push({ concepto: 'Parte proporcional de las pagas extra', importe: r2(n.paga * datos.pagasExtra / 12 * f), especie: false });
    else if (datos.mesesPaga.includes(mes)) devengos.push({ concepto: `Paga extra de ${MESES[mes - 1]}`, importe: r2(num(entrada.pagaImporte, n.paga)), especie: false });
  }
  if (n.presenciaHoras > 0) devengos.push({ concepto: `Horas de presencia: ${coma(n.presenciaHoras)} h × ${eur(n.presenciaPrecio)}`, importe: r2(n.presenciaHoras * n.presenciaPrecio), especie: false });
  if (n.otros > 0) devengos.push({ concepto: String(entrada.otrosConcepto || 'Otros conceptos').trim().slice(0, 80) || 'Otros conceptos', importe: r2(n.otros), especie: false });
  const total = r2(devengos.reduce((s, d) => s + d.importe, 0));
  const especie = r2(devengos.filter(d => d.especie).reduce((s, d) => s + d.importe, 0));
  const b = baseDe(n, datos, num(entrada.baseManual));
  const c = cuotas(b.base, { reduccion: n.reduccion, contrato: n.contrato }, datos);
  const deducciones = c.lineas.filter(l => l.trabajadora > 0).map(l => ({ concepto: `${l.concepto} (${pct(l.tipoTrabajador)})`, importe: l.trabajadora }));
  const totalDeducciones = r2(deducciones.reduce((s, d) => s + d.importe, 0));
  const lista = avisos(n, datos);
  const anioRecibo = Number(periodo.slice(0, 4));
  if (anioRecibo !== datos.anio) lista.push(otroAnio(anioRecibo, datos));
  if (parcial) lista.push('Mes incompleto: la cuota que se muestra es la de un mes entero. La de este mes la calcula la Seguridad Social según los días de alta: cópiala de tu recibo de Import@ss.');
  return {
    periodo, nombreMes: nombreMes(periodo), dias, diasMes, parcial, entrada: n, devengos, total, especie, deducciones, totalDeducciones,
    liquido: r2(total - especie - totalDeducciones), tramo: b.tramo, base: b.base, baseManual: b.manual, cuotas: c, avisos: lista,
  };
}

/** Datos del mes siguiente: mismo contrato, sin lo que solo vale para un mes (presencia, otros, días, importe de la paga). */
export function prepararSiguiente(datosRecibo) {
  const siguiente = { ...datosRecibo, periodo: mesSiguiente(periodoValido(datosRecibo.periodo) ? datosRecibo.periodo : `${DATOS.anio}-01`) };
  for (const k of ['dias', 'presenciaHoras', 'otros', 'otrosConcepto', 'pagaImporte']) siguiente[k] = '';
  return siguiente;
}

export function fechaUTC(iso) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso))) return null;
  const [a, m, d] = iso.split('-').map(Number);
  const t = Date.UTC(a, m - 1, d);
  const f = new Date(t);
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d ? t : null;
}

const DIA = 86400000;

/** Días entre dos fechas, ambas incluidas. */
export function diasEntre(desde, hasta) {
  return Math.round((hasta - desde) / DIA) + 1;
}

export const CAUSAS = ['causas-hogar', 'baja-voluntaria', 'fin-temporal', 'otra'];

/**
 * Finiquito orientativo, en bruto.
 * causa 'causas-hogar': art. 11.2 RD 1620/2011 (12 días por año con tope de 6 mensualidades y preaviso de 20 o 7 días).
 */
export function finiquito(entrada, datos = DATOS) {
  const n = normalizar(entrada, datos);
  const inicio = fechaUTC(entrada.inicio);
  const fin = fechaUTC(entrada.fin);
  const errores = [];
  if (inicio === null) errores.push('Indica la fecha de inicio de la relación.');
  if (fin === null) errores.push('Indica el último día de trabajo.');
  if (inicio !== null && fin !== null && fin < inicio) errores.push('El último día no puede ser anterior al inicio.');
  if (errores.length) return { errores, lineas: [], total: 0, avisos: [] };
  const finD = new Date(fin);
  const anio = finD.getUTCFullYear();
  const mes = finD.getUTCMonth() + 1;
  const diasMes = diasDelMes(`${anio}-${String(mes).padStart(2, '0')}`);
  const diasUltimoMes = diasEntre(Math.max(inicio, Date.UTC(anio, mes - 1, 1)), fin);
  const diasAnio = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0 ? 366 : 365;
  const diasEnAnio = diasEntre(Math.max(inicio, Date.UTC(anio, 0, 1)), fin);
  const antiguedadDias = diasEntre(inicio, fin);
  const lineas = [];
  const lista = avisos(n, datos);
  if (anio !== datos.anio) lista.push(otroAnio(anio, datos));
  const anualDinero = n.modo === 'horas' ? r2(n.horasMes * n.precioHora * 12) : r2(n.salario * 12 + n.paga * datos.pagasExtra);
  const anualTotal = r2(anualDinero + n.especie * 12);
  const diario = anualTotal / diasAnio;
  if (entrada.mesPagado !== true && entrada.mesPagado !== 'si') {
    if (n.modo === 'horas') {
      const horas = num(entrada.horasPendientes);
      if (horas > 0) lineas.push({ concepto: `Horas trabajadas sin pagar: ${coma(horas)} h × ${eur(n.precioHora)}`, importe: r2(horas * n.precioHora) });
    } else {
      lineas.push({ concepto: `Salario de ${MESES[mes - 1]}: ${diasUltimoMes} de ${diasMes} días`, importe: r2(n.salario * diasUltimoMes / diasMes) });
      if (n.prorrata) lineas.push({ concepto: `Parte proporcional de las pagas extra de ${MESES[mes - 1]}: ${diasUltimoMes} de ${diasMes} días`, importe: r2(n.paga * datos.pagasExtra / 12 * diasUltimoMes / diasMes) });
    }
  }
  if (n.modo !== 'horas' && !n.prorrata && entrada.pagaPagada !== true && entrada.pagaPagada !== 'si') {
    // Cada paga se gana en su semestre, en proporción al tiempo trabajado (art. 8.4 RD 1620/2011).
    const inicioSemestre = Date.UTC(anio, mes <= 6 ? 0 : 6, 1);
    const diasSemestre = diasEntre(inicioSemestre, Date.UTC(anio, mes <= 6 ? 6 : 12, 0));
    const ganados = diasEntre(Math.max(inicio, inicioSemestre), fin);
    lineas.push({ concepto: `Parte de la paga extra de ${mes <= 6 ? 'junio' : 'diciembre'}: ${ganados} de ${diasSemestre} días`, importe: r2(n.paga * ganados / diasSemestre) });
  }
  if (n.modo !== 'horas') {
    const generadas = datos.vacacionesDias * diasEnAnio / diasAnio;
    const pendientes = Math.max(0, r2(generadas - num(entrada.vacacionesDisfrutadas)));
    if (pendientes > 0) lineas.push({ concepto: `Vacaciones no disfrutadas: ${coma(pendientes)} días`, importe: r2(pendientes * anualDinero / diasAnio) });
  }
  const causa = CAUSAS.includes(entrada.causa) ? entrada.causa : 'causas-hogar';
  let preavisoDebido = 0;
  if (causa === 'causas-hogar') {
    const ext = datos.extincion;
    const dias = ext.diasPorAnio * antiguedadDias / diasAnio;
    const tope = ext.topeMensualidades * anualTotal / 12;
    lineas.push({ concepto: `Indemnización: ${ext.diasPorAnio} días por año trabajado (${coma(r2(dias))} días)`, importe: r2(Math.min(dias * diario, tope)) });
    preavisoDebido = antiguedadDias > diasAnio ? ext.preavisoMasDeUnAnio : ext.preavisoHastaUnAnio;
    const dado = Math.min(preavisoDebido, num(entrada.preavisoDado));
    if (dado < preavisoDebido) lineas.push({ concepto: `Preaviso no dado: ${preavisoDebido - dado} días de salario`, importe: r2((preavisoDebido - dado) * diario) });
    if (n.modo === 'interna') lista.push('A una interna no se le puede comunicar la extinción entre las 17:00 y las 8:00 del día siguiente, salvo falta muy grave (art. 11.4 RD 1620/2011).');
  } else if (causa === 'fin-temporal') {
    lista.push('Al acabar un contrato temporal puede corresponder una indemnización (art. 49.1.c del Estatuto de los Trabajadores). No la calculamos: compruébala.');
  } else if (causa === 'otra') {
    lista.push('Para un despido disciplinario o cualquier otra causa no calculamos indemnización: consulta a un profesional.');
  }
  return { errores: [], causa, antiguedadDias, diasUltimoMes, preavisoDebido, diario: r2(diario), lineas, total: r2(lineas.reduce((s, l) => s + l.importe, 0)), avisos: lista };
}
