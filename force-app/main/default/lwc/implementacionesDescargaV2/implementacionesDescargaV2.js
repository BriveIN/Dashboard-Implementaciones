import { LightningElement, api } from "lwc";
import getReporteImplementaciones from "@salesforce/apex/ReportesImplementacionesController.getReporteImplementacionesJson";
import getReporteProyectos from "@salesforce/apex/ReportesImplementacionesController.getReporteProyectosJson";
import { generarXlsxTabla, descargarXlsx } from "c/planTrabajoXlsx";

/*
 * Botón "Descargar reportes" del dashboard de Implementaciones: Implementaciones (Reporte 1) o Proyectos (Reporte 2).
 * Cada descarga usa los filtros que el panel tiene en ese momento (obtenerFiltros los lee al hacer clic).
 * Apex devuelve las filas por páginas (cursor); aquí se juntan y se arma el .xlsx con el mismo módulo del Plan de trabajo.
 */

const DURACION_OK = 6000; // ms que se ve el aviso de éxito
const DURACION_ERROR = 10000; // ms que se ve el aviso de error
const MAX_PAGINAS = 100; // tope de seguridad: con 1,000 registros por página son 100,000 filas
// Presentación de cada hoja, medida de las guías en Reporte/ (anchos por columna, alto del encabezado y relleno)
const HOJAS = {
  implementaciones: {
    "Por fecha creación": {
      altoEncabezado: 43.2,
      anchos: [18, 46.22, 46.22, 19.89, 30.44, 44.55, 31.22, 31, 25.33, 25.33, 22.89, 24.11, 23.22, 46.22, 16.55, 16.66, 16.33, 17.66, 20.44, 19.78, 14.78]
    }
  },
  proyectos: {
    "Fecha de creación": {
      altoEncabezado: 43.2,
      relleno: true,
      anchos: [18, 44.89, 46.22, 16.89, 30.44, 32.44, 31.22, 31, 25.33, 25.33, 22.89, 24.11, 23.22, 46.22, 16.55, 16.66, 18.66, 18.66, 18.66, 19.78, 14.78]
    }
  }
};
const REPORTES = {
  implementaciones: { llamar: getReporteImplementaciones, nombre: "implementaciones" },
  proyectos: { llamar: getReporteProyectos, nombre: "proyectos" }
};

const fechaCorta = (iso) => (iso ? iso.slice(0, 10).split("-").reverse().join("/") : "");

const mensajeError = (e) => (e && e.body && e.body.message) || (e && e.message) || "No se pudo descargar el reporte.";

export default class ImplementacionesDescargaV2 extends LightningElement {
  /** Filtros actuales del panel como texto JSON (objeto Filtros de Apex, sin cursor); el panel lo mantiene al día. */
  @api filtrosReporte;

  menuAbierto = false;
  ocupado = false;
  textoOcupado = "";
  aviso = null; // { tipo: "ok" | "error", texto }
  _temporizador;
  _interno = false;
  _alCerrar;

  connectedCallback() {
    // un clic fuera del botón y del menú lo cierra (los clics de adentro se marcan en marcarInterno)
    this._alCerrar = () => {
      if (this._interno) {
        this._interno = false;
        return;
      }
      this.menuAbierto = false;
    };
    document.addEventListener("click", this._alCerrar);
  }

  disconnectedCallback() {
    clearTimeout(this._temporizador);
    document.removeEventListener("click", this._alCerrar);
  }

  marcarInterno() {
    this._interno = true;
  }

  get textoBoton() {
    return this.ocupado ? this.textoOcupado : "Descargar reportes";
  }

  get ariaMenu() {
    return String(this.menuAbierto);
  }

  get ariaOcupado() {
    return String(this.ocupado);
  }

