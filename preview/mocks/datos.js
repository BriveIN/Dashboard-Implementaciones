import { SECCIONES } from './secciones';

/*
 * Datos ficticios con la forma que devuelve ImplementacionesPanelController.obtenerImplementaciones:
 *   { id, nombre, tipo ('Implementación' | 'Proyecto'), etapa, etapaOriginal, cuentaId, empresa, esPrueba, oportunidadId,
 *     responsable, asociados[], solucion, propietario, contacto, poliza[], ordenCompra, creadoEn, cambioEstatus,
 *     fechaAcordadaKickoff, fechaKickoff, horasContratadas, horasConsumidas, horasRestantes, pausas, tiempoPausa,
 *     evidenciaPausa, historialPausas[],
 *     secciones: [{ clave, nombre, grupo, disponible, seleccionada, completa, generaActividad, datos: [{ etiqueta, valor, tipo }] }],
 *     actividades: [{ id, asunto, estado, fecha, resumen, liga, seccion, grupo, etapa, horas }],
 *     cambios: [{ campo, hito, anterior, nuevo, registrado, dias }],
 *     tiempos: [{ etapa, horas, veces }] }
 * Las proporciones se parecen a las reales; no representan clientes reales. Corte de información: 2026-10-01.
 */
const ETAPA_ORIGINAL = {
    noIniciada: 'No iniciada', agendada: 'Agendada', kickoff: 'Kick Off', enPausa: 'En Pausa',
    enProceso: 'Recepción de Insumos', entregaFinal: 'Entrega Final', finalizada: 'Implementación Finalizada'
};
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const largo = (iso) => { const [a, m, d] = iso.split('-').map(Number); return `${d} de ${MESES[m - 1]} de ${a}`; };
const def = (clave) => SECCIONES.find((s) => s.clave === clave);

/*
 * secs: { clave: { fecha, horas, comentarios, actividad (true por defecto), completa (true por defecto) } }
 * Una sección con completa:false queda seleccionada pero con campos a medias; actividad:false = completa sin actividad.
 */
