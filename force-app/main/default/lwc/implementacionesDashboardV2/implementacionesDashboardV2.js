/*
 * Vista Dashboard del panel de implementaciones: las mismas cifras y gráficas del dashboard "Monitoreo Implementaciones tipo".
 * Lógica pura (sin DOM). Recibe las filas de ImplementacionesPanelV2Controller.obtenerDashboard (Implementaciones creadas
 * desde 2025, con su etapa real) y aplica a cada indicador las reglas de su reporte:
 *   - Año fiscal: cierre de la oportunidad desde el 2026-01-01 y antes del 2026-12-31. Lo usa el reporte principal
 *     (creadas, cuentas, completadas, canceladas, reprogramaciones, horas, estatus y detalle).
 *   - No iniciadas | no agendadas: etapa No iniciada o Back log.
 *   - Agendadas: etapa Kick Off, En Proceso o En Pausa, con fecha acordada.
 *   - En proceso: etapa En Proceso.
 *   - Por fecha acordada: fecha acordada desde el 2026-01-01.
 *   - Satisfacción: promedio de las que tienen satisfacción mayor a 0.01.
 *   - Horas contratadas vs consumidas: por cuenta, sin filtro de año.
 * Completadas = etapa "Entrega del Proyecto" (así la cuenta el reporte).
 */

export const INICIO_ANIO = "2026-01-01";
export const FIN_ANIO = "2026-12-31"; // el reporte usa "menor que": el 31 de diciembre queda fuera
const ETAPA_COMPLETADA = "Entrega del Proyecto";
const ETAPAS_NO_INICIADAS = ["No iniciada", "Back log"];
const ETAPAS_AGENDADAS = ["Kick Off", "En Proceso", "En Pausa"];
const MAX_CUENTAS_HORAS = 10;
const MAX_POLIZAS = 7;
export const PASO_FILAS = 25;

const MESES = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"];
const ETAPAS = [
  { etapa: "No iniciada", color: "#8a9aa4" },
  { etapa: "Back log", color: "#bdc7cd" },
  { etapa: "Agendada", color: "#4d8eb0" },
  { etapa: "Kick Off", color: "#185987" },
  { etapa: "Recepción de Insumos", color: "#6f8fa0" },
  { etapa: "En Proceso", color: "#a1a943" },
  { etapa: "En Pausa", color: "#c47b00" },
  { etapa: "Entrega Final", color: "#5f9c72" },
  { etapa: "Implementación Finalizada", color: "#17613b" },
  { etapa: "Entrega del Proyecto", color: "#2f8f5b" },
  { etapa: "Cancelada/o", color: "#a5221c" },
  { etapa: "No aplica", color: "#c9b8d6" }
];
const COLOR_OTRA_ETAPA = "#5b7180";
const COLORES_POLIZA = ["#176a7c", "#a1a943", "#185987", "#c47b00", "#17613b", "#a5221c", "#5f9c72", "#8a9aa4"];
const SIN_POLIZA = "Sin póliza";
const TEXTO_ORDEN = new Set(["empresa", "responsable", "nombre", "etapa", "solucion", "oportunidad", "centro", "vencimiento"]);

const fmtEnt = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 0 });
const fmtDec = new Intl.NumberFormat("es-MX", { maximumFractionDigits: 1 });
const entero = (n) => fmtEnt.format(n || 0);
const decimal = (n) => fmtDec.format(n || 0);
const suma = (lista, f) => lista.reduce((t, x) => t + (f(x) || 0), 0);
const pct = (n, total) => (total ? Math.round((n / total) * 100) : 0);
const colorEtapa = (e) => (ETAPAS.find((x) => x.etapa === e) || { color: COLOR_OTRA_ETAPA }).color;
const ordenEtapa = (e) => {
  const i = ETAPAS.findIndex((x) => x.etapa === e);
  return i === -1 ? ETAPAS.length : i;
};
const textoFecha = (v) => {
  if (!v) return "—";
  const [a, m, d] = String(v).slice(0, 10).split("-").map(Number);
  return a && m && d ? `${d} ${MESES[m - 1]} ${a}` : String(v);
};
const claveCuenta = (f) => f.cuentaId || f.empresa || f.id;

