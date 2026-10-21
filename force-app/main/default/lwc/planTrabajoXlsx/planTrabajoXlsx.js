/**
 * Generador del .xlsx del Plan de trabajo, sin dependencias (corre bajo Locker y LWS).
 *
 * Un .xlsx es un zip de XML: aquí se arma el XML a mano y se empaqueta con un zip "stored" (sin compresión).
 * Replica Plantilla_institucional_Plan_de_trabajo_Brive.xlsx: encabezado con logos, ficha, KPIs, filas de fase
 * con fórmulas, validaciones, formato condicional, hoja "Días inhábiles" y hoja oculta "Catalogos".
 *
 * Entrada (ya normalizada por quien llama; aquí no se consulta Salesforce):
 *   plan = {
 *     solucionTitulo, cliente, proyecto, tipoSolucion, responsable, contacto,
 *     fechaGeneracion: 'AAAA-MM-DD',
 *     fases: [{ nombre, actividades: [{ nombre, duracion|null, inicia: 'AAAA-MM-DD'|null, asignado, avance: 0..1,
 *                                       estatus, comentarios }] }],
 *     diasInhabiles: [{ fecha: 'AAAA-MM-DD', motivo }]
 *   }
 *   logos = { brive: { bytes: Uint8Array, ext: 'png'|'jpeg' }, solucion: { bytes, ext } | null }
 * Devuelve Uint8Array con el archivo.
 */

export const ESTATUS = ['Sin iniciar', 'En proceso', 'Finalizado', 'En pausa'];
const POR_DEFINIR = 'Por definir';
const HOJA_PLAN = 'Plan de trabajo';
const HOJA_DIAS = 'Días inhábiles';
const HOJA_CAT = 'Catalogos';
const FILA_ENCABEZADO = 17;
const PRIMERA_FILA = 18;
const MAX_DIAS_INHABILES = 99; // el rango con nombre llega a la fila 100

// Índices de estilo (cellXfs en ESTILOS_XML). Mantener sincronizados.
const S = {
    base: 0, fondo: 1, titulo: 2, solucion: 3, cliente: 4, franja: 5, fichaEtiqueta: 6, fichaValor: 7, fichaFecha: 8,
    kpiEtiqueta: 9, kpiPct: 10, kpiFecha: 11, kpiTexto: 12, encabezado: 13, faseCentro: 14, faseTexto: 15,
    faseFecha: 16, fasePct: 17, actCentro: 18, actNombre: 19, actFecha: 20, actTexto: 21, actPct: 22,
    leyendaTitulo: 23, leyenda: 24, hojaEnc: 25, hojaFecha: 26, hojaTexto: 27, hojaNota: 28, catEnc: 29, catTexto: 30, leyendaAzul: 31, sinActividades: 32,
    tablaEncabezado: 33, tablaTexto: 34, tablaFecha: 35, tablaPorcentaje: 36, tablaNumero: 37, tablaEncabezadoRelleno: 38
};

// ---------- Fechas ----------

const MS_DIA = 86400000;

export function isoASerial(iso) {
    if (!iso || !/^\d{4}-\d{2}-\d{2}/.test(iso)) return null;
    const [a, m, d] = iso.slice(0, 10).split('-').map(Number);
    return Math.round(Date.UTC(a, m - 1, d) / MS_DIA) + 25569;
}

function serialADate(serial) {
    return new Date(Math.round((serial - 25569) * MS_DIA));
}

function esLaboral(serial, inhabiles) {
    const dia = serialADate(serial).getUTCDay();
    return dia !== 0 && dia !== 6 && !inhabiles.has(serial);
}

/** Equivalente a WORKDAY(inicio, dias, inhabiles) con dias >= 0. */
export function workday(inicio, dias, inhabiles) {
    let s = inicio;
    let n = 0;
    while (n < dias) {
        s += 1;
        if (esLaboral(s, inhabiles)) n += 1;
    }
    return s;
}

/** Equivalente a NETWORKDAYS(a, b, inhabiles) con a <= b. */
export function networkdays(a, b, inhabiles) {
    let n = 0;
    for (let s = a; s <= b; s += 1) {
        if (esLaboral(s, inhabiles)) n += 1;
    }
    return n;
}

function nesimoLunes(anio, mes, n) {
    const primero = new Date(Date.UTC(anio, mes, 1)).getUTCDay();
    const dia = 1 + ((8 - primero) % 7) + (n - 1) * 7;
    return Date.UTC(anio, mes, dia);
}

const iso = (ms) => new Date(ms).toISOString().slice(0, 10);

/** Feriados oficiales de México (LFT art. 74) para los años dados. */
export function diasFestivosMexico(anios) {
    const lista = [];
    anios.forEach((a) => {
        lista.push({ fecha: iso(Date.UTC(a, 0, 1)), motivo: 'Año Nuevo' });
        lista.push({ fecha: iso(nesimoLunes(a, 1, 1)), motivo: 'Día de la Constitución (1er lunes de feb.)' });
        lista.push({ fecha: iso(nesimoLunes(a, 2, 3)), motivo: 'Natalicio de Benito Juárez (3er lunes de mar.)' });
        lista.push({ fecha: iso(Date.UTC(a, 4, 1)), motivo: 'Día del Trabajo' });
        lista.push({ fecha: iso(Date.UTC(a, 8, 16)), motivo: 'Día de la Independencia' });
        if ((a - 2024) % 6 === 0) {
            lista.push({ fecha: iso(Date.UTC(a, 9, 1)), motivo: 'Transmisión del Poder Ejecutivo Federal' });
        }
        lista.push({ fecha: iso(nesimoLunes(a, 10, 3)), motivo: 'Revolución Mexicana (3er lunes de nov.)' });
        lista.push({ fecha: iso(Date.UTC(a, 11, 25)), motivo: 'Navidad' });
    });
    return lista;
}

// ---------- XML ----------

const SIN_CARACTERES_INVALIDOS = /[^\u0009\u000A\u000D -퟿-�]/g;

