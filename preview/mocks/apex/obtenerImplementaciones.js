import { implementaciones, espera, simulaError } from './fuente';

/*
 * Simula ImplementacionesPanelController.obtenerImplementaciones({ incluirPruebas }).
 * Igual que Apex: el corte del 2026-10-01 ya viene aplicado en los datos (registros, actividades y cambios),
 * y la cuenta de pruebas solo se devuelve si se pide.
 */
export default async function obtenerImplementaciones({ incluirPruebas }) {
    window.llamadasApex = (window.llamadasApex || 0) + 1; // para comprobar que "Actualizar" sí vuelve a llamar a Apex
    await espera(350);
    if (simulaError) throw { body: { message: 'Error simulado: no tienes acceso al objeto Implementación.' } };
    return (await implementaciones()).filter((i) => incluirPruebas || !i.esPrueba);
}
