import { LightningElement } from "lwc";
import { NavigationMixin } from "lightning/navigation";
import obtenerImplementaciones from "@salesforce/apex/ImplementacionesPanelV2Controller.obtenerImplementaciones";
import LOGO_BRIVE from "@salesforce/resourceUrl/QSA_BriveLogo";
import {
  CORTE,
  ETAPAS,
  ETAPA_PAUSA,
  CONSUMOS,
  GRUPOS_ACTIVIDAD,
  etiquetaEtapa,
  consumoDe,
  infoConsumo,
  restantesDe,
  fmtHoras,
  fmtEntero,
  fmtPct,
  fmtFecha,
  leerResumen
} from "c/implementacionesUtilV2";

/*
 * Panel de implementaciones y proyectos (Delivery_y_Desarrollo__c). Solo lectura.
 *   Vista general | Implementaciones | Proyectos  →  indicador → registro → etapa → sección → actividad → resumen → horas / cambios
 * El corte del 1 de octubre de 2026 lo aplica Apex en la consulta; aquí no existe forma de quitarlo.
 * Estatus ≠ actividades: el estatus es la etapa actual del registro; las actividades confirman qué secciones se completaron.
 * Las horas se muestran tal como las calcula Salesforce (Horas_Contratadas__c, Horas__c, Horas_Disponibles__c).
 */

const CLAVE_PREFERENCIAS = "implementacionesPanelV2.preferencias";
const CLAVE_PRUEBAS = "implementacionesPanelV2.incluirPruebas";
const SECCIONES_INICIALES = {
  filtros: false,
  // el análisis complementario empieza plegado: la primera vista es la ejecutiva
  actividades: false,
  horas: false,
  tiempos: false,
  "tabla-imp": true,
  "tabla-pro": true
};
const POR_PAGINA = 12;
const ACTIVIDADES_POR_PAGINA = 8;
const MAX_FILAS_LISTA = 150; // filas que se pintan de una lista larga; el resto se alcanza con el buscador
const MAX_CATEGORIAS = 8; // categorías de producto visibles sin buscar; el resto, tras "Ver todas las categorías"
const TOP_LISTA = 3; // sin buscar ni abrir "Ver todos", cada lista muestra solo los 3 con más registros

const FILTROS_VACIOS = {
  etapa: "",
  cuenta: "",
  responsable: "",
  asociado: "",
  solucion: "",
  producto: "",
  cambios: "",
  consumo: "",
  grupo: "",
  area: "",
  mes: "",
  desde: "",
  hasta: "",
  campoFecha: "creadoEn"
};

// "nombre" es cómo se llama lo que se cuenta en cada vista: el texto de los indicadores cambia con la pestaña
const VISTAS = [
  { valor: "general", etiqueta: "Vista general", tipo: null, nombre: "Registros" },
  { valor: "implementaciones", etiqueta: "Implementaciones", tipo: "Implementación", nombre: "Implementaciones" },
  { valor: "proyectos", etiqueta: "Proyectos", tipo: "Proyecto", nombre: "Proyectos" }
];

const TABLAS = {
  imp: { clave: "imp", tipo: "Implementación", titulo: "Detalle de Implementaciones", vacio: "No hay implementaciones con estos filtros." },
  pro: { clave: "pro", tipo: "Proyecto", titulo: "Detalle de Proyectos", vacio: "No hay proyectos con estos filtros." }
};

const COLUMNAS = [
  { campo: "nombre", etiqueta: "Nombre", orden: "texto" },
  { campo: "empresa", etiqueta: "Cuenta comercial", orden: "texto" },
  { campo: "responsable", etiqueta: "Responsable", orden: "texto" },
  { campo: "asociado", etiqueta: "Asociado", orden: "texto" },
  { campo: "solucion", etiqueta: "Solución", orden: "texto" },
  { campo: "etapaOrden", etiqueta: "Estatus", orden: "numero" },
  { campo: "fechaAcordadaKickoff", etiqueta: "Kickoff acordado", orden: "texto" },
  { campo: "fechaKickoff", etiqueta: "Kickoff", orden: "texto" },
  { campo: "horasContratadas", etiqueta: "Contratadas", orden: "numero", num: true },
  { campo: "horasConsumidas", etiqueta: "Consumidas", orden: "numero", num: true },
  { campo: "restantes", etiqueta: "Restantes", orden: "numero", num: true },
  { campo: "pct", etiqueta: "% consumido", orden: "numero", num: true },
  { campo: "nAct", etiqueta: "Actividades", orden: "numero", num: true },
  { campo: "nCambios", etiqueta: "Cambios", orden: "numero", num: true }
];

const SIN_RESPONSABLE = "__sin__";

// Propietario del programa: se deduce del usuario "Propietarios de Implementación" (Usuario__c). Llenar con el nombre exacto del usuario.
const AREA_ATRACCION = "Atracción y Selección";
const AREA_DESARROLLO = "Desarrollo Organizacional";
const SIN_AREA = "Sin asignar";
const AREAS = [AREA_ATRACCION, AREA_DESARROLLO];
const AREA_POR_PROPIETARIO = {
  "Centro de Especialidad ENTORNO": AREA_DESARROLLO,
  "Centro de Especialidad ENTORNO 2": AREA_DESARROLLO,
  "Centro de Especialidad EVT-EVOU": AREA_ATRACCION,
  "Capacitacion Continua": AREA_ATRACCION
};

const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const etiquetaMes = (clave) => `${MESES[Number(clave.slice(5, 7)) - 1]} ${clave.slice(0, 4)}`;
const ORDEN_ETAPA = { noIniciada: 0, agendada: 1, kickoff: 2, enProceso: 3, entregaFinal: 4, finalizada: 5, enPausa: 6 };

const CAMPOS_FECHA = [
  { label: "Creación del registro", value: "creadoEn" },
  { label: "Kickoff acordado", value: "fechaAcordadaKickoff" },
  { label: "Kickoff", value: "fechaKickoff" },
  { label: "Fecha fin", value: "fechaFinImplementacion" },
  { label: "Último cambio de etapa", value: "cambioEstatus" }
];

const CON_CAMBIOS = [
  { label: "Todos", value: "" },
  { label: "Con controles de cambio", value: "con" },
  { label: "Sin controles de cambio", value: "sin" }
];

// primer contenedor con scroll propio (en Salesforce suele ser el cuerpo de la página, no la ventana)
function contenedorScroll(el) {
  let n = el;
  while (n) {
    n = n.parentElement || (n.parentNode && n.parentNode.host) || null;
    if (n && n.nodeType === 1) {
      const o = window.getComputedStyle(n).overflowY;
      if ((o === "auto" || o === "scroll") && n.scrollHeight > n.clientHeight) return n;
    }
  }
  return document.scrollingElement || document.documentElement;
}

// para buscar sin importar mayúsculas ni acentos
const sinAcentos = (t) => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

