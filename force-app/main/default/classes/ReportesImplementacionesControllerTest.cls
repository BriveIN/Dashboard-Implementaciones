@IsTest
private class ReportesImplementacionesControllerTest {

    static final String CUENTA = 'Cuenta Reportes Prueba';
    static final String PATITO = 'Patito Reportes Sa de CV';

    static String primerValor(Schema.DescribeFieldResult campo, Integer saltar) {
        Integer visto = 0;
        for (Schema.PicklistEntry p : campo.getPicklistValues()) {
            if (!p.isActive()) continue;
            if (visto == saltar) return p.getValue();
            visto++;
        }
        return null;
    }

    static Delivery_y_Desarrollo__c registro(String tipo, Id cuenta, Id oportunidad) {
        return new Delivery_y_Desarrollo__c(Name = 'Registro ' + tipo, Tipo_de_Ejecucion__c = tipo,
            Etapa_del_Proyecto__c = 'Kick Off', Oportunidad__c = oportunidad, Cuenta_Comercial__c = cuenta);
    }

    /*
     * A  Implementación 10-jul-2026, con acta enviada, responsable, asociados y satisfacción
     * B  Implementación 30-sep-2026 23:30 hora de México (ya es 1-oct en GMT): entra al Q3
     * C  Implementación 1-oct-2026 00:30 hora de México: queda fuera del Q3
     * D  Proyecto 15-ago-2026
     * E  Implementación de la cuenta de pruebas 1-ago-2026
     */
    @TestSetup
    static void preparar() {
        Account cuenta = new Account(Name = CUENTA);
        Account patito = new Account(Name = PATITO);
        insert new List<Account>{ cuenta, patito };
        Opportunity oportunidad = new Opportunity(Name = 'Oportunidad Reportes Prueba', AccountId = cuenta.Id, StageName = 'Demostrar valor',
            LeadSource = 'Outbound (push)', CloseDate = Date.today().addDays(30));
        insert oportunidad;

        Delivery_y_Desarrollo__c a = registro('Implementación', cuenta.Id, oportunidad.Id);
        a.Soluci_n_adquirida__c = 'Evaluatest';
        a.Fecha_Envio_Acta_Entrega__c = Date.newInstance(2026, 9, 1);
        a.Fecha_Acordada_Final_Config__c = Date.newInstance(2026, 9, 15);
        a.Acta_de_Entrega_Firmada_Cliente__c = true;
        a.Satisfacion_del_Cliente__c = 9;
        a.Total_Participantes__c = 12;
        a.Responsable_de_la_Implementaci_n__c = primerValor(Delivery_y_Desarrollo__c.Responsable_de_la_Implementaci_n__c.getDescribe(), 0);
        String primero = primerValor(Delivery_y_Desarrollo__c.Consultor_Asociado__c.getDescribe(), 0);
        String segundo = primerValor(Delivery_y_Desarrollo__c.Consultor_Asociado__c.getDescribe(), 1);
        a.Consultor_Asociado__c = segundo == null ? primero : primero + ';' + segundo;
        Delivery_y_Desarrollo__c b = registro('Implementación', cuenta.Id, oportunidad.Id);
        b.Etapa_del_Proyecto__c = 'No iniciada';
        b.Soluci_n_adquirida__c = 'Entorno+';
        Delivery_y_Desarrollo__c c = registro('Implementación', cuenta.Id, oportunidad.Id);
        Delivery_y_Desarrollo__c d = registro('Proyecto', cuenta.Id, oportunidad.Id);
        Delivery_y_Desarrollo__c e = registro('Implementación', patito.Id, oportunidad.Id);
        insert new List<Delivery_y_Desarrollo__c>{ a, b, c, d, e };

        Test.setCreatedDate(a.Id, Datetime.newInstanceGmt(2026, 7, 10, 18, 0, 0));
        Test.setCreatedDate(b.Id, Datetime.newInstanceGmt(2026, 10, 1, 5, 30, 0));
        Test.setCreatedDate(c.Id, Datetime.newInstanceGmt(2026, 10, 1, 6, 30, 0));
        Test.setCreatedDate(d.Id, Datetime.newInstanceGmt(2026, 8, 15, 18, 0, 0));
        Test.setCreatedDate(e.Id, Datetime.newInstanceGmt(2026, 8, 1, 18, 0, 0));
    }

