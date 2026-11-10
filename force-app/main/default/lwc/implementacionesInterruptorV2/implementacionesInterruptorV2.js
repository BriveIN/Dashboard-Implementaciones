import { LightningElement, api } from "lwc";

/*
 * Interruptor con el mismo aspecto que el de Panel / Dashboard. No cambia nada por sí mismo: avisa al panel
 * (evento "alternar", con el estado que se pide en detail.activo) y el panel decide.
 */
export default class ImplementacionesInterruptorV2 extends LightningElement {
  @api etiqueta = "";
  @api estado = "";
  @api ayuda = "";
  @api activo = false;

  get ariaActivo() {
    return this.activo ? "true" : "false";
  }

  alternar() {
    this.dispatchEvent(new CustomEvent("alternar", { detail: { activo: !this.activo } }));
  }
}
