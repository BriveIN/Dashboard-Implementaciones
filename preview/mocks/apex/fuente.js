import { IMPLEMENTACIONES } from '../datos';

/*
 * Origen de los datos del visor local.
 *   por defecto       -> datos ficticios de datos.js
 *   ?datos=reales     -> preview/datos-reales.json (lo genera scripts/datos_reales.py; no se versiona)
 *   ?error=1          -> simula un fallo de Apex
 */
const parametros = new URLSearchParams(window.location.search);
export const usaReales = parametros.get('datos') === 'reales';
export const simulaError = parametros.has('error');

let cache;
export async function implementaciones() {
    if (!usaReales) return IMPLEMENTACIONES;
    if (!cache) {
        const r = await fetch('datos-reales.json', { cache: 'no-store' });
        if (!r.ok) throw { body: { message: 'No existe preview/datos-reales.json: corre python3 scripts/datos_reales.py' } };
        cache = await r.json();
    }
    return cache;
}

export const espera = (ms) => new Promise((r) => setTimeout(r, ms));
