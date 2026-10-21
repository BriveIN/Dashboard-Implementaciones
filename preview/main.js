import { createElement } from 'lwc';
import ImplementacionesPanel from 'c/implementacionesPanel';

// la franja avisa de dónde salen los datos
if (new URLSearchParams(window.location.search).get('datos') === 'reales') {
    document.querySelector('.barra_local').innerHTML =
        '<strong>Prototipo local</strong> · datos reales de Brive (copia de solo lectura en preview/datos-reales.json)';
}

const panel = createElement('c-implementaciones-panel', { is: ImplementacionesPanel });
document.querySelector('#app').appendChild(panel);

// la navegación de Salesforce no existe en local: se muestra un aviso con el registro que se abriría
const aviso = document.querySelector('#aviso');
let temporizador;
window.addEventListener('navegacion-simulada', (e) => {
    const { recordId, objectApiName } = e.detail.attributes || {};
    aviso.textContent = `En Salesforce se abriría el registro ${objectApiName} ${recordId}`;
    aviso.hidden = false;
    clearTimeout(temporizador);
    temporizador = setTimeout(() => (aviso.hidden = true), 3000);
});