function esc(texto) {
    return String(texto)
        .replace(SIN_CARACTERES_INVALIDOS, '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function letra(col) {
    let n = col;
    let s = '';
    while (n > 0) {
        const r = (n - 1) % 26;
        s = String.fromCharCode(65 + r) + s;
        n = Math.floor((n - 1) / 26);
    }
    return s;
}

const ref = (col, fila) => letra(col) + fila;

/** Hoja en construcción: celdas por fila, estilos de fila, combinadas. */
class Hoja {
    constructor() {
        this.filas = new Map(); // fila -> { ht, s, celdas: Map(col -> xml) }
        this.combinadas = [];
    }

    fila(n) {
        if (!this.filas.has(n)) this.filas.set(n, { ht: null, s: null, celdas: new Map() });
        return this.filas.get(n);
    }

    alto(n, ht) {
        this.fila(n).ht = ht;
    }

    estiloFila(n, s) {
        this.fila(n).s = s;
    }

    texto(col, fila, valor, s) {
        this.fila(fila).celdas.set(col, `<c r="${ref(col, fila)}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`);
    }

    numero(col, fila, valor, s) {
        this.fila(fila).celdas.set(col, `<c r="${ref(col, fila)}" s="${s}"><v>${valor}</v></c>`);
    }

    vacia(col, fila, s) {
        this.fila(fila).celdas.set(col, `<c r="${ref(col, fila)}" s="${s}"/>`);
    }

    /** Fórmula con su valor ya calculado (para vistas previas que no recalculan). */
    formula(col, fila, f, cache, s) {
        let v = '';
        let t = '';
        if (typeof cache === 'number') {
            v = `<v>${cache}</v>`;
        } else if (typeof cache === 'string') {
            t = ' t="str"';
            v = `<v>${esc(cache)}</v>`;
        }
        this.fila(fila).celdas.set(col, `<c r="${ref(col, fila)}" s="${s}"${t}><f>${esc(f)}</f>${v}</c>`);
    }

    /** Texto o número en una celda que puede traer "Por definir" (fechas). */
    textoONumero(col, fila, valor, s) {
        if (typeof valor === 'number') this.numero(col, fila, valor, s);
        else this.texto(col, fila, valor, s);
    }

    combinar(rango) {
        this.combinadas.push(rango);
    }

    datosXml() {
        const filas = [...this.filas.keys()].sort((a, b) => a - b);
        return filas.map((n) => {
            const f = this.filas.get(n);
            const attrs = `${f.ht != null ? ` ht="${f.ht}" customHeight="1"` : ''}${f.s != null ? ` s="${f.s}" customFormat="1"` : ''}`;
            const celdas = [...f.celdas.keys()].sort((a, b) => a - b).map((c) => f.celdas.get(c)).join('');
            return `<row r="${n}"${attrs}>${celdas}</row>`;
        }).join('');
    }

    combinadasXml() {
        if (!this.combinadas.length) return '';
        return `<mergeCells count="${this.combinadas.length}">${this.combinadas.map((r) => `<mergeCell ref="${r}"/>`).join('')}</mergeCells>`;
    }
}

const NS_MAIN = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const NS_REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const CABECERA_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';

const ESTILOS_XML = (() => {
    const fuente = (extra, sz, color, nombre = 'Arial') =>
        `<font>${extra}<sz val="${sz}"/>${color ? `<color rgb="${color}"/>` : ''}<name val="${nombre}"/><family val="2"/></font>`;
    const fuentes = [
        '<font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>',
        fuente('<b/>', 20, 'FF5B6770'), fuente('<b/>', 13, 'FF7FA414'), fuente('', 11, 'FF5B6770'),
        fuente('<b/>', 9, 'FF5B6770'), fuente('', 10, 'FF000000'), fuente('<b/>', 9, 'FFFFFFFF'),
        fuente('<b/>', 14, 'FF5B6770'), fuente('<b/>', 10, 'FFFFFFFF'), fuente('<b/>', 10, 'FF333B41'),
        fuente('<i/>', 9, 'FF7A848B'), fuente('<b/>', 11, 'FFFFFFFF'), fuente('', 10, null),
        fuente('<b/>', 11, null), fuente('', 11, null),
        fuente('', 11, null, 'Aptos Narrow'), fuente('<b/>', 11, null, 'Aptos Narrow')
    ];
    const relleno = (rgb) => `<fill><patternFill patternType="solid"><fgColor rgb="${rgb}"/><bgColor indexed="64"/></patternFill></fill>`;
    const rellenos = [
        '<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>',
        relleno('FFFFFFFF'), relleno('FFAADB1E'), relleno('FFF2F4F5'), relleno('FF5B6770'), relleno('FFEEF7D2'), relleno('FFE3F1F7'), relleno('FFDAF2D0')
    ];
    const lado = (n) => `<${n} style="thin"><color rgb="FFD9DDE0"/></${n}>`;
    const bordes = [
        '<border><left/><right/><top/><bottom/><diagonal/></border>',
        `<border>${lado('left')}${lado('right')}${lado('top')}${lado('bottom')}<diagonal/></border>`
    ];
    // [numFmt, fuente, relleno, borde, alineación]
    const al = (h, v, wrap, indent) => `<alignment horizontal="${h}" vertical="${v}"${wrap ? ' wrapText="1"' : ''}${indent ? ` indent="${indent}"` : ''}/>`;
    const centro = al('center', 'center');
    const xfs = [
        [0, 0, 0, 0, ''], [0, 0, 2, 0, ''], [0, 1, 2, 0, ''], [0, 2, 2, 0, ''], [0, 3, 2, 0, ''], [0, 0, 3, 0, ''],
        [0, 4, 0, 0, ''], [0, 5, 4, 0, ''], [165, 5, 4, 0, al('left', 'bottom')],
        [0, 6, 5, 0, centro], [166, 7, 6, 0, centro], [165, 7, 6, 0, centro], [0, 7, 6, 0, centro],
        [0, 8, 5, 1, al('center', 'center', true)],
        [0, 9, 3, 1, centro], [0, 9, 3, 1, al('left', 'center')], [165, 9, 3, 1, centro], [166, 9, 3, 1, centro],
        [0, 5, 0, 1, centro], [0, 5, 0, 1, al('left', 'center', true, 1)], [165, 5, 0, 1, centro],
        [0, 5, 0, 1, al('left', 'center', true)], [166, 5, 0, 1, centro],
        [0, 4, 0, 0, ''], [0, 10, 0, 0, ''], [0, 11, 5, 0, ''], [165, 12, 0, 0, ''], [0, 12, 0, 0, ''],
        [0, 10, 0, 0, ''], [0, 13, 0, 0, ''], [0, 14, 0, 0, ''],
        [0, 10, 7, 1, centro], [0, 10, 0, 1, al('left', 'center', false, 1)],
        // tablas de reportes (como las guías de Reporte/): Aptos Narrow 11, encabezado centrado con ajuste de texto,
        // texto con ajuste, fecha dd/mm/aaaa, porcentaje y número alineados a la derecha
        [0, 16, 0, 0, al('center', 'center', true)], [0, 15, 0, 0, '<alignment wrapText="1"/>'],
        [165, 15, 0, 0, '<alignment horizontal="right" wrapText="1"/>'], [167, 15, 0, 0, '<alignment horizontal="right" wrapText="1"/>'],
        [0, 15, 0, 0, '<alignment horizontal="right" wrapText="1"/>'], [0, 16, 8, 0, al('center', 'center', true)]
    ].map(([nf, fu, re, bo, a]) =>
        `<xf numFmtId="${nf}" fontId="${fu}" fillId="${re}" borderId="${bo}" xfId="0" applyNumberFormat="1" applyFont="1" applyFill="1" applyBorder="1"${a ? ' applyAlignment="1">' + a + '</xf>' : '/>'}`);
    const dxf = (b, i, color, fondo) =>
        `<dxf><font>${b ? '<b/>' : ''}${i ? '<i/>' : ''}<color rgb="${color}"/></font>${fondo ? `<fill><patternFill><bgColor rgb="${fondo}"/></patternFill></fill>` : ''}</dxf>`;
    const dxfs = [dxf(1, 0, 'FF3E5A00', 'FFD8EFB0'), dxf(1, 0, 'FF7F6000', 'FFFFF2CC'), dxf(1, 0, 'FF9C3B00', 'FFFBE2D5'), dxf(0, 1, 'FF9AA3AA', null), '<dxf><fill><patternFill><bgColor rgb="FFE3F1F7"/></patternFill></fill></dxf>'];
    return `${CABECERA_XML}<styleSheet xmlns="${NS_MAIN}">` +
        '<numFmts count="3"><numFmt numFmtId="165" formatCode="dd/mm/yyyy"/><numFmt numFmtId="166" formatCode="0%"/><numFmt numFmtId="167" formatCode="0.00%"/></numFmts>' +
        `<fonts count="${fuentes.length}">${fuentes.join('')}</fonts><fills count="${rellenos.length}">${rellenos.join('')}</fills>` +
        `<borders count="${bordes.length}">${bordes.join('')}</borders>` +
        '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>' +
        `<cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs>` +
        '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
        `<dxfs count="${dxfs.length}">${dxfs.join('')}</dxfs></styleSheet>`;
})();

// ---------- Imágenes ----------

/** Alto y ancho en píxeles leyendo la cabecera PNG o JPEG. */
export function dimensionesImagen(bytes) {
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        const v = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
        return { w: v.getUint32(16), h: v.getUint32(20) };
    }
    let i = 2;
    while (i < bytes.length - 9) {
        if (bytes[i] !== 0xff) {
            i += 1;
        } else {
            const marca = bytes[i + 1];
            if (marca >= 0xc0 && marca <= 0xcf && marca !== 0xc4 && marca !== 0xc8 && marca !== 0xcc) {
                return { h: (bytes[i + 5] << 8) | bytes[i + 6], w: (bytes[i + 7] << 8) | bytes[i + 8] };
            }
            i += 2 + ((bytes[i + 2] << 8) | bytes[i + 3]);
        }
    }
    return { w: 1, h: 1 };
}

