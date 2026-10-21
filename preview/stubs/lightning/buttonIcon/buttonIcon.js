import { LightningElement, api } from 'lwc';

// Versión simulada de lightning-button-icon para el visor local
export default class ButtonIcon extends LightningElement {
    @api iconName;
    @api alternativeText;
    @api title;
    @api disabled = false;
}
