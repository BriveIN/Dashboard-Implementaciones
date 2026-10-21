/**
 * Plan de trabajo de una Implementación (LWC implementacionesDetalleV2 -> "Descargar plan de trabajo"). Solo lectura.
 *
 * Arma, para UN registro, las 5 etapas del plan (Kickoff, Planeación, Ejecución, Análisis y Entrega final) leyendo los
 * campos que ya existen en Delivery_y_Desarrollo__c. De dónde sale cada fila está en Plan_Trabajo_Actividad__mdt
 * (un registro por actividad): para agregar una actividad nueva basta un registro de metadata, sin código.
 *
 * Filas: las fijas (sin casilla) siempre; las de Ejecución y Análisis solo si su casilla está marcada y la solución y el
 * tipo (Implementación / Proyecto) del registro están en su regla. El logo sale de Logo_Solucion__mdt.
 *
 * with sharing + USER_MODE: cada usuario obtiene solo lo que ya tiene permitido.
 */
public with sharing class PlanTrabajoController {

    @TestVisible static final List<String> ETAPAS = new List<String>{ 'Kickoff', 'Planeación', 'Ejecución', 'Análisis', 'Entrega final' };
    @TestVisible static final String ETAPA_PAUSA = 'En Pausa';
    @TestVisible static final String SIN_INICIAR = 'Sin iniciar';
    @TestVisible static final String EN_PROCESO = 'En proceso';
    @TestVisible static final String FINALIZADO = 'Finalizado';
    @TestVisible static final String EN_PAUSA = 'En pausa';
    // los campos "Duración X" están en horas (los flows los escriben como "Duracion (horas)"): una jornada = 8 h
    @TestVisible static final Decimal HORAS_POR_DIA = 8;
    @TestVisible static final String SEPARADOR_COMENTARIOS = ' · ';

    // avance que se propone según el estatus (editable en el Excel)
    static final Map<String, Decimal> AVANCE = new Map<String, Decimal>{
        'Sin iniciar' => 0, 'En proceso' => 0.5, 'En pausa' => 0, 'Finalizado' => 1
    };

    // ---------- forma de la respuesta ----------

    public class Actividad {
        @AuraEnabled public String nombre;
        @AuraEnabled public String inicia;      // AAAA-MM-DD o null (el Excel muestra "Por definir")
        @AuraEnabled public String fin;         // AAAA-MM-DD o null: solo cuando Salesforce guarda una fecha de fin
        @AuraEnabled public Decimal duracion;   // días hábiles, o null
        @AuraEnabled public String asignado;
        @AuraEnabled public Boolean conCliente; // la fila requiere participación del cliente (se resalta en azul)
        @AuraEnabled public Decimal avance;     // 0 a 1
        @AuraEnabled public String estatus;     // Sin iniciar | En proceso | Finalizado | En pausa
        @AuraEnabled public String comentarios;
    }

    public class Fase {
        @AuraEnabled public String nombre;
        @AuraEnabled public List<Actividad> actividades = new List<Actividad>();
    }

    public class Plan {
        @AuraEnabled public Id registroId;
        @AuraEnabled public String cliente;
        @AuraEnabled public String nombreCorto;     // para "Asignado a" y para resaltar las filas del cliente
        @AuraEnabled public String proyecto;
        @AuraEnabled public String tipo;
        @AuraEnabled public String solucion;        // etiqueta con la que los usuarios ven la solución
        @AuraEnabled public String responsable;
        @AuraEnabled public String contacto;
        @AuraEnabled public Decimal participantes;
        @AuraEnabled public Decimal horasContratadas;
        @AuraEnabled public String estadoProyecto;
        @AuraEnabled public String logoRecurso;     // nombre del Static Resource, o null si la solución no tiene logo
        @AuraEnabled public String logoUrl;
        @AuraEnabled public String logoExtension;   // png | jpeg
        @AuraEnabled public List<Fase> fases = new List<Fase>();
        @AuraEnabled public List<String> avisos = new List<String>();   // configuración o permisos que dejaron algo fuera del plan
    }

    // sin cacheable: el plan debe reflejar lo último capturado cada vez que se descarga
    @AuraEnabled
    public static Plan obtenerPlan(Id registroId) {
        try {
            return armar(registroId, Date.today());
        } catch (AuraHandledException e) {
            throw e;
        } catch (Exception e) {
            throw new AuraHandledException('No se pudo armar el plan de trabajo: ' + e.getMessage());
        }
    }

    // ---------- armado ----------

    // filas del mapeo en el orden de Orden__c
    class Fila implements Comparable {
        Plan_Trabajo_Actividad__mdt m;
        Fila(Plan_Trabajo_Actividad__mdt m) { this.m = m; }
        public Integer compareTo(Object otro) {
            Decimal a = m.Orden__c == null ? 0 : m.Orden__c;
            Decimal b = ((Fila) otro).m.Orden__c == null ? 0 : ((Fila) otro).m.Orden__c;
            return a == b ? 0 : (a < b ? -1 : 1);
        }
    }

    @TestVisible
    static Plan armar(Id registroId, Date hoy) {
        if (registroId == null) throw new AuraHandledException('Falta el registro del que se arma el plan.');
        Plan plan = new Plan();
        plan.registroId = registroId;

        List<Fila> filas = new List<Fila>();
        for (Plan_Trabajo_Actividad__mdt m : Plan_Trabajo_Actividad__mdt.getAll().values()) filas.add(new Fila(m));
        filas.sort();

        Set<String> consultados = new Set<String>();
        Delivery_y_Desarrollo__c r = consultarRegistro(registroId, filas, consultados, plan.avisos);

        String solucion = (String) r.get('Soluci_n_adquirida__c');
        String tipo = r.Tipo_de_Ejecucion__c;
        plan.cliente = r.Cuenta_Comercial__r != null ? r.Cuenta_Comercial__r.Name : r.Nombre_Comercial_de_la_Cuenta__c;
        plan.nombreCorto = String.isNotBlank(r.Nombre_Comercial_de_la_Cuenta__c) ? r.Nombre_Comercial_de_la_Cuenta__c : plan.cliente;
        plan.proyecto = r.Name;
        plan.tipo = tipo;
        plan.solucion = etiquetaSolucion(solucion);
        plan.responsable = (String) r.get('Responsable_de_la_Implementaci_n__c');
        plan.contacto = r.Contacto__r != null ? r.Contacto__r.Name : null;
        plan.participantes = decimalDe(valor(r, 'Total_Participantes__c', consultados));
        plan.horasContratadas = decimalDe(valor(r, 'Horas_Contratadas__c', consultados));
        plan.estadoProyecto = r.Etapa_del_Proyecto__c;
        asignarLogo(plan, solucion);

        Boolean pausa = r.Etapa_del_Proyecto__c == ETAPA_PAUSA;
        Map<String, Fase> porEtapa = new Map<String, Fase>();
        for (String etapa : ETAPAS) {
            Fase f = new Fase();
            f.nombre = etapa;
            porEtapa.put(etapa, f);
            plan.fases.add(f);
        }
        for (Fila fila : filas) {
            Plan_Trabajo_Actividad__mdt m = fila.m;
            if (!porEtapa.containsKey(m.Etapa__c)) {
                plan.avisos.add('La actividad ' + m.Actividad__c + ' tiene una etapa desconocida (' + m.Etapa__c + '): no sale en el plan.');
                continue;
            }
            if (!aplica(m, r, consultados, solucion, tipo)) continue;
            porEtapa.get(m.Etapa__c).actividades.add(actividadDe(m, r, consultados, plan, pausa, hoy));
        }
        return plan;
    }

    /** Fija = siempre. Con casilla: marcada, que aplique al tipo y a la solución, y (si se pide) con dato en un campo extra. */
    @TestVisible
    static Boolean aplica(Plan_Trabajo_Actividad__mdt m, Delivery_y_Desarrollo__c r, Set<String> consultados, String solucion, String tipo) {
        if (String.isNotBlank(m.Checkbox__c) && valor(r, m.Checkbox__c, consultados) != true) return false;
        if (String.isNotBlank(m.Requiere_Dato__c) && !lleno(valor(r, m.Requiere_Dato__c, consultados))) return false;
        if (String.isNotBlank(m.Aplica_A__c) && m.Aplica_A__c != 'Ambos' && m.Aplica_A__c != tipo) return false;
        List<String> soluciones = partir(m.Soluciones__c);
        return soluciones.isEmpty() || soluciones[0] == 'Todas' || soluciones.contains(solucion);
    }

    static Actividad actividadDe(Plan_Trabajo_Actividad__mdt m, Delivery_y_Desarrollo__c r, Set<String> consultados, Plan plan,
            Boolean pausa, Date hoy) {
        Actividad a = new Actividad();
        a.nombre = m.Actividad__c;

        Date inicio = primeraFecha(r, m.Campos_Inicio__c, consultados);
        Date finCampo = primeraFecha(r, m.Campos_Fin__c, consultados);
        // un fin anterior al inicio es un dato mal capturado: se ignora en vez de producir una duración absurda
        if (inicio != null && finCampo != null && finCampo < inicio) finCampo = null;
        a.inicia = inicio == null ? null : String.valueOf(inicio);
        a.fin = finCampo == null ? null : String.valueOf(finCampo);
        a.duracion = duracionDe(m, r, consultados);

        // para el estatus: el fin guardado, o inicio + duración en días hábiles
        Date fin = finCampo;
        if (fin == null && inicio != null) fin = sumarDiasHabiles(inicio, (a.duracion == null ? 1 : Integer.valueOf(a.duracion)) - 1);

        a.estatus = estatusDe(m.Tipo_Estatus__c, estatusBooleano(m, r, consultados), inicio, fin, pausa, hoy);
        a.avance = AVANCE.get(a.estatus);
        a.asignado = asignadoDe(m.Asignado__c, plan);
        a.conCliente = m.Asignado__c != null && m.Asignado__c.contains('Cliente');
        a.comentarios = comentariosDe(m, r, consultados);
        return a;
    }

    /** Días hábiles: el campo "Duración X" (horas / 8, mínimo 1 día) o la duración fija de la actividad. */
    @TestVisible
    static Decimal duracionDe(Plan_Trabajo_Actividad__mdt m, Delivery_y_Desarrollo__c r, Set<String> consultados) {
        if (String.isNotBlank(m.Campo_Duracion__c)) {
            Decimal valor = decimalDe(valor(r, m.Campo_Duracion__c, consultados));
            if (valor != null && valor > 0) {
                Decimal dias = m.Unidad_Duracion__c == 'Dias' ? valor : valor / HORAS_POR_DIA;
                return Math.max(1, Math.ceil(dias));
            }
        }
        return m.Duracion_Fija__c;
    }

    /**
     * SeCompleto: la casilla "Se completó" en verdadero = Finalizado; si no, con inicio <= hoy = En proceso; si no, Sin iniciar.
     * FechaSesion: fecha < hoy = Finalizado; = hoy = En proceso; futura o vacía = Sin iniciar.
     * Fechas: fin <= hoy = Finalizado; solo inicio <= hoy = En proceso; sin fechas = Sin iniciar.
     * Con el registro en pausa, lo que no esté finalizado sale En pausa.
     */
    @TestVisible
    static String estatusDe(String regla, Boolean completo, Date inicio, Date fin, Boolean pausa, Date hoy) {
        String estatus = SIN_INICIAR;
        if (regla == 'SeCompleto') {
            if (completo == true) estatus = FINALIZADO;
            else if (inicio != null && inicio <= hoy) estatus = EN_PROCESO;
        } else if (regla == 'FechaSesion') {
            if (inicio != null && inicio < hoy) estatus = FINALIZADO;
            else if (inicio != null && inicio == hoy) estatus = EN_PROCESO;
        } else {
            if (fin != null && fin <= hoy) estatus = FINALIZADO;
            else if (inicio != null && inicio <= hoy) estatus = EN_PROCESO;
        }
        return pausa && estatus != FINALIZADO ? EN_PAUSA : estatus;
    }

    static Boolean estatusBooleano(Plan_Trabajo_Actividad__mdt m, Delivery_y_Desarrollo__c r, Set<String> consultados) {
        return String.isBlank(m.Campo_Estatus__c) ? null : valor(r, m.Campo_Estatus__c, consultados) == true;
    }

    // Brivé -> "Brivé Soluciones | {Responsable}"; Cliente -> "{Nombre corto} | {Contacto}"; Brivé + Cliente -> "Brivé Soluciones | {Responsable} + {Nombre corto}"
    @TestVisible
    static String asignadoDe(String clasificacion, Plan plan) {
        String brive = 'Brivé Soluciones' + (String.isNotBlank(plan.responsable) ? ' | ' + plan.responsable : '');
        String cliente = String.isNotBlank(plan.nombreCorto) ? plan.nombreCorto : 'Cliente';
        if (clasificacion == 'Cliente') return cliente + (String.isNotBlank(plan.contacto) ? ' | ' + plan.contacto : '');
        if (clasificacion == 'Brivé + Cliente') return brive + ' + ' + cliente;
        return brive;
    }

    static String comentariosDe(Plan_Trabajo_Actividad__mdt m, Delivery_y_Desarrollo__c r, Set<String> consultados) {
        List<String> partes = new List<String>();
        for (String api : partir(m.Campos_Comentarios__c)) {
            Object v = valor(r, api, consultados);
            if (v == null) continue;
            // los campos de texto enriquecido guardan HTML ("<p>texto</p>"): en el Excel solo va el texto
            String texto = v instanceof Decimal
                ? ((Decimal) v).stripTrailingZeros().toPlainString()
                : String.valueOf(v).stripHtmlTags().unescapeHtml4().replace(';', ', ');
            if (String.isNotBlank(texto)) partes.add(texto.trim());
        }
        if (partes.isEmpty()) return null;
        // el metadata recorta los espacios finales: el prefijo siempre se separa del texto con uno
        return (String.isBlank(m.Prefijo_Comentario__c) ? '' : m.Prefijo_Comentario__c.trim() + ' ') + String.join(partes, SEPARADOR_COMENTARIOS);
    }

    // ---------- consulta ----------

    static Delivery_y_Desarrollo__c consultarRegistro(Id registroId, List<Fila> filas, Set<String> consultados, List<String> avisos) {
        Map<String, Schema.SObjectField> existentes = Schema.SObjectType.Delivery_y_Desarrollo__c.fields.getMap();
        Set<String> campos = new Set<String>{
            'Name', 'Tipo_de_Ejecucion__c', 'Etapa_del_Proyecto__c', 'Cuenta_Comercial__r.Name', 'Nombre_Comercial_de_la_Cuenta__c',
            'Contacto__r.Name', 'toLabel(Responsable_de_la_Implementaci_n__c)', 'Soluci_n_adquirida__c'
        };
        consultados.addAll(new Set<String>{ 'responsable_de_la_implementaci_n__c', 'soluci_n_adquirida__c' });
        Set<String> pedidos = new Set<String>{ 'Total_Participantes__c', 'Horas_Contratadas__c' };
        for (Fila f : filas) {
            Plan_Trabajo_Actividad__mdt m = f.m;
            pedidos.addAll(new Set<String>{ m.Checkbox__c, m.Requiere_Dato__c, m.Campo_Duracion__c, m.Campo_Estatus__c });
            for (String lista : new List<String>{ m.Campos_Inicio__c, m.Campos_Fin__c, m.Campos_Comentarios__c }) pedidos.addAll(partir(lista));
        }
        pedidos.remove(null);
        pedidos.remove('');
        for (String api : pedidos) {
            Schema.SObjectField campo = existentes.get(api.toLowerCase());
            if (campo == null) {
                avisos.add('El campo ' + api + ' no existe en la Implementación.');
            } else if (!campo.getDescribe().isAccessible()) {
                avisos.add('Sin acceso al campo ' + api + ': se deja fuera del plan.');
            } else {
                campos.add(api);
                consultados.add(api.toLowerCase());
            }
        }
        List<Delivery_y_Desarrollo__c> encontrados = (List<Delivery_y_Desarrollo__c>) Database.queryWithBinds(
            'SELECT ' + String.join(new List<String>(campos), ', ') + ' FROM Delivery_y_Desarrollo__c WHERE Id = :registroId',
            new Map<String, Object>{ 'registroId' => registroId }, AccessLevel.USER_MODE);
        if (encontrados.isEmpty()) throw new AuraHandledException('No se encontró la implementación o no tienes acceso a ella.');
        return encontrados[0];
    }

    // logo de la solución: Logo_Solucion__mdt apunta a un Static Resource. Sin registro o sin recurso, el plan sale sin logo de solución.
    static void asignarLogo(Plan plan, String solucion) {
        if (String.isBlank(solucion)) return;
        String recurso;
        for (Logo_Solucion__mdt l : Logo_Solucion__mdt.getAll().values()) {
            if (l.Solucion__c == solucion) { recurso = l.Recurso__c; break; }
        }
        if (String.isBlank(recurso)) return;
        // StaticResource es configuración de la org, no datos del usuario: se lee en modo sistema
        List<StaticResource> encontrados = [SELECT Name, ContentType, SystemModstamp FROM StaticResource WHERE Name = :recurso WITH SYSTEM_MODE LIMIT 1];
        if (encontrados.isEmpty()) {
            plan.avisos.add('El Static Resource ' + recurso + ' no existe: el plan sale sin logo de solución.');
            return;
        }
        StaticResource s = encontrados[0];
        String tipo = s.ContentType == null ? '' : s.ContentType.toLowerCase();
        if (tipo == 'image/png') plan.logoExtension = 'png';
        else if (tipo == 'image/jpeg' || tipo == 'image/jpg') plan.logoExtension = 'jpeg';
        else {
            plan.avisos.add('El Static Resource ' + recurso + ' no es png ni jpg: el plan sale sin logo de solución.');
            return;
        }
        plan.logoRecurso = recurso;
        plan.logoUrl = '/resource/' + s.SystemModstamp.getTime() + '/' + s.Name;
    }

    // ---------- utilidades ----------

    // etiqueta con la que los usuarios ven la solución (por ejemplo "Nuevo Evaluatest" se ve como "Evaluatest I.A.");
    // las reglas y el logo se comparan con el valor guardado, no con la etiqueta
    static String etiquetaSolucion(String valor) {
        if (String.isBlank(valor)) return valor;
        for (Schema.PicklistEntry e : Delivery_y_Desarrollo__c.Soluci_n_adquirida__c.getDescribe().getPicklistValues()) {
            if (e.getValue() == valor) return e.getLabel();
        }
        return valor;
    }

    // solo lee campos que sí entraron a la consulta (los demás darían SObjectException)
    static Object valor(Delivery_y_Desarrollo__c r, String api, Set<String> consultados) {
        if (String.isBlank(api) || !consultados.contains(api.toLowerCase())) return null;
        return r.get(api);
    }

    static Boolean lleno(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean) return (Boolean) v;
        if (v instanceof String) return String.isNotBlank((String) v);
        return true;
    }

    static Decimal decimalDe(Object v) {
        return v instanceof Decimal ? (Decimal) v : null;
    }

    // primera fecha con valor de una lista de campos separados por coma
    static Date primeraFecha(Delivery_y_Desarrollo__c r, String campos, Set<String> consultados) {
        for (String api : partir(campos)) {
            Object v = valor(r, api, consultados);
            if (v instanceof Date) return (Date) v;
        }
        return null;
    }

    // lunes a viernes, sin feriados (el Excel sí los considera; aquí solo sirve para decidir el estatus)
    @TestVisible
    static Date sumarDiasHabiles(Date inicio, Integer dias) {
        Date d = inicio;
        Integer n = 0;
        while (n < dias) {
            d = d.addDays(1);
            String dia = Datetime.newInstance(d, Time.newInstance(12, 0, 0, 0)).formatGmt('u');   // 1 = lunes ... 7 = domingo
            if (dia != '6' && dia != '7') n++;
        }
        return d;
    }

    static List<String> partir(String lista) {
        List<String> salida = new List<String>();
        if (String.isBlank(lista)) return salida;
        for (String p : lista.split(',')) {
            if (String.isNotBlank(p)) salida.add(p.trim());
        }
        return salida;
    }
}
