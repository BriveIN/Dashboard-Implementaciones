import { LightningElement, api } from 'lwc';

// Versión simulada de lightning-icon: dibuja en SVG los íconos utility que usa el panel
const TRAZOS = {
    'utility:arrowup': 'M12 19V5M5 12l7-7 7 7',
    'utility:arrowdown': 'M12 5v14M5 12l7 7 7-7',
    'utility:download': 'M12 4v11M7 10l5 5 5-5M5 20h14',
    'utility:refresh': 'M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7',
    'utility:close': 'M6 6l12 12M18 6L6 18',
    'utility:chevronright': 'M9 5l7 7-7 7',
    'utility:chevrondown': 'M5 9l7 7 7-7',
    'utility:forward': 'M4 12h15M13 6l6 6-6 6',
    'utility:filterList': 'M4 6h16M7 12h10M10 18h4',
    'utility:chevronup': 'M5 15l7-7 7 7',
    'utility:layers': 'M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5M3 17l9 5 9-5',
    'utility:task': 'M5 4h14v16H5zM9 12l2 2 4-4',
    'utility:event': 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4',
    'utility:edit': 'M4 20h4L19 9l-4-4L4 16v4zM14 6l4 4',
    'utility:warning': 'M12 3l10 18H2L12 3zM12 10v5M12 18v.5',
    'utility:clock': 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v5l3 2',
    'utility:user': 'M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM4 21c0-4 4-6 8-6s8 2 8 6'
};
const TAMANOS = { 'xx-small': '0.75rem', 'x-small': '0.875rem', small: '1rem', medium: '1.5rem' };

export default class Icon extends LightningElement {
    @api iconName;
    @api size = 'small';
    @api alternativeText;
    get trazo() {
        return TRAZOS[this.iconName] || '';
    }
    get estilo() {
        const t = TAMANOS[this.size] || '1rem';
        return `width:${t};height:${t}`;
    }
    get oculto() {
        return this.alternativeText ? 'false' : 'true';
    }
}