// ---------- reglas de cada reporte ----------

export const enAnio = (f) => !!f.cierre && f.cierre >= INICIO_ANIO && f.cierre < FIN_ANIO;
const noIniciadas = (filas) => filas.filter((f) => ETAPAS_NO_INICIADAS.includes(f.etapa));
const agendadas = (filas) => filas.filter((f) => ETAPAS_AGENDADAS.includes(f.etapa) && f.fechaAcordada);
const enProceso = (filas) => filas.filter((f) => f.etapa === "En Proceso");
const conSatisfaccion = (filas) => filas.filter((f) => f.satisfaccion > 0.01);

/** Registros que explican cada indicador (los mismos que su cifra). */
export function filasDeIndicador(filas, id) {
  const anio = filas.filter(enAnio);
  switch (id) {
    case "d-creadas":
    case "d-cuentas":
      return anio;
    case "d-noiniciadas":
      return noIniciadas(filas);
    case "d-agendadas":
      return agendadas(filas);
    case "d-enproceso":
      return enProceso(filas);
    case "d-completadas":
      return anio.filter((f) => f.etapa === ETAPA_COMPLETADA);
    case "d-canceladas":
      return anio.filter((f) => f.cancelada);
    case "d-reprogramaciones":
      return anio.filter((f) => f.reprogramaciones > 0);
    case "d-hcontratadas":
      return anio.filter((f) => f.horasContratadas > 0);
    case "d-hconsumidas":
      return anio.filter((f) => f.horasConsumidas > 0);
    case "d-hdisponibles":
      return anio.filter((f) => f.horasDisponibles > 0);
    case "d-satisfaccion":
      return conSatisfaccion(filas);
    default:
      return [];
  }
}

// ---------- tablas ----------

const horasTxt = (n) => (n === null || n === undefined ? "—" : decimal(n));
const COL_CUENTA = { campo: "empresa", etiqueta: "Cuenta", valor: (f) => f.empresa, texto: (f) => f.empresa || "—" };
const COL_NOMBRE = { campo: "nombre", etiqueta: "Implementación", valor: (f) => f.nombre, texto: (f) => f.nombre };
const COL_ETAPA = { campo: "etapa", etiqueta: "Etapa", valor: (f) => f.etapa, texto: (f) => f.etapa || "—" };
const COLS_HORAS = [
  { campo: "horasContratadas", etiqueta: "Contratadas", num: true, valor: (f) => f.horasContratadas, texto: (f) => horasTxt(f.horasContratadas) },
  { campo: "horasConsumidas", etiqueta: "Consumidas", num: true, valor: (f) => f.horasConsumidas, texto: (f) => horasTxt(f.horasConsumidas) },
  { campo: "horasDisponibles", etiqueta: "Disponibles", num: true, valor: (f) => f.horasDisponibles, texto: (f) => horasTxt(f.horasDisponibles) }
];
// "Detalle de Implementaciones"
const COLUMNAS_DETALLE = [
  { campo: "responsable", etiqueta: "Responsable", valor: (f) => f.responsable, texto: (f) => f.responsable || "—" },
  { campo: "creadoEn", etiqueta: "Fecha de creación", valor: (f) => f.creadoEn, texto: (f) => textoFecha(f.creadoEn) },
  { campo: "fechaAcordada", etiqueta: "Fecha acordada", valor: (f) => f.fechaAcordada, texto: (f) => textoFecha(f.fechaAcordada) },
  COL_NOMBRE,
  COL_ETAPA,
  { campo: "reprogramaciones", etiqueta: "Reprogramaciones", num: true, valor: (f) => f.reprogramaciones, texto: (f) => entero(f.reprogramaciones) },
  { campo: "vencimiento", etiqueta: "Vencimiento", valor: (f) => f.vencimiento, texto: (f) => f.vencimiento || "—" },
  ...COLS_HORAS
];
// "Seguimiento a Implementaciones" (no iniciadas, agendadas, en proceso) y el detalle de cada indicador
const COLUMNAS_SEGUIMIENTO = [
  COL_CUENTA,
  { campo: "cierre", etiqueta: "Cierre", valor: (f) => f.cierre, texto: (f) => textoFecha(f.cierre) },
  { campo: "solucion", etiqueta: "Solución adquirida", valor: (f) => f.solucion, texto: (f) => f.solucion || "—" },
  { campo: "oportunidad", etiqueta: "Oportunidad", valor: (f) => f.oportunidad, texto: (f) => f.oportunidad || "—" },
  { campo: "centro", etiqueta: "Propietario", valor: (f) => f.centro, texto: (f) => f.centro || "—" },
  COL_NOMBRE,
  COL_ETAPA,
  ...COLS_HORAS
];

