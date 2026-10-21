import { LightningElement, api } from 'lwc';

const fmtNum = new Intl.NumberFormat('es-MX');

/*
 * Barras horizontales.
 * modo 'apilado' (por defecto): filas [{ clave, etiqueta, primera, segunda, marca? }]
 *   serie1 / serie2: nombres de las dos series
 *   tono1 / tono2: pagada | continua | ok | okClaro | info | infoClaro | precaucion | alerta | critico | neutro
 * modo 'simple': filas [{ clave, etiqueta, valor, valorTexto?, marca?, tono? }], color con tono1 o el tono de la fila
 * marca = clase de color del punto junto a la etiqueta
 */
export default class ImplementacionesBarras extends LightningElement {
    @api filas = [];
    @api modo = 'apilado';
    @api serie1 = 'Consumidas';
    @api serie2 = 'Restantes';
    @api tono1 = 'info';
    @api tono2 = 'okClaro';
    @api etiquetaAncha = false;
    // filas que se pueden tocar para filtrar: avisan con 'seleccionar' (detail = clave de la fila)
    @api seleccionable = false;
    @api seleccionada = '';

    elegir(e) {
        this.dispatchEvent(new CustomEvent('seleccionar', { detail: e.currentTarget.dataset.clave }));
    }

    get esSimple() {
        return this.modo === 'simple';
    }

    get claseBarras() {
        return ['barras', this.esSimple ? 'barras_simples' : '', this.etiquetaAncha ? 'barras_etiqueta_ancha' : ''].join(' ');
    }

    get claseMuestra1() {
        return `muestra tono_${this.tono1}`;
    }

    get claseMuestra2() {
        return `muestra tono_${this.tono2}`;
    }

    get vista() {
        const filas = this.filas || [];
        const totalDe = (f) => (this.esSimple ? f.valor : f.primera + f.segunda);
        const suma = filas.reduce((s, f) => s + totalDe(f), 0);
        const max = Math.max(1, ...filas.map(totalDe));
        return filas.map((f) => {
            const total = totalDe(f);
            const porcentaje = suma ? Math.round((total / suma) * 100) : 0;
            const base = {
                ...f,
                claseMarca: f.marca ? `marca ${f.marca}` : '',
                activa: f.clave === this.seleccionada,
                claseFila: f.clave === this.seleccionada ? 'fila fila_boton fila_activa' : 'fila fila_boton',
                totalTexto: f.valorTexto || `${fmtNum.format(total)} · ${porcentaje}%`
            };
            if (this.esSimple) {
                return {
                    ...base,
                    titulo: `${f.etiqueta}: ${base.totalTexto}`,
                    // una fila puede traer su propio tono (p. ej. vencimiento: verde, amarillo, rojo)
                    claseSegmento: `segmento tono_${f.tono || this.tono1}`,
                    estilo: `width:${(total / max) * 100}%`
                };
            }
            return {
                ...base,
                primeraTexto: fmtNum.format(f.primera),
                segundaTexto: fmtNum.format(f.segunda),
                titulo: `${f.etiqueta}: ${f.primera} ${this.serie1.toLowerCase()}, ${f.segunda} ${this.serie2.toLowerCase()}`,
                claseSegmento1: `segmento tono_${this.tono1}`,
                claseSegmento2: `segmento tono_${this.tono2}`,
                estilo1: `width:${(f.primera / max) * 100}%`,
                estilo2: `width:${(f.segunda / max) * 100}%`
            };
        });
    }
}
