import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import obtenerPlan from '@salesforce/apex/PlanTrabajoController.obtenerPlan';
import LOGO_BRIVE_PLAN from '@salesforce/resourceUrl/PlanTrabajo_Logo_Brive';
import { generarXlsx, descargarXlsx, nombreArchivo } from 'c/planTrabajoXlsx';
import { etiquetaEtapa, consumoDe, infoConsumo, restantesDe, fmtHoras, fmtPct, fmtFecha, fmtFechaHora, fmtDias, leerResumen } from 'c/implementacionesUtilV2';

/*
 * Detalle completo de una implementación o proyecto, debajo de su fila de la tabla.
 * Solo presenta: el panel le pasa el registro tal como lo devuelve Apex.
 *   Registro → Etapa → Sección → Actividad → Resumen y datos → Horas / Controles de cambio
 * Eventos: abrir (id) · cerrar
 */
// una sola lista de avance, en el orden del proceso: Ejecución y Análisis van después de Planeación
const ORDEN_AVANCE = ['Kickoff', 'Planeación', 'Ejecución', 'Análisis', 'Otras', 'Entrega final'];
const GRUPOS_FIJOS = ['Kickoff', 'Planeación', 'Entrega final']; // se muestran siempre; las demás, solo si su casilla está seleccionada
const TITULOS_AVANCE = { Kickoff: 'Kickoff', Planeación: 'Planeación', Ejecución: 'Ejecución', Análisis: 'Análisis', Otras: 'Otras secciones', 'Entrega final': 'Entrega final' };

export default class ImplementacionesDetalle extends LightningElement {
    @api registro;

    descargandoPlan = false;

    get textoPlan() {
        return this.descargandoPlan ? 'Generando plan…' : 'Descargar plan de trabajo';
    }

    get ariaOcupadoPlan() {
        return this.descargandoPlan ? 'true' : 'false';
    }

    async leerImagen(url) {
        const respuesta = await fetch(url);
        if (!respuesta.ok) throw new Error(`No se pudo leer la imagen (${respuesta.status})`);
        return new Uint8Array(await respuesta.arrayBuffer());
    }

    avisoToast(titulo, mensaje, variante) {
        this.dispatchEvent(new ShowToastEvent({ title: titulo, message: mensaje, variant: variante }));
    }

    /**
     * Plan de trabajo de este registro: Apex arma las fases y actividades según su solución y el navegador genera el .xlsx.
     * Se puede descargar en cualquier momento, aunque el plan esté parcial.
     */
    async descargarPlan() {
        if (this.descargandoPlan) return;
        this.descargandoPlan = true;
        try {
            const plan = await obtenerPlan({ registroId: this.registro.id });
            const logos = { brive: { bytes: await this.leerImagen(LOGO_BRIVE_PLAN), ext: 'png' }, solucion: null };
            if (plan.logoUrl) {
                try {
                    logos.solucion = { bytes: await this.leerImagen(plan.logoUrl), ext: plan.logoExtension };
                } catch (e) {
                    // sin el logo de la solución el plan sigue siendo válido: se genera sin él
                    plan.avisos = [...(plan.avisos || []), 'No se pudo leer el logo de la solución.'];
                }
            }
            const hoy = new Date();
            const fecha = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;
            const archivo = generarXlsx({ ...plan, fechaGeneracion: fecha }, logos);
            descargarXlsx(archivo, nombreArchivo(plan.cliente, plan.solucion, fecha), this.template.querySelector('.detalle'));
            const avisos = plan.avisos || [];
            if (avisos.length) this.avisoToast('Plan descargado con avisos', avisos.join(' '), 'warning');
        } catch (e) {
            const motivo = (e && e.body && e.body.message) || (e && e.message) || 'Error desconocido.';
            this.avisoToast('No se pudo generar el plan de trabajo', motivo, 'error');
        } finally {
            this.descargandoPlan = false;
        }
    }

    avisar(nombre, detail) {
        this.dispatchEvent(new CustomEvent(nombre, { detail }));
    }

    abrir() {
        this.avisar('abrir', this.registro.id);
    }

    cerrar() {
        this.avisar('cerrar');
    }

    // abre o cierra todas las actividades de un bloque (los <details> llevan su propio estado)
    alternarTodas(e) {
        const contenedor = this.template.querySelector(`[data-lista="${e.currentTarget.dataset.lista}"]`);
        if (!contenedor) return;
        const detalles = contenedor.querySelectorAll('details');
        const abrir = Array.from(detalles).some((d) => !d.open);
        detalles.forEach((d) => (d.open = abrir));
    }

    // ---------- información general ----------