function ordenar(filas, columna, asc) {
  const vacio = (x) => x === null || x === undefined || x === "";
  return [...filas].sort((a, b) => {
    const x = columna.valor(a);
    const y = columna.valor(b);
    if (vacio(x) || vacio(y)) return vacio(x) === vacio(y) ? 0 : vacio(x) ? 1 : -1;
    const c = columna.num ? x - y : String(x).localeCompare(String(y), "es");
    return asc ? c : -c;
  });
}

function armarTabla(clave, filas, columnas, ui) {
  const orden = ui.orden[clave];
  const columna = columnas.find((c) => c.campo === orden.campo) || columnas[0];
  const ordenadas = ordenar(filas, columna, orden.asc);
  const limite = ui.limite[clave] || PASO_FILAS;
  const visibles = ordenadas.slice(0, limite);
  return {
    clave,
    total: entero(filas.length),
    hay: filas.length > 0,
    hayMas: ordenadas.length > visibles.length,
    textoPaginacion: `Mostrando ${entero(visibles.length)} de ${entero(ordenadas.length)}`,
    encabezados: columnas.map((c) => {
      const activa = c.campo === columna.campo;
      return {
        campo: c.campo,
        etiqueta: c.etiqueta,
        clase: c.num ? "num" : "",
        aria: activa ? (orden.asc ? "ascending" : "descending") : "none",
        icono: activa ? (orden.asc ? "utility:arrowup" : "utility:arrowdown") : null,
        textoOrden: activa ? (orden.asc ? "Orden ascendente" : "Orden descendente") : ""
      };
    }),
    filas: visibles.map((f) => ({
      id: f.id,
      celdas: columnas.map((c) => ({ campo: c.campo, clase: c.num ? "num" : "", texto: c.texto(f) }))
    }))
  };
}

/** Orden inicial de cada tabla; al tocar una columna de texto empieza ascendente y al tocar una numérica, descendente. */
export const ORDEN_INICIAL = {
  det: { campo: "creadoEn", asc: false },
  nin: { campo: "cierre", asc: true },
  age: { campo: "empresa", asc: true },
  pro: { campo: "empresa", asc: true },
  drill: { campo: "empresa", asc: true }
};
export const empiezaAscendente = (campo) => TEXTO_ORDEN.has(campo);

// ---------- gráficas ----------

function armarSeguimiento(anio) {
  // etapa × póliza; las pólizas menos frecuentes se juntan en "Otras"
  const conteo = new Map();
  for (const f of anio) {
    const p = f.poliza || SIN_POLIZA;
    conteo.set(p, (conteo.get(p) || 0) + 1);
  }
  const principales = [...conteo.entries()].sort((a, b) => b[1] - a[1]).map(([p]) => p);
  const visibles = principales.slice(0, MAX_POLIZAS);
  const hayOtras = principales.length > visibles.length;
  const grupos = hayOtras ? [...visibles, "Otras"] : visibles;
  const color = (g) => COLORES_POLIZA[Math.min(grupos.indexOf(g), COLORES_POLIZA.length - 1)];
  const porEtapa = new Map();
  for (const f of anio) {
    if (!porEtapa.has(f.etapa)) porEtapa.set(f.etapa, []);
    porEtapa.get(f.etapa).push(f);
  }
  const etapas = [...porEtapa.keys()].sort((a, b) => ordenEtapa(a) - ordenEtapa(b));
  const maximo = Math.max(1, ...etapas.map((e) => porEtapa.get(e).length));
  return {
    hay: etapas.length > 0,
    leyenda: grupos.map((g) => ({ clave: g, etiqueta: g, estilo: `background:${color(g)}` })),
    filas: etapas.map((e) => {
      const lista = porEtapa.get(e);
      const segmentos = grupos
        .map((g) => ({ g, n: lista.filter((f) => ((f.poliza || SIN_POLIZA) === g) || (g === "Otras" && !visibles.includes(f.poliza || SIN_POLIZA))).length }))
        .filter((x) => x.n > 0);
      return {
        clave: e,
        etapa: e,
        total: entero(lista.length),
        segmentos: segmentos.map((x) => ({
          clave: x.g,
          n: x.n,
          estilo: `width:${(x.n / maximo) * 100}%;background:${color(x.g)}`,
          titulo: `${e} · ${x.g}: ${x.n}`
        }))
      };
    })
  };
}