const EMU_PX = 9525;

function ajustar(dim, maxW, maxH) {
    const k = Math.min(maxW / dim.w, maxH / dim.h);
    return { w: Math.round(dim.w * k), h: Math.round(dim.h * k) };
}

// ---------- Zip (sin compresión) ----------

const TABLA_CRC = (() => {
    const t = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
        let c = n;
        for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        t[n] = c >>> 0;
    }
    return t;
})();

function crc32(bytes) {
    let c = 0xffffffff;
    for (let i = 0; i < bytes.length; i += 1) c = TABLA_CRC[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
}

const FECHA_DOS = ((2026 - 1980) << 9) | (1 << 5) | 1;

function empaquetar(archivos) {
    const enc = new TextEncoder();
    const partes = archivos.map((a) => ({
        nombre: enc.encode(a.nombre),
        datos: typeof a.datos === 'string' ? enc.encode(a.datos) : a.datos
    }));
    let tamano = 22;
    partes.forEach((p) => { tamano += 30 + p.nombre.length + p.datos.length + 46 + p.nombre.length; });
    const out = new Uint8Array(tamano);
    const v = new DataView(out.buffer);
    let pos = 0;
    const centrales = [];
    partes.forEach((p) => {
        const crc = crc32(p.datos);
        const offset = pos;
        v.setUint32(pos, 0x04034b50, true); v.setUint16(pos + 4, 20, true); v.setUint16(pos + 6, 0x0800, true);
        v.setUint16(pos + 8, 0, true); v.setUint16(pos + 10, 0, true); v.setUint16(pos + 12, FECHA_DOS, true);
        v.setUint32(pos + 14, crc, true); v.setUint32(pos + 18, p.datos.length, true); v.setUint32(pos + 22, p.datos.length, true);
        v.setUint16(pos + 26, p.nombre.length, true); v.setUint16(pos + 28, 0, true);
        out.set(p.nombre, pos + 30);
        out.set(p.datos, pos + 30 + p.nombre.length);
        pos += 30 + p.nombre.length + p.datos.length;
        centrales.push({ p, crc, offset });
    });
    const inicioCentral = pos;
    centrales.forEach(({ p, crc, offset }) => {
        v.setUint32(pos, 0x02014b50, true); v.setUint16(pos + 4, 20, true); v.setUint16(pos + 6, 20, true);
        v.setUint16(pos + 8, 0x0800, true); v.setUint16(pos + 10, 0, true); v.setUint16(pos + 12, 0, true);
        v.setUint16(pos + 14, FECHA_DOS, true); v.setUint32(pos + 16, crc, true);
        v.setUint32(pos + 20, p.datos.length, true); v.setUint32(pos + 24, p.datos.length, true);
        v.setUint16(pos + 28, p.nombre.length, true); v.setUint32(pos + 42, offset, true);
        out.set(p.nombre, pos + 46);
        pos += 46 + p.nombre.length;
    });
    v.setUint32(pos, 0x06054b50, true); v.setUint16(pos + 8, partes.length, true); v.setUint16(pos + 10, partes.length, true);
    v.setUint32(pos + 12, pos - inicioCentral, true); v.setUint32(pos + 16, inicioCentral, true);
    return out;
}

// ---------- Hoja "Plan de trabajo" ----------

const ANCHOS = [6, 60, 12, 13, 13, 40, 11, 14, 36]; // A..I
const pxColumna = (ancho) => Math.trunc(ancho * 7 + 5);
const pxFila = (pt) => Math.round((pt * 96) / 72);
const ALTOS_ENCABEZADO = [21.75, 21.75, 21.75, 21.75, 4.5];

function normalizarEstatus(e) {
    return ESTATUS.includes(e) ? e : ESTATUS[0];
}

function limitarAvance(a) {
    const n = Number(a);
    if (!Number.isFinite(n)) return 0;
    return Math.min(1, Math.max(0, n));
}

function construirPlan(plan, inhabiles) {
    const h = new Hoja();
    const fechaGen = isoASerial(plan.fechaGeneracion) || isoASerial(new Date().toISOString());
    const texto = (v) => (v === null || v === undefined ? '' : String(v));

    // Encabezado: filas 1-4 blancas, fila 5 franja verde
    for (let f = 1; f <= 5; f += 1) {
        h.alto(f, ALTOS_ENCABEZADO[f - 1]);
        h.estiloFila(f, f === 5 ? S.franja : S.fondo);
    }
    h.texto(3, 1, 'PLAN DE TRABAJO', S.titulo);
    h.texto(3, 2, plan.solucion || '', S.solucion);
    h.texto(3, 3, plan.cliente || '', S.cliente);
    // K1 (columna oculta): nombre corto del cliente. Las filas cuyo "Asignado a" lo menciona se pintan en azul claro.
    h.texto(11, 1, plan.nombreCorto || plan.cliente || '', S.base);

    // Ficha (filas 7-12): cada lado puede ir vacío
    const lado = (fila, c1, c2, etiqueta, valor, esFecha) => {
        if (etiqueta === null) return;
        h.texto(c1, fila, etiqueta, S.fichaEtiqueta);
        h.vacia(c1 + 1, fila, S.fichaEtiqueta);
        const v = c1 === 1 ? 3 : 8;
        const hasta = c1 === 1 ? 5 : 9;
        if (esFecha) h.numero(v, fila, valor, S.fichaFecha);
        else h.texto(v, fila, texto(valor), S.fichaValor);
        for (let c = v + 1; c <= hasta; c += 1) h.vacia(c, fila, esFecha ? S.fichaFecha : S.fichaValor);
        h.combinar(`${letra(c1)}${fila}:${letra(c1 + 1)}${fila}`);
        h.combinar(`${letra(v)}${fila}:${letra(hasta)}${fila}`);
    };
    const ficha = (fila, izq, der) => {
        h.alto(fila, fila === 12 ? 15 : 18);
        lado(fila, 1, 5, izq ? izq[0] : null, izq ? izq[1] : null, false);
        lado(fila, 6, 9, der ? der[0] : null, der ? der[1] : null, !!(der && der[2]));
    };
    ficha(7, ['Cliente', plan.cliente], ['Tipo', plan.tipo]);
    ficha(8, ['Proyecto', plan.proyecto], ['Solución', plan.solucion]);
    ficha(9, ['Responsable Brivé', plan.responsable], ['Contacto cliente', plan.contacto]);
    ficha(10, ['Participantes', plan.participantes], ['Horas contratadas', plan.horasContratadas]);
    ficha(11, ['Estado del proyecto', plan.estadoProyecto], null);
    ficha(12, null, ['Fecha de generación', fechaGen, true]);

    // Filas del plan
    h.alto(FILA_ENCABEZADO, 30);
    ['#', 'Etapa / Actividad', 'Duración\n(días háb.)', 'Inicia', 'Finaliza', 'Asignado a', 'Avance', 'Estatus', 'Comentarios']
        .forEach((t, i) => h.texto(i + 1, FILA_ENCABEZADO, t, S.encabezado));

    let fila = PRIMERA_FILA;
    const rangosValidacion = [];
    const filasActividad = []; // filas de actividad, para el avance general
    const todas = []; // actividades con valores calculados, para los KPIs
    const fases = plan.fases || [];

    fases.forEach((fase, i) => {
        const filaFase = fila;
        const acts = fase.actividades || [];
        const nombreFase = (fase.nombre || '').toLocaleUpperCase('es-MX');
        h.alto(filaFase, 19.5);
        h.texto(1, filaFase, String(i + 1), S.faseCentro);
        h.texto(2, filaFase, nombreFase, S.faseTexto);

        if (!acts.length) {
            // etapa sin actividades seleccionadas: se muestra igual, sin fórmulas que den error
            h.vacia(3, filaFase, S.faseCentro);
            h.texto(4, filaFase, POR_DEFINIR, S.faseFecha);
            h.texto(5, filaFase, POR_DEFINIR, S.faseFecha);
            h.vacia(6, filaFase, S.faseTexto);
            h.vacia(7, filaFase, S.fasePct);
            h.vacia(8, filaFase, S.faseCentro);
            h.vacia(9, filaFase, S.faseTexto);
            const vacio = filaFase + 1;
            h.alto(vacio, 15);
            for (let c = 1; c <= 9; c += 1) h.vacia(c, vacio, S.sinActividades);
            h.texto(2, vacio, 'Sin actividades seleccionadas', S.sinActividades);
            fila = vacio + 1;
            return;
        }

        const ini = filaFase + 1;
        const fin = filaFase + acts.length;
        rangosValidacion.push(`${ini}:${fin}`);
        const calc = [];

        acts.forEach((act, j) => {
            const r = ini + j;
            const serialInicio = isoASerial(act.inicia);
            const serialFinGuardado = isoASerial(act.fin);
            let duracion = Number.isFinite(Number(act.duracion)) && act.duracion !== null && act.duracion !== '' ? Number(act.duracion) : null;
            // si Salesforce guarda una fecha de fin, manda sobre la duración: los días hábiles entre ambas (con los días inhábiles del archivo)
            if (serialInicio !== null && serialFinGuardado !== null && serialFinGuardado >= serialInicio) {
                duracion = networkdays(serialInicio, serialFinGuardado, inhabiles);
            }
            const serialFin = serialInicio !== null ? workday(serialInicio, Math.max(duracion || 0, 1) - 1, inhabiles) : null;
            const avance = limitarAvance(act.avance);
            const estatus = normalizarEstatus(act.estatus);
            calc.push({ serialInicio, serialFin, avance, estatus });
            todas.push({ serialInicio, serialFin, estatus, avance });
            filasActividad.push(r);

            h.alto(r, 15);
            h.texto(1, r, `${i + 1}.${j + 1}`, S.actCentro);
            h.texto(2, r, act.nombre || '', S.actNombre);
            if (duracion !== null) h.numero(3, r, duracion, S.actCentro); else h.vacia(3, r, S.actCentro);
            h.textoONumero(4, r, serialInicio !== null ? serialInicio : POR_DEFINIR, S.actFecha);
            h.formula(5, r, `IF(ISNUMBER(D${r}),WORKDAY(D${r},MAX(C${r},1)-1,DiasInhabiles),"${POR_DEFINIR}")`,
                serialFin !== null ? serialFin : POR_DEFINIR, S.actFecha);
            if (act.asignado) h.texto(6, r, act.asignado, S.actTexto); else h.vacia(6, r, S.actTexto);
            h.numero(7, r, avance, S.actPct);
            h.texto(8, r, estatus, S.actCentro);
            if (act.comentarios) h.texto(9, r, act.comentarios, S.actTexto); else h.vacia(9, r, S.actTexto);
        });

        // Fila de etapa: todo calculado desde sus actividades
        const rango = (c) => `${c}${ini}:${c}${fin}`;
        const inicios = calc.filter((c) => c.serialInicio !== null).map((c) => c.serialInicio);
        const finales = calc.filter((c) => c.serialFin !== null).map((c) => c.serialFin);
        const minI = inicios.length ? Math.min(...inicios) : null;
        const maxF = finales.length ? Math.max(...finales) : null;
        const todosFechas = inicios.concat(finales);
        const duracionFase = todosFechas.length ? networkdays(Math.min(...todosFechas), Math.max(...todosFechas), inhabiles) : '';
        const prom = calc.reduce((x, c) => x + c.avance, 0) / calc.length;
        const n = calc.length;
        const cuenta = (e) => calc.filter((c) => c.estatus === e).length;
        const estatusFase = cuenta('Finalizado') === n ? 'Finalizado' : cuenta('Sin iniciar') === n ? 'Sin iniciar' : 'En proceso';

        h.formula(3, filaFase, `IF(COUNT(D${ini}:E${fin})=0,"",NETWORKDAYS(MIN(D${ini}:E${fin}),MAX(D${ini}:E${fin}),DiasInhabiles))`, duracionFase, S.faseCentro);
        h.formula(4, filaFase, `IF(COUNT(${rango('D')})=0,"${POR_DEFINIR}",MIN(${rango('D')}))`, minI !== null ? minI : POR_DEFINIR, S.faseFecha);
        h.formula(5, filaFase, `IF(COUNT(${rango('E')})=0,"${POR_DEFINIR}",MAX(${rango('E')}))`, maxF !== null ? maxF : POR_DEFINIR, S.faseFecha);
        h.vacia(6, filaFase, S.faseTexto);
        h.formula(7, filaFase, `AVERAGE(${rango('G')})`, prom, S.fasePct);
        h.formula(8, filaFase, `IF(COUNTIF(${rango('H')},"Finalizado")=${n},"Finalizado",IF(COUNTIF(${rango('H')},"Sin iniciar")=${n},"Sin iniciar","En proceso"))`, estatusFase, S.faseCentro);
        h.vacia(9, filaFase, S.faseTexto);
        fila = fin + 1;
    });

    if (!fases.length) {
        h.alto(PRIMERA_FILA, 15);
        h.texto(2, PRIMERA_FILA, 'Sin actividades registradas en Salesforce', S.sinActividades);
        fila = PRIMERA_FILA + 1;
    }
    const ultima = fila - 1;

    // KPIs (filas 14-15) y nota de color (fila 16)
    h.alto(14, 18);
    h.alto(15, 25.5);
    const kpi = (c1, c2, etiqueta, fx, cache, estilo) => {
        h.texto(c1, 14, etiqueta, S.kpiEtiqueta);
        for (let c = c1 + 1; c <= c2; c += 1) h.vacia(c, 14, S.kpiEtiqueta);
        if (fx === null) h.numero(c1, 15, cache, estilo);
        else h.formula(c1, 15, fx, cache, estilo);
        for (let c = c1 + 1; c <= c2; c += 1) h.vacia(c, 15, estilo);
        h.combinar(`${letra(c1)}14:${letra(c2)}14`);
        h.combinar(`${letra(c1)}15:${letra(c2)}15`);
    };
    const iniciosTodos = todas.filter((t) => t.serialInicio !== null).map((t) => t.serialInicio);
    const finesTodos = todas.filter((t) => t.serialFin !== null).map((t) => t.serialFin);
    const promGeneral = todas.length ? todas.reduce((x, t) => x + t.avance, 0) / todas.length : 0;
    const finalizadas = todas.filter((t) => t.estatus === 'Finalizado').length;
    const rA = `A${PRIMERA_FILA}:A${ultima}`;
    // el avance general es el promedio de las actividades (no de las etapas)
    kpi(1, 2, 'Avance general',
        filasActividad.length ? `AVERAGE(${filasActividad.map((r) => `G${r}`).join(',')})` : null, promGeneral, S.kpiPct);
    kpi(3, 5, 'Inicio del proyecto', `IF(COUNT(D${PRIMERA_FILA}:D${ultima})=0,"${POR_DEFINIR}",MIN(D${PRIMERA_FILA}:D${ultima}))`,
        iniciosTodos.length ? Math.min(...iniciosTodos) : POR_DEFINIR, S.kpiFecha);
    kpi(6, 7, 'Fin estimado', `IF(COUNT(E${PRIMERA_FILA}:E${ultima})=0,"${POR_DEFINIR}",MAX(E${PRIMERA_FILA}:E${ultima}))`,
        finesTodos.length ? Math.max(...finesTodos) : POR_DEFINIR, S.kpiFecha);
    // se cuentan solo actividades (su # es "1.1", "2.3"...), no las filas de etapa
    kpi(8, 9, 'Actividades finalizadas',
        `COUNTIFS(H${PRIMERA_FILA}:H${ultima},"Finalizado",${rA},"*.*")&" de "&COUNTIF(${rA},"*.*")`,
        `${finalizadas} de ${todas.length}`, S.kpiTexto);
    h.alto(16, 15);
    h.texto(9, 16, 'Actividad con participación del cliente', S.leyendaAzul);

    // Leyenda al pie
    const l0 = ultima + 2;
    h.alto(l0, 15);
    h.texto(1, l0, 'Cómo usar esta plantilla', S.leyendaTitulo);
    [
        'Generada desde Salesforce (Implementaciones). Etapas fijas: Kickoff, Planeación, Ejecución, Análisis y Entrega final. Las filas verdes se calculan solas.',
        'Ejecución y Análisis muestran solo las actividades marcadas en Salesforce para esta solución. Las filas en azul claro requieren participación del cliente.',
        'Edita Duración, Inicia, Asignado a, Avance, Estatus y Comentarios. \'Finaliza\' se calcula en días hábiles (ver hoja \'Días inhábiles\'). Fechas sin capturar = \'Por definir\'.',
        'Lo que edites aquí no regresa a Salesforce: este archivo es una copia de trabajo.'
    ].forEach((t, i) => {
        const r = l0 + 1 + i;
        h.alto(r, 15);
        h.texto(1, r, t, S.leyenda);
        h.combinar(`A${r}:I${r}`);
    });
    const ultimaImpresion = l0 + 4;

    return { h, ultima, ultimaImpresion, rangosValidacion };
}

function anclaPorPixel(xpx, ypx) {
    let col = 0;
    let x = xpx;
    while (col < ANCHOS.length - 1 && x >= pxColumna(ANCHOS[col])) { x -= pxColumna(ANCHOS[col]); col += 1; }
    let fila = 0;
    let y = ypx;
    while (fila < ALTOS_ENCABEZADO.length - 1 && y >= pxFila(ALTOS_ENCABEZADO[fila])) { y -= pxFila(ALTOS_ENCABEZADO[fila]); fila += 1; }
    return { col, colOff: x * EMU_PX, fila, filaOff: y * EMU_PX };
}

function dibujo(imagenes) {
    const total = ANCHOS.reduce((s, a) => s + pxColumna(a), 0);
    const anclas = imagenes.map((img, i) => {
        const dim = dimensionesImagen(img.bytes);
        const caja = img.lado === 'izq' ? ajustar(dim, 160, 62) : ajustar(dim, 220, 78);
        const x = img.lado === 'izq' ? 0 : total - caja.w - 8;
        const y = img.lado === 'izq' ? 0 : Math.max(0, Math.round((87 - caja.h) / 2));
        const a = anclaPorPixel(x, y);
        return `<xdr:oneCellAnchor><xdr:from><xdr:col>${a.col}</xdr:col><xdr:colOff>${a.colOff}</xdr:colOff><xdr:row>${a.fila}</xdr:row><xdr:rowOff>${a.filaOff}</xdr:rowOff></xdr:from>` +
            `<xdr:ext cx="${caja.w * EMU_PX}" cy="${caja.h * EMU_PX}"/><xdr:pic><xdr:nvPicPr><xdr:cNvPr id="${i + 2}" name="${esc(img.nombre)}" descr="${esc(img.nombre)}"/><xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr></xdr:nvPicPr>` +
            `<xdr:blipFill><a:blip r:embed="rId${i + 1}"/><a:stretch><a:fillRect/></a:stretch></xdr:blipFill>` +
            `<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="${caja.w * EMU_PX}" cy="${caja.h * EMU_PX}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr></xdr:pic><xdr:clientData/></xdr:oneCellAnchor>`;
    });
    return `${CABECERA_XML}<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="${NS_REL}">${anclas.join('')}</xdr:wsDr>`;
}

function hojaPlanXml(p, hayDibujo) {
    const { h, ultima, ultimaImpresion, rangosValidacion } = p;
    const cols = ANCHOS.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('') +
        '<col min="11" max="11" width="13" customWidth="1" hidden="1"/>';
    const sqref = (c) => rangosValidacion.map((r) => { const [a, b] = r.split(':'); return `${c}${a}:${c}${b}`; }).join(' ');
    const validaciones = rangosValidacion.length
        ? '<dataValidations count="2">' +
          `<dataValidation type="list" allowBlank="1" showErrorMessage="1" errorTitle="Estatus no válido" error="Elige un estatus del catálogo" sqref="${sqref('H')}"><formula1>${HOJA_CAT}!$A$2:$A$5</formula1></dataValidation>` +
          `<dataValidation type="decimal" operator="between" allowBlank="0" showErrorMessage="1" errorTitle="Avance no válido" error="Captura un % entre 0% y 100%" sqref="${sqref('G')}"><formula1>0</formula1><formula2>1</formula2></dataValidation>` +
          '</dataValidations>'
        : '';
    const cond =
        // filas donde participa el cliente: "Asignado a" menciona el nombre corto que está en K1 (solo actividades, no filas de etapa)
        `<conditionalFormatting sqref="A${PRIMERA_FILA}:G${ultima} I${PRIMERA_FILA}:I${ultima}"><cfRule type="expression" dxfId="4" priority="1"><formula>AND(ISTEXT($A${PRIMERA_FILA}),ISNUMBER(SEARCH($K$1,$F${PRIMERA_FILA})))</formula></cfRule></conditionalFormatting>` +
        `<conditionalFormatting sqref="H${PRIMERA_FILA}:H${ultima}">` +
        '<cfRule type="cellIs" dxfId="0" priority="2" operator="equal"><formula>"Finalizado"</formula></cfRule>' +
        '<cfRule type="cellIs" dxfId="1" priority="3" operator="equal"><formula>"En proceso"</formula></cfRule>' +
        '<cfRule type="cellIs" dxfId="2" priority="4" operator="equal"><formula>"En pausa"</formula></cfRule></conditionalFormatting>' +
        `<conditionalFormatting sqref="D${PRIMERA_FILA}:E${ultima}"><cfRule type="cellIs" dxfId="3" priority="5" operator="equal"><formula>"${POR_DEFINIR}"</formula></cfRule></conditionalFormatting>` +
        `<conditionalFormatting sqref="G${PRIMERA_FILA}:G${ultima}"><cfRule type="dataBar" priority="6"><dataBar minLength="10" maxLength="90"><cfvo type="num" val="0"/><cfvo type="num" val="1"/><color rgb="FFAADB1E"/></dataBar></cfRule></conditionalFormatting>`;
    return `${CABECERA_XML}<worksheet xmlns="${NS_MAIN}" xmlns:r="${NS_REL}">` +
        '<sheetPr><pageSetUpPr fitToPage="1"/></sheetPr>' +
        `<dimension ref="A1:K${ultimaImpresion}"/>` +
        `<sheetViews><sheetView showGridLines="0" tabSelected="1" workbookViewId="0"><pane xSplit="2" ySplit="${FILA_ENCABEZADO}" topLeftCell="C${PRIMERA_FILA}" activePane="bottomRight" state="frozen"/>` +
        `<selection pane="topRight"/><selection pane="bottomLeft"/><selection pane="bottomRight" activeCell="C${PRIMERA_FILA}" sqref="C${PRIMERA_FILA}"/></sheetView></sheetViews>` +
        '<sheetFormatPr defaultRowHeight="15"/>' +
        `<cols>${cols}</cols><sheetData>${h.datosXml()}</sheetData>${h.combinadasXml()}${cond}${validaciones}` +
        '<pageMargins left="0.75" right="0.75" top="1" bottom="1" header="0.5" footer="0.5"/>' +
        '<pageSetup paperSize="1" orientation="landscape" fitToWidth="1" fitToHeight="0"/>' +
        `${hayDibujo ? '<drawing r:id="rId1"/>' : ''}</worksheet>`;
}

// ---------- Hojas auxiliares ----------

function hojaDiasXml(dias) {
    const h = new Hoja();
    h.texto(1, 1, 'Fecha', S.hojaEnc);
    h.texto(2, 1, 'Motivo', S.hojaEnc);
    dias.forEach((d, i) => {
        h.numero(1, i + 2, d.serial, S.hojaFecha);
        h.texto(2, i + 2, d.motivo || '', S.hojaTexto);
    });
    h.texto(4, 2, `Agrega aquí vacaciones o días no laborables del proyecto (hasta la fila ${MAX_DIAS_INHABILES + 1}).`, S.hojaNota);
    return `${CABECERA_XML}<worksheet xmlns="${NS_MAIN}"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>` +
        '<cols><col min="1" max="1" width="14" customWidth="1"/><col min="2" max="2" width="46" customWidth="1"/><col min="4" max="4" width="70" customWidth="1"/></cols>' +
        `<sheetData>${h.datosXml()}</sheetData></worksheet>`;
}

function hojaCatalogosXml() {
    const h = new Hoja();
    h.texto(1, 1, 'Estatus', S.catEnc);
    ESTATUS.forEach((e, i) => h.texto(1, i + 2, e, S.catTexto));
    return `${CABECERA_XML}<worksheet xmlns="${NS_MAIN}"><sheetViews><sheetView workbookViewId="0"/></sheetViews><sheetFormatPr defaultRowHeight="15"/>` +
        `<sheetData>${h.datosXml()}</sheetData></worksheet>`;
}

// ---------- Libro ----------

export function generarXlsx(plan, logos) {
    const anios = new Set();
    (plan.fases || []).forEach((f) => (f.actividades || []).forEach((a) => { if (a.inicia) anios.add(Number(a.inicia.slice(0, 4))); }));
    const base = anios.size ? Math.min(...anios) : Number((plan.fechaGeneracion || new Date().toISOString()).slice(0, 4));
    const fin = anios.size ? Math.max(...anios) + 1 : base + 1;
    const lista = plan.diasInhabiles || diasFestivosMexico(Array.from({ length: fin - base + 1 }, (_, i) => base + i));
    const dias = lista
        .map((d) => ({ serial: isoASerial(d.fecha), motivo: d.motivo }))
        .filter((d) => d.serial !== null)
        .sort((a, b) => a.serial - b.serial)
        .slice(0, MAX_DIAS_INHABILES);
    const inhabiles = new Set(dias.map((d) => d.serial));

    const construido = construirPlan(plan, inhabiles);
    const imagenes = [];
    if (logos && logos.brive) imagenes.push({ ...logos.brive, lado: 'izq', nombre: 'Logo Brivé' });
    if (logos && logos.solucion) imagenes.push({ ...logos.solucion, lado: 'der', nombre: 'Logo de la solución' });

    const archivos = [];
    const tipos = new Set(imagenes.map((i) => i.ext));
    archivos.push({
        nombre: '[Content_Types].xml',
        datos: `${CABECERA_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
            `${tipos.has('png') ? '<Default Extension="png" ContentType="image/png"/>' : ''}${tipos.has('jpeg') ? '<Default Extension="jpeg" ContentType="image/jpeg"/>' : ''}` +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            [1, 2, 3].map((n) => `<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' +
            `${imagenes.length ? '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>' : ''}</Types>`
    });
    archivos.push({
        nombre: '_rels/.rels',
        datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    });
    archivos.push({
        nombre: 'xl/workbook.xml',
        datos: `${CABECERA_XML}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>` +
            `<sheet name="${HOJA_PLAN}" sheetId="1" r:id="rId1"/><sheet name="${HOJA_DIAS}" sheetId="2" r:id="rId2"/><sheet name="${HOJA_CAT}" sheetId="3" state="hidden" r:id="rId3"/></sheets><definedNames>` +
            `<definedName name="_xlnm.Print_Area" localSheetId="0">'${HOJA_PLAN}'!$A$1:$I$${construido.ultimaImpresion}</definedName>` +
            `<definedName name="_xlnm.Print_Titles" localSheetId="0">'${HOJA_PLAN}'!$${FILA_ENCABEZADO}:$${FILA_ENCABEZADO}</definedName>` +
            `<definedName name="DiasInhabiles">'${HOJA_DIAS}'!$A$2:$A$${MAX_DIAS_INHABILES + 1}</definedName></definedNames><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>`
    });
    archivos.push({
        nombre: 'xl/_rels/workbook.xml.rels',
        datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            [1, 2, 3].map((n) => `<Relationship Id="rId${n}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${n}.xml"/>`).join('') +
            `<Relationship Id="rId4" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`
    });
    archivos.push({ nombre: 'xl/styles.xml', datos: ESTILOS_XML });
    archivos.push({ nombre: 'xl/worksheets/sheet1.xml', datos: hojaPlanXml(construido, imagenes.length > 0) });
    archivos.push({ nombre: 'xl/worksheets/sheet2.xml', datos: hojaDiasXml(dias) });
    archivos.push({ nombre: 'xl/worksheets/sheet3.xml', datos: hojaCatalogosXml() });
    if (imagenes.length) {
        archivos.push({
            nombre: 'xl/worksheets/_rels/sheet1.xml.rels',
            datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/drawing" Target="../drawings/drawing1.xml"/></Relationships>`
        });
        archivos.push({ nombre: 'xl/drawings/drawing1.xml', datos: dibujo(imagenes) });
        archivos.push({
            nombre: 'xl/drawings/_rels/drawing1.xml.rels',
            datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
                imagenes.map((img, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/image" Target="../media/image${i + 1}.${img.ext}"/>`).join('') + '</Relationships>'
        });
        imagenes.forEach((img, i) => archivos.push({ nombre: `xl/media/image${i + 1}.${img.ext}`, datos: img.bytes }));
    }
    return empaquetar(archivos);
}

/** "Plan de trabajo_[Cliente]_[Solución]_[AAAA-MM-DD].xlsx" sin caracteres que rompan nombres de archivo. */
export function nombreArchivo(cliente, solucion, fechaIso) {
    const limpio = (t) => String(t || '').replace(/[\\/:*?"<>|\u0000-\u001f]/g, '').replace(/\s+/g, ' ').trim() || 'Sin nombre';
    return `Plan de trabajo_${limpio(cliente)}_${limpio(solucion)}_${fechaIso}.xlsx`;
}

/**
 * Descarga el archivo en el navegador. Locker limita los tipos MIME del Blob: se prueban varios y, si ninguno pasa,
 * se usa un enlace data: en base64. `anfitrion` es un elemento del DOM del componente donde se agrega el enlace.
 */
export function descargarXlsx(bytes, nombre, anfitrion) {
    const tipos = ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/octet-stream', 'application/zip', ''];
    let href = null;
    for (const tipo of tipos) {
        try {
            href = URL.createObjectURL(tipo ? new Blob([bytes], { type: tipo }) : new Blob([bytes]));
            break;
        } catch (e) {
            href = null;
        }
    }
    if (!href) {
        let binario = '';
        for (let i = 0; i < bytes.length; i += 8192) binario += String.fromCharCode.apply(null, bytes.subarray(i, i + 8192));
        href = 'data:application/octet-stream;base64,' + btoa(binario);
    }
    const enlace = document.createElement('a');
    enlace.href = href;
    enlace.download = nombre;
    anfitrion.appendChild(enlace);
    enlace.click();
    enlace.remove();
}

// ---------- Reportes en tabla (encabezado + filas, con autofiltro) ----------

const MAX_ANCHO_COLUMNA = 60;
const MIN_ANCHO_COLUMNA = 10;

/** Nombre de hoja válido en Excel: sin []:*?/\ y de hasta 31 caracteres. */
function nombreHoja(nombre, posicion) {
    const limpio = String(nombre || '').replace(/[[\]:*?/\\]/g, '').trim().slice(0, 31);
    return limpio || `Hoja ${posicion}`;
}

/** Ancho (en caracteres) que deja legible el encabezado y el contenido más largo, con tope. */
function anchoColumna(columna, indice, filas) {
    let max = String(columna.encabezado || '').length + 3; // el botón del autofiltro ocupa lugar
    if (columna.tipo === 'fecha') max = Math.max(max, 12);
    else if (columna.tipo !== 'numero' && columna.tipo !== 'porcentaje') {
        for (let i = 0; i < filas.length; i += 1) {
            const v = filas[i][indice];
            if (v !== null && v !== undefined) {
                const largo = String(v).length;
                if (largo > max) max = largo;
            }
        }
    }
    return Math.min(MAX_ANCHO_COLUMNA, Math.max(MIN_ANCHO_COLUMNA, max + 1));
}

function celdaTabla(col, fila, columna, valor) {
    const r = ref(col, fila);
    if (valor === null || valor === undefined || valor === '') return '';
    if (columna.tipo === 'fecha') {
        const serial = isoASerial(String(valor));
        return serial === null ? '' : `<c r="${r}" s="${S.tablaFecha}"><v>${serial}</v></c>`;
    }
    if (columna.tipo === 'numero' || columna.tipo === 'porcentaje') {
        const n = Number(valor);
        if (!Number.isFinite(n)) return '';
        return `<c r="${r}" s="${columna.tipo === 'porcentaje' ? S.tablaPorcentaje : S.tablaNumero}"><v>${n}</v></c>`;
    }
    return `<c r="${r}" s="${S.tablaTexto}" t="inlineStr"><is><t xml:space="preserve">${esc(valor)}</t></is></c>`;
}

function hojaTablaXml(hoja, seleccionada) {
    const columnas = hoja.columnas;
    const filas = hoja.filas;
    const ultima = letra(columnas.length);
    const total = filas.length + 1;
    const partes = [
        `${CABECERA_XML}<worksheet xmlns="${NS_MAIN}"><dimension ref="A1:${ultima}${total}"/>`,
        `<sheetViews><sheetView showGridLines="0" ${seleccionada ? 'tabSelected="1" ' : ''}workbookViewId="0"/></sheetViews>`,
        '<sheetFormatPr baseColWidth="10" defaultRowHeight="14.4"/>',
        `<cols>${columnas.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${(hoja.anchos && hoja.anchos[i]) || anchoColumna(c, i, filas)}" customWidth="1"/>`).join('')}</cols>`,
        '<sheetData>',
        `<row r="1"${hoja.altoEncabezado ? ` ht="${hoja.altoEncabezado}" customHeight="1"` : ''}>${columnas.map((c, i) => `<c r="${ref(i + 1, 1)}" s="${hoja.relleno ? S.tablaEncabezadoRelleno : S.tablaEncabezado}" t="inlineStr"><is><t xml:space="preserve">${esc(c.encabezado)}</t></is></c>`).join('')}</row>`
    ];
    for (let f = 0; f < filas.length; f += 1) {
        const fila = filas[f];
        let celdas = '';
        for (let c = 0; c < columnas.length; c += 1) celdas += celdaTabla(c + 1, f + 2, columnas[c], fila[c]);
        partes.push(`<row r="${f + 2}">${celdas}</row>`);
    }
    partes.push(`</sheetData><autoFilter ref="A1:${ultima}${total}"/></worksheet>`);
    return partes.join('');
}

/**
 * .xlsx de reportes: una hoja por elemento de `hojas`, con la fila 1 en negritas y autofiltro, fechas reales dd/mm/aaaa,
 * números como número y anchos de columna legibles.
 *   hojas = [{ nombre, columnas: [{ encabezado, tipo: 'texto'|'fecha'|'numero'|'porcentaje' }],
 *              filas: [[valor, ...]],     // fecha = 'AAAA-MM-DD'; vacío = null
 *              anchos?: [ancho por columna], altoEncabezado?: puntos, relleno?: encabezado con relleno verde claro }]
 * Devuelve Uint8Array con el archivo.
 */
export function generarXlsxTabla(hojas) {
    const nombres = hojas.map((h, i) => nombreHoja(h.nombre, i + 1));
    const archivos = [];
    archivos.push({
        nombre: '[Content_Types].xml',
        datos: `${CABECERA_XML}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>' +
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>' +
            hojas.map((h, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join('') +
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/></Types>'
    });
    archivos.push({
        nombre: '_rels/.rels',
        datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="${NS_REL}/officeDocument" Target="xl/workbook.xml"/></Relationships>`
    });
    archivos.push({
        nombre: 'xl/workbook.xml',
        datos: `${CABECERA_XML}<workbook xmlns="${NS_MAIN}" xmlns:r="${NS_REL}"><bookViews><workbookView activeTab="0"/></bookViews><sheets>` +
            nombres.map((n, i) => `<sheet name="${esc(n)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('') + '</sheets><definedNames>' +
            hojas.map((h, i) => `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${esc(`'${nombres[i].replace(/'/g, "''")}'!$A$1:$${letra(h.columnas.length)}$${h.filas.length + 1}`)}</definedName>`).join('') +
            '</definedNames></workbook>'
    });
    archivos.push({
        nombre: 'xl/_rels/workbook.xml.rels',
        datos: `${CABECERA_XML}<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
            hojas.map((h, i) => `<Relationship Id="rId${i + 1}" Type="${NS_REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('') +
            `<Relationship Id="rId${hojas.length + 1}" Type="${NS_REL}/styles" Target="styles.xml"/></Relationships>`
    });
    archivos.push({ nombre: 'xl/styles.xml', datos: ESTILOS_XML });
    hojas.forEach((h, i) => archivos.push({ nombre: `xl/worksheets/sheet${i + 1}.xml`, datos: hojaTablaXml(h, i === 0) }));
    return empaquetar(archivos);
}