  // Aviso temporal: aparece en un recuadro y se quita solo (el de error dura más para alcanzar a leerlo); también se cierra al hacer clic
  avisar(tipo, texto) {
    clearTimeout(this._temporizador);
    this.aviso = { tipo, texto };
    this._temporizador = setTimeout(() => this.cerrarAviso(), tipo === "error" ? DURACION_ERROR : DURACION_OK);
  }

  cerrarAviso() {
    clearTimeout(this._temporizador);
    this.aviso = null;
  }

  get hayAviso() {
    return !!this.aviso;
  }

  get textoAviso() {
    return this.aviso ? this.aviso.texto : "";
  }

  get claseAviso() {
    return `aviso ${this.aviso && this.aviso.tipo === "error" ? "aviso_error" : "aviso_ok"}`;
  }

  get rolAviso() {
    return this.aviso && this.aviso.tipo === "error" ? "alert" : "status";
  }

  alternarMenu() {
    this.cerrarAviso();
    this.menuAbierto = !this.menuAbierto;
    if (this.menuAbierto) {
      // foco a la primera opción para quien navega con teclado
      Promise.resolve().then(() => {
        const primera = this.template.querySelector(".opcion");
        if (primera) primera.focus();
      });
    }
  }

  teclaMenu(e) {
    if (!this.menuAbierto) return;
    if (e.key === "Escape") {
      this.menuAbierto = false;
      const boton = this.template.querySelector(".boton_secundario");
      if (boton) boton.focus();
      return;
    }
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
    const opciones = [...this.template.querySelectorAll(".opcion")];
    const actual = opciones.indexOf(this.template.activeElement);
    const paso = e.key === "ArrowDown" ? 1 : -1;
    opciones[(actual + paso + opciones.length) % opciones.length].focus();
    e.preventDefault();
  }

  async descargar(e) {
    const reporte = REPORTES[e.currentTarget.dataset.reporte];
    if (!reporte || this.ocupado) return;
    this.menuAbierto = false;
    this.cerrarAviso();
    this.ocupado = true;
    this.textoOcupado = "Preparando…";
    try {
      // sin los filtros del panel no se descarga: usar valores por defecto daría un reporte distinto al que se ve
      if (typeof this.filtrosReporte !== "string" || !this.filtrosReporte) {
        this.avisar("error", "El panel no envió sus filtros. Recarga la página e inténtalo de nuevo.");
        return;
      }
      const filtros = JSON.parse(this.filtrosReporte);
      let hojas = null;
      let archivo = "";
      let total = 0;
      let rango = "";
      for (let pagina = 0; pagina < MAX_PAGINAS; pagina += 1) {
        const r = await reporte.llamar({ filtros: JSON.stringify(filtros) }); // eslint-disable-line no-await-in-loop
        archivo = r.archivo;
        rango = `del ${fechaCorta(r.desde)} al ${fechaCorta(r.hasta)}`;
        total += r.registros;
        if (!hojas) hojas = r.hojas.map((h) => ({ ...(HOJAS[reporte.nombre][h.nombre] || {}), nombre: h.nombre, columnas: h.columnas, filas: [] }));
        r.hojas.forEach((h, i) => {
          h.filas.forEach((fila) => hojas[i].filas.push(fila));
        });
        this.textoOcupado = `Preparando… ${total.toLocaleString("es-MX")} registros`;
        if (!r.hayMas) break;
        filtros.cursorFecha = r.cursorFecha;
        filtros.cursorId = r.cursorId;
      }
      if (total === 0) {
        this.avisar("error", `No hay ${reporte.nombre} creados ${rango} (el reporte usa la fecha de creación) con los filtros actuales.`);
        return;
      }
      descargarXlsx(generarXlsxTabla(hojas), archivo, this.template.querySelector(".descarga"));
      this.avisar("ok", `Se descargó ${archivo} (${total.toLocaleString("es-MX")} registros).`);
    } catch (err) {
      this.avisar("error", mensajeError(err));
    } finally {
      this.ocupado = false;
    }
  }
}
