import { espera, simulaError } from './fuente';

/*
 * Simula PlanTrabajoController.obtenerPlan({ registroId }): un plan de ejemplo ya normalizado, con una fase completa,
 * una parcial (fechas "Por definir") y sin logo de solución (la imagen sale de los Static Resources, que aquí no existen).
 */
export default async function obtenerPlan({ registroId }) {
    window.planesPedidos = (window.planesPedidos || []).concat(registroId);
    await espera(250);
    if (simulaError) throw { body: { message: 'Error simulado: no tienes acceso al objeto Implementación.' } };
    const a = (nombre, inicia, fin, duracion, estatus, avance, comentarios) => ({
        nombre, inicia, fin, duracion, asignado: 'Norma Christian Gómez', avance, estatus, comentarios
    });
    return {
        registroId,
        solucionTitulo: 'Implementación Evaluatest',
        cliente: 'Cuenta Prueba Expediente',
        proyecto: 'Implementación de ejemplo',
        tipoSolucion: 'Evaluatest',
        responsable: 'Norma Christian Gómez',
        contacto: 'Nombre del contacto',
        logoRecurso: null,
        logoUrl: null,
        logoExtension: null,
        avisos: [],
        fases: [
            { nombre: 'Kickoff', actividades: [a('Kick Off', '2026-10-05', '2026-10-06', 2, 'Finalizado', 1, 'Acta enviada')] },
            { nombre: 'Ejecución', actividades: [a('Configuración inicial de la cuenta', '2026-10-14', null, null, 'En proceso', 0.5, null), a('Configuración de un perfil', null, null, null, 'Sin iniciar', 0, null)] }
        ]
    };
}
