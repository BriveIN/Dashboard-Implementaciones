import { LightningElement, api } from "lwc";

/*
 * Tabla ordenable de la vista Dashboard. No calcula nada: el panel le pasa la tabla ya armada (encabezados, filas visibles,
 * paginación) y ella avisa lo que el usuario pide. Eventos: ordenar { tabla, campo } · mas { tabla } · cerrar
 */
export default class ImplementacionesDashTablaV2 extends LightningElement {
  @api titulo;
  @api tabla;
  @api textoVacio = "Sin registros.";
  @api cerrable = false;

  get claseSeccion() {
    return this.cerrable ? "seccion seccion_abierta" : "seccion";
  }

  ordenar(e) {
    const { campo } = e.currentTarget.dataset;
    this.dispatchEvent(new CustomEvent("ordenar", { detail: { tabla: this.tabla.clave, campo } }));
  }

  mostrarMas() {
    this.dispatchEvent(new CustomEvent("mas", { detail: { tabla: this.tabla.clave } }));
  }

  cerrar() {
    this.dispatchEvent(new CustomEvent("cerrar"));
  }
}
