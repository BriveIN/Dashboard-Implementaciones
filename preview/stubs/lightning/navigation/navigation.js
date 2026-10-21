// Versión simulada de lightning/navigation: avisa a la página en vez de navegar
const Navigate = Symbol('Navigate');
const GenerateUrl = Symbol('GenerateUrl');

export const NavigationMixin = (Base) =>
    class extends Base {
        [Navigate](pageReference) {
            window.dispatchEvent(new CustomEvent('navegacion-simulada', { detail: pageReference }));
        }
        [GenerateUrl](pageReference) {
            return Promise.resolve(`#${pageReference?.attributes?.recordId || ''}`);
        }
    };
NavigationMixin.Navigate = Navigate;
NavigationMixin.GenerateUrl = GenerateUrl;