function armarDona(anio) {
  const porEtapa = new Map();
  for (const f of anio) porEtapa.set(f.etapa, (porEtapa.get(f.etapa) || 0) + 1);
  const etapas = [...porEtapa.keys()].sort((a, b) => ordenEtapa(a) - ordenEtapa(b));
  let acumulado = 0;
  const items = etapas.map((e) => {
    const n = porEtapa.get(e);
    const color = colorEtapa(e);
    const desde = acumulado;
    acumulado += (n / anio.length) * 100;
    return { etapa: e, n: entero(n), pct: pct(n, anio.length), estiloMarca: `background:${color}`, tramo: `${color} ${desde}% ${acumulado}%` };
  });
  return {
    hay: items.length > 0,
    items,
    total: entero(anio.length),
    estilo: items.length ? `background:conic-gradient(${items.map((i) => i.tramo).join(", ")})` : ""
  };
}

function armarMeses(filas) {
  const delAnio = filas.filter((f) => f.fechaAcordada && f.fechaAcordada >= INICIO_ANIO);
  const porMes = new Map();
  for (const f of delAnio) {
    const k = f.fechaAcordada.slice(0, 7);
    if (!porMes.has(k)) porMes.set(k, []);
    porMes.get(k).push(f);
  }
  const claves = [...porMes.keys()].sort();
  const maximo = Math.max(1, ...claves.map((k) => porMes.get(k).length));
  const etapasUsadas = [...new Set(delAnio.map((f) => f.etapa))].sort((a, b) => ordenEtapa(a) - ordenEtapa(b));
  const columnas = claves.map((k) => {
    const lista = porMes.get(k);
    const [a, m] = k.split("-").map(Number);
    const cuentas = new Set(lista.map(claveCuenta)).size;
    return {
      clave: k,
      etiqueta: `${MESES[m - 1]} ${String(a).slice(2)}`,
      total: lista.length,
      cuentas,
      titulo: `${MESES[m - 1]} ${a}: ${lista.length} implementaciones · ${cuentas} cuentas`,
      segmentos: etapasUsadas
        .map((e) => ({ e, n: lista.filter((f) => f.etapa === e).length }))
        .filter((x) => x.n > 0)
        .map((x) => ({
          clave: x.e,
          estilo: `height:${(x.n / maximo) * 100}%;background:${colorEtapa(x.e)}`,
          titulo: `${x.e}: ${x.n}`
        }))
    };
  });
  const maxCuentas = Math.max(0, ...columnas.map((c) => c.cuentas));
  const puntos = columnas.map((c, i) => ({
    clave: c.clave,
    x: ((i + 0.5) / columnas.length) * 100,
    y: maxCuentas ? 100 - (c.cuentas / maxCuentas) * 100 : 100
  }));
  return {
    hay: columnas.length > 0,
    leyenda: etapasUsadas.map((e) => ({ clave: e, etiqueta: e, estilo: `background:${colorEtapa(e)}` })),
    columnas: columnas.map((c) => ({ ...c, total: entero(c.total), cuentasTxt: entero(c.cuentas) })),
    ancho: `min-width:${columnas.length * 3.25}rem`,
    hayLinea: maxCuentas > 0,
    linea: {
      puntos: puntos.map((q) => `${q.x},${q.y}`).join(" "),
      marcas: puntos.map((q) => ({ clave: q.clave, estilo: `left:${q.x}%;top:${q.y}%` })),
      maximo: entero(maxCuentas)
    }
  };
}

