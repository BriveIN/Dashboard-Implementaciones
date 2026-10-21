import { LightningElement, api } from 'lwc';
import { etiquetaEtapa, infoConsumo, fmtHoras, fmtPct } from 'c/implementacionesUtilV2';

/*
 * Registros que explican un indicador, desplegados justo debajo de él (sin llevar la pantalla a otro lado).
 * Cada fila se abre ahí mismo con el detalle completo. Eventos: cerrar · abrir (id)
 */
const POR_PAGINA = 6;

export default class ImplementacionesLista extends LightningElement {
    @api titulo;
    @api registros = [];

    abiertas = {};
    limite = POR_PAGINA;

    get filas() {
        return (this.registros || []).slice(0, this.limite).map((r) => {
            const info = infoConsumo(r.consumo);
            const abierta = !!this.abiertas[r.id];
            return {
                id: r.id,
                registro: r,
                abierta,
                ariaAbierta: String(abierta),
                icono: abierta ? 'utility:chevrondown' : 'utility:chevronright',
                claseFila: abierta ? 'fila fila_abierta' : 'fila',
                nombre: r.nombre,
                empresa: r.empresa || '—',
                tipo: r.tipo,
                etapa: etiquetaEtapa(r.etapa),
                claseEtapa: `chip chip_${r.etapa}`,
                horas: r.horasContratadas ? `${fmtHoras(r.horasConsumidas)} de ${fmtHoras(r.horasContratadas)} h · ${fmtPct(r.pct)}` : `${fmtHoras(r.horasConsumidas)} h consumidas`,
                claseHoras: `texto_tono_${info.tono}`,
                estadoHoras: info.etiqueta,
                actividades: `${r.nAct} ${r.nAct === 1 ? 'actividad' : 'actividades'}`,
                cambios: r.nCambios ? `${r.nCambios} ${r.nCambios === 1 ? 'cambio' : 'cambios'}` : ''
            };
        });
    }

    get total() {
        return (this.registros || []).length;
    }

    get subtitulo() {
        return `${this.total} ${this.total === 1 ? 'registro' : 'registros'}`;
    }

    get hayMas() {
        return this.total > this.limite;
    }

    get textoMas() {
        return `Mostrar más (${Math.min(POR_PAGINA, this.total - this.limite)} de ${this.total - this.limite})`;
    }

    get vacio() {
        return this.total === 0;
    }

    alternar(e) {
        const { id } = e.currentTarget.dataset;
        this.abiertas = { ...this.abiertas, [id]: !this.abiertas[id] };
    }

    mostrarMas() {
        this.limite += POR_PAGINA;
    }

    cerrar() {
        this.dispatchEvent(new CustomEvent('cerrar'));
    }

    cerrarFila(e) {
        this.abiertas = { ...this.abiertas, [e.currentTarget.dataset.id]: false };
    }

    abrir(e) {
        this.dispatchEvent(new CustomEvent('abrir', { detail: typeof e.detail === 'string' ? e.detail : e.currentTarget.dataset.id }));
    }
}
