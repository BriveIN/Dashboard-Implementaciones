import { LightningElement, api } from 'lwc';

// Versión simulada de lightning-combobox: un <select> nativo con el mismo evento change
export default class Combobox extends LightningElement {
    @api label;
    @api value;
    @api options = [];
    @api variant;
    get opciones() {
        return (this.options || []).map((o) => ({ ...o, seleccionada: o.value === this.value }));
    }
    cambiar(e) {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent('change', { detail: { value: e.target.value } }));
    }
}
