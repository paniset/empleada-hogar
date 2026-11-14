// Botón «Me interesaría un servicio así». No cobra, no pide datos y no envía nada.
// El proyecto no tiene todavía un contador de clics sin datos personales. Cuando exista, pon su URL en MEDIDOR
// y añade ese origen a connect-src en la CSP de generar.py: entonces se enviará solo el nombre del botón.
export const MEDIDOR = null;

export const GRACIAS = 'Gracias. Este servicio todavía no existe: estamos comprobando si interesa antes de hacerlo. '
  + 'No te hemos pedido ningún dato ni cobrado nada. Si sale, lo anunciaremos en esta página.';

export function conectarInteres(raiz = document) {
  for (const boton of raiz.querySelectorAll('[data-interes]')) {
    const salida = raiz.getElementById ? raiz.getElementById(boton.getAttribute('aria-controls')) : null;
    boton.addEventListener('click', () => {
      if (salida) { salida.hidden = false; salida.textContent = GRACIAS; }
      if (MEDIDOR && navigator.sendBeacon) {
        try { navigator.sendBeacon(`${MEDIDOR}?e=${encodeURIComponent(boton.dataset.interes)}`); } catch { /* sin medidor */ }
      }
    });
  }
}

if (typeof document !== 'undefined') conectarInteres();
