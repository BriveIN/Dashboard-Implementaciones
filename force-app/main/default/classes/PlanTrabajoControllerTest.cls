@IsTest
private class PlanTrabajoControllerTest {

    static final Date HOY = Date.newInstance(2026, 10, 20);

    @TestSetup
    static void preparar() {
        Account cuenta = new Account(Name = 'Cuenta Plan de Trabajo Prueba');
        insert cuenta;
        Opportunity oportunidad = new Opportunity(Name = 'Oportunidad Plan de Trabajo Prueba', AccountId = cuenta.Id,
            StageName = 'Demostrar valor', LeadSource = 'Outbound (push)', CloseDate = Date.today().addDays(30));
        insert oportunidad;
        Contact contacto = new Contact(FirstName = 'Luis', LastName = 'Contacto Prueba', AccountId = cuenta.Id);
        insert contacto;

        // A: solo las etapas fijas (sin fechas ni casillas)
        Delivery_y_Desarrollo__c a = base(cuenta, oportunidad, 'Evaluatest', 'Implementación', 'No iniciada');
        a.Contacto__c = contacto.Id;
        // B: varias casillas marcadas, con sesiones pasadas y futuras
        Delivery_y_Desarrollo__c b = base(cuenta, oportunidad, 'Evaluatest IA operativos', 'Implementación', 'Kick Off');
        b.Fecha_inicio_Kick_Off__c = Date.newInstance(2026, 10, 5);
        b.Fecha_Fin_de_Implementaci_n__c = Date.newInstance(2026, 10, 6);
        b.Plan_de_Trabajo_Aprobado__c = true;
        b.Configuraci_n_inicial_de_la_cuenta__c = true;
        b.Fecha_Hab_Configuracion_Inicial_Cuenta__c = Date.newInstance(2026, 10, 14);
        b.ESIC_Operativos__c = true;
        b.Fecha_Hab_ESIC_Operativos__c = Date.newInstance(2026, 10, 30);
        b.Seguimiento_a_candidatos__c = true;
        b.Fecha_Hab_Seguimiento_a_Candidatos__c = HOY;
        b.Perfiles__c = true;
        b.Numero_de_Perfiles_Creados__c = 11;
        // C: Entorno+ / Proyecto, con duración en horas, Resultados y Recomendaciones
        Delivery_y_Desarrollo__c c = base(cuenta, oportunidad, 'Entorno+', 'Proyecto', 'Recepción de Insumos');
        c.Arranque__c = true;
        c.Fecha_Arranque__c = Date.newInstance(2026, 10, 5);
        c.Duraci_n_Arranque__c = 34;
        c.Resultados__c = true;
        c.Fecha_Resultados__c = Date.newInstance(2026, 10, 12);
        c.Fecha_Recomendaciones__c = Date.newInstance(2026, 10, 15);
        // D: casillas marcadas que NO aplican a la solución ni al tipo (hay datos de prueba así)
        Delivery_y_Desarrollo__c d = base(cuenta, oportunidad, 'Evou', 'Implementación', 'Kick Off');
        d.Configuraci_n_inicial_de_la_cuenta__c = true;
        d.Fecha_Hab_Configuracion_Inicial_Cuenta__c = Date.newInstance(2026, 10, 14);
        d.Carga_de_Perfiles__c = true;
        d.Fecha_Carga_de_Perfiles__c = Date.newInstance(2026, 10, 14);
        d.Aplicaci_n_360__c = true;
        d.Fecha_Aplicaci_n_360__c = Date.newInstance(2026, 10, 14);
        d.Se_completo_Aplicaci_n_360__c = true;
        // E: en pausa, y con una solución sin logo
        Delivery_y_Desarrollo__c e = base(cuenta, oportunidad, 'Suite Brivé', 'Proyecto', 'En Pausa');
        e.Fecha_inicio_Kick_Off__c = Date.newInstance(2026, 10, 5);
        e.Plan_de_Trabajo_Aprobado__c = true;
        insert new List<Delivery_y_Desarrollo__c>{ a, b, c, d, e };
    }