function armarHorasPorCuenta(filas) {
  const porCuenta = new Map();
  for (const f of filas) {
    const k = f.empresa || "Sin cuenta";
    const c = porCuenta.get(k) || { cuenta: k, contratadas: 0, consumidas: 0 };
    c.contratadas += f.horasContratadas || 0;
    c.consumidas += f.horasConsumidas || 0;
    porCuenta.set(k, c);
  }
  const todas = [...porCuenta.values()].filter((c) => c.contratadas > 0 || c.consumidas > 0).sort((a, b) => b.contratadas - a.contratadas);
  const visibles = todas.slice(0, MAX_CUENTAS_HORAS);
  const maximo = Math.max(1, ...visibles.map((c) => Math.max(c.contratadas, c.consumidas)));
  return {
    hay: visibles.length > 0,
    nota: todas.length > visibles.length ? `Las ${visibles.length} cuentas con más horas contratadas, de ${entero(todas.length)}.` : `${entero(todas.length)} cuentas.`,
    filas: visibles.map((c) => ({
      cuenta: c.cuenta,
      contratadas: decimal(c.contratadas),
      consumidas: decimal(c.consumidas),
      estiloContratadas: `width:${(c.contratadas / maximo) * 100}%`,
      estiloConsumidas: `width:${(c.consumidas / maximo) * 100}%`,
      titulo: `${c.cuenta}: ${decimal(c.consumidas)} consumidas de ${decimal(c.contratadas)} contratadas`
    }))
  };
}

function armarSatisfaccion(filas) {
  const lista = conSatisfaccion(filas);
  if (!lista.length) return { hay: false, valor: "—", ancho: "width:0", clase: "dash_medidor_relleno", n: "0" };
  const promedio = suma(lista, (f) => f.satisfaccion) / lista.length;
  const tono = promedio < 33 ? "critico" : promedio < 67 ? "precaucion" : "ok";
  return {
    hay: true,
    valor: `${decimal(promedio)}%`,
    ancho: `width:${Math.max(0, Math.min(100, promedio))}%`,
    clase: `dash_medidor_relleno dash_medidor_${tono}`,
    n: entero(lista.length)
  };
}

// ---------- vista completa ----------

/**
 * ui = { orden: {det, nin, age, pro, drill}, limite: {...}, abierto: id del indicador abierto o null }
 */
