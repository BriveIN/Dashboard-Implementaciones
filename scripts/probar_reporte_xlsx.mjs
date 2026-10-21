// Genera un .xlsx de reportes con el mismo módulo que usa el LWC. Uso: node scripts/probar_reporte_xlsx.mjs <salida.xlsx> [filas]
import { writeFileSync } from 'node:fs';
import { generarXlsxTabla } from '../force-app/main/default/lwc/planTrabajoXlsx/planTrabajoXlsx.js';

const [salida, n = '12'] = process.argv.slice(2);
const columnas = [
    { encabezado: 'Implementación: Id.', tipo: 'texto' },
    { encabezado: 'Implementación: Fecha de creación', tipo: 'fecha' },
    { encabezado: 'Horas Contratadas', tipo: 'numero' },
    { encabezado: 'Porcentaje', tipo: 'porcentaje' },
    { encabezado: 'Comentarios Sesión final', tipo: 'texto' }
];
const filas = Array.from({ length: Number(n) }, (_, i) => [
    `a0N${String(i).padStart(12, '0')}`, i % 5 === 0 ? null : `2026-0${1 + (i % 9)}-1${i % 9}`, i % 3 === 0 ? null : i * 1.5, i % 4 === 0 ? 0.25 : null,
    i % 2 ? `Comentario con acentos áéíóú, "comillas" & <signos>\nsegunda línea ${i}` : null
]);
writeFileSync(salida, generarXlsxTabla([
    { nombre: 'Por fecha creación', columnas, filas },
    { nombre: 'Acta de entrega', columnas, filas: filas.slice(0, 2) }
]));
console.log(salida, filas.length, 'filas');