const mensajeError = (e) => (e && e.body && e.body.message) || (e && e.message) || "No se pudieron cargar los datos.";
const suma = (lista, f) => lista.reduce((s, x) => s + (f(x) || 0), 0);
const unicos = (lista) => [...new Set(lista.filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
const opciones = (valores, todos) => [{ label: todos, value: "" }, ...valores.map((v) => ({ label: v, value: v }))];

// una sola pasada por registro: lo que las tablas y los indicadores comparan
function enriquecer(r) {
  const hc = r.horasContratadas;
  const hu = r.horasConsumidas;
  const actividades = r.actividades || [];
  const cambios = r.cambios || [];
  return {
    ...r,
    asociado: (r.asociados || []).join(", "),
    consumo: consumoDe(hc, hu),
    // por registro: restantes = contratadas − consumidas; % consumido = consumidas ÷ contratadas
    restantes: restantesDe(r),
    pct: hc > 0 ? (hu || 0) / hc : null,
    nAct: actividades.length,
    nCambios: cambios.length,
    etapaOrden: ORDEN_ETAPA[r.etapa],
    area: AREA_POR_PROPIETARIO[r.propietario] || SIN_AREA,
    gruposActividad: new Set(actividades.map((a) => a.grupo).filter(Boolean)),
    nombresProducto: (r.productos || []).map((p) => p.nombre),
    busqueda: `${r.nombre} ${r.empresa || ""} ${r.responsable || ""} ${(r.asociados || []).join(" ")} ${r.solucion || ""}`.toLowerCase()
  };
}

function pasaFiltros(r, f, sinEtapa) {
  if (!sinEtapa && f.etapa && r.etapa !== f.etapa) return false;
  if (f.cuenta && r.empresa !== f.cuenta) return false;
  if (f.responsable === SIN_RESPONSABLE) {
    if (r.responsable) return false;
  } else if (f.responsable && r.responsable !== f.responsable) return false;
  if (f.asociado && !(r.asociados || []).includes(f.asociado)) return false;
  if (f.solucion && r.solucion !== f.solucion) return false;
  if (f.producto && !r.nombresProducto.includes(f.producto)) return false;
  if (f.cambios === "con" && r.nCambios === 0) return false;
  if (f.cambios === "sin" && r.nCambios > 0) return false;
  if (f.consumo && r.consumo !== f.consumo) return false;
  if (f.grupo && !r.gruposActividad.has(f.grupo)) return false;
  if (f.area && r.area !== f.area) return false;
  if (f.mes && String(r[f.campoFecha] || "").slice(0, 7) !== f.mes) return false;
  if (f.desde || f.hasta) {
    const v = String(r[f.campoFecha] || "").slice(0, 10);
    if (!v || (f.desde && v < f.desde) || (f.hasta && v > f.hasta)) return false;
  }
  return true;
}

// ordena por una columna; los vacíos van siempre al final
function ordenar(lista, orden) {
  const col = COLUMNAS.find((c) => c.campo === orden.campo) || COLUMNAS[0];
  const valor = (r) => (col.campo === "asociado" ? r.asociado : r[col.campo]);
  return [...lista].sort((a, b) => {
    const x = valor(a);
    const y = valor(b);
    const vx = x === null || x === undefined || x === "";
    const vy = y === null || y === undefined || y === "";
    if (vx || vy) return vx === vy ? 0 : vx ? 1 : -1;
    const c = col.orden === "numero" ? x - y : String(x).localeCompare(String(y), "es");
    return c * orden.dir;
  });
}

export default class ImplementacionesPanel extends NavigationMixin(LightningElement) {
  logoBrive = LOGO_BRIVE;

  registros = [];
  cargando = false;
  error;
  actualizadoEn;
  incluirPruebas = false;
  secciones = { ...SECCIONES_INICIALES };

  vista = "general";
  filtros = { ...FILTROS_VACIOS };
  grupoActividades = "";
  buscandoActividades = false;
  busquedaActividades = "";
  limiteActividades = ACTIVIDADES_POR_PAGINA;
  busquedas = { cuenta: "", producto: "" };
  listasAbiertas = { cuenta: false };
  categoriasAbiertas = {};
  todasCategorias = false;
  tablas = {
    imp: { busqueda: "", orden: { campo: "etapaOrden", dir: 1 }, limite: POR_PAGINA, abiertas: {}, cerrando: {} },
    pro: { busqueda: "", orden: { campo: "etapaOrden", dir: 1 }, limite: POR_PAGINA, abiertas: {}, cerrando: {} }
  };
  vm = { vacio: true };
  origenDrill = null;
  lugarDrill = "estatus";
  temporizadores = {};

  connectedCallback() {
    this.leerPreferencias();
    this.cargar();
  }

  disconnectedCallback() {
    Object.values(this.temporizadores).forEach((t) => clearTimeout(t));
  }

  // ---------- preferencias y secciones plegables ----------

  leerPreferencias() {
    try {
      this.incluirPruebas = window.localStorage.getItem(CLAVE_PRUEBAS) === "1";
    } catch (e) {
      this.incluirPruebas = false;
    }
    try {
      const guardadas = JSON.parse(window.localStorage.getItem(CLAVE_PREFERENCIAS) || "{}");
      this.secciones = { ...SECCIONES_INICIALES, ...guardadas };
    } catch (e) {
      // sin almacenamiento del navegador: se usan los valores iniciales
      this.secciones = { ...SECCIONES_INICIALES };
    }
  }

  guardarSeccion(clave, abierta) {
    this.secciones = { ...this.secciones, [clave]: abierta };
    try {
      window.localStorage.setItem(CLAVE_PREFERENCIAS, JSON.stringify(this.secciones));
    } catch (err) {
      // si no se puede guardar, la sección igual queda abierta o cerrada en esta sesión
    }
    this.recalcular();
  }

  alternarSeccion(e) {
    const clave = e.currentTarget.dataset.seccion;
    const abierta = e.currentTarget.open;
    if (!clave || this.secciones[clave] === abierta) return;
    this.guardarSeccion(clave, abierta);
  }

  masFiltros = false;

  alternarMasFiltros() {
    this.masFiltros = !this.masFiltros;
  }

  get masFiltrosAbiertos() {
    return this.masFiltros;
  }

  get ariaMasFiltros() {
    return String(this.masFiltros);
  }

  get textoMasFiltros() {
    const f = this.filtros;
    const activos = ["producto", "cambios", "consumo", "grupo"].filter((c) => f[c]).length;
    return activos ? `Más filtros (${activos} activos)` : "Más filtros";
  }

  get iconoMasFiltros() {
    return this.masFiltros ? "utility:chevronup" : "utility:chevrondown";
  }

  alternarFiltros() {
    this.guardarSeccion("filtros", !this.secciones.filtros);
  }

  get ariaFiltros() {
    return String(!!this.secciones.filtros);
  }

  get textoBotonFiltros() {
    return this.secciones.filtros ? "Ocultar filtros" : "Cambiar filtros";
  }

  get iconoBotonFiltros() {
    return this.secciones.filtros ? "utility:chevronup" : "utility:chevrondown";
  }

  get filtrosAbiertos() {
    return this.secciones.filtros;
  }

  // ---------- carga ----------

  async cargar() {
    this.cargando = true;
    this.error = undefined;
    try {
      const datos = await obtenerImplementaciones({ incluirPruebas: this.incluirPruebas });
      this.registros = (datos || []).map(enriquecer);
      this.actualizadoEn = new Date();
      this.recalcular();
    } catch (e) {
      this.error = mensajeError(e);
    } finally {
      this.cargando = false;
    }
  }

  actualizar() {
    this.cargar();
  }

  // al actualizar, lo que ya se ve se queda en pantalla hasta que lleguen los datos nuevos (no se pierde el lugar)
  get hayDatos() {
    return this.registros.length > 0;
  }

  get cargandoInicial() {
    return this.cargando && this.registros.length === 0;
  }

  get ariaCargando() {
    return String(this.cargando);
  }

  get textoActualizar() {
    return this.cargando ? "Actualizando…" : "Actualizar";
  }

  get sinDatos() {
    return !this.cargando && !this.error && this.registros.length === 0;
  }

  get estadoActualizacion() {
    if (!this.actualizadoEn) return "Cargando…";
    if (this.cargando) return "Actualizando…";
    const hora = this.actualizadoEn.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });
    return `Actualizado a las ${hora} · registros desde el 1 de octubre de 2026`;
  }

  get avisoCorte() {
    return "solo se consideran registros con fechas o actividades desde el 1 de octubre de 2026. Los anteriores no intervienen en ninguna cifra.";
  }

  get ariaPruebas() {
    return String(this.incluirPruebas);
  }

  get textoPruebas() {
    return this.incluirPruebas ? "visible" : "oculta";
  }

  alternarPruebas() {
    this.incluirPruebas = !this.incluirPruebas;
    try {
      window.localStorage.setItem(CLAVE_PRUEBAS, this.incluirPruebas ? "1" : "0");
    } catch (e) {
      // la preferencia solo dura esta sesión
    }
    this.cargar();
  }

  // ---------- filtros ----------

  get fechaMinima() {
    return CORTE;
  }

  get opcionesCampoFecha() {
    return CAMPOS_FECHA;
  }

  get opcionesCambios() {
    return CON_CAMBIOS;
  }

  get opcionesEtapa() {
    return [{ label: "Todos", value: "" }, ...[...ETAPAS, ETAPA_PAUSA].map((e) => ({ label: e.etiqueta, value: e.clave }))];
  }

  get opcionesConsumo() {
    return [{ label: "Todos", value: "" }, ...CONSUMOS.map((c) => ({ label: c.etiqueta, value: c.clave }))];
  }

  get opcionesGrupo() {
    return [{ label: "Todas", value: "" }, ...GRUPOS_ACTIVIDAD.map((g) => ({ label: `Con actividades de ${g}`, value: g }))];
  }

  get opcionesArea() {
    const hay = new Set(this.registrosDeLaVista.map((r) => r.area));
    return [{ label: "Todos", value: "" }, ...[...AREAS, SIN_AREA].filter((a) => a !== SIN_AREA || hay.has(a)).map((a) => ({ label: a, value: a }))];
  }

  // meses que existen en los datos, según la fecha elegida en "Rango según"
  get opcionesMes() {
    const campo = this.filtros.campoFecha;
    const claves = new Set(this.registrosDeLaVista.map((r) => String(r[campo] || "").slice(0, 7)).filter((m) => m >= CORTE.slice(0, 7)));
    if (this.filtros.mes) claves.add(this.filtros.mes);
    return [{ label: "Todos", value: "" }, ...[...claves].sort().map((m) => ({ label: etiquetaMes(m), value: m }))];
  }

  get opcionesCuenta() {
    return opciones(unicos(this.registrosDeLaVista.map((r) => r.empresa)), "Todas");
  }

  get opcionesResponsable() {
    return [...opciones(unicos(this.registrosDeLaVista.map((r) => r.responsable)), "Todos"), { label: "Sin responsable", value: SIN_RESPONSABLE }];
  }

  get opcionesAsociado() {
    return opciones(unicos(this.registrosDeLaVista.flatMap((r) => r.asociados || [])), "Todos");
  }

  get opcionesProducto() {
    return opciones(unicos(this.registrosDeLaVista.flatMap((r) => r.nombresProducto)), "Todos");
  }

  get opcionesSolucion() {
    return opciones(unicos(this.registrosDeLaVista.map((r) => r.solucion)), "Todas");
  }

  get registrosDeLaVista() {
    const tipo = VISTAS.find((v) => v.valor === this.vista).tipo;
    return tipo ? this.registros.filter((r) => r.tipo === tipo) : this.registros;
  }

  get hayFiltros() {
    return this.numFiltros > 0;
  }

  get sinFiltros() {
    return !this.hayFiltros;
  }

  get numFiltros() {
    return this.chipsFiltros.length;
  }

  get chipsFiltros() {
    const f = this.filtros;
    const chips = [];
    const agrega = (campo, texto) => chips.push({ campo, texto, textoQuitar: `Quitar el filtro: ${texto}` });
    if (f.etapa) agrega("etapa", `Estatus: ${etiquetaEtapa(f.etapa)}`);
    if (f.cuenta) agrega("cuenta", `Cuenta: ${f.cuenta}`);
    if (f.responsable) agrega("responsable", f.responsable === SIN_RESPONSABLE ? "Sin responsable" : `Responsable: ${f.responsable}`);
    if (f.asociado) agrega("asociado", `Asociado: ${f.asociado}`);
    if (f.solucion) agrega("solucion", `Solución: ${f.solucion}`);
    if (f.producto) agrega("producto", `Producto: ${f.producto}`);
    if (f.cambios) agrega("cambios", CON_CAMBIOS.find((c) => c.value === f.cambios).label);
    if (f.consumo) agrega("consumo", `Horas: ${infoConsumo(f.consumo).etiqueta}`);
    if (f.grupo) agrega("grupo", `Con actividades de ${f.grupo}`);
    if (f.area) agrega("area", `Propietario: ${f.area}`);
    if (f.mes) agrega("mes", `${CAMPOS_FECHA.find((c) => c.value === f.campoFecha).label}: ${etiquetaMes(f.mes)}`);
    if (f.desde || f.hasta) {
      const campo = CAMPOS_FECHA.find((c) => c.value === f.campoFecha).label.toLowerCase();
      agrega("fechas", `${campo}: ${f.desde ? fmtFecha(f.desde) : "…"} – ${f.hasta ? fmtFecha(f.hasta) : "…"}`);
    }
    return chips;
  }

  get textoPeriodo() {
    return "Desde 1 oct 2026";
  }

  cambiarFiltro(e) {
    const { campo } = e.currentTarget.dataset;
    this.filtros = { ...this.filtros, [campo]: e.detail.value };
    this.origenDrill = null; // elegir en los combos no abre listas: eso solo lo hacen los indicadores
    this.reiniciarTablas();
    this.recalcular();
  }

  cambiarFecha(e) {
    const { campo } = e.currentTarget.dataset;
    let valor = e.detail.value || "";
    // el corte es una restricción de los datos: ninguna fecha anterior se puede elegir
    if (valor && valor < CORTE) valor = CORTE;
    this.filtros = { ...this.filtros, [campo]: valor };
    this.origenDrill = null;
    this.reiniciarTablas();
    this.recalcular();
  }

  quitarFiltro(e) {
    const { campo } = e.currentTarget.dataset;
    const cambios = campo === "fechas" ? { desde: "", hasta: "" } : { [campo]: "" };
    this.filtros = { ...this.filtros, ...cambios };
    this.origenDrill = null;
    this.reiniciarTablas();
    this.recalcular();
  }

  limpiarFiltros() {
    this.filtros = { ...FILTROS_VACIOS };
    this.origenDrill = null;
    this.grupoActividades = "";
    this.buscandoActividades = false;
    this.busquedaActividades = "";
    this.reiniciarTablas();
    this.recalcular();
  }

  cambiarVista(e) {
    this.vista = e.currentTarget.dataset.valor;
    this.reiniciarTablas();
    this.recalcular();
  }

  reiniciarTablas() {
    this.limiteActividades = ACTIVIDADES_POR_PAGINA;
    for (const k of Object.keys(this.tablas)) this.tablas[k] = { ...this.tablas[k], limite: POR_PAGINA };
    this.tablas = { ...this.tablas };
  }

  // de un indicador a los registros que lo explican: aplica el filtro y los despliega justo debajo de lo que se tocó
  filtrarDesdeIndicador(e) {
    const { filtro, valor, lugar } = e.currentTarget.dataset;
    this.aplicarFiltroDrill(filtro, valor, lugar, e.currentTarget);
  }

  // las tarjetas de distribución también filtran: llevan en data-clave el valor tocado
  filtrarDesdeTarjeta(e) {
    const { filtro, clave, lugar } = e.currentTarget.dataset;
    this.aplicarFiltroDrill(filtro, clave, lugar, e.currentTarget);
  }

  aplicarFiltroDrill(filtro, valor, lugar, control) {
    this.conPosicionFija(control, () => {
      const actual = this.filtros[filtro];
      this.filtros = { ...this.filtros, [filtro]: actual === valor ? "" : valor };
      this.origenDrill = this.filtros[filtro] !== "" ? filtro : null;
      this.lugarDrill = lugar || "estatus";
      this.reiniciarTablas();
      this.recalcular();
    });
  }

  // Al abrir una lista, la que estaba abierta en otro lugar se cierra y todo lo de abajo se recorre. Para no perder el hilo,
  // lo que se tocó se queda donde estaba en pantalla: después de pintar se compensa el desplazamiento.
  conPosicionFija(control, cambio) {
    const antes = control ? control.getBoundingClientRect().top : null;
    cambio();
    if (antes === null) return;
    Promise.resolve().then(() =>
      window.requestAnimationFrame(() => {
        if (!control.isConnected) return;
        const delta = control.getBoundingClientRect().top - antes;
        if (Math.abs(delta) > 1) contenedorScroll(control).scrollTop += delta;
      })
    );
  }

  get drillActivo() {
    const o = this.origenDrill;
    const valor = o && this.filtros[o];
    if (!valor) return null;
    const n = this.nombreVista;
    const titulos = {
      etapa: `${n} en ${etiquetaEtapa(valor)}`,
      cambios: `${n} con controles de cambio`,
      grupo: `${n} con actividades de ${valor}`,
      consumo: `${n}: ${infoConsumo(valor).etiqueta}`,
      responsable: valor === SIN_RESPONSABLE ? `${n} sin responsable` : `${n} de ${valor}`,
      asociado: `${n} con ${valor} como asociado`,
      solucion: `${n} de ${valor}`,
      producto: `${n} con el producto ${valor}`,
      cuenta: `${n} de ${valor}`,
      area: `${n} de ${valor}`
    };
    return { titulo: titulos[o] || n, registros: this.vm.filtrados || [] };
  }

  drillEn(lugar) {
    return this.lugarDrill === lugar ? this.drillActivo : null;
  }

  get drillKpis() {
    return this.drillEn("kpis");
  }

  get drillEstatus() {
    return this.drillEn("estatus");
  }

  get drillDistribucion() {
    return this.drillEn("distribucion");
  }

  get drillAreas() {
    return this.drillEn("areas");
  }

  get drillActividades() {
    return this.drillEn("actividades");
  }

  get drillHoras() {
    return this.drillEn("horas");
  }

  cerrarDrill() {
    const o = this.origenDrill;
    if (!o) return;
    this.filtros = { ...this.filtros, [o]: "" };
    this.origenDrill = null;
    this.recalcular();
  }

  // ---------- cálculo ----------

  recalcular() {
    const tipoVista = VISTAS.find((v) => v.valor === this.vista).tipo;
    const f = this.filtros;
    const deTipo = (r) => !tipoVista || r.tipo === tipoVista;
    const sinTipo = this.registros.filter((r) => pasaFiltros(r, f, false));
    // cada gráfica se calcula sin su propio filtro, para poder cambiar de selección sin quitarla antes
    const conjunto = (campo) => this.registros.filter((r) => deTipo(r) && pasaFiltros(r, { ...f, [campo]: "" }, false));
    const sinEtapa = conjunto("etapa");
    const filtrados = sinTipo.filter(deTipo);

    this.vm = {
      vacio: filtrados.length === 0 && sinEtapa.length === 0,
      sinFiltrados: filtrados.length === 0,
      filtrados,
      conteoVistas: {
        general: sinTipo.length,
        implementaciones: sinTipo.filter((r) => r.tipo === "Implementación").length,
        proyectos: sinTipo.filter((r) => r.tipo === "Proyecto").length
      },
      kpis: this.armarKpis(filtrados),
      camino: this.armarCamino(sinEtapa),
      atencion: this.armarAtencion(conjunto),
      distribucion: this.armarDistribucion(conjunto),
      actividades: this.armarActividades(filtrados),
      horas: this.armarHoras(filtrados, conjunto("consumo")),
      tiempos: this.armarTiempos(filtrados),
      tablas: this.armarTablas(filtrados, tipoVista)
    };
  }

  get vacio() {
    return this.vm.vacio;
  }

  // el panel se queda completo aunque los filtros no devuelvan nada: así se ve qué filtro vació y se puede quitar sin perder el resto
  get hayRegistros() {
    return this.hayDatos;
  }

  // el aviso general solo sale cuando no hay una lista desplegada que ya lo diga
  get sinResultados() {
    return this.hayDatos && this.vm.sinFiltrados === true && !this.drillActivo;
  }

  // ----- vistas (pestañas) -----

  get vistas() {
    return VISTAS.map((v) => ({
      valor: v.valor,
      etiqueta: v.etiqueta,
      conteo: fmtEntero(this.vm.conteoVistas ? this.vm.conteoVistas[v.valor] : 0),
      seleccionada: v.valor === this.vista,
      clase: v.valor === this.vista ? "pestana pestana_activa" : "pestana"
    }));
  }

  // Registros | Implementaciones | Proyectos, según la pestaña
  get nombreVista() {
    return VISTAS.find((v) => v.valor === this.vista).nombre;
  }

  get sobretituloIndicadores() {
    return `Resumen ejecutivo · ${this.vista === "general" ? "Vista general" : this.nombreVista}`;
  }

  get descripcionVista() {
    if (this.vista === "implementaciones") return "Solo Implementaciones";
    if (this.vista === "proyectos") return "Solo Proyectos";
    return "Implementaciones y Proyectos";
  }

  // ----- indicadores -----

  armarKpis(filas) {
    const conCambios = filas.filter((r) => r.nCambios > 0).length;
    const k = (id, etiqueta, valor, nota, extra = {}) => ({
      id,
      etiqueta,
      icono: extra.icono,
      accion: extra.filtro ? (extra.activo ? "Ocultar registros" : "Ver registros") : "",
      valor,
      nota: nota || "",
      esBoton: !!extra.filtro,
      filtro: extra.filtro,
      valorFiltro: extra.valor,
      clase: `kpi${extra.filtro ? " kpi_boton" : ""}${extra.tono ? ` kpi_${extra.tono}` : ""}${extra.activo ? " kpi_abierto" : ""}`,
      ariaPresionado: String(!!extra.activo),
      ayuda: extra.ayuda || ""
    });
    // la primera vista es ejecutiva: las horas se leen por registro (tabla y detalle), no en sumas globales
    return [
      k("total", this.nombreVista, fmtEntero(filas.length), this.descripcionVista, { icono: "utility:layers" }),
      k("actividades", "Actividades generadas", fmtEntero(suma(filas, (r) => r.nAct)), "Secciones completadas, desde el 1 de octubre", { icono: "utility:task" }),
      k("conCambios", `${this.nombreVista} con controles de cambio`, fmtEntero(conCambios), "Toca para ver cuáles", {
        icono: "utility:event",
        filtro: "cambios",
        valor: "con",
        tono: conCambios ? "alerta" : "",
        activo: this.filtros.cambios === "con",
        ayuda: "Ver solo los registros con controles de cambio"
      }),
      k("totalCambios", "Cambios totales", fmtEntero(suma(filas, (r) => r.nCambios)), "Cambios de fechas de hitos", { icono: "utility:edit" })
    ];
  }

  // lo que pide seguimiento: cada chip filtra y despliega sus registros
  armarAtencion(conjunto) {
    const chip = (id, filtro, valor, etiqueta, detalle, tono, n, icono, pildora) => {
      const activo = this.filtros[filtro] === valor;
      return { id, filtro, valor, etiqueta, detalle, n, icono, pildora: n ? pildora : "Sin pendientes", clase: `atencion_tarjeta atencion_${n ? tono : "ok"}${activo ? " atencion_abierta" : ""}`, ariaPresionado: String(activo) };
    };
    const cuenta = (campo, pasa) => conjunto(campo).filter(pasa).length;
    return [
      chip("excedido", "consumo", "excedido", "Horas excedidas", "Consumieron más de lo contratado", "critico", cuenta("consumo", (r) => r.consumo === "excedido"), "utility:warning", "Crítico"),
      chip("cercano", "consumo", "cercano", "Próximos a agotar horas", "Desde el 90% sin llegar al 100%", "precaucion", cuenta("consumo", (r) => r.consumo === "cercano"), "utility:clock", "90% o más"),
      chip("conCambios", "cambios", "con", "Con controles de cambio", "Cambiaron fechas de hitos", "alerta", cuenta("cambios", (r) => r.nCambios > 0), "utility:event", "Revisar fechas"),
      chip("sinResponsable", "responsable", SIN_RESPONSABLE, "Sin responsable", "Nadie lo tiene asignado", "alerta", cuenta("responsable", (r) => !r.responsable), "utility:user", "Asignación pendiente")
    ];
  }

  // dónde se concentran los registros: una tarjeta por valor, con cuántos registros tiene; cada tarjeta filtra
  armarDistribucion(conjunto) {
    const tarjetas = (campo, valoresDe, limite, extra = () => []) => {
      const m = new Map();
      for (const r of conjunto(campo)) for (const v of valoresDe(r)) m.set(v, (m.get(v) || 0) + 1);
      const elegido = this.filtros[campo];
      const filas = [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).slice(0, limite);
      // el valor seleccionado siempre se ve, aunque no quede entre los primeros
      if (elegido && elegido !== SIN_RESPONSABLE && !filas.some(([k]) => k === elegido) && m.has(elegido)) filas.push([elegido, m.get(elegido)]);
      const tarjeta = (clave, etiqueta, n, alerta) => {
        const activa = elegido === clave;
        return {
          clave,
          etiqueta,
          valor: fmtEntero(n),
          clase: `tarjeta${alerta ? " tarjeta_alerta" : ""}${activa ? " tarjeta_activa" : ""}`,
          ariaPresionado: String(activa)
        };
      };
      return [...filas.map(([k, n]) => tarjeta(k, k, n, false)), ...extra(conjunto(campo), tarjeta)];
    };
    const sinResp = (lista, tarjeta) => {
      const n = lista.filter((r) => !r.responsable).length;
      return n ? [tarjeta(SIN_RESPONSABLE, "Sin responsable", n, true)] : [];
    };
    const solucion = tarjetas("solucion", (r) => (r.solucion ? [r.solucion] : []), 8);
    const responsable = tarjetas("responsable", (r) => (r.responsable ? [r.responsable] : []), 8, sinResp);
    const asociado = tarjetas("asociado", (r) => r.asociados || [], 8);
    const fila = (k, n, elegido) => ({
      clave: k,
      etiqueta: k,
      valor: fmtEntero(n),
      clase: `fila_lista${k === elegido ? " fila_lista_activa" : ""}`,
      ariaPresionado: String(k === elegido)
    });
    // orden de una lista: lo seleccionado primero, luego de más a menos registros
    const ordenar = (entradas, elegido) => entradas.sort((a, b) => (b[0] === elegido) - (a[0] === elegido) || b[1] - a[1] || a[0].localeCompare(b[0], "es"));

    // cuenta comercial crece sin límite: se ven las 3 con más registros; el buscador o "Ver todas" muestran el resto en una lista con scroll
    const cuentaLista = (() => {
      const campo = "cuenta";
      const m = new Map();
      for (const r of conjunto(campo)) if (r.empresa) m.set(r.empresa, (m.get(r.empresa) || 0) + 1);
      const elegido = this.filtros[campo];
      const q = sinAcentos(this.busquedas[campo]);
      const coinciden = ordenar([...m.entries()].filter(([k]) => !q || sinAcentos(k).includes(q)), elegido);
      const abierta = !!q || this.listasAbiertas[campo];
      const visibles = coinciden.slice(0, abierta ? MAX_FILAS_LISTA : TOP_LISTA);
      // lo seleccionado siempre se ve arriba, aunque quede fuera del top o de la búsqueda
      if (elegido && m.has(elegido) && !visibles.some(([k]) => k === elegido)) visibles.unshift([elegido, m.get(elegido)]);
      return {
        busqueda: this.busquedas[campo],
        textoTotal: `${fmtEntero(m.size)} distintas`,
        sinDatos: m.size === 0,
        sinCoincidencias: m.size > 0 && coinciden.length === 0,
        claseLista: abierta ? "lista_conteo" : "lista_conteo lista_corta",
        hayVerTodas: !q && !abierta && m.size > TOP_LISTA,
        hayPlegar: !q && abierta && m.size > TOP_LISTA,
        textoVerTodas: `Ver todas (${fmtEntero(m.size)})`,
        truncada: coinciden.length > MAX_FILAS_LISTA,
        textoTruncada: `Se muestran ${fmtEntero(MAX_FILAS_LISTA)} de ${fmtEntero(coinciden.length)}. Escribe en el buscador para encontrar el resto.`,
        filas: visibles.map(([k, n]) => fila(k, n, elegido))
      };
    })();

    // producto: agrupado por la categoría del producto; en cada una se ven los 3 con más registros
    const productoLista = (() => {
      const campo = "producto";
      const todos = new Map(); // nombre -> { n: registros que lo incluyen, categoria }
      for (const r of conjunto(campo)) {
        for (const p of r.productos || []) {
          const e = todos.get(p.nombre) || { n: 0, categoria: p.categoria || "Sin categoría" };
          e.n++;
          todos.set(p.nombre, e);
        }
      }
      const elegido = this.filtros[campo];
      const q = sinAcentos(this.busquedas[campo]);
      const porCategoria = new Map();
      for (const [nombre, e] of todos) {
        const c = porCategoria.get(e.categoria) || { todos: [], coinciden: [], suma: 0 };
        c.todos.push(nombre);
        c.suma += e.n;
        if (!q || sinAcentos(nombre).includes(q) || nombre === elegido) c.coinciden.push([nombre, e.n]);
        porCategoria.set(e.categoria, c);
      }
      const categorias = [...porCategoria.entries()]
        .filter(([, c]) => c.coinciden.length > 0)
        .sort((a, b) => b[1].suma - a[1].suma || a[0].localeCompare(b[0], "es"))
        .map(([titulo, c]) => {
          const abierta = !!q || !!this.categoriasAbiertas[titulo];
          const ordenadas = ordenar(c.coinciden, elegido);
          return {
            clave: titulo,
            titulo,
            textoTotal: q ? `${fmtEntero(c.coinciden.length)} de ${fmtEntero(c.todos.length)}` : `${fmtEntero(c.todos.length)} ${c.todos.length === 1 ? "producto" : "productos"}`,
            claseLista: abierta ? "lista_conteo" : "lista_conteo lista_corta",
            hayVerTodos: !q && !abierta && c.todos.length > TOP_LISTA,
            hayPlegar: !q && abierta && c.todos.length > TOP_LISTA,
            textoVerTodos: `Ver todos (${fmtEntero(c.todos.length)})`,
            filas: (abierta ? ordenadas.slice(0, MAX_FILAS_LISTA) : ordenadas.slice(0, TOP_LISTA)).map(([k, n]) => fila(k, n, elegido))
          };
        });
      // lo seleccionado se queda a la vista aunque no entre en el top de su categoría
      for (const c of categorias) {
        if (elegido && todos.get(elegido) && todos.get(elegido).categoria === c.titulo && !c.filas.some((f) => f.clave === elegido)) c.filas.unshift(fila(elegido, todos.get(elegido).n, elegido));
      }
      const verTodas = !!q || this.todasCategorias;
      const visibles = verTodas ? categorias : categorias.slice(0, MAX_CATEGORIAS);
      // la categoría del producto seleccionado nunca queda escondida
      const elegida = elegido && todos.get(elegido) ? categorias.find((c) => c.titulo === todos.get(elegido).categoria) : null;
      if (elegida && !visibles.includes(elegida)) visibles.push(elegida);
      return {
        busqueda: this.busquedas[campo],
        textoTotal: `${fmtEntero(todos.size)} productos · ${fmtEntero(porCategoria.size)} ${porCategoria.size === 1 ? "categoría" : "categorías"}`,
        sinDatos: todos.size === 0,
        sinCoincidencias: todos.size > 0 && categorias.length === 0,
        hayMasCategorias: !q && !this.todasCategorias && categorias.length > MAX_CATEGORIAS,
        hayMenosCategorias: !q && this.todasCategorias && categorias.length > MAX_CATEGORIAS,
        textoMasCategorias: `Ver todas las categorías (${fmtEntero(categorias.length)})`,
        categorias: visibles
      };
    })();
    return { solucion, responsable, asociado, cuentaLista, productoLista, sinAsociado: asociado.length === 0, areas: this.armarAreas(conjunto("area")) };
  }

  // un bloque por propietario del programa (área): registros, estatus y horas; cada bloque filtra
  armarAreas(lista) {
    const elegida = this.filtros.area;
    const claves = [...AREAS, ...(lista.some((r) => r.area === SIN_AREA) || elegida === SIN_AREA ? [SIN_AREA] : [])];
    return claves.map((area) => {
      const rs = lista.filter((r) => r.area === area);
      const contratadas = suma(rs, (r) => r.horasContratadas);
      const consumidas = suma(rs, (r) => r.horasConsumidas);
      const personas = new Map();
      for (const r of rs) {
        const k = r.propietario || "Sin propietario";
        personas.set(k, (personas.get(k) || 0) + 1);
      }
      const activa = elegida === area;
      return {
        clave: area,
        etiqueta: area,
        total: fmtEntero(rs.length),
        clase: `area_bloque${area === SIN_AREA ? " area_sin" : ""}${activa ? " area_activa" : ""}`,
        ariaPresionado: String(activa),
        sinRegistros: rs.length === 0,
        enCurso: fmtEntero(rs.filter((r) => !["finalizada", "enPausa", "noIniciada"].includes(r.etapa)).length),
        finalizadas: fmtEntero(rs.filter((r) => r.etapa === "finalizada").length),
        enPausa: fmtEntero(rs.filter((r) => r.etapa === "enPausa").length),
        horas: `${fmtHoras(consumidas)} de ${fmtHoras(contratadas)} h (${fmtPct(contratadas > 0 ? consumidas / contratadas : null)})`,
        personas: [...personas.entries()].sort((a, b) => b[1] - a[1]).map(([nombre, n]) => ({ clave: nombre, texto: `${nombre} · ${fmtEntero(n)}` }))
      };
    });
  }

  // ----- estatus actual: etapa del registro, nunca las actividades -----

  armarCamino(filas) {
    const cuenta = (clave) => filas.filter((r) => r.etapa === clave);
    const conActividad = (clave, grupos) => {
      const n = cuenta(clave).filter((r) => grupos.some((g) => r.gruposActividad.has(g))).length;
      return n ? `${n} con su actividad` : "";
    };
    const notas = {
      kickoff: conActividad("kickoff", ["Kickoff"]),
      enProceso: conActividad("enProceso", ["Planeación", "Ejecución", "Análisis"]),
      entregaFinal: conActividad("entregaFinal", ["Entrega final"])
    };
    const paso = (e, i) => {
      const activo = this.filtros.etapa === e.clave;
      return {
        id: e.clave,
        etapa: e.etiqueta,
        valor: fmtEntero(cuenta(e.clave).length),
        nota: notas[e.clave] || "",
        activo,
        claseLi: `paso paso_${e.clave}${i === 0 ? " paso_primero" : ""}${activo ? " paso_abierto" : ""} paso_interactivo`
      };
    };
    const pausa = {
      id: ETAPA_PAUSA.clave,
      etapa: ETAPA_PAUSA.etiqueta,
      valor: fmtEntero(cuenta("enPausa").length),
      nota: "Condición especial",
      activo: this.filtros.etapa === "enPausa"
    };
    pausa.claseLi = `cierre cierre_pausa${pausa.activo ? " paso_abierto" : ""}`;
    return { pasos: ETAPAS.map(paso), pausa };
  }

  // ----- actividades -----

  armarActividades(filas) {
    const todas = filas.flatMap((r) => (r.actividades || []).map((a) => ({ ...a, registro: r })));
    const porGrupo = GRUPOS_ACTIVIDAD.map((g) => {
      const n = todas.filter((a) => a.grupo === g).length;
      const activo = this.filtros.grupo === g;
      return {
        id: g,
        etiqueta: g,
        valor: fmtEntero(n),
        nota: ((n2) => `${fmtEntero(n2)} ${n2 === 1 ? "registro" : "registros"}`)(filas.filter((r) => r.gruposActividad.has(g)).length),
        clase: `kpi kpi_boton${activo ? " kpi_abierto" : ""}`,
        ariaPresionado: String(activo)
      };
    });
    const conteo = (clave, etiqueta) => {
      const mapa = new Map();
      for (const a of todas) {
        const k = clave(a);
        if (k) mapa.set(k, (mapa.get(k) || 0) + 1);
      }
      return [...mapa.entries()]
        .sort((x, y) => y[1] - x[1])
        .slice(0, 10)
        .map(([k, n]) => ({ clave: k, etiqueta: etiqueta ? etiqueta(k) : k, valor: n }));
    };
    const nombreSeccion = new Map();
    for (const r of filas) for (const s of r.secciones || []) nombreSeccion.set(s.clave, s.nombre);
    const sinGrupo = todas.filter((a) => !GRUPOS_ACTIVIDAD.includes(a.grupo)).length;
    const recientes = [...todas].sort((a, b) => (b.fecha || "").localeCompare(a.fecha || ""));
    const delGrupo = recientes.filter((a) => !this.grupoActividades || a.grupo === this.grupoActividades);
    // búsqueda sin acentos ni mayúsculas, en lo que se ve de la actividad y en lo que capturó
    const q = sinAcentos(this.busquedaActividades);
    const textoDe = (a) =>
      sinAcentos(`${a.asunto} ${a.registro.nombre} ${a.registro.empresa || ""} ${nombreSeccion.get(a.seccion) || ""} ${a.etapa || ""} ${a.resumen || ""}`);
    const visibles = q ? delGrupo.filter((a) => textoDe(a).includes(q)) : delGrupo;
    return {
      total: todas.length,
      // los cinco grupos suman el total, salvo actividades de otras secciones o sin sección identificada: se avisa para que cuadre
      notaGrupos: sinGrupo ? `${fmtEntero(sinGrupo)} ${sinGrupo === 1 ? "actividad es de" : "actividades son de"} otra sección o no se ligó a una sección, así que no está en ningún grupo de arriba.` : "",
      porGrupo,
      porEtapa: conteo((a) => a.etapa),
      porSeccion: conteo((a) => a.seccion, (k) => nombreSeccion.get(k) || k),
      porSolucion: conteo((a) => a.registro.solucion),
      porRegistro: conteo((a) => a.registro.id, (k) => (filas.find((r) => r.id === k) || {}).nombre || k),
      segmentos: ["", ...GRUPOS_ACTIVIDAD].map((g) => ({
        valor: g,
        etiqueta: g || "Todas",
        clase: this.grupoActividades === g ? "segmento segmento_activo" : "segmento",
        seleccionado: this.grupoActividades === g
      })),
      lista: visibles.slice(0, this.limiteActividades).map((a) => {
        const resumen = leerResumen(a.resumen);
        const comentario = resumen.find((x) => x.esComentario);
        return {
          clave: a.id,
          asunto: a.asunto,
          registroId: a.registro.id,
          registro: a.registro.nombre,
          fecha: fmtFecha(a.fecha),
          etapa: a.etapa || "Sin etapa",
          seccion: nombreSeccion.get(a.seccion) || "Sin sección identificada",
          horas: a.horas === null || a.horas === undefined ? "" : `${fmtHoras(a.horas)} h`,
          vistaPrevia: comentario ? comentario.valor.split("\n")[0].slice(0, 180) : "",
          resumen,
          liga: a.liga
        };
      }),
      hayMas: visibles.length > this.limiteActividades,
      textoMas: `Mostrar más (${Math.min(ACTIVIDADES_POR_PAGINA, visibles.length - this.limiteActividades)} de ${visibles.length - this.limiteActividades})`,
      hayLista: visibles.length > 0,
      totalVisibles: visibles.length,
      buscando: this.buscandoActividades,
      ariaBuscando: String(this.buscandoActividades),
      busqueda: this.busquedaActividades,
      claseLupa: this.buscandoActividades || q ? "lupa lupa_activa" : "lupa",
      nota: q
        ? `${fmtEntero(visibles.length)} de ${fmtEntero(delGrupo.length)} actividades coinciden con la búsqueda`
        : `${fmtEntero(visibles.length)} actividades, de la más reciente a la más antigua`
    };
  }

  // "Ver todas / Ver menos" de la lista de cuentas
  alternarLista(e) {
    const { campo } = e.currentTarget.dataset;
    this.listasAbiertas = { ...this.listasAbiertas, [campo]: !this.listasAbiertas[campo] };
    this.recalcular();
  }

  alternarCategorias() {
    this.todasCategorias = !this.todasCategorias;
    this.recalcular();
  }

  // "Ver todos / Ver menos" de una categoría de producto
  alternarCategoria(e) {
    const { categoria } = e.currentTarget.dataset;
    this.categoriasAbiertas = { ...this.categoriasAbiertas, [categoria]: !this.categoriasAbiertas[categoria] };
    this.recalcular();
  }

  buscarEnLista(e) {
    const { campo } = e.currentTarget.dataset;
    this.busquedas = { ...this.busquedas, [campo]: e.detail.value || "" };
    this.recalcular();
  }

  cambiarGrupoActividades(e) {
    this.grupoActividades = e.currentTarget.dataset.valor;
    this.limiteActividades = ACTIVIDADES_POR_PAGINA;
    this.recalcular();
  }

  // lupa: abre o cierra el buscador de actividades; al cerrarlo se quita la búsqueda
  alternarBusquedaActividades() {
    this.buscandoActividades = !this.buscandoActividades;
    if (!this.buscandoActividades) this.busquedaActividades = "";
    this.limiteActividades = ACTIVIDADES_POR_PAGINA;
    this.recalcular();
    if (this.buscandoActividades) {
      requestAnimationFrame(() => {
        const campo = this.template.querySelector(".buscador_actividades");
        if (campo) campo.focus();
      });
    }
  }

  buscarActividades(e) {
    this.busquedaActividades = e.detail.value || "";
    this.limiteActividades = ACTIVIDADES_POR_PAGINA;
    this.recalcular();
  }

  teclaBuscarActividades(e) {
    if (e.key === "Escape" && this.buscandoActividades) this.alternarBusquedaActividades();
  }

  mostrarMasActividades() {
    this.limiteActividades += ACTIVIDADES_POR_PAGINA;
    this.recalcular();
  }

  // ----- horas -----

  armarHoras(filas, paraEstados) {
    const estados = CONSUMOS.map((c) => {
      const n = paraEstados.filter((r) => r.consumo === c.clave).length;
      const activo = this.filtros.consumo === c.clave;
      return {
        id: c.clave,
        etiqueta: c.etiqueta,
        detalle: c.ayuda,
        valor: n,
        clase: `alerta_chip alerta_${c.tono}${activo ? " alerta_abierta" : ""}`,
        ariaPresionado: String(activo)
      };
    });
    const acts = filas.flatMap((r) => (r.actividades || []).filter((a) => a.horas).map((a) => ({ ...a })));
    const horasPor = (clave) => {
      const m = new Map();
      for (const a of acts) {
        const k = clave(a);
        if (k) m.set(k, (m.get(k) || 0) + a.horas);
      }
      return [...m.entries()].sort((x, y) => y[1] - x[1]);
    };
    const nombreSeccion = new Map();
    for (const r of filas) for (const s of r.secciones || []) nombreSeccion.set(s.clave, s.nombre);
    // por registro: quién ha consumido más, con el color de su estado
    const tonoBarra = (r) => {
      const tono = infoConsumo(r.consumo).tono;
      return tono === "ok" ? "okClaro" : tono;
    };
    const topRegistros = [...filas]
      .filter((r) => (r.horasConsumidas || 0) > 0)
      .sort((a, b) => (b.pct === null ? -1 : b.pct) - (a.pct === null ? -1 : a.pct) || b.horasConsumidas - a.horasConsumidas)
      .slice(0, 8)
      .map((r) => ({
        clave: r.id,
        etiqueta: r.nombre,
        valor: r.pct === null ? 0 : Math.min(r.pct, 1.5),
        valorTexto: r.pct === null ? `${fmtHoras(r.horasConsumidas)} h` : `${fmtHoras(r.horasConsumidas)} de ${fmtHoras(r.horasContratadas)} h · ${fmtPct(r.pct)}`,
        tono: tonoBarra(r)
      }));
    // dato secundario: nunca sustituye la lectura por registro
    const hc = suma(filas, (r) => r.horasContratadas);
    const hu = suma(filas, (r) => r.horasConsumidas);
    return {
      estados,
      topRegistros,
      hayTop: topRegistros.length > 0,
      totales: `Referencia de los ${fmtEntero(filas.length)} registros filtrados: ${fmtHoras(hu)} h consumidas de ${fmtHoras(hc)} h contratadas.`,
      porEtapa: horasPor((a) => a.etapa).map(([k, v]) => ({ clave: k, etiqueta: k, valor: v, valorTexto: `${fmtHoras(v)} h`, tono: "info" })),
      porSeccion: horasPor((a) => a.seccion)
        .slice(0, 10)
        .map(([k, v]) => ({ clave: k, etiqueta: nombreSeccion.get(k) || k, valor: v, valorTexto: `${fmtHoras(v)} h`, tono: "infoClaro" })),
      hayPorEtapa: acts.length > 0
    };
  }

  // ----- tiempos y controles de cambio -----

  armarTiempos(filas) {
    const dias = (a, b) => Math.round((Date.parse(b) - Date.parse(a)) / 86400000);
    const hoy = new Date().toISOString().slice(0, 10);
    const promedio = (lista) => (lista.length ? lista.reduce((s, x) => s + x, 0) / lista.length : null);
    const filaDuracion = (tipo, etiqueta) => {
      const delTipo = filas.filter((r) => r.tipo === tipo && r.fechaKickoff);
      const terminadas = delTipo.filter((r) => r.etapa === "finalizada").map((r) => dias(r.fechaKickoff, String(r.cambioEstatus).slice(0, 10)));
      const abiertas = delTipo.filter((r) => r.etapa !== "finalizada").map((r) => dias(r.fechaKickoff, hoy));
      const t = promedio(terminadas.filter((d) => d >= 0));
      const a = promedio(abiertas.filter((d) => d >= 0));
      return [
        { clave: `${tipo}-t`, etiqueta: `${etiqueta} finalizadas`, valor: t || 0, valorTexto: t === null ? "Sin datos" : `${Math.round(t)} días · ${terminadas.length}`, tono: "ok" },
        { clave: `${tipo}-a`, etiqueta: `${etiqueta} abiertas`, valor: a || 0, valorTexto: a === null ? "Sin datos" : `${Math.round(a)} días · ${abiertas.length}`, tono: "info" }
      ];
    };
    const porEtapa = new Map();
    for (const r of filas) for (const t of r.tiempos || []) porEtapa.set(t.etapa, (porEtapa.get(t.etapa) || 0) + t.horas);
    const orden = ["No iniciada", "Agendada", "Kickoff", "En proceso", "Entrega final", "Finalizada"];
    const cambios = filas.flatMap((r) => (r.cambios || []).map((c) => ({ ...c, registro: r })));
    const porHito = new Map();
    for (const c of cambios) porHito.set(c.hito, (porHito.get(c.hito) || 0) + 1);
    const desviaciones = [...cambios]
      .filter((c) => c.dias !== null && c.dias !== undefined)
      .sort((a, b) => Math.abs(b.dias) - Math.abs(a.dias))
      .slice(0, 8)
      .map((c, i) => ({
        clave: `${i}-${c.registro.id}-${c.campo}`,
        registro: c.registro.nombre,
        hito: c.hito,
        anterior: fmtFecha(c.anterior),
        nuevo: fmtFecha(c.nuevo),
        desviacion: `${c.dias > 0 ? "+" : c.dias < 0 ? "−" : ""}${Math.abs(c.dias)} d`,
        clase: c.dias > 0 ? "texto_alerta" : c.dias < 0 ? "texto_ok" : ""
      }));
    const conMas = [...filas]
      .filter((r) => r.nCambios > 0)
      .sort((a, b) => b.nCambios - a.nCambios)
      .slice(0, 6)
      .map((r) => ({ clave: r.id, etiqueta: r.nombre, valor: r.nCambios, valorTexto: `${r.nCambios} ${r.nCambios === 1 ? "cambio" : "cambios"}`, tono: "alerta" }));
    return {
      duracion: [...filaDuracion("Implementación", "Implementaciones"), ...filaDuracion("Proyecto", "Proyectos")],
      porEtapa: orden.filter((e) => porEtapa.has(e)).map((e) => ({ clave: e, etiqueta: e, valor: porEtapa.get(e), valorTexto: `${fmtHoras(porEtapa.get(e))} h`, tono: "info" })),
      hayPorEtapa: porEtapa.size > 0,
      porHito: [...porHito.entries()].sort((a, b) => b[1] - a[1]).map(([k, n]) => ({ clave: k, etiqueta: k, valor: n, valorTexto: `${n}`, tono: "alerta" })),
      hayPorHito: porHito.size > 0,
      desviaciones,
      hayDesviaciones: desviaciones.length > 0,
      conMas,
      hayConMas: conMas.length > 0,
      enPausa: filas.filter((r) => r.etapa === "enPausa").length
    };
  }

  // ---------- tablas de detalle ----------

  armarTablas(filas, tipoVista) {
    return Object.values(TABLAS)
      .filter((t) => !tipoVista || t.tipo === tipoVista)
      .map((t) => this.armarTabla(t, filas.filter((r) => r.tipo === t.tipo)));
  }

  armarTabla(def, delTipo) {
    const estado = this.tablas[def.clave];
    const buscado = estado.busqueda.trim().toLowerCase();
    const todas = ordenar(delTipo.filter((r) => !buscado || r.busqueda.includes(buscado)), estado.orden);
    const visibles = todas.slice(0, estado.limite);
    const clave = def.clave;
    const abierta = (id) => !!estado.abiertas[id];
    return {
      clave,
      titulo: def.titulo,
      vacio: def.vacio,
      seccion: `tabla-${clave}`,
      abierto: this.secciones[`tabla-${clave}`],
      resumenCabecera: `${fmtEntero(delTipo.length)} ${delTipo.length === 1 ? "registro" : "registros"}`,
      busqueda: estado.busqueda,
      hayFilas: todas.length > 0,
      resumenTabla: `${fmtEntero(visibles.length)} de ${fmtEntero(todas.length)}`,
      hayMas: todas.length > visibles.length,
      encabezados: COLUMNAS.map((c) => ({
        campo: c.campo,
        etiqueta: c.etiqueta,
        clase: c.num ? "num" : "",
        aria: estado.orden.campo === c.campo ? (estado.orden.dir === 1 ? "ascending" : "descending") : "none",
        icono: estado.orden.campo === c.campo ? (estado.orden.dir === 1 ? "utility:arrowup" : "utility:arrowdown") : "",
        textoOrden: `Ordenado ${estado.orden.dir === 1 ? "de menor a mayor" : "de mayor a menor"}`
      })),
      columnas: COLUMNAS.length,
      filas: visibles.map((r) => {
        const info = infoConsumo(r.consumo);
        const abiertaFila = abierta(r.id);
        const cerrando = !!estado.cerrando[r.id];
        return {
          id: r.id,
          registro: r,
          clase: abiertaFila ? "fila_seleccionada" : "",
          abierta: abiertaFila,
          claseExpansion: cerrando ? "expansion expansion_cierra" : "expansion",
          ariaAbierta: String(abiertaFila && !cerrando),
          iconoAbrir: abiertaFila && !cerrando ? "utility:chevrondown" : "utility:chevronright",
          textoAbrir: abiertaFila && !cerrando ? "Cerrar el detalle" : "Ver el detalle",
          nombre: r.nombre,
          prueba: r.esPrueba,
          notaNombre: r.tipo === "Proyecto" ? "Proyecto" : "Implementación",
          empresa: r.empresa || "—",
          responsable: r.responsable || "Sin responsable",
          claseResponsable: r.responsable ? "" : "texto_alerta",
          asociado: r.asociado || "—",
          solucion: r.solucion || "—",
          etapa: etiquetaEtapa(r.etapa),
          claseEtapa: `chip chip_${r.etapa}`,
          acordada: fmtFecha(r.fechaAcordadaKickoff),
          kickoff: fmtFecha(r.fechaKickoff),
          contratadas: fmtHoras(r.horasContratadas),
          consumidas: fmtHoras(r.horasConsumidas),
          restantes: fmtHoras(r.restantes),
          claseRestantes: (r.restantes || 0) < 0 ? "num texto_critico" : "num",
          pct: fmtPct(r.pct),
          hayPct: r.pct !== null,
          estiloPct: `width:${Math.min(100, Math.round((r.pct || 0) * 100))}%`,
          clasePct: `avance_relleno tono_${info.tono}`,
          estadoHoras: info.etiqueta,
          claseEstadoHoras: `celda_nota texto_tono_${info.tono}`,
          actividades: r.nAct,
          cambios: r.nCambios,
          claseCambios: r.nCambios > 0 ? "num texto_alerta" : "num"
        };
      })
    };
  }

  get tablasVisibles() {
    return this.vm.tablas || [];
  }

  buscar(e) {
    const { tabla } = e.currentTarget.dataset;
    this.tablas = { ...this.tablas, [tabla]: { ...this.tablas[tabla], busqueda: e.detail.value || "", limite: POR_PAGINA } };
    this.recalcular();
  }

  ordenarPor(e) {
    const { tabla, campo } = e.currentTarget.dataset;
    const actual = this.tablas[tabla].orden;
    const orden = actual.campo === campo ? { campo, dir: -actual.dir } : { campo, dir: 1 };
    this.tablas = { ...this.tablas, [tabla]: { ...this.tablas[tabla], orden } };
    this.recalcular();
  }

  mostrarMas(e) {
    const { tabla } = e.currentTarget.dataset;
    this.tablas = { ...this.tablas, [tabla]: { ...this.tablas[tabla], limite: this.tablas[tabla].limite + POR_PAGINA } };
    this.recalcular();
  }

  // Abrir y cerrar se pueden interrumpir: si se vuelve a tocar mientras cierra, el detalle se queda abierto.
  alternarFila(e) {
    const { tabla, id } = e.currentTarget.dataset;
    const estado = this.tablas[tabla];
    const llave = `${tabla}:${id}`;
    const abiertas = { ...estado.abiertas };
    const cerrando = { ...estado.cerrando };
    if (abiertas[id] && !cerrando[id]) {
      cerrando[id] = true;
      this.temporizadores[llave] = setTimeout(() => {
        const e2 = this.tablas[tabla];
        const a = { ...e2.abiertas };
        const c = { ...e2.cerrando };
        delete a[id];
        delete c[id];
        this.tablas = { ...this.tablas, [tabla]: { ...e2, abiertas: a, cerrando: c } };
        this.recalcular();
      }, 180);
    } else {
      clearTimeout(this.temporizadores[llave]);
      abiertas[id] = true;
      delete cerrando[id];
    }
    this.tablas = { ...this.tablas, [tabla]: { ...estado, abiertas, cerrando } };
    this.recalcular();
  }

  cerrarFila(e) {
    const { tabla, id } = e.currentTarget.dataset;
    this.alternarFila({ currentTarget: { dataset: { tabla, id } } });
  }

  abrirRegistro(e) {
    const id = typeof e.detail === "string" ? e.detail : e.currentTarget.dataset.id;
    this.navegarARegistro(id);
  }

  navegarARegistro(recordId) {
    this[NavigationMixin.Navigate]({
      type: "standard__recordPage",
      attributes: { recordId, objectApiName: "Delivery_y_Desarrollo__c", actionName: "view" }
    });
  }

  // ---------- reporte en Excel ----------

  // Filtros del panel para los reportes en Excel (Apex los aplica sobre la fecha de creación; el campo de fecha elegido aquí no cambia el reporte).
  // Los filtros que solo el panel conoce (producto, actividades, cambios, horas, área) viajan como lista de Ids.
  get filtrosReporte() {
    const f = this.filtros;
    const filtros = {
      desde: f.desde,
      hasta: f.hasta,
      mes: f.mes,
      etapa: f.etapa,
      cuenta: f.cuenta,
      responsable: f.responsable,
      asociado: f.asociado,
      solucion: f.solucion,
      incluirPruebas: this.incluirPruebas
    };
    if (f.producto || f.cambios || f.consumo || f.grupo || f.area) {
      const sinFecha = { ...f, desde: "", hasta: "", mes: "" };
      filtros.ids = this.registros.filter((r) => pasaFiltros(r, sinFecha, false)).map((r) => r.id);
    }
    return JSON.stringify(filtros); // texto: se pasa al botón como propiedad, sin funciones ni objetos de por medio
  }
}