    static Delivery_y_Desarrollo__c base(Account cuenta, Opportunity oportunidad, String solucion, String tipo, String etapa) {
        return new Delivery_y_Desarrollo__c(Name = solucion + ' ' + tipo, Tipo_de_Ejecucion__c = tipo, Etapa_del_Proyecto__c = etapa,
            Cuenta_Comercial__c = cuenta.Id, Oportunidad__c = oportunidad.Id, Soluci_n_adquirida__c = solucion);
    }

    // los flows de la org renombran los registros al crearlos: se identifican por su solución
    static Id idDe(String solucion) {
        List<Delivery_y_Desarrollo__c> r = [SELECT Id FROM Delivery_y_Desarrollo__c WHERE Soluci_n_adquirida__c = :solucion];
        System.assertEquals(1, r.size(), 'datos de prueba: ' + solucion);
        return r[0].Id;
    }

    static PlanTrabajoController.Plan plan(String solucion) {
        return PlanTrabajoController.armar(idDe(solucion), HOY);
    }

    static PlanTrabajoController.Fase fase(PlanTrabajoController.Plan p, String nombre) {
        for (PlanTrabajoController.Fase f : p.fases) {
            if (f.nombre == nombre) return f;
        }
        return null;
    }

    static PlanTrabajoController.Actividad actividad(PlanTrabajoController.Plan p, String nombre) {
        for (PlanTrabajoController.Fase f : p.fases) {
            for (PlanTrabajoController.Actividad a : f.actividades) {
                if (a.nombre == nombre) return a;
            }
        }
        return null;
    }

    static List<String> nombres(PlanTrabajoController.Fase f) {
        List<String> n = new List<String>();
        for (PlanTrabajoController.Actividad a : f.actividades) n.add(a.nombre);
        return n;
    }

    // ---------- estructura del plan ----------

    @IsTest
    static void conSoloLasEtapasFijasSalenLasCincoEtapasConSusFilas() {
        PlanTrabajoController.Plan p = plan('Evaluatest');
        System.assertEquals(PlanTrabajoController.ETAPAS.size(), p.fases.size(), 'siempre las 5 etapas');
        for (Integer i = 0; i < p.fases.size(); i++) System.assertEquals(PlanTrabajoController.ETAPAS[i], p.fases[i].nombre);
        System.assertEquals(2, fase(p, 'Kickoff').actividades.size());
        System.assertEquals(4, fase(p, 'Planeación').actividades.size());
        System.assertEquals(0, fase(p, 'Ejecución').actividades.size(), 'sin casillas marcadas');
        System.assertEquals(0, fase(p, 'Análisis').actividades.size());
        System.assertEquals(4, fase(p, 'Entrega final').actividades.size());
        for (PlanTrabajoController.Fase f : p.fases) {
            for (PlanTrabajoController.Actividad a : f.actividades) {
                System.assertEquals(PlanTrabajoController.SIN_INICIAR, a.estatus, a.nombre);
                System.assertEquals(null, a.inicia, 'fechas vacías: el Excel muestra Por definir');
                System.assertEquals(0, a.avance);
            }
        }
        System.assertEquals('Cuenta Plan de Trabajo Prueba', p.cliente);
        System.assertNotEquals(null, p.nombreCorto, 'nombre corto: el comercial de la cuenta o, si no hay, su nombre');
        System.assertEquals('PlanTrabajo_Logo_Evaluatest', p.logoRecurso);
    }

