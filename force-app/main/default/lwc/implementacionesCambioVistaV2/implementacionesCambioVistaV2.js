import { LightningElement, api } from "lwc";
import PERMISO_LIDER from "@salesforce/customPermission/Panel_Implementaciones_Lider";

/*
 * Interruptor Panel / Dashboard. Solo se muestra con el permiso personalizado Panel_Implementaciones_Lider.
 * No cambia nada por sí mismo: avisa al panel (evento "cambio") y el panel decide qué vista pinta.
 */
export default class ImplementacionesCambioVistaV2 extends LightningElement {
  // true = vista Dashboard; false = vista Panel
  @api esDashboard = false;

  get visible() {
    return PERMISO_LIDER === true;
  }

  get ariaActivo() {
    return this.esDashboard ? "true" : "false";
  }

  get textoVista() {
    return this.esDashboard ? "Dashboard" : "Panel";
  }

  cambiar() {
    this.dispatchEvent(new CustomEvent("cambio", { detail: { dashboard: !this.esDashboard } }));
  }
}