    // los flows de la org renombran los registros: se identifican por cuenta, tipo y fecha de creación
    static String id15(String cuenta, String tipo, Datetime creado) {
        List<Delivery_y_Desarrollo__c> r = [
            SELECT Id FROM Delivery_y_Desarrollo__c
            WHERE Cuenta_Comercial__r.Name = :cuenta AND Tipo_de_Ejecucion__c = :tipo AND CreatedDate = :creado
        ];
        System.assertEquals(1, r.size(), 'datos de prueba: ' + cuenta + ' ' + tipo + ' ' + creado);
        return String.valueOf(r[0].Id).left(15);
    }

    static ReportesImplementacionesController.Filtros q3() {
        ReportesImplementacionesController.Filtros f = new ReportesImplementacionesController.Filtros();
        f.desde = '2026-07-01';
        f.hasta = '2026-09-30';
        return f;
    }

    static List<String> ids(ReportesImplementacionesController.Hoja hoja) {
        List<String> salida = new List<String>();
        for (List<Object> fila : hoja.filas) salida.add((String) fila[0]);
        return salida;
    }

    static List<String> encabezados(ReportesImplementacionesController.Hoja hoja) {
        List<String> salida = new List<String>();
        for (ReportesImplementacionesController.Columna c : hoja.columnas) salida.add(c.encabezado);
        return salida;
    }

    static Integer columna(ReportesImplementacionesController.Hoja hoja, String encabezado) {
        List<String> e = encabezados(hoja);
        System.assert(e.contains(encabezado), 'falta la columna ' + encabezado);
        return e.indexOf(encabezado);
    }

    @IsTest
    static void implementaciones_trae_una_hoja_con_los_encabezados_de_la_especificacion() {
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteImplementaciones(q3());
        System.assertEquals('Reporte_implementaciones_2026-07-01_a_2026-09-30.xlsx', r.archivo);
        System.assertEquals(1, r.hojas.size());
        System.assertEquals('Por fecha creación', r.hojas[0].nombre);

        List<String> principal = encabezados(r.hojas[0]);
        System.assertEquals(21, principal.size());
        System.assertEquals('Implementación: Id.', principal[0]);
        System.assertEquals('Responsable de la Implementación', principal[4], 'los datos de identificación van primero');
        System.assertEquals('Etapa del Proyecto/Implementacion', principal[6]);
        System.assertEquals('Implementación: Fecha de creación', principal[7]);
        System.assertEquals('Fecha Inicio Implementación', principal[8]);
        System.assertEquals('Fecha estimada fin implementación/proyecto', principal[9], 'después de la fecha de inicio');
        System.assertEquals('Fecha Sesión Final Cliente', principal[10]);
        System.assert(!principal.contains('Fecha Fin de implementación'));
        System.assertEquals('Encuesta de Satisfacción Enviada', principal[18]);
        System.assertEquals('Comentarios Sesión final', principal[20]);

    }

    @IsTest
    static void implementaciones_respeta_el_rango_en_hora_de_mexico_y_el_orden() {
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteImplementaciones(q3());
        String a = id15(CUENTA, 'Implementación', Datetime.newInstanceGmt(2026, 7, 10, 18, 0, 0));
        String b = id15(CUENTA, 'Implementación', Datetime.newInstanceGmt(2026, 10, 1, 5, 30, 0));
        System.assertEquals(new List<String>{ a, b }, ids(r.hojas[0]), 'A y B (30-sep 23:30 en México), por fecha de creación ascendente; sin C, proyecto ni pruebas');
        System.assertEquals(2, r.registros);
        System.assertEquals(false, r.hayMas);
        System.assertEquals(15, a.length());

        Integer creacion = columna(r.hojas[0], 'Implementación: Fecha de creación');
        System.assertEquals('2026-07-10', r.hojas[0].filas[0][creacion]);
        System.assertEquals('2026-09-30', r.hojas[0].filas[1][creacion], 'la fecha se muestra en hora de México, no en GMT');
    }

    @IsTest
    static void convierte_booleanos_numeros_fechas_y_multiseleccion() {
        ReportesImplementacionesController.Hoja h = ReportesImplementacionesController.getReporteImplementaciones(q3()).hojas[0];
        List<Object> fila = h.filas[0];
        System.assertEquals('Sí', fila[columna(h, 'Acta de entrega firmada cliente')]);
        System.assertEquals('No', h.filas[1][columna(h, 'Acta de entrega firmada cliente')]);
        System.assertEquals(9, fila[columna(h, 'Satisfacion del Cliente')]);
        System.assertEquals('2026-09-15', fila[columna(h, 'Fecha estimada fin implementación/proyecto')]);
        System.assertEquals('', fila[columna(h, 'Fecha Recibo VoBo Cliente')], 'una fecha vacía sale como texto vacío, no null');
        for (List<Object> f : h.filas) {
            for (Object celda : f) System.assertNotEquals(null, celda, 'Aura descarta los null de una lista y desplaza las columnas');
            System.assertEquals(h.columnas.size(), f.size());
        }
        String asociados = (String) fila[columna(h, 'Consultor Asociado')];
        System.assert(!asociados.contains(';') || asociados.contains('; '), 'los valores de multiselección se unen con "; "');
        System.assertNotEquals(null, fila[columna(h, 'Responsable de la Implementación')]);
    }