    @IsTest
    static void variasCasillasMarcadasEntranEnElOrdenDelMapeoYSuEstatusSigueSuRegla() {
        PlanTrabajoController.Plan p = plan('Evaluatest IA operativos');
        System.assertEquals(new List<String>{ 'Configuración inicial de la cuenta (sesión)', 'ESIC Operativos (sesión)' }, nombres(fase(p, 'Ejecución')));
        System.assertEquals(new List<String>{ 'Seguimiento a candidatos (sesión)' }, nombres(fase(p, 'Análisis')));
        System.assertEquals(PlanTrabajoController.FINALIZADO, actividad(p, 'Configuración inicial de la cuenta (sesión)').estatus, 'sesión pasada');
        System.assertEquals(PlanTrabajoController.SIN_INICIAR, actividad(p, 'ESIC Operativos (sesión)').estatus, 'sesión futura');
        System.assertEquals(PlanTrabajoController.EN_PROCESO, actividad(p, 'Seguimiento a candidatos (sesión)').estatus, 'sesión hoy');
        // Kickoff: fin guardado <= hoy = Finalizado; aprobación del plan por su casilla
        PlanTrabajoController.Actividad kick = actividad(p, 'Sesión kick off');
        System.assertEquals('2026-10-05', kick.inicia);
        System.assertEquals('2026-10-06', kick.fin);
        System.assertEquals(PlanTrabajoController.FINALIZADO, kick.estatus);
        System.assertEquals(PlanTrabajoController.FINALIZADO, actividad(p, 'Envío y aprobación del plan de trabajo').estatus);
        // comentario con el número de perfiles; la creación de perfiles no lleva fecha
        PlanTrabajoController.Actividad perfiles = actividad(p, 'Creación de perfiles');
        System.assertEquals('Perfiles creados: 11', perfiles.comentarios);
        System.assertEquals(null, perfiles.inicia);
        System.assertEquals(PlanTrabajoController.FINALIZADO, perfiles.estatus);
    }

    @IsTest
    static void unaCasillaMarcadaQueNoAplicaALaSolucionONoAlTipoNoSale() {
        PlanTrabajoController.Plan p = plan('Evou');
        System.assertEquals(null, actividad(p, 'Configuración inicial de la cuenta (sesión)'), 'solo Evaluatest/Etegrity');
        System.assertEquals(null, actividad(p, 'Carga de perfiles'), 'solo Proyecto');
        System.assertNotEquals(null, actividad(p, 'Aplicación 360°'), 'sí aplica a Evou / Implementación');
    }

    @IsTest
    static void laDuracionEnHorasSeConvierteADiasHabilesYResultadosTraeRecomendaciones() {
        PlanTrabajoController.Plan p = plan('Entorno+');
        PlanTrabajoController.Actividad arranque = actividad(p, 'Arranque');
        System.assertEquals(5, arranque.duracion, '34 h / 8 = 4.25 -> 5 días');
        System.assertEquals('2026-10-05', arranque.inicia);
        System.assertEquals(PlanTrabajoController.EN_PROCESO, arranque.estatus, 'sin "Se completó" pero ya inició');
        System.assertNotEquals(null, actividad(p, 'Resultados'));
        System.assertNotEquals(null, actividad(p, 'Recomendaciones'), 'Resultados marcado y Fecha_Recomendaciones__c con dato');
        System.assertEquals(new List<String>{ 'Resultados', 'Recomendaciones' }, nombres(fase(p, 'Análisis')));
    }

    @IsTest
    static void conElRegistroEnPausaLoQueNoTerminoSaleEnPausa() {
        PlanTrabajoController.Plan p = plan('Suite Brivé');
        System.assertEquals(PlanTrabajoController.FINALIZADO, actividad(p, 'Envío y aprobación del plan de trabajo').estatus, 'lo finalizado no pasa a pausa');
        System.assertEquals(PlanTrabajoController.EN_PAUSA, actividad(p, 'Creación de perfiles').estatus);
        System.assertEquals(PlanTrabajoController.EN_PAUSA, actividad(p, 'Solicitud de insumos al cliente').estatus);
        System.assertEquals('En Pausa', p.estadoProyecto);
    }

    @IsTest
    static void solucionSinLogoSaleSinLogo() {
        PlanTrabajoController.Plan p = plan('Suite Brivé');
        System.assertEquals(null, p.logoRecurso);
        System.assertEquals(null, p.logoUrl);
    }

