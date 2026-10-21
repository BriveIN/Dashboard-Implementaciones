// Arma el .xlsx de un reporte a partir de la respuesta JSON de Apex (la misma que recibe el LWC), con la presentación
// de las guías (HOJAS del LWC). Uso: node scripts/reporte_desde_json.mjs <respuesta.json> <carpeta_salida> <implementaciones|proyectos>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { generarXlsxTabla } from '../force-app/main/default/lwc/planTrabajoXlsx/planTrabajoXlsx.js';

const [entrada, carpeta, tipo] = process.argv.slice(2);
const fuente = readFileSync(new URL('../force-app/main/default/lwc/implementacionesDescargaV2/implementacionesDescargaV2.js', import.meta.url), 'utf8');
const HOJAS = new Function(`return (${fuente.match(/const HOJAS = (\{[\s\S]*?\n\});/)[1]});`)();
const r = JSON.parse(readFileSync(entrada, 'utf8'));
mkdirSync(carpeta, { recursive: true });
writeFileSync(`${carpeta}/${r.archivo}`, generarXlsxTabla(r.hojas.map((h) => ({ ...(HOJAS[tipo][h.nombre] || {}), nombre: h.nombre, columnas: h.columnas, filas: h.filas }))));
console.log(r.archivo, r.hojas.map((h) => `${h.nombre}: ${h.filas.length}`).join(' | '));
