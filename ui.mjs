// Utilidades de interfaz comunes: creación de nodos, memoria opcional del navegador y fechas.

/** h('td', {class: 'x', colspan: 2}, 'texto', otroNodo) */
export function h(tag, attrs = {}, ...hijos) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === false || v === null || v === undefined) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else if (k === 'checked') el.checked = Boolean(v);
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const hijo of hijos.flat(Infinity)) {
    if (hijo === null || hijo === undefined || hijo === false) continue;
    el.append(hijo instanceof Node ? hijo : document.createTextNode(String(hijo)));
  }
  return el;
}

/** Memoria opcional en localStorage: solo se usa si el usuario marca «Recordar en este navegador». */
export function memoria(clave) {
  const k = `empleada-hogar:${clave}`;
  return {
    hay() { try { return localStorage.getItem(k) !== null; } catch { return false; } },
    leer() { try { const t = localStorage.getItem(k); return t ? JSON.parse(t) : null; } catch { return null; } },
    guardar(valor) { try { localStorage.setItem(k, JSON.stringify(valor)); return true; } catch { return false; } },
    borrar() { try { localStorage.removeItem(k); } catch { /* sin almacenamiento */ } },
  };
}

/** Conecta la casilla «Recordar» con la memoria; devuelve una función para guardar si procede. */
export function conectarRecordar(casilla, mem, obtener, aviso) {
  casilla.checked = mem.hay();
  const guardar = () => {
    if (!casilla.checked) return;
    if (!mem.guardar(obtener()) && aviso) aviso.textContent = 'Este navegador no permite guardar datos: imprime o copia antes de cerrar.';
  };
  casilla.addEventListener('change', () => {
    if (casilla.checked) guardar();
    else mem.borrar();
    if (aviso) aviso.textContent = casilla.checked ? 'Guardado solo en este navegador. Nada se envía a ningún servidor.' : 'Datos borrados de este navegador.';
  });
  return guardar;
}

export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function fechaLarga(iso) {
  const [a, m, d] = iso.split('-').map(Number);
  const meses = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  return `${d} de ${meses[m - 1]} de ${a}`;
}

export async function copiar(texto, boton) {
  const original = boton.textContent;
  try {
    await navigator.clipboard.writeText(texto);
    boton.textContent = 'Copiado';
  } catch {
    boton.textContent = 'No se pudo copiar: selecciona el texto';
  }
  setTimeout(() => { boton.textContent = original; }, 2000);
}

export function descargar(nombre, contenido, tipo) {
  const url = URL.createObjectURL(new Blob([contenido], { type: tipo }));
  const a = h('a', { href: url, download: nombre });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** Lee un formulario: los radios dan su valor marcado y las casillas «si» o «». La casilla «recordar» no se guarda. */
export function leerForm(form) {
  const datos = {};
  for (const el of form.elements) {
    if (!el.name || el.id === 'recordar') continue;
    if (el.type === 'radio') { if (el.checked) datos[el.name] = el.value; } else if (el.type === 'checkbox') datos[el.name] = el.checked ? 'si' : '';
    else datos[el.name] = el.value.trim();
  }
  return datos;
}

/** Rellena un formulario con lo que devolvió leerForm (lo desconocido se ignora). */
export function rellenarForm(form, datos) {
  if (!datos || typeof datos !== 'object') return;
  for (const el of form.elements) {
    if (!el.name || !(el.name in datos)) continue;
    const v = datos[el.name];
    if (el.type === 'radio') el.checked = el.value === v;
    else if (el.type === 'checkbox') el.checked = v === 'si' || v === true;
    else if (el.tagName === 'SELECT') { if ([...el.options].some(o => o.value === v)) el.value = v; } else el.value = String(v ?? '').slice(0, 200);
  }
}

/** Muestra solo los campos del tipo de trabajo elegido (data-modo="horas mensual interna"). */
export function mostrarModo(form) {
  const modo = form.querySelector('input[name="modo"]:checked')?.value || 'horas';
  // Al cambiar de tipo de trabajo, si las horas siguen en el valor por defecto del tipo anterior, pon el del nuevo.
  const horas = form.elements.namedItem('horasSemana');
  const previo = form.dataset.modoPrevio;
  const defecto = m => (m === 'horas' ? '10' : '40');
  if (horas && previo && previo !== modo && horas.value.trim() === defecto(previo)) horas.value = defecto(modo);
  form.dataset.modoPrevio = modo;
  for (const el of form.querySelectorAll('[data-modo]')) el.hidden = !el.dataset.modo.split(' ').includes(modo);
  return modo;
}

export function listaAvisos(ul, avisos) {
  ul.replaceChildren(...avisos.map(t => h('li', {}, t)));
  ul.hidden = avisos.length === 0;
}