    @IsTest
    static void lasReglasUsanElValorGuardadoYNoLaEtiquetaDeLaSolucion() {
        // "Nuevo Evaluatest" se ve como "Evaluatest I.A.": sus filas y su logo salen del valor guardado
        Delivery_y_Desarrollo__c r = [SELECT Id FROM Delivery_y_Desarrollo__c WHERE Soluci_n_adquirida__c = 'Evaluatest IA operativos'];
        r.Soluci_n_adquirida__c = 'Nuevo Evaluatest';
        update r;
        PlanTrabajoController.Plan p = PlanTrabajoController.armar(r.Id, HOY);
        System.assertEquals('PlanTrabajo_Logo_Evaluatest', p.logoRecurso);
        System.assertNotEquals(null, actividad(p, 'Configuración inicial de la cuenta (sesión)'));
    }

    // ---------- asignado a ----------

    @IsTest
    static void losComentariosEnTextoEnriquecidoSalenSinEtiquetasHtml() {
        Delivery_y_Desarrollo__c r = [SELECT Id FROM Delivery_y_Desarrollo__c WHERE Soluci_n_adquirida__c = 'Evaluatest IA operativos'];
        r.Comentarios_Kick_Off__c = '<p>Hola &amp; adiós</p>';
        update r;
        PlanTrabajoController.Plan p = PlanTrabajoController.armar(r.Id, HOY);
        System.assertEquals('Hola & adiós', actividad(p, 'Sesión kick off').comentarios);
    }

    @IsTest
    static void asignadoSegunLaClasificacionDeLaFila() {
        PlanTrabajoController.Plan p = plan('Evaluatest');
        p.responsable = 'Ana Pérez';
        p.nombreCorto = 'Empresa Ejemplo';
        p.contacto = 'Luis Gómez';
        System.assertEquals('Brivé Soluciones | Ana Pérez', PlanTrabajoController.asignadoDe('Brivé', p));
        System.assertEquals('Empresa Ejemplo | Luis Gómez', PlanTrabajoController.asignadoDe('Cliente', p));
        System.assertEquals('Brivé Soluciones | Ana Pérez + Empresa Ejemplo', PlanTrabajoController.asignadoDe('Brivé + Cliente', p));
        p.responsable = null;
        p.contacto = null;
        System.assertEquals('Brivé Soluciones', PlanTrabajoController.asignadoDe('Brivé', p));
        System.assertEquals('Empresa Ejemplo', PlanTrabajoController.asignadoDe('Cliente', p));
        PlanTrabajoController.Plan lleno = plan('Evaluatest');
        System.assertEquals(true, actividad(lleno, 'Sesión kick off').conCliente);
        System.assertEquals(false, actividad(lleno, 'Solicitud de insumos al cliente').conCliente);
        System.assertEquals(true, actividad(lleno, 'Envío de insumos por el cliente').conCliente);
    }

    // ---------- reglas sueltas ----------