export function armarDashboard(filas, ui) {
  const anio = filas.filter(enAnio);
  const cuentas = new Set(anio.map(claveCuenta)).size;
  const cuantas = (id) => filasDeIndicador(filas, id).length;
  const boton = (d) => {
    const abierto = ui.abierto === d.id;
    return {
      ...d,
      valor: d.texto || entero(d.valor),
      clase: `kpi kpi_boton${d.tono ? ` kpi_${d.tono}` : ""}${abierto ? " kpi_abierto" : ""}`,
      seleccionado: String(abierto),
      accion: abierto ? "Ocultar registros" : "Ver registros",
      textoAyuda: abierto ? `Ocultar: ${d.etiquetaLista}` : `Ver: ${d.etiquetaLista}`
    };
  };
  const completadas = cuantas("d-completadas");
  const estados = [
    { id: "d-creadas", etiqueta: "Implementaciones creadas", etiquetaLista: "Implementaciones creadas", valor: anio.length, nota: "Cierre de oportunidad en 2026", icono: "utility:layers" },
    { id: "d-cuentas", etiqueta: "Cuentas con implementaciones", etiquetaLista: "Implementaciones, por cuenta", valor: cuentas, nota: "Cuentas distintas", icono: "utility:company" },
    { id: "d-noiniciadas", etiqueta: "No iniciadas | no agendadas", etiquetaLista: "Implementaciones no iniciadas | no agendadas", valor: cuantas("d-noiniciadas"), nota: "No iniciada o Back log", icono: "utility:clock", tono: "alerta" },
    { id: "d-agendadas", etiqueta: "Agendadas", etiquetaLista: "Implementaciones agendadas", valor: cuantas("d-agendadas"), nota: "Con fecha acordada", icono: "utility:event" },
    { id: "d-enproceso", etiqueta: "En proceso", etiquetaLista: "Implementaciones en proceso", valor: cuantas("d-enproceso"), nota: "Etapa En Proceso", icono: "utility:sync" },
    { id: "d-completadas", etiqueta: "Completadas", etiquetaLista: "Implementaciones completadas", valor: completadas, nota: `${pct(completadas, anio.length)}% de las creadas`, icono: "utility:success", tono: "ok" },
    { id: "d-canceladas", etiqueta: "Canceladas", etiquetaLista: "Implementaciones canceladas", valor: cuantas("d-canceladas"), nota: "Marcadas como canceladas", icono: "utility:ban" },
    { id: "d-reprogramaciones", etiqueta: "Reprogramaciones", etiquetaLista: "Implementaciones con reprogramaciones", valor: suma(anio, (f) => f.reprogramaciones), nota: `${entero(cuantas("d-reprogramaciones"))} implementaciones`, icono: "utility:rotate" }
  ].map(boton);
  const satisfaccion = armarSatisfaccion(filas);
  const horas = [
    { id: "d-hcontratadas", etiqueta: "Horas contratadas", etiquetaLista: "Implementaciones con horas contratadas", valor: suma(anio, (f) => f.horasContratadas), nota: "Provenientes de la OV", icono: "utility:clock" },
    { id: "d-hconsumidas", etiqueta: "Horas consumidas", etiquetaLista: "Implementaciones con horas consumidas", valor: suma(anio, (f) => f.horasConsumidas), nota: "Registradas en las actividades", icono: "utility:check" },
    { id: "d-hdisponibles", etiqueta: "Horas disponibles", etiquetaLista: "Implementaciones con horas disponibles", valor: suma(anio, (f) => f.horasDisponibles), nota: "Contratadas menos consumidas", icono: "utility:hourglass" },
    { id: "d-satisfaccion", etiqueta: "Satisfacción del cliente", etiquetaLista: "Implementaciones con satisfacción registrada", valor: 0, texto: satisfaccion.valor, nota: `Promedio de ${satisfaccion.n} implementaciones`, icono: "utility:like", tono: "ok" }
  ].map(boton);

  const abierto = estados.concat(horas).find((k) => k.id === ui.abierto);
  const filasAbiertas = abierto ? filasDeIndicador(filas, abierto.id) : [];
  const esDeHoras = abierto && (abierto.id.startsWith("d-h") || abierto.id === "d-satisfaccion");
  return {
    estados,
    horas,
    satisfaccion,
    drill: abierto ? { id: abierto.id, titulo: abierto.etiquetaLista, deHoras: esDeHoras, tabla: armarTabla("drill", filasAbiertas, COLUMNAS_SEGUIMIENTO, ui) } : null,
    seguimiento: armarSeguimiento(anio),
    dona: armarDona(anio),
    meses: armarMeses(filas),
    horasCuentas: armarHorasPorCuenta(filas),
    tablaDetalle: armarTabla("det", anio, COLUMNAS_DETALLE, ui),
    tablasSeguimiento: [
      { clave: "nin", titulo: "Seguimiento: no iniciadas | no agendadas", vacio: "Sin implementaciones no iniciadas.", tabla: armarTabla("nin", noIniciadas(filas), COLUMNAS_SEGUIMIENTO, ui) },
      { clave: "age", titulo: "Seguimiento de implementaciones agendadas", vacio: "Sin implementaciones agendadas.", tabla: armarTabla("age", agendadas(filas), COLUMNAS_SEGUIMIENTO, ui) },
      { clave: "pro", titulo: "Seguimiento de implementaciones en proceso", vacio: "Sin implementaciones en proceso.", tabla: armarTabla("pro", enProceso(filas), COLUMNAS_SEGUIMIENTO, ui) }
    ]
  };
}
