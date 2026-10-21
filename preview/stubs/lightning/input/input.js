import { LightningElement, api } from 'lwc';

// Versión simulada de lightning-input (texto y búsqueda); dispara change en cada tecla, igual que el original
export default class Input extends LightningElement {
    @api label;
    @api type = 'text';
    @api value;
    @api placeholder;
    @api min;
    @api variant;
    get ocultarEtiqueta() {
        return this.variant === 'label-hidden';
    }
    escribir(e) {
        this.value = e.target.value;
        this.dispatchEvent(new CustomEvent('change', { detail: { value: e.target.value } }));
    }
}
