// Versión simulada de lightning/platformShowToastEvent: deja el aviso en la consola y en window.avisosToast
export class ShowToastEvent extends CustomEvent {
    constructor(detail) {
        super('lightning__showtoast', { detail });
        (window.avisosToast = window.avisosToast || []).push(detail);
        console.info('[toast]', detail.variant, detail.title, detail.message);
    }
}
