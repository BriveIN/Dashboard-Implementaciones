/**
 * Reportes en Excel del panel de implementaciones (LWC implementacionesDescargaV2). Solo lectura.
 *
 *   getReporteImplementaciones  -> Reporte 1: Tipo de Ejecución = Implementación; hoja "Por fecha creación"
 *   getReporteProyectos         -> Reporte 2: Tipo de Ejecución = Proyecto; hoja "Fecha de creación"
 *
 * El rango de fechas se aplica SIEMPRE a CreatedDate, inclusivo y en hora de Ciudad de México. Las columnas salen en el
 * orden y con el texto de la especificación; fórmulas y horas se exportan tal como las guarda Salesforce (no se recalcula).
 * Una consulta por reporte (sin SOQL en ciclos): para soportar miles de filas sin pasar el límite de memoria y de respuesta,
 * la consulta se pagina por llave (CreatedDate, Id) y el componente pide la siguiente página con el cursor que recibe.
 *
 * with sharing + WITH USER_MODE: cada usuario exporta solo lo que ya tiene permitido ver.
 */
public with sharing class ReportesImplementacionesController {

    static final String ZONA = 'America/Mexico_City';
    static final String TIPO_IMPLEMENTACION = 'Implementación';
    static final String TIPO_PROYECTO = 'Proyecto';
    public static final String SIN_RESPONSABLE = '__sin__';
    @TestVisible static Integer tamanoPagina = 1000;

    // ---------- forma de la entrada y de la respuesta ----------

    /** Los filtros que el panel ya tiene (nada nuevo). Las fechas llegan como 'aaaa-mm-dd'; mes como 'aaaa-mm'. */
    public class Filtros {
        @AuraEnabled public String desde;
        @AuraEnabled public String hasta;
        @AuraEnabled public String mes;
        @AuraEnabled public String etapa;           // clave de etapa del panel (noIniciada, kickoff, enPausa, ...)
        @AuraEnabled public String cuenta;
        @AuraEnabled public String responsable;     // SIN_RESPONSABLE = registros sin responsable
        @AuraEnabled public String asociado;
        @AuraEnabled public String solucion;        // etiqueta tal como la muestra el panel
        @AuraEnabled public Boolean incluirPruebas;
        @AuraEnabled public List<String> ids;       // filtros que solo el panel conoce (producto, actividades, cambios, horas, área)
        @AuraEnabled public String cursorFecha;     // página siguiente: último CreatedDate (GMT) y Id de la página anterior
        @AuraEnabled public String cursorId;
    }
    public class Columna {
        @AuraEnabled public String encabezado;
        @AuraEnabled public String tipo;            // texto | fecha | numero | porcentaje
    }
    public class Hoja {
        @AuraEnabled public String nombre;
        @AuraEnabled public List<Columna> columnas = new List<Columna>();
        @AuraEnabled public List<List<Object>> filas = new List<List<Object>>();   // String o Decimal, nunca null (vacío = ''); fecha = 'aaaa-mm-dd'
    }
    public class Reporte {
        @AuraEnabled public String archivo;
        @AuraEnabled public String desde;
        @AuraEnabled public String hasta;
        @AuraEnabled public Integer registros;      // registros de esta página
        @AuraEnabled public Boolean hayMas;
        @AuraEnabled public String cursorFecha;
        @AuraEnabled public String cursorId;
        @AuraEnabled public List<Hoja> hojas = new List<Hoja>();
    }

    // ---------- columnas ----------

    // tipo: id | texto | etiqueta (picklist, toLabel) | multi | fechaHora | fecha | numero | bool
    class Col {
        String encabezado; String api; String tipo;
        Col(String encabezado, String api, String tipo) { this.encabezado = encabezado; this.api = api; this.tipo = tipo; }
        String tipoHoja() {
            return tipo == 'fecha' || tipo == 'fechaHora' ? 'fecha' : tipo == 'numero' ? 'numero' : 'texto';
        }
    }
    class DefHoja {
        String nombre; List<Col> columnas;
        DefHoja(String nombre, List<Col> columnas) { this.nombre = nombre; this.columnas = columnas; }
    }

    static Col c(String encabezado, String api, String tipo) { return new Col(encabezado, api, tipo); }

    // Los textos de cada reporte son los de la especificación, con sus mayúsculas (R1 y R2 no coinciden en dos encabezados).
    static List<Col> columnasPrincipal(String encuesta) {
        return new List<Col>{
            c('Implementación: Id.', 'Id', 'id'),
            c('Nombre comercial de la cuenta', 'Nombre_Comercial_de_la_Cuenta__c', 'texto'),
            c('Implementación: Nombre de la Implementación', 'Name', 'texto'),
            c('Solución Adquirida', 'Soluci_n_adquirida__c', 'etiqueta'),
            c('Responsable de la Implementación', 'Responsable_de_la_Implementaci_n__c', 'etiqueta'),
            c('Consultor Asociado', 'Consultor_Asociado__c', 'multi'),
            c('Etapa del Proyecto/Implementacion', 'Etapa_del_Proyecto__c', 'etiqueta'),
            c('Implementación: Fecha de creación', 'CreatedDate', 'fechaHora'),
            c('Fecha Inicio Implementación', 'Fecha_Inicio_Implementaci_n__c', 'fecha'),
            c('Fecha estimada fin implementación/proyecto', 'Fecha_Acordada_Final_Config__c', 'fecha'),
            c('Fecha Sesión Final Cliente', 'Fecha_Sesion_Final_Cliente__c', 'fecha'),
            c('Fecha Envío Acta de Entrega', 'Fecha_Envio_Acta_Entrega__c', 'fecha'),
            c('Fecha Recibo VoBo Cliente', 'Fecha_Recibo_VoBo_Cliente__c', 'fecha'),
            c('Vencimiento de Implementación', 'Vencimiento_de_Implementaci_n__c', 'texto'),
            c('Horas Contratadas', 'Horas_Contratadas__c', 'numero'),
            c('Horas Consumidas', 'Horas__c', 'numero'),
            c('Horas Disponibles', 'Horas_Disponibles__c', 'numero'),
            c('Acta de entrega firmada cliente', 'Acta_de_Entrega_Firmada_Cliente__c', 'bool'),
            c(encuesta, 'Encuesta_de_Satisfaccion__c', 'bool'),
            c('Satisfacion del Cliente', 'Satisfacion_del_Cliente__c', 'numero'),
            c('Comentarios Sesión final', 'Comentarios_Sesion_Final__c', 'texto')
        };
    }

    // ---------- entradas del LWC ----------

    /**
     * Entradas del LWC: los filtros viajan como texto JSON (un objeto Apex como parámetro de Aura puede llegar vacío y el reporte
     * saldría con los valores por defecto). Devuelven lo mismo que getReporteImplementaciones / getReporteProyectos.
     */
    @AuraEnabled
    public static Reporte getReporteImplementacionesJson(String filtros) {
        return getReporteImplementaciones(leerFiltros(filtros));
    }

    @AuraEnabled
    public static Reporte getReporteProyectosJson(String filtros) {
        return getReporteProyectos(leerFiltros(filtros));
    }

    static Filtros leerFiltros(String texto) {
        try {
            return String.isBlank(texto) ? null : (Filtros) JSON.deserialize(texto, Filtros.class);
        } catch (JSONException e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage('No se pudieron leer los filtros del panel: ' + e.getMessage());
            throw ex;
        }
    }

    public static Reporte getReporteImplementaciones(Filtros filtros) {
        return generar(filtros, TIPO_IMPLEMENTACION, 'implementaciones', new List<DefHoja>{
            new DefHoja('Por fecha creación', columnasPrincipal('Encuesta de Satisfacción Enviada'))
        });
    }

    public static Reporte getReporteProyectos(Filtros filtros) {
        return generar(filtros, TIPO_PROYECTO, 'proyectos', new List<DefHoja>{
            new DefHoja('Fecha de creación', columnasPrincipal('Encuesta de Satisfacción enviada'))
        });
    }

    // ---------- armado ----------

    static Reporte generar(Filtros filtros, String tipo, String nombreArchivo, List<DefHoja> hojas) {
        try {
            Filtros f = filtros == null ? new Filtros() : filtros;
            Date[] rango = rango(f);
            List<Delivery_y_Desarrollo__c> registros = consultar(f, tipo, rango[0], rango[1], hojas);

            Reporte salida = new Reporte();
            salida.desde = String.valueOf(rango[0]);
            salida.hasta = String.valueOf(rango[1]);
            salida.archivo = 'Reporte_' + nombreArchivo + '_' + salida.desde + '_a_' + salida.hasta + '.xlsx';
            salida.hayMas = registros.size() > tamanoPagina;
            if (salida.hayMas) registros.remove(registros.size() - 1);
            salida.registros = registros.size();
            if (salida.hayMas) {
                Delivery_y_Desarrollo__c ultimo = registros[registros.size() - 1];
                salida.cursorFecha = ultimo.CreatedDate.formatGmt('yyyy-MM-dd HH:mm:ss');
                salida.cursorId = ultimo.Id;
            }
            for (DefHoja d : hojas) salida.hojas.add(armarHoja(d, registros));
            return salida;
        } catch (Exception e) {
            AuraHandledException ex = new AuraHandledException(e.getMessage());
            ex.setMessage('No se pudo generar el reporte: ' + e.getMessage());
            throw ex;
        }
    }

    static Hoja armarHoja(DefHoja d, List<Delivery_y_Desarrollo__c> registros) {
        Hoja h = new Hoja();
        h.nombre = d.nombre;
        for (Col col : d.columnas) {
            Columna columna = new Columna();
            columna.encabezado = col.encabezado;
            columna.tipo = col.tipoHoja();
            h.columnas.add(columna);
        }
        for (Delivery_y_Desarrollo__c r : registros) {
            List<Object> fila = new List<Object>();
            for (Col col : d.columnas) fila.add(valor(r, col));
            h.filas.add(fila);
        }
        return h;
    }

    static Object valor(Delivery_y_Desarrollo__c r, Col col) {
        Object v = r.get(col.api);
        // Aura descarta los null dentro de una lista y recorre las celdas siguientes: una celda vacía viaja como ''
        if (v == null) return '';
        switch on col.tipo {
            when 'id' { return String.valueOf(r.Id).left(15); }   // el Id de 18 es el de 15 más una suma de control
            when 'fechaHora' { return ((Datetime) v).format('yyyy-MM-dd', ZONA); }
            when 'fecha' { return String.valueOf((Date) v); }
            when 'numero' { return (Decimal) v; }
            when 'bool' { return (Boolean) v ? 'Sí' : 'No'; }
            when 'multi' { return ((String) v).replace(';', '; '); }
            when else { return String.valueOf(v); }
        }
    }

    // ---------- consulta ----------

    // una sola consulta con los campos de todas las hojas del reporte
    static List<Delivery_y_Desarrollo__c> consultar(Filtros f, String tipo, Date desde, Date hasta, List<DefHoja> hojas) {
        Set<String> campos = new Set<String>{ 'Id', 'CreatedDate' };
        Set<String> yaPedidos = new Set<String>{ 'Id', 'CreatedDate' };
        for (DefHoja d : hojas) {
            for (Col col : d.columnas) {
                if (!yaPedidos.add(col.api)) continue;
                campos.add(col.tipo == 'etiqueta' || col.tipo == 'multi' ? 'toLabel(' + col.api + ')' : col.api);
            }
        }

        Map<String, Object> binds = new Map<String, Object>{
            'tipo' => tipo,
            'desdeDt' => inicioDelDia(desde),
            'hastaDt' => inicioDelDia(hasta.addDays(1)),    // exclusivo: el último día entra completo
            'limite' => tamanoPagina + 1
        };
        String donde = ' WHERE Tipo_de_Ejecucion__c = :tipo AND CreatedDate >= :desdeDt AND CreatedDate < :hastaDt';
        donde += filtrosDelPanel(f, binds);
        if (String.isNotBlank(f.cursorFecha) && String.isNotBlank(f.cursorId)) {
            binds.put('cursorFecha', Datetime.valueOfGmt(f.cursorFecha));
            binds.put('cursorId', (Id) f.cursorId);
            donde += ' AND (CreatedDate > :cursorFecha OR (CreatedDate = :cursorFecha AND Id > :cursorId))';
        }
        String consulta = 'SELECT ' + String.join(new List<String>(campos), ', ') + ' FROM Delivery_y_Desarrollo__c' + donde
            + ' ORDER BY CreatedDate ASC, Id ASC LIMIT :limite';
        // AccessLevel.USER_MODE equivale a WITH USER_MODE (no se pueden poner los dos en una consulta dinámica)
        return (List<Delivery_y_Desarrollo__c>) Database.queryWithBinds(consulta, binds, AccessLevel.USER_MODE);
    }

    // mismos criterios que pasaFiltros del panel; solo los que existen allí
    static String filtrosDelPanel(Filtros f, Map<String, Object> binds) {
        String donde = '';
        if (String.isNotBlank(f.etapa)) {
            Set<String> etapas = new Set<String>();
            for (String original : ImplementacionesPanelV2Controller.ETAPAS.keySet()) {
                if (ImplementacionesPanelV2Controller.ETAPAS.get(original) == f.etapa) etapas.add(original);
            }
            binds.put('etapas', etapas);
            donde += ' AND Etapa_del_Proyecto__c IN :etapas';
        }
        if (String.isNotBlank(f.cuenta)) {
            binds.put('cuenta', f.cuenta);
            donde += ' AND (Cuenta_Comercial__r.Name = :cuenta OR (Cuenta_Comercial__c = null AND Nombre_Comercial_de_la_Cuenta__c = :cuenta))';
        }
        if (f.responsable == SIN_RESPONSABLE) {
            donde += ' AND Responsable_de_la_Implementaci_n__c = null';
        } else if (String.isNotBlank(f.responsable)) {
            binds.put('responsable', valorDePicklist(Delivery_y_Desarrollo__c.Responsable_de_la_Implementaci_n__c.getDescribe(), f.responsable));
            donde += ' AND Responsable_de_la_Implementaci_n__c = :responsable';
        }
        if (String.isNotBlank(f.asociado)) {
            binds.put('asociado', valorDePicklist(Delivery_y_Desarrollo__c.Consultor_Asociado__c.getDescribe(), f.asociado));
            donde += ' AND Consultor_Asociado__c INCLUDES (:asociado)';
        }
        if (String.isNotBlank(f.solucion)) {
            binds.put('solucion', valorDePicklist(Delivery_y_Desarrollo__c.Soluci_n_adquirida__c.getDescribe(), f.solucion));
            donde += ' AND Soluci_n_adquirida__c = :solucion';
        }
        if (f.incluirPruebas != true) {
            binds.put('prueba', ImplementacionesPanelV2Controller.CUENTA_PRUEBA);
            donde += ' AND (Cuenta_Comercial__c = null OR (NOT Cuenta_Comercial__r.Name LIKE :prueba))';
        }
        if (f.ids != null) {
            Set<Id> ids = new Set<Id>();
            for (String texto : f.ids) {
                try { ids.add((Id) texto); } catch (Exception e) { continue; }
            }
            binds.put('ids', ids);
            donde += ' AND Id IN :ids';
        }
        return donde;
    }

    // el panel muestra etiquetas (toLabel); la consulta necesita el valor guardado
    @TestVisible static String valorDePicklist(Schema.DescribeFieldResult campo, String etiqueta) {
        for (Schema.PicklistEntry p : campo.getPicklistValues()) {
            if (p.getLabel() == etiqueta || p.getValue() == etiqueta) return p.getValue();
        }
        return etiqueta;
    }

    // ---------- fechas ----------

    /**
     * Rango [desde, hasta] del reporte. El mes del panel se vuelve rango; sin fechas, desde el corte del panel hasta hoy.
     * Siempre se aplica a la fecha de creación: el selector "campo de fecha" del panel no cambia el reporte.
     */
    @TestVisible static Date[] rango(Filtros f) {
        Date desde = leerFecha(f.desde);
        Date hasta = leerFecha(f.hasta);
        if (String.isNotBlank(f.mes) && f.mes.length() >= 7) {
            Date primero = Date.newInstance(Integer.valueOf(f.mes.substring(0, 4)), Integer.valueOf(f.mes.substring(5, 7)), 1);
            Date ultimo = primero.addMonths(1).addDays(-1);
            if (desde == null || desde < primero) desde = primero;
            if (hasta == null || hasta > ultimo) hasta = ultimo;
        }
        if (desde == null) desde = ImplementacionesPanelV2Controller.FECHA_INICIO_DATOS;
        if (hasta == null) hasta = Date.today();
        if (desde > hasta) throw new ReporteException('El rango de fechas no es válido: ' + desde + ' es posterior a ' + hasta + '.');
        return new Date[]{ desde, hasta };
    }

    static Date leerFecha(String texto) {
        if (String.isBlank(texto)) return null;
        try {
            return Date.valueOf(texto.left(10));
        } catch (Exception e) {
            throw new ReporteException('Fecha no válida: ' + texto);
        }
    }

    // 00:00 en hora de Ciudad de México expresado en GMT, que es lo que compara CreatedDate
    @TestVisible static Datetime inicioDelDia(Date dia) {
        Datetime gmt = Datetime.newInstanceGmt(dia, Time.newInstance(0, 0, 0, 0));
        return gmt.addSeconds(-(TimeZone.getTimeZone(ZONA).getOffset(gmt) / 1000));
    }

    public class ReporteException extends Exception {}
}
