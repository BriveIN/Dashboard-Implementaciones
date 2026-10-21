/*
 * Reglas y formatos compartidos por implementacionesPanelV2 e implementacionesDetalleV2. Solo presenta datos: ninguna cifra
 * global de horas se calcula aquí: las horas contratadas y consumidas vienen de Salesforce (Horas_Contratadas__c, Horas__c); por registro,
 * restantes = contratadas − consumidas y % consumido = consumidas ÷ contratadas.
 */

// corte de información: lo aplica Apex en la consulta; aquí solo se usa para avisar y limitar las fechas elegibles
export const CORTE = '2026-10-01';

// umbrales del consumo de horas. POR CONFIRMAR con el equipo (ver PRODUCT.md): no existen en Salesforce.
export const UMBRAL_BAJO = 0.25; // menos de este avance = bajo consumo
export const UMBRAL_CERCANO = 0.9; // desde este avance y sin llegar al 100% = próximo a agotar

// etapas del proceso en orden; "En pausa" es una condición aparte, no un paso de la secuencia
export const ETAPAS = [
    { clave: 'noIniciada', etiqueta: 'No iniciada' },
    { clave: 'agendada', etiqueta: 'Agendada' },
    { clave: 'kickoff', etiqueta: 'Kickoff' },
    { clave: 'enProceso', etiqueta: 'En proceso' },
    { clave: 'entregaFinal', etiqueta: 'Entrega final' },
    { clave: 'finalizada', etiqueta: 'Implementación finalizada' }
];
export const ETAPA_PAUSA = { clave: 'enPausa', etiqueta: 'En pausa' };
const TODAS_LAS_ETAPAS = [...ETAPAS, ETAPA_PAUSA];

export function etiquetaEtapa(clave) {
    const e = TODAS_LAS_ETAPAS.find((x) => x.clave === clave);
    return e ? e.etiqueta : clave || '';
}

export const GRUPOS_ACTIVIDAD = ['Kickoff', 'Planeación', 'Ejecución', 'Análisis', 'Entrega final'];

// estados del consumo de horas: cada uno con su tono semántico (ok, info, precaucion, alerta, critico, neutro)
export const CONSUMOS = [
    { clave: 'bajo', etiqueta: 'Bajo consumo', tono: 'info', ayuda: `Menos del ${UMBRAL_BAJO * 100}% de las horas contratadas` },
    { clave: 'normal', etiqueta: 'Consumo normal', tono: 'ok', ayuda: 'Entre el bajo consumo y el límite' },
    { clave: 'cercano', etiqueta: 'Próximo a agotar', tono: 'precaucion', ayuda: `Desde el ${UMBRAL_CERCANO * 100}% sin llegar al 100%` },
    { clave: 'completo', etiqueta: '100% consumido', tono: 'alerta', ayuda: 'Consumió exactamente las horas contratadas' },
    { clave: 'excedido', etiqueta: 'Excedido', tono: 'critico', ayuda: 'Consumió más horas de las contratadas' },
    { clave: 'sinContratadas', etiqueta: 'Sin horas contratadas', tono: 'neutro', ayuda: 'El registro no tiene horas contratadas en Salesforce' }
];

export function consumoDe(contratadas, consumidas) {
    const hc = contratadas || 0;
    const hu = consumidas || 0;
    if (hc <= 0) return 'sinContratadas';
    if (hu > hc) return 'excedido';
    if (hu === hc) return 'completo';
    const avance = hu / hc;
    if (avance >= UMBRAL_CERCANO) return 'cercano';
    if (avance < UMBRAL_BAJO) return 'bajo';
    return 'normal';
}

// horas restantes de UN registro: contratadas − consumidas (vacío si no tiene ninguna de las dos)
export function restantesDe(r) {
    const hc = r.horasContratadas;
    const hu = r.horasConsumidas;
    if ((hc === null || hc === undefined) && (hu === null || hu === undefined)) return null;
    return (hc || 0) - (hu || 0);
}

export function infoConsumo(clave) {
    return CONSUMOS.find((c) => c.clave === clave) || CONSUMOS[CONSUMOS.length - 1];
}

// ---------- formatos ----------

const numero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 1 });
const entero = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 });
export const fmtHoras = (n) => (n === null || n === undefined ? '—' : numero.format(n));
export const fmtEntero = (n) => entero.format(n || 0);
export const fmtPct = (n) => (n === null || n === undefined ? '—' : `${Math.round(n * 100)}%`);

const MESES_CORTOS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

// 'yyyy-mm-dd' (o ISO con hora) -> '5 oct 2026', sin pasar por zonas horarias
export function fmtFecha(valor) {
    if (!valor) return '—';
    const [a, m, d] = String(valor).slice(0, 10).split('-').map(Number);
    if (!a || !m || !d) return String(valor);
    return `${d} ${MESES_CORTOS[m - 1]} ${a}`;
}

export function fmtFechaHora(valor) {
    if (!valor) return '—';
    const f = new Date(valor);
    if (Number.isNaN(f.getTime())) return fmtFecha(valor);
    return `${f.getDate()} ${MESES_CORTOS[f.getMonth()]} ${f.getFullYear()}`;
}

export function fmtDias(dias) {
    if (dias === null || dias === undefined) return '—';
    if (dias === 0) return 'Sin diferencia';
    const n = Math.abs(dias);
    return `${dias > 0 ? '+' : '−'}${n} ${n === 1 ? 'día' : 'días'}`;
}

// ---------- resumen de la actividad ----------

// El flow arma la descripción como "Etiqueta: valor" por línea; los comentarios pueden ocupar varias líneas.
const LINEA_CON_ETIQUETA = /^(Fecha[^:]{0,40}|Duracion \(horas\)|Comentarios|Liga[^:]{0,40}|Lista de participantes|Estatus[^:]{0,30}):\s?(.*)$/;

export function leerResumen(texto) {
    const pares = [];
    for (const linea of String(texto || '').split(/\r?\n/)) {
        const m = LINEA_CON_ETIQUETA.exec(linea);
        if (m) {
            pares.push({ etiqueta: m[1], valor: m[2] });
        } else if (pares.length && linea.trim() !== '') {
            pares[pares.length - 1].valor += `\n${linea}`;
        } else if (!pares.length && linea.trim() !== '') {
            pares.push({ etiqueta: 'Resumen', valor: linea });
        }
    }
    return pares.map((p, i) => ({
        clave: `${i}-${p.etiqueta}`,
        etiqueta: p.etiqueta === 'Duracion (horas)' ? 'Duración (horas)' : p.etiqueta === 'Fecha sesion final cliente' ? 'Fecha sesión final cliente' : p.etiqueta,
        valor: p.valor.trim() || '—',
        esLiga: /^https?:\/\//i.test(p.valor.trim()),
        esComentario: p.etiqueta === 'Comentarios'
    }));
}
