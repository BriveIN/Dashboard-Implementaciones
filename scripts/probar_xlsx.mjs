// Genera .xlsx de prueba con el mismo módulo que usa el LWC. Uso: node scripts/probar_xlsx.mjs <carpeta_salida>
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { generarXlsx, nombreArchivo } from '../force-app/main/default/lwc/planTrabajoXlsx/planTrabajoXlsx.js';

const salida = process.argv[2];
mkdirSync(salida, { recursive: true });
const recursos = '../force-app/main/default/staticresources/';
const leer = (n) => new Uint8Array(readFileSync(new URL(recursos + n, import.meta.url)));
const brive = { bytes: leer('PlanTrabajo_Logo_Brive.png'), ext: 'png' };
const act = (nombre, duracion, inicia, fin, asignado, conCliente, avance, estatus, comentarios) => ({ nombre, duracion, inicia, fin, asignado, conCliente, avance, estatus, comentarios });
const B = 'Brivé Soluciones | Ana Pérez';
const BC = 'Brivé Soluciones | Ana Pérez + Empresa Ejemplo';
const C = 'Empresa Ejemplo | Luis Gómez (RH)';
const base = { cliente: 'Empresa Ejemplo S.A. de C.V.', nombreCorto: 'Empresa Ejemplo', proyecto: 'Evaluación 360° 2026 – Gerencias', tipo: 'Implementación', solucion: 'Evou', responsable: 'Ana Pérez', contacto: 'Luis Gómez (RH)', participantes: 30, horasContratadas: 40, estadoProyecto: 'Kick Off', fechaGeneracion: '2026-10-08' };
const fase = (nombre, actividades) => ({ nombre, actividades });

const casos = {
    // igual al ejemplo de la plantilla nueva (Evou / Implementación)
    evou: {
        ...base,
        fases: [
            fase('Kickoff', [act('Sesión kick off', 1, '2026-06-01', null, BC, true, 1, 'Finalizado', null), act('Envío y aprobación del plan de trabajo', 1, '2026-06-02', null, BC, true, 1, 'Finalizado', 'Evidencia: liga al plan aprobado')]),
            fase('Planeación', [act('Solicitud de insumos al cliente', 1, '2026-06-03', null, B, false, 1, 'Finalizado', null), act('Envío de insumos por el cliente', 5, '2026-06-04', null, C, true, 0.5, 'En proceso', 'Insumos recibidos: matriz de colaboradores'), act('Creación de perfiles', null, null, null, B, false, 0, 'Sin iniciar', null)]),
            fase('Ejecución', [act('Aplicación 360°', 12, '2026-06-12', null, B, false, 0, 'Sin iniciar', null), act('Capacitación / taller especializado (sesión)', 1, '2026-07-03', null, BC, true, 0, 'Sin iniciar', 'Taller de sensibilización')]),
            fase('Análisis', [act('Resultados', 2, null, null, B, false, 0, 'Sin iniciar', null)]),
            fase('Entrega final', [act('Sesión final con el cliente', 1, null, null, BC, true, 0, 'Sin iniciar', null), act('Visto bueno y firma del acta de entrega', 3, '2026-06-20', '2026-06-24', C, true, 0, 'Sin iniciar', null)])
        ]
    },
    // Ejecución y Análisis sin nada marcado
    soloFijas: { ...base, solucion: 'Evaluatest I.A.', fases: ['Kickoff', 'Planeación', 'Ejecución', 'Análisis', 'Entrega final'].map((n) => fase(n, n === 'Ejecución' || n === 'Análisis' ? [] : [act(`Actividad de ${n}`, null, null, null, B, false, 0, 'Sin iniciar', null)])) },
    // sin datos de la ficha ni actividades
    vacio: { ...base, participantes: null, horasContratadas: null, contacto: null, fases: [] }
};
const evou = { brive, solucion: { bytes: leer('PlanTrabajo_Logo_Evou.jpg'), ext: 'jpeg' } };
const eva = { brive, solucion: { bytes: leer('PlanTrabajo_Logo_Evaluatest.png'), ext: 'png' } };
for (const [k, plan] of Object.entries(casos)) {
    const bytes = generarXlsx(plan, k === 'evou' ? evou : k === 'soloFijas' ? eva : { brive, solucion: null });
    writeFileSync(`${salida}/${k}.xlsx`, bytes);
    console.log(k, bytes.length, 'bytes', nombreArchivo(plan.cliente, plan.solucion, plan.fechaGeneracion));
}