    @IsTest
    static void proyectos_trae_solo_proyectos_en_una_hoja() {
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteProyectos(q3());
        System.assertEquals('Reporte_proyectos_2026-07-01_a_2026-09-30.xlsx', r.archivo);
        System.assertEquals(1, r.hojas.size());
        System.assertEquals('Fecha de creación', r.hojas[0].nombre);
        List<String> e = encabezados(r.hojas[0]);
        System.assertEquals(21, e.size());
        System.assertEquals('Fecha estimada fin implementación/proyecto', e[9]);
        System.assert(!e.contains('Fecha Fin de Implementación'));
        System.assertEquals('Encuesta de Satisfacción enviada', e[18]);
        System.assertEquals(new List<String>{ id15(CUENTA, 'Proyecto', Datetime.newInstanceGmt(2026, 8, 15, 18, 0, 0)) }, ids(r.hojas[0]));
    }

    @IsTest
    static void la_cuenta_de_pruebas_solo_entra_si_el_panel_la_muestra() {
        ReportesImplementacionesController.Filtros f = q3();
        System.assertEquals(2, ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0].filas.size());
        f.incluirPruebas = true;
        List<String> con = ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]);
        System.assertEquals(3, con.size());
        System.assert(con.contains(id15(PATITO, 'Implementación', Datetime.newInstanceGmt(2026, 8, 1, 18, 0, 0))));
    }

    @IsTest
    static void aplica_los_filtros_del_panel() {
        String a = id15(CUENTA, 'Implementación', Datetime.newInstanceGmt(2026, 7, 10, 18, 0, 0));
        String b = id15(CUENTA, 'Implementación', Datetime.newInstanceGmt(2026, 10, 1, 5, 30, 0));

        ReportesImplementacionesController.Filtros f = q3();
        f.etapa = 'noIniciada';
        System.assertEquals(new List<String>{ b }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]));

        f = q3();
        f.etapa = 'kickoff';
        System.assertEquals(new List<String>{ a }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]));

        f = q3();
        f.cuenta = CUENTA;
        System.assertEquals(2, ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0].filas.size());
        f.cuenta = 'Otra cuenta';
        System.assertEquals(0, ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0].filas.size());

        f = q3();
        f.solucion = 'Evaluatest';
        System.assertEquals(new List<String>{ a }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]));

        f = q3();
        f.responsable = ReportesImplementacionesController.SIN_RESPONSABLE;
        System.assertEquals(new List<String>{ b }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]));
        f.responsable = primerValor(Delivery_y_Desarrollo__c.Responsable_de_la_Implementaci_n__c.getDescribe(), 0);
        System.assertEquals(new List<String>{ a }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]));

        f = q3();
        f.asociado = primerValor(Delivery_y_Desarrollo__c.Consultor_Asociado__c.getDescribe(), 0);
        // los flows de la org pueden asignar consultores a otros registros: basta con que el filtro incluya al que lo tiene
        System.assert(ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]).contains(a));
        f.asociado = 'Consultor que no existe';
        System.assertEquals(0, ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0].filas.size());

        f = q3();
        f.ids = new List<String>{ a, 'no es un id' };
        System.assertEquals(new List<String>{ a }, ids(ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0]), 'los Ids de 15 caracteres también sirven');
        f.ids = new List<String>();
        System.assertEquals(0, ReportesImplementacionesController.getReporteImplementaciones(f).hojas[0].filas.size(), 'una lista vacía no deja pasar nada');
    }

    @IsTest
    static void el_mes_del_panel_se_vuelve_rango_de_creacion() {
        ReportesImplementacionesController.Filtros f = new ReportesImplementacionesController.Filtros();
        f.mes = '2026-07';
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteImplementaciones(f);
        System.assertEquals('Reporte_implementaciones_2026-07-01_a_2026-07-31.xlsx', r.archivo);
        System.assertEquals(1, r.hojas[0].filas.size());
        // con rango dentro del mes, manda la intersección
        f.desde = '2026-07-15';
        System.assertEquals('Reporte_implementaciones_2026-07-15_a_2026-07-31.xlsx', ReportesImplementacionesController.getReporteImplementaciones(f).archivo);
    }

    @IsTest
    static void pagina_por_cursor_sin_perder_ni_repetir_filas() {
        ReportesImplementacionesController.tamanoPagina = 1;
        ReportesImplementacionesController.Filtros f = q3();
        ReportesImplementacionesController.Reporte primera = ReportesImplementacionesController.getReporteImplementaciones(f);
        System.assertEquals(true, primera.hayMas);
        System.assertEquals(1, primera.hojas[0].filas.size());
        System.assertNotEquals(null, primera.cursorFecha);

        f.cursorFecha = primera.cursorFecha;
        f.cursorId = primera.cursorId;
        ReportesImplementacionesController.Reporte segunda = ReportesImplementacionesController.getReporteImplementaciones(f);
        System.assertEquals(false, segunda.hayMas);
        System.assertEquals(null, segunda.cursorId);
        System.assertEquals(1, segunda.hojas[0].filas.size());
        System.assertNotEquals(primera.hojas[0].filas[0][0], segunda.hojas[0].filas[0][0]);
    }

    @IsTest
    static void sin_fechas_usa_el_corte_del_panel_y_hoy() {
        Date[] r = ReportesImplementacionesController.rango(new ReportesImplementacionesController.Filtros());
        System.assertEquals(ImplementacionesPanelV2Controller.FECHA_INICIO_DATOS, r[0]);
        System.assertEquals(Date.today(), r[1]);
    }

    @IsTest
    static void rechaza_rangos_y_fechas_no_validos() {
        ReportesImplementacionesController.Filtros f = new ReportesImplementacionesController.Filtros();
        f.desde = '2026-09-30';
        f.hasta = '2026-07-01';
        try {
            ReportesImplementacionesController.getReporteImplementaciones(f);
            System.assert(false, 'debió fallar');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('rango de fechas'), e.getMessage());
        }
        f.desde = 'ayer';
        try {
            ReportesImplementacionesController.getReporteProyectos(f);
            System.assert(false, 'debió fallar');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('Fecha no válida'), e.getMessage());
        }
    }

    @IsTest
    static void sin_filtros_no_falla() {
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteImplementaciones(null);
        System.assertEquals(1, r.hojas.size());
    }

    @IsTest
    static void las_entradas_del_lwc_leen_los_filtros_de_un_texto_json() {
        String json = '{"desde":"2026-01-01","hasta":"2026-12-31","mes":"2026-07","etapa":"","incluirPruebas":false,"ids":null}';
        ReportesImplementacionesController.Reporte r = ReportesImplementacionesController.getReporteImplementacionesJson(json);
        System.assertEquals('Reporte_implementaciones_2026-07-01_a_2026-07-31.xlsx', r.archivo, 'el mes del texto se aplicó');
        System.assertEquals('Reporte_proyectos_2026-07-01_a_2026-07-31.xlsx', ReportesImplementacionesController.getReporteProyectosJson(json).archivo);
        System.assertEquals(1, ReportesImplementacionesController.getReporteProyectosJson(null).hojas.size(), 'sin texto usa los valores por defecto');
        try {
            ReportesImplementacionesController.getReporteImplementacionesJson('{no es json');
            System.assert(false, 'debió fallar');
        } catch (AuraHandledException e) {
            System.assert(e.getMessage().contains('filtros del panel'), e.getMessage());
        }
    }

    @IsTest
    static void el_dia_empieza_a_las_cero_horas_de_mexico() {
        Datetime inicio = ReportesImplementacionesController.inicioDelDia(Date.newInstance(2026, 7, 1));
        System.assertEquals(Datetime.newInstanceGmt(2026, 7, 1, 6, 0, 0), inicio, 'México es UTC-6 sin horario de verano desde 2022');
    }

    @IsTest
    static void traduce_la_etiqueta_del_picklist_a_su_valor() {
        Schema.DescribeFieldResult campo = Delivery_y_Desarrollo__c.Soluci_n_adquirida__c.getDescribe();
        System.assertEquals('Evaluatest', ReportesImplementacionesController.valorDePicklist(campo, 'Evaluatest'));
        System.assertEquals('algo que no existe', ReportesImplementacionesController.valorDePicklist(campo, 'algo que no existe'));
    }
}