function registro(n, base) {
    const { secs = {}, cambios = [], tiempos = [], ...r } = base;
    const empresa = r.empresa;
    const actividades = [];
    const secciones = SECCIONES.map((d) => {
        const entrada = secs[d.clave];
        const seleccionada = d.casilla ? !!entrada : !!entrada;
        const completa = !!entrada && entrada.completa !== false;
        const datos = [];
        if (entrada) {
            for (const c of d.campos) {
                if (c.tipo === 'date' && entrada.fecha && !datos.some((x) => x.tipo === 'date')) datos.push({ etiqueta: c.etiqueta, valor: entrada.fecha, tipo: 'date' });
                else if (/Duraci/.test(c.etiqueta) && entrada.horas != null) datos.push({ etiqueta: c.etiqueta, valor: String(entrada.horas), tipo: 'double' });
                else if (/Comentarios/.test(c.etiqueta) && entrada.comentarios) datos.push({ etiqueta: c.etiqueta, valor: entrada.comentarios, tipo: 'textarea' });
                else if (/Liga/.test(c.etiqueta) && entrada.liga) datos.push({ etiqueta: c.etiqueta, valor: entrada.liga, tipo: 'url' });
            }
            if (completa && entrada.actividad !== false && d.generaActividad) {
                const lineas = [`Fecha: ${largo(entrada.fecha)}`];
                if (entrada.horas != null) lineas.push(`Duracion (horas): ${entrada.horas}`);
                if (entrada.comentarios) lineas.push(`Comentarios: ${entrada.comentarios}`);
                actividades.push({
                    id: `00T${n}${d.clave}`, asunto: `${d.asunto} - ${empresa}`, estado: 'Completada', fecha: entrada.fecha,
                    resumen: lineas.join('\n'), liga: entrada.liga || null, horas: entrada.horas ?? null, seccion: d.clave, grupo: d.grupo,
                    etapa: d.grupo === 'Kickoff' ? 'Kickoff' : d.grupo === 'Entrega final' ? 'Entrega final' : 'En proceso'
                });
            }
        }
        return {
            clave: d.clave, nombre: d.nombre, grupo: d.grupo, generaActividad: d.generaActividad,
            disponible: !d.soluciones.length || d.soluciones.includes(r.solucion), seleccionada, completa, datos
        };
    });
    actividades.sort((a, b) => a.fecha.localeCompare(b.fecha));
    const hc = r.hc ?? null;
    const hu = r.hu ?? null;
    return {
        id: `a0N${String(n).padStart(4, '0')}`, nombre: r.nombre, tipo: r.tipo, etapa: r.etapa, etapaOriginal: ETAPA_ORIGINAL[r.etapa],
        cuentaId: `001${n}`, empresa, esPrueba: !!r.esPrueba, oportunidadId: `006${n}`, oportunidad: `Oportunidad de ejemplo ${n}`, productos: r.productos || [...(PRODUCTOS[r.solucion] || []), ...(n % 2 ? [producto('POLIZA DE IMPLEMENTACIÒN A1', 'IMPLEMENTACIÓN')] : [])], responsable: r.responsable || null,
        asociados: r.asociados || [], solucion: r.solucion, propietario: r.responsable || null, contacto: 'Contacto de ejemplo',
        poliza: [], ordenCompra: null, creadoEn: r.creadoEn || '2026-10-02T15:00:00.000Z', cambioEstatus: r.cambioEstatus || '2026-10-05T18:00:00.000Z',
        fechaAcordadaKickoff: r.acordada || null, fechaKickoff: r.kickoff || null,
        horasContratadas: hc, horasConsumidas: hu, horasRestantes: hc == null && hu == null ? null : (hc || 0) - (hu || 0),
        pausas: r.pausas ?? null, tiempoPausa: r.tiempoPausa ?? null, evidenciaPausa: r.evidenciaPausa || null, historialPausas: r.historialPausas || [],
        secciones, actividades,
        cambios: cambios.map((c) => ({ campo: c.campo || 'Reprogramacion_Inicio_Kick_Off__c', ...c, dias: Math.round((Date.parse(c.nuevo) - Date.parse(c.anterior)) / 86400000) })),
        tiempos
    };
}