    @IsTest
    static void reglasDeEstatus() {
        Date ayer = HOY.addDays(-1);
        Date manana = HOY.addDays(1);
        // SeCompleto
        System.assertEquals('Finalizado', PlanTrabajoController.estatusDe('SeCompleto', true, null, null, false, HOY));
        System.assertEquals('En proceso', PlanTrabajoController.estatusDe('SeCompleto', false, ayer, null, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('SeCompleto', false, manana, null, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('SeCompleto', null, null, null, false, HOY));
        // FechaSesion
        System.assertEquals('Finalizado', PlanTrabajoController.estatusDe('FechaSesion', null, ayer, ayer, false, HOY));
        System.assertEquals('En proceso', PlanTrabajoController.estatusDe('FechaSesion', null, HOY, HOY, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('FechaSesion', null, manana, manana, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('FechaSesion', null, null, null, false, HOY));
        // Fechas
        System.assertEquals('Finalizado', PlanTrabajoController.estatusDe('Fechas', null, ayer, HOY, false, HOY));
        System.assertEquals('En proceso', PlanTrabajoController.estatusDe('Fechas', null, ayer, manana, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('Fechas', null, manana, manana, false, HOY));
        System.assertEquals('Sin iniciar', PlanTrabajoController.estatusDe('Fechas', null, null, null, false, HOY));
        // pausa
        System.assertEquals('En pausa', PlanTrabajoController.estatusDe('Fechas', null, ayer, manana, true, HOY));
        System.assertEquals('Finalizado', PlanTrabajoController.estatusDe('SeCompleto', true, null, null, true, HOY));
    }

    @IsTest
    static void duracionEnHorasODiasOFija() {
        Delivery_y_Desarrollo__c r = [SELECT Id, Duraci_n_Arranque__c FROM Delivery_y_Desarrollo__c WHERE Soluci_n_adquirida__c = 'Entorno+'];
        Set<String> consultados = new Set<String>{ 'duraci_n_arranque__c' };
        Plan_Trabajo_Actividad__mdt horas = new Plan_Trabajo_Actividad__mdt(Campo_Duracion__c = 'Duraci_n_Arranque__c', Unidad_Duracion__c = 'Horas');
        Plan_Trabajo_Actividad__mdt dias = new Plan_Trabajo_Actividad__mdt(Campo_Duracion__c = 'Duraci_n_Arranque__c', Unidad_Duracion__c = 'Dias');
        Plan_Trabajo_Actividad__mdt fija = new Plan_Trabajo_Actividad__mdt(Duracion_Fija__c = 1);
        System.assertEquals(5, PlanTrabajoController.duracionDe(horas, r, consultados));
        System.assertEquals(34, PlanTrabajoController.duracionDe(dias, r, consultados));
        System.assertEquals(1, PlanTrabajoController.duracionDe(fija, r, consultados));
        System.assertEquals(null, PlanTrabajoController.duracionDe(new Plan_Trabajo_Actividad__mdt(), r, consultados));
        r.Duraci_n_Arranque__c = 2;
        System.assertEquals(1, PlanTrabajoController.duracionDe(horas, r, consultados), 'mínimo un día');
    }

    @IsTest
    static void diasHabilesSaltanElFinDeSemana() {
        // viernes 2026-10-16 + 1 día hábil = lunes 2026-10-19
        System.assertEquals(Date.newInstance(2026, 10, 19), PlanTrabajoController.sumarDiasHabiles(Date.newInstance(2026, 10, 16), 1));
        System.assertEquals(Date.newInstance(2026, 10, 16), PlanTrabajoController.sumarDiasHabiles(Date.newInstance(2026, 10, 16), 0));
    }

    // ---------- errores y permisos ----------

    @IsTest
    static void sinIdOConUnIdQueNoEsDeUnaImplementacionDaError() {
        try {
            PlanTrabajoController.obtenerPlan(null);
            System.assert(false, 'debía fallar sin registro');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
        try {
            PlanTrabajoController.obtenerPlan(Account.SObjectType.getDescribe().getKeyPrefix() + '000000000000AAA');
            System.assert(false, 'debía fallar con un Id que no es de una implementación');
        } catch (AuraHandledException e) {
            System.assert(true);
        }
    }

    @IsTest
    static void usuarioSinPermisosNoRecibeElPlan() {
        List<Profile> perfiles = [SELECT Id FROM Profile WHERE Name IN ('Minimum Access - Salesforce', 'Acceso mínimo - Salesforce', 'Standard User', 'Usuario estándar') LIMIT 1];
        if (perfiles.isEmpty()) return;
        Id registro = idDe('Evaluatest');
        User u = new User(Alias = 'plansin', Email = 'plansin@example.com', Username = 'plansin' + System.currentTimeMillis() + '@example.com',
            LastName = 'Sin permisos', ProfileId = perfiles[0].Id, TimeZoneSidKey = 'America/Mexico_City', LocaleSidKey = 'es_MX',
            EmailEncodingKey = 'UTF-8', LanguageLocaleKey = 'es');
        insert u;
        System.runAs(u) {
            try {
                PlanTrabajoController.obtenerPlan(registro);
                System.assert(false, 'un usuario sin acceso al objeto no debe recibir el plan');
            } catch (AuraHandledException e) {
                System.assert(true);
            }
        }
    }
}
