import { LightningElement, api } from 'lwc';

// Versión simulada de lightning-button para el visor local
export default class Button extends LightningElement {
    @api label;
    @api iconName;
    @api variant = 'neutral';
    @api disabled = false;
    get clase() {
        return `boton boton_${this.variant}`;
    }
}