// productos de la oportunidad según la solución (en Salesforce salen de las líneas de producto de la oportunidad)
const producto = (nombre, categoria) => ({ nombre, categoria });
const PRODUCTOS = {
    'Evaluatest': [producto('Hora Consultoría Evaluatest IA®', 'CONSULTORÍA'), producto('LICENCIA EVALUATEST IA® ADMINISTRATIVOS A1', 'LICENCIA')],
    'Entorno+': [producto('Hora Consultoría Entorno+®', 'CONSULTORÍA'), producto('PÓLIZA DE RESULTADOS NOM035 B5', 'IMPLEMENTACIÓN'), producto('LICENCIA DE APLICACIÓN NOM035 B5', 'LICENCIA')],
    'Evou': [producto('LICENCIA EVOU UNITARIO', 'LICENCIA'), producto('Hora Consultoría Evou®', 'CONSULTORÍA')],
    'Evaluatest IA operativos': [producto('Hora Consultoría Evaluatest IA®', 'CONSULTORÍA'), producto('ETEGRITY N1', 'ADDINES ETEGRITY'), producto('LICENCIA ETEGRITY N3', 'LICENCIA'), producto('LICENCIA EVALUATEST OPERATIVOS A1', 'LICENCIA')]
};
const I = 'Implementación';
const P = 'Proyecto';
const filas = [
    { nombre: 'Alfa Logística Evaluatest 2026 Implementación', tipo: I, etapa: 'kickoff', empresa: 'Alfa Logística', responsable: 'Leonela Castillo Agustin', asociados: ['Cinthia Gabriela Ruelas Peña'], solucion: 'Evaluatest', hc: 20, hu: 1, acordada: '2026-10-05', kickoff: '2026-10-05',
      secs: { KickOff: { fecha: '2026-10-05', horas: 1, comentarios: 'Se acordó el plan de trabajo y el calendario de insumos.' } } },
    { nombre: 'Beta Manufactura Clima 2026 Implementación', tipo: I, etapa: 'enProceso', empresa: 'Beta Manufactura', responsable: 'Alin Reyes', asociados: ['Paola Zetina'], solucion: 'Entorno+', hc: 40, hu: 37, acordada: '2026-09-28', kickoff: '2026-09-28',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Kick Off con dirección y RH.' },
        Insumos: { fecha: '2026-10-02', horas: 3, comentarios: 'Llegaron los insumos completos; falta la lista de áreas.' },
        Arranque: { fecha: '2026-10-03', horas: 4, comentarios: 'Se hicieron 4 sesiones de sensibilización de 1 hora.' },
        Evaluacion: { fecha: '2026-10-05', horas: 6, comentarios: 'La evaluación inició sin incidentes.' },
        EnvioComunicados: { fecha: '2026-10-05', horas: 0, comentarios: '1 comunicado de invitación y 3 recordatorios.', completa: false },
        ElaboracionPPT: { fecha: '2026-10-06', horas: 5, comentarios: 'Pendiente de generar.', actividad: false }
      },
      cambios: [{ hito: 'Inicio de Kickoff', anterior: '2026-09-21', nuevo: '2026-09-28', registrado: '2026-10-02' }, { hito: 'Recepción de insumos', anterior: '2026-10-05', nuevo: '2026-10-12', registrado: '2026-10-05' }],
      tiempos: [{ etapa: 'Kickoff', horas: 52, veces: 1 }] },
    { nombre: 'Gamma Retail Evou 2026 Implementación', tipo: I, etapa: 'enProceso', empresa: 'Gamma Retail', responsable: 'Ana Paola Morales', asociados: [], solucion: 'Evou', hc: 24, hu: 24,
      acordada: '2026-09-22', kickoff: '2026-09-22',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Todo conforme.' },
        Insumos: { fecha: '2026-10-01', horas: 2, comentarios: 'Perfiles y participantes cargados.' },
        CargaPerfiles: { fecha: '2026-10-02', horas: 8, comentarios: 'Se cargaron 48 perfiles.' },
        Aplicacion360: { fecha: '2026-10-03', horas: 6, comentarios: 'Inicio de la aplicación.' },
        EnvioEstatus: { fecha: '2026-10-04', horas: 2, comentarios: 'Envío diario al cierre del día.' },
        DesHomMetodo: { fecha: '2026-10-05', horas: 5, comentarios: null }
      } },
    { nombre: 'Delta Servicios EVT IA Operativos Implementación', tipo: I, etapa: 'entregaFinal', empresa: 'Delta Servicios', responsable: 'Carlos Ricardo Sánchez', asociados: ['Cinthia Gabriela Ruelas Peña'], solucion: 'Evaluatest IA operativos', hc: 30, hu: 34, acordada: '2026-09-14', kickoff: '2026-09-14',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Kick Off.' },
        Insumos: { fecha: '2026-10-01', horas: 2, comentarios: 'Insumos completos.' },
        ConfigPlataforma: { fecha: '2026-10-02', horas: 5, comentarios: null },
        ESICOperativos: { fecha: '2026-10-02', horas: 0, comentarios: 'Habilitamiento a 12 participantes.', liga: 'https://zoom.example.com/rec/esic' },
        EntregaFinal: { fecha: '2026-10-05', horas: 6, comentarios: 'Sesión final con el cliente; acta pendiente de firma.' }
      },
      tiempos: [{ etapa: 'Kickoff', horas: 18.5, veces: 1 }, { etapa: 'En proceso', horas: 96, veces: 1 }] },
    { nombre: 'Épsilon Alimentos Evaluatest 2027 Implementación', tipo: I, etapa: 'noIniciada', empresa: 'Épsilon Alimentos', responsable: null, asociados: [], solucion: 'Evaluatest', hc: null, hu: null, creadoEn: '2026-10-05T17:22:12.000Z', cambioEstatus: '2026-10-05T17:22:12.000Z' },
    { nombre: 'Zeta Educación NOM 035 2026 Implementación', tipo: I, etapa: 'finalizada', empresa: 'Zeta Educación', responsable: 'Alin Reyes', asociados: ['Paola Zetina'], solucion: 'Entorno+', hc: 60, hu: 22, acordada: '2026-08-10', kickoff: '2026-08-10',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Reanudado tras pausa.' },
        Arranque: { fecha: '2026-10-01', horas: 4, comentarios: 'Sesiones de sensibilización.' },
        Resultados: { fecha: '2026-10-02', horas: 9, comentarios: 'Se presentaron resultados a dirección.' },
        EntregaFinal: { fecha: '2026-10-03', horas: 7, comentarios: 'Satisfacción alta.' }
      },
      cambios: [{ hito: 'Sesión final con el cliente', anterior: '2026-09-30', nuevo: '2026-10-03', registrado: '2026-10-01' }],
      tiempos: [{ etapa: 'Entrega final', horas: 6.6, veces: 1 }] },
    { nombre: 'Eta Farmacéutica Evaluatest 2026 Implementación', tipo: I, etapa: 'enPausa', empresa: 'Eta Farmacéutica', responsable: 'Jesus Rafael Chang', asociados: [], solucion: 'Evaluatest', hc: 18, hu: 6, acordada: '2026-09-15', kickoff: '2026-09-15',
      pausas: 1, tiempoPausa: 22, evidenciaPausa: 'El cliente pidió detener hasta que cierre su auditoría interna.', historialPausas: ['2026-10-02, 2026-10-05 11:38:54Z: paso a En Pausa (0 h)'],
      secs: { KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Kick Off.' }, Insumos: { fecha: '2026-10-02', horas: 5, comentarios: 'Insumos recibidos.' } } },
    { nombre: 'Theta Banca Evaluatest 2026 Implementación', tipo: I, etapa: 'agendada', empresa: 'Theta Banca', responsable: 'Norma Christian Gómez', asociados: [], solucion: 'Evaluatest', hc: 12, hu: 0, acordada: '2026-10-14' },
    { nombre: 'Iota Telecom Clima 2026 Implementación', tipo: I, etapa: 'enProceso', empresa: 'Iota Telecom', responsable: 'Hannia Karina Bautista', asociados: ['Paola Zetina'], solucion: 'Entorno+', hc: 72, hu: 70, acordada: '2026-09-02', kickoff: '2026-09-02',
      secs: {
        KickOff: { fecha: '2026-10-02', horas: 1, comentarios: 'Kick Off.' },
        Arranque: { fecha: '2026-10-02', horas: 6, comentarios: 'Sensibilización a líderes.' },
        Evaluacion: { fecha: '2026-10-04', horas: 30, comentarios: 'Ampliaron la evaluación 3 días.' },
        ElaboracionPPT: { fecha: '2026-10-05', horas: 33, comentarios: 'Se personalizaron 6 PPT.' }
      },
      cambios: [{ hito: 'Inicio de Kickoff', anterior: '2026-09-02', nuevo: '2026-09-16', registrado: '2026-10-01' }, { hito: 'Recepción de insumos', anterior: '2026-09-23', nuevo: '2026-10-02', registrado: '2026-10-02' }, { hito: 'Sesión final con el cliente', anterior: '2026-10-20', nuevo: '2026-11-03', registrado: '2026-10-05' }],
      tiempos: [{ etapa: 'Kickoff', horas: 120, veces: 1 }] },
    { nombre: 'Kappa Seguros Entorno+ Proyecto 2026', tipo: P, etapa: 'enProceso', empresa: 'Kappa Seguros', responsable: 'Rosa Inés Escamilla', asociados: ['Cinthia Gabriela Ruelas Peña'], solucion: 'Entorno+', hc: 50, hu: 5, acordada: '2026-10-01', kickoff: '2026-10-01',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Kick Off del proyecto.' },
        Insumos: { fecha: '2026-10-02', horas: 2, comentarios: 'Insumos recibidos.' },
        Arranque: { fecha: '2026-10-03', horas: 2, comentarios: null, actividad: false }
      } },
    { nombre: 'Lambda Energía Evaluatest Proyecto 2026', tipo: P, etapa: 'kickoff', empresa: 'Lambda Energía', responsable: 'Rosa Inés Escamilla', asociados: [], solucion: 'Evaluatest', hc: 16, hu: 1, acordada: '2026-10-06', kickoff: '2026-10-06',
      secs: { KickOff: { fecha: '2026-10-06', horas: 1, comentarios: 'Kick Off.' } } },
    { nombre: 'Mu Distribución Evou Proyecto 2026', tipo: P, etapa: 'finalizada', empresa: 'Mu Distribución', responsable: 'Ana Paola Morales', asociados: [], solucion: 'Evou', hc: 12, hu: 12, acordada: '2026-09-01', kickoff: '2026-09-01',
      secs: { EntregaFinal: { fecha: '2026-10-02', horas: 2, comentarios: 'Acta firmada.' }, AjustesActualizaciones: { fecha: '2026-10-01', horas: 4, comentarios: 'Cambios de # durante la aplicación.' } },
      cambios: [{ hito: 'Envío del acta de entrega', anterior: '2026-09-28', nuevo: '2026-10-02', registrado: '2026-10-02' }] },
    { nombre: 'Nu Construcción Evaluatest Proyecto 2026', tipo: P, etapa: 'entregaFinal', empresa: 'Nu Construcción', responsable: 'Carlos Ricardo Sánchez', asociados: [], solucion: 'Evaluatest', hc: 40, hu: 45, acordada: '2026-08-20', kickoff: '2026-08-20',
      secs: {
        KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'Kick Off.' },
        CargaPerfiles: { fecha: '2026-10-02', horas: 12, comentarios: null },
        TemporadaEvaluacion: { fecha: '2026-10-03', horas: 20, comentarios: null },
        AnalisisDatos: { fecha: '2026-10-04', horas: 8, comentarios: null },
        EntregaFinal: { fecha: '2026-10-05', horas: 4, comentarios: 'Cliente satisfecho.' }
      } },
    { nombre: 'Xi Turismo Evaluatest Proyecto 2027', tipo: P, etapa: 'noIniciada', empresa: 'Xi Turismo', responsable: 'Rosa Inés Escamilla', asociados: [], solucion: 'Evaluatest', hc: null, hu: null, creadoEn: '2026-10-01T18:33:31.000Z' },
    { nombre: 'Patito Sa de CV XS Patito 2026 Implementación', tipo: I, etapa: 'enPausa', empresa: 'Patito Sa de CV', esPrueba: true, responsable: 'Aradith Juarez', asociados: [], solucion: 'Entorno+', hc: 0, hu: 13, acordada: '2026-10-01', kickoff: '2026-10-01',
      secs: { KickOff: { fecha: '2026-10-01', horas: 1, comentarios: 'prueba' }, Insumos: { fecha: '2026-10-01', horas: 2, comentarios: 'prueba2' }, EntregaFinal: { fecha: '2026-10-01', horas: 6, comentarios: 'prueba' } } }
];

export const IMPLEMENTACIONES = filas.map((f, i) => registro(i + 1, f));
