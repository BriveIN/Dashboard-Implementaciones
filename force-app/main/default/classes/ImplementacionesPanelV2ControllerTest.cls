@IsTest
private class ImplementacionesPanelV2ControllerTest {

    @TestSetup
    static void preparar() {
        Account cuenta = new Account(Name = 'Cuenta Implementaciones Prueba');
        Account patito = new Account(Name = 'Patito Sa de CV');
        insert new List<Account>{ cuenta, patito };

        Opportunity oportunidad = new Opportunity(
            Name = 'Oportunidad Implementaciones Prueba',
            AccountId = cuenta.Id,
            StageName = 'Demostrar valor',
            LeadSource = 'Outbound (push)',
            CloseDate = Date.today().addDays(30)
        );
        insert oportunidad;

        insert new List<Delivery_y_Desarrollo__c>{
            new Delivery_y_Desarrollo__c(Name = 'Implementación vigente', Tipo_de_Ejecucion__c = 'Implementación',
                Etapa_del_Proyecto__c = 'Recepción de Insumos', Oportunidad__c = oportunidad.Id, Cuenta_Comercial__c = cuenta.Id,
                Soluci_n_adquirida__c = 'Evaluatest', Horas_Contratadas__c = 20),
            new Delivery_y_Desarrollo__c(Name = 'Proyecto vigente', Tipo_de_Ejecucion__c = 'Proyecto',
                Etapa_del_Proyecto__c = 'No iniciada', Oportunidad__c = oportunidad.Id, Cuenta_Comercial__c = cuenta.Id),
            new Delivery_y_Desarrollo__c(Name = 'Cuenta de prueba: no debe aparecer', Tipo_de_Ejecucion__c = 'Implementación',
                Etapa_del_Proyecto__c = 'Kick Off', Oportunidad__c = oportunidad.Id, Cuenta_Comercial__c = patito.Id)
        };
    }

    // los flows de la org renombran los registros al crearlos: se identifican por su cuenta y tipo, no por el nombre
    static Id idDe(String cuenta, String tipo) {
        List<Delivery_y_Desarrollo__c> r = [
            SELECT Id FROM Delivery_y_Desarrollo__c
            WHERE Cuenta_Comercial__r.Name = :cuenta AND Tipo_de_Ejecucion__c = :tipo
        ];
        System.assertEquals(1, r.size(), 'datos de prueba: ' + cuenta + ' ' + tipo);
        return r[0].Id;
    }

    static Map<Id, ImplementacionesPanelV2Controller.Implementacion> porId(Boolean pruebas) {
        Map<Id, ImplementacionesPanelV2Controller.Implementacion> m = new Map<Id, ImplementacionesPanelV2Controller.Implementacion>();
        for (ImplementacionesPanelV2Controller.Implementacion i : ImplementacionesPanelV2Controller.obtenerImplementaciones(pruebas)) m.put(i.id, i);
        return m;
    }

    @IsTest
    static void trae_solo_etapas_vigentes_y_separa_el_tipo() {
        Id implementacion = idDe('Cuenta Implementaciones Prueba', 'Implementación');
        Id proyecto = idDe('Cuenta Implementaciones Prueba', 'Proyecto');
        Id deCuentaPrueba = idDe('Patito Sa de CV', 'Implementación');
        Map<Id, ImplementacionesPanelV2Controller.Implementacion> r = porId(false);
        System.assert(r.containsKey(implementacion));
        System.assert(r.containsKey(proyecto));
        System.assert(!r.containsKey(deCuentaPrueba), 'la cuenta de pruebas se oculta por defecto');
        System.assertEquals('Implementación', r.get(implementacion).tipo);
        System.assertEquals('Proyecto', r.get(proyecto).tipo);
        System.assertEquals('Oportunidad Implementaciones Prueba', r.get(implementacion).oportunidad, 'el nombre de la oportunidad alimenta el CSV');
        // la etapa del panel sale del mapa de etapas vigentes
        System.assertEquals(ImplementacionesPanelV2Controller.ETAPAS.get(r.get(implementacion).etapaOriginal), r.get(implementacion).etapa);
    }