    get generales() {
        const r = this.registro;
        const par = (etiqueta, valor) => ({ clave: etiqueta, etiqueta, valor: valor === null || valor === undefined || valor === '' ? '—' : valor });
        return [
            par('Tipo', r.tipo),
            par('Etapa actual', etiquetaEtapa(r.etapa)),
            par('Cuenta comercial', r.empresa),
            par('Responsable', r.responsable),
            par('Asociado', r.asociados && r.asociados.length ? r.asociados.join(', ') : null),
            par('Propietario', r.propietario),
            par('Contacto', r.contacto),
            par('Solución adquirida', r.solucion),
            par('Póliza adquirida', r.poliza && r.poliza.length ? r.poliza.join(', ') : null),
            par('Fecha acordada de Kickoff', fmtFecha(r.fechaAcordadaKickoff)),
            par('Fecha de Kickoff', fmtFecha(r.fechaKickoff)),
            par('Último cambio de etapa', fmtFechaHora(r.cambioEstatus)),
            par('Creado', fmtFechaHora(r.creadoEn))
        ];
    }

    get tituloActividades() {
        const n = (this.registro.actividades || []).length;
        return `Actividades (${n})`;
    }

    // ---------- actividades ----------

    get actividades() {
        const porClave = new Map((this.registro.secciones || []).map((s) => [s.clave, s]));
        return [...(this.registro.actividades || [])]
            .sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''))
            .map((a) => this.vistaActividad(a, porClave.get(a.seccion)));
    }

    get hayActividades() {
        return this.actividades.length > 0;
    }

    vistaActividad(a, seccion) {
        const resumen = leerResumen(a.resumen);
        const comentario = resumen.find((x) => x.esComentario);
        return {
            clave: a.id,
            asunto: a.asunto,
            fecha: fmtFecha(a.fecha),
            etapa: a.etapa || 'Sin etapa',
            claseEtapa: `chip chip_etapa_${(a.etapa || 'sin').replace(/\s/g, '')}`,
            seccion: seccion ? seccion.nombre : 'Sin sección identificada',
            horas: a.horas === null || a.horas === undefined ? null : `${fmtHoras(a.horas)} h`,
            liga: a.liga,
            // la primera línea del comentario se ve sin abrir: el contenido importante no queda oculto
            vistaPrevia: comentario ? comentario.valor.split('\n')[0].slice(0, 160) : '',
            hayResumen: resumen.length > 0,
            resumen
        };
    }

    // ---------- avance: etapas y secciones con su evidencia ----------

    get avance() {
        const r = this.registro;
        const actividadesPor = {};
        for (const a of r.actividades || []) (actividadesPor[a.seccion] = actividadesPor[a.seccion] || []).push(a);
        const secciones = r.secciones || [];
        const grupos = ORDEN_AVANCE.map((nombre) => {
            const filas = secciones
                .filter((s) => s.grupo === nombre && (GRUPOS_FIJOS.includes(nombre) || s.seleccionada))
                .map((s) => this.vistaSeccion(s, actividadesPor[s.clave] || []));
            const conActividad = filas.filter((f) => f.hayActividades).length;
            return {
                nombre,
                titulo: TITULOS_AVANCE[nombre],
                filas,
                hay: filas.length > 0,
                // los grupos sin casillas empiezan plegados: solo dicen "Sin casillas seleccionadas" en su encabezado
                abierto: filas.length > 0,
                // Ejecución y Análisis siempre aparecen, aunque no tengan casillas, para que se vea el recorrido completo
                vacio: filas.length === 0 && (nombre === 'Ejecución' || nombre === 'Análisis'),
                total: filas.length,
                conActividad,
                resumen: filas.length ? `${conActividad} de ${filas.length} con actividad` : 'Sin casillas seleccionadas'
            };
        }).filter((g) => g.hay || g.vacio);
        // toda actividad del registro tiene que verse en el avance: las que no caen en ninguna sección mostrada van aparte
        const mostradas = new Set(grupos.flatMap((g) => g.filas.map((f) => f.clave)));
        const sueltas = (r.actividades || [])
            .filter((a) => !mostradas.has(a.seccion))
            .map((a) => this.vistaActividad(a, secciones.find((s) => s.clave === a.seccion)));
        const total = (r.actividades || []).length;
        const sinSeleccionar = secciones.filter((s) => !GRUPOS_FIJOS.includes(s.grupo) && !s.seleccionada && s.disponible);
        return {
            grupos,
            resumen: grupos.map((g) => ({ clave: g.nombre, titulo: g.titulo, texto: g.resumen, clase: g.conActividad ? 'chip chip_estado_ok' : 'chip chip_estado_neutro' })),
            sueltas,
            haySueltas: sueltas.length > 0,
            conteo: `${total} ${total === 1 ? 'actividad' : 'actividades'} desde el 1 de octubre · ${total - sueltas.length} en las secciones de abajo${sueltas.length ? ` · ${sueltas.length} sin sección en el avance` : ''}`,
            sinSeleccionar: sinSeleccionar.map((s) => ({ clave: s.clave, nombre: s.nombre })),
            haySinSeleccionar: sinSeleccionar.length > 0,
            solucion: r.solucion || 'esta solución'
        };
    }

    vistaSeccion(s, actividades) {
        const hayActividad = actividades.length > 0;
        let estado;
        let clase;
        if (s.seleccionada && s.completa && hayActividad) {
            estado = 'Completa · con actividad';
            clase = 'ok';
        } else if (s.seleccionada && s.completa && !s.generaActividad) {
            estado = 'Completa · esta sección no genera actividad';
            clase = 'neutro';
        } else if (s.seleccionada && s.completa) {
            estado = 'Completa · sin actividad desde el 1 oct';
            clase = 'alerta';
        } else if (hayActividad) {
            estado = 'Con actividad';
            clase = 'ok';
        } else if (s.datos.length) {
            estado = 'Incompleta · en captura';
            clase = 'alerta';
        } else {
            estado = 'Sin datos';
            clase = 'neutro';
        }
        const vistaDatos = (s.datos || []).map((d, i) => ({
            clave: `${i}-${d.etiqueta}`,
            etiqueta: d.etiqueta,
            valor: d.tipo === 'date' ? fmtFecha(d.valor) : d.valor,
            esLiga: /^https?:\/\//i.test(d.valor || ''),
            esTexto: d.tipo === 'textarea'
        }));
        return {
            clave: s.clave,
            grupo: s.grupo,
            nombre: s.nombre,
            claseEstado: `chip chip_estado_${clase}`,
            estado,
            abierta: hayActividad || s.datos.length > 0,
            hayDatos: vistaDatos.length > 0,
            datos: vistaDatos,
            hayActividades: hayActividad,
            actividades: actividades.map((a) => this.vistaActividad(a, s)),
            linea: [hayActividad ? `${actividades.length} ${actividades.length === 1 ? 'actividad' : 'actividades'}` : '', vistaDatos.length ? `${vistaDatos.length} ${vistaDatos.length === 1 ? 'dato' : 'datos'}` : '']
                .filter(Boolean)
                .join(' · ')
        };
    }

    // ---------- horas ----------

    get horas() {
        const r = this.registro;
        const clave = consumoDe(r.horasContratadas, r.horasConsumidas);
        const info = infoConsumo(clave);
        const hc = r.horasContratadas || 0;
        const pct = hc > 0 ? (r.horasConsumidas || 0) / hc : null;
        const desglose = (r.actividades || [])
            .filter((a) => a.horas !== null && a.horas !== undefined)
            .map((a) => ({ clave: a.id, asunto: a.asunto, fecha: fmtFecha(a.fecha), horas: fmtHoras(a.horas), valor: a.horas }));
        const suma = desglose.reduce((s, a) => s + a.valor, 0);
        const consumidas = r.horasConsumidas || 0;
        return {
            contratadas: fmtHoras(r.horasContratadas),
            consumidas: fmtHoras(r.horasConsumidas),
            restantes: fmtHoras(restantesDe(r)),
            pct: fmtPct(pct),
            hayPct: pct !== null,
            estiloBarra: `width:${Math.min(100, Math.round((pct || 0) * 100))}%`,
            claseBarra: `progreso_relleno tono_${info.tono}`,
            claseEstado: `chip chip_estado_${info.tono}`,
            estado: info.etiqueta,
            ayuda: info.ayuda,
            claseRestantes: (restantesDe(r) || 0) < 0 ? 'cifra_valor texto_critico' : 'cifra_valor',
            hayDesglose: desglose.length > 0,
            desglose,
            totalDesglose: fmtHoras(suma),
            sinDesglose: consumidas - suma > 0.05 ? fmtHoras(consumidas - suma) : null
        };
    }

    // ---------- controles de cambio ----------

    get cambios() {
        const lista = [...(this.registro.cambios || [])].sort((a, b) => (b.registrado || '').localeCompare(a.registrado || ''));
        return lista.map((c, i) => ({
            clave: `${i}-${c.campo}-${c.registrado}`,
            hito: c.hito,
            anterior: fmtFecha(c.anterior),
            nuevo: fmtFecha(c.nuevo),
            desviacion: fmtDias(c.dias),
            claseDesviacion: c.dias > 0 ? 'texto_alerta' : c.dias < 0 ? 'texto_ok' : '',
            registrado: fmtFecha(c.registrado)
        }));
    }

    get hayCambios() {
        return this.cambios.length > 0;
    }

    get tituloCambios() {
        return `Controles de cambio (${this.cambios.length})`;
    }

    get pausa() {
        const r = this.registro;
        const hay = (r.pausas || 0) > 0 || (r.tiempoPausa || 0) > 0 || (r.historialPausas || []).length > 0 || !!r.evidenciaPausa;
        return {
            hay,
            pausas: r.pausas || 0,
            tiempo: fmtHoras(r.tiempoPausa || 0),
            evidencia: r.evidenciaPausa,
            lineas: (r.historialPausas || []).map((l, i) => ({ clave: `${i}`, texto: l }))
        };
    }

    get tiempos() {
        return (this.registro.tiempos || []).map((t) => ({ clave: t.etapa, etapa: t.etapa, horas: `${fmtHoras(t.horas)} h`, veces: t.veces }));
    }

    get hayTiempos() {
        return this.tiempos.length > 0;
    }
}