    @IsTest
    static void agrupa_los_productos_de_cada_oportunidad_sin_repetir() {
        Id oportunidadA = '006000000000001AAA';
        Id oportunidadB = '006000000000002AAA';
        String lineasJson = '[' +
            '{"attributes":{"type":"OpportunityLineItem"},"OpportunityId":"' + oportunidadA + '","Product2":{"attributes":{"type":"Product2"},"Name":"Licencia Evou","Categoria__c":"LICENCIA"}},' +
            '{"attributes":{"type":"OpportunityLineItem"},"OpportunityId":"' + oportunidadA + '","Product2":{"attributes":{"type":"Product2"},"Name":"Licencia Evou","Categoria__c":"LICENCIA"}},' +
            '{"attributes":{"type":"OpportunityLineItem"},"OpportunityId":"' + oportunidadA + '","Product2":{"attributes":{"type":"Product2"},"Name":"Hora Consultoría"}},' +
            '{"attributes":{"type":"OpportunityLineItem"},"OpportunityId":"' + oportunidadB + '","Product2":{"attributes":{"type":"Product2"},"Name":"Póliza","Categoria__c":"SERVICIOS IMPLEMENTACIÓN"}},' +
            '{"attributes":{"type":"OpportunityLineItem"},"OpportunityId":"' + oportunidadB + '"}' +
            ']';
        List<OpportunityLineItem> lineas = (List<OpportunityLineItem>) JSON.deserialize(lineasJson, List<OpportunityLineItem>.class);
        Map<Id, List<ImplementacionesPanelV2Controller.Producto>> r = ImplementacionesPanelV2Controller.agruparProductos(lineas);
        System.assertEquals(2, r.get(oportunidadA).size(), 'el mismo producto en dos líneas cuenta una vez');
        System.assertEquals('Licencia Evou', r.get(oportunidadA)[0].nombre);
        System.assertEquals('LICENCIA', r.get(oportunidadA)[0].categoria);
        System.assertEquals(null, r.get(oportunidadA)[1].categoria, 'un producto sin categoría queda con categoría vacía');
        System.assertEquals(1, r.get(oportunidadB).size(), 'una línea sin producto no suma nada');
        System.assertEquals('SERVICIOS IMPLEMENTACIÓN', r.get(oportunidadB)[0].categoria);
        System.assertEquals(0, ImplementacionesPanelV2Controller.agruparProductos(new List<OpportunityLineItem>()).size());
    }

    @IsTest
    static void las_etapas_heredadas_no_entran() {
        // el picklist es restringido y no deja crear registros con estos valores: se verifica el mapa de etapas vigentes
        for (String heredada : new List<String>{ 'Entrega del Proyecto', 'Back log', 'Cancelada/o', 'No aplica', 'En Proceso' }) {
            System.assert(!ImplementacionesPanelV2Controller.ETAPAS.containsKey(heredada), heredada + ' no debe estar entre las etapas vigentes');
        }
        System.assertEquals('enProceso', ImplementacionesPanelV2Controller.ETAPAS.get('Recepción de Insumos'));
    }

    @IsTest
    static void la_cuenta_de_pruebas_se_marca_cuando_se_pide() {
        Id deCuentaPrueba = idDe('Patito Sa de CV', 'Implementación');
        Map<Id, ImplementacionesPanelV2Controller.Implementacion> r = porId(true);
        System.assert(r.containsKey(deCuentaPrueba));
        System.assertEquals(true, r.get(deCuentaPrueba).esPrueba);
    }

    @IsTest
    static void cada_registro_trae_todas_las_secciones() {
        Id implementacion = idDe('Cuenta Implementaciones Prueba', 'Implementación');
        ImplementacionesPanelV2Controller.Implementacion i = porId(false).get(implementacion);
        System.assertEquals(ImplementacionesPanelV2Controller.definiciones().size(), i.secciones.size());
    }

    @IsTest
    static void relaciona_la_actividad_con_su_seccion() {
        System.assertEquals('Arranque', ImplementacionesPanelV2Controller.seccionDe('Arranque completado - Cliente').clave);
        System.assertEquals('ConfigInicial',
            ImplementacionesPanelV2Controller.seccionDe('Habilitamiento completado: Configuración inicial de la cuenta - Cliente').clave);
        System.assertEquals('Insumos', ImplementacionesPanelV2Controller.seccionDe('Planeación completada - Cliente').clave);
        System.assertEquals('Insumos', ImplementacionesPanelV2Controller.seccionDe('Recepción de Insumos y Configuración completada - Cliente').clave);
        System.assertEquals(null, ImplementacionesPanelV2Controller.seccionDe('Llamada con el cliente'));
    }

    @IsTest
    static void lee_las_horas_del_resumen_de_la_actividad() {
        System.assertEquals(3.5, ImplementacionesPanelV2Controller.horasDe('Fecha: 31 de agosto de 2026\nDuracion (horas): 3.5\nComentarios: ok'));
        System.assertEquals(null, ImplementacionesPanelV2Controller.horasDe('Fecha: 20 de marzo de 2026\nComentarios: sin horas'));
    }

    @IsTest
    static void controles_de_cambio_solo_desde_el_corte() {
        ImplementacionesPanelV2Controller.Cambio nuevo = ImplementacionesPanelV2Controller.cambioDe('2026-08-14 -> 2026-07-24 (2026-10-05 18:12:27Z)');
        System.assertEquals('2026-08-14', nuevo.anterior);
        System.assertEquals('2026-07-24', nuevo.nuevo);
        System.assertEquals(-21, nuevo.dias);
        System.assertEquals(null, ImplementacionesPanelV2Controller.cambioDe('2025-09-10 -> 2025-10-09 (2025-10-05 11:38:54Z)'), 'antes del corte no cuenta');
    }

    @IsTest
    static void las_pausas_se_filtran_por_fecha() {
        List<String> lineas = new List<String>{
            '2026-07-14, 2026-10-05 11:38:54Z: paso a Entrega Final (0 h)',
            '2025-01-10, 2025-02-01 08:00:00Z: paso a En Proceso (0 h)'
        };
        System.assertEquals(1, ImplementacionesPanelV2Controller.desdeCorte(lineas).size());
    }
}
