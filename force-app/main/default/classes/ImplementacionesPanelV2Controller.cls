/**
 * Datos para el panel de implementaciones y proyectos (LWC implementacionesPanelV2). Solo lectura.
 *
 * Objeto: Delivery_y_Desarrollo__c ("Implementación"); Tipo_de_Ejecucion__c separa Implementaciones de Proyectos.
 * Corte de información: solo entran registros con alguna fecha de trabajo desde FECHA_INICIO_DATOS, y de ellos solo se
 * devuelven las actividades, cambios y tiempos fechados desde ese día. Es parte de la consulta, no un filtro de pantalla.
 * Las horas se toman tal cual de los campos que ya llenan los flows de la org (no se recalculan).
 *
 * with sharing + USER_MODE: cada usuario ve solo lo que ya tiene permitido.
 */
public with sharing class ImplementacionesPanelV2Controller {

    @TestVisible public static final Date FECHA_INICIO_DATOS = Date.newInstance(2026, 10, 1);
    @TestVisible public static final String CUENTA_PRUEBA = '%patito%';
    @TestVisible static final Set<String> TIPOS = new Set<String>{ 'Implementación', 'Proyecto' };

    // valor real del picklist (Etapa_del_Proyecto__c) -> etapa del panel. "Recepción de Insumos" se muestra como "En proceso".
    // Los valores heredados (Back log, Entrega del Proyecto, Cancelada/o, No aplica, En Proceso) no entran al panel.
    @TestVisible public static final Map<String, String> ETAPAS = new Map<String, String>{
        'No iniciada' => 'noIniciada',
        'Agendada' => 'agendada',
        'Kick Off' => 'kickoff',
        'En Pausa' => 'enPausa',
        'Recepción de Insumos' => 'enProceso',
        'Entrega Final' => 'entregaFinal',
        'Implementación Finalizada' => 'finalizada'
    };

    // Control de Cambios (sección de la página del registro): historial "viejo -> nuevo (fecha)" de cada hito
    @TestVisible static final Map<String, String> REPROGRAMACIONES = new Map<String, String>{
        'Reprogramacion_Inicio_Kick_Off__c' => 'Inicio de Kickoff',
        'Reprogramacion_Fin_Kick_Off__c' => 'Fin de Kickoff',
        'Reprogramacion_Recepcion_Insumos__c' => 'Recepción de insumos',
        'Reprog_Fecha_Acordada_Config__c' => 'Inicio de configuración',
        'Reprogramacion_Final_Config__c' => 'Final de configuración',
        'Reprogramacion_Recibo_VoBo_Cliente__c' => 'Recibo de VoBo del cliente',
        'Reprogramacion_Envio_Acta_Entrega__c' => 'Envío del acta de entrega',
        'Reprogramacion_Sesion_Final_Cliente__c' => 'Sesión final con el cliente',
        'Reprogramacion_Sesion_Final_Real__c' => 'Sesión final real',
        'Reprogramacion_Fin_Implement_Real__c' => 'Fin real de la implementación'
    };

    // historial de etapas: "{fecha}: paso a {etapa} ({n} h)" = horas que estuvo en la etapa del campo
    @TestVisible static final Map<String, String> HISTORIAL_ETAPAS = new Map<String, String>{
        'Historial_No_Iniciada__c' => 'No iniciada',
        'Historial_Agendada__c' => 'Agendada',
        'Historial_Kick_Off__c' => 'Kickoff',
        'Historial_Recepcion_de_Insumos__c' => 'En proceso',
        'Historial_Entrega_Final__c' => 'Entrega final',
        'Historial_Implementacion_Finalizada__c' => 'Finalizada'
    };

    static final Pattern CAMBIO = Pattern.compile('^(.*?)\\s*->\\s*(.*?)\\s*\\((\\d{4}-\\d{2}-\\d{2})[^)]*\\)\\s*$');
    static final Pattern PASO_ETAPA = Pattern.compile('^(\\d{4}-\\d{2}-\\d{2})[^:]*:?\\d*:?\\d*Z?: paso a .+? \\(([0-9.]+) h\\)\\s*$');
    static final Pattern HORAS_ACTIVIDAD = Pattern.compile('Duracion \\(horas\\):\\s*([0-9]+(?:[.,][0-9]+)?)');
    static final Pattern FECHA = Pattern.compile('(\\d{4}-\\d{2}-\\d{2})');

    /**
     * Casillas y secciones de Ejecución y Análisis (más Kick Off, Planeación y Entrega final), tomadas de los flows
     * Delivery_y_Desarrollo_Generar_Actividades y de la página de registro. Generado: no editar a mano.
     * soluciones = soluciones para las que la página muestra la casilla (vacío = todas).
     */
    @TestVisible static final String SECCIONES_JSON = '[{"clave":"KickOff","nombre":"Kick Off","grupo":"Kickoff","asunto":"Kick Off completada","casilla":null,"completo":null,"requeridos":["Fecha_inicio_Kick_Off__c","Comentarios_Kick_Off__c","Duraci_n_Etapa_Kickoff__c"],"generaActividad":true,"soluciones":[],"campos":[{"api":"Fecha_acordada__c","etiqueta":"Fecha Acordada Kick Off","tipo":"date"},{"api":"Fecha_inicio_Kick_Off__c","etiqueta":"Fecha Kick Off","tipo":"date"},{"api":"Duraci_n_Etapa_Kickoff__c","etiqueta":"Duración Etapa Kickoff","tipo":"double"},{"api":"Objetivos_estrat_gicos_del_cliente__c","etiqueta":"Objetivos estratégicos del cliente","tipo":"textarea"},{"api":"Plan_de_Trabajo_Aprobado__c","etiqueta":"Plan de Trabajo Aprobado","tipo":"boolean"},{"api":"Evidencia_Plan_de_Trabajo__c","etiqueta":"Evidencia Plan de Trabajo","tipo":"url"},{"api":"Comentarios_Kick_Off__c","etiqueta":"Comentarios Kick Off","tipo":"textarea"}]},{"clave":"Insumos","nombre":"Planeación","grupo":"Planeación","asunto":"Planeación completada","casilla":null,"completo":null,"requeridos":["Fecha_Recibo_Insumos__c","Insumos_Completos__c","Fecha_Acordada_Configuracion__c","Perfiles__c","Comentarios_Recepcion_Insumos_Config__c","Duraci_n_Etapa_Insumos_y_Configuraci_n__c"],"generaActividad":true,"soluciones":[],"campos":[{"api":"Fecha_Acordada_Recepcion_Insumos__c","etiqueta":"Fecha Acordada Recepción Insumos","tipo":"date"},{"api":"Fecha_Solicitud_Insumos__c","etiqueta":"Fecha Solicitud Insumos","tipo":"date"},{"api":"Fecha_Recibo_Insumos__c","etiqueta":"Fecha Recibo Insumos","tipo":"date"},{"api":"Fecha_Acordada_Configuracion__c","etiqueta":"Fecha Inicio Configuración","tipo":"date"},{"api":"Insumos_Completos__c","etiqueta":"Insumos Completos","tipo":"boolean"},{"api":"Lista_de_Insumos_Recibidos__c","etiqueta":"Lista de Insumos Recibidos","tipo":"multipicklist"},{"api":"Duraci_n_Etapa_Insumos_y_Configuraci_n__c","etiqueta":"Duración Etapa Insumos y Configuración","tipo":"double"},{"api":"Perfiles__c","etiqueta":"Se Crearon Perfiles","tipo":"boolean"},{"api":"Comentarios_Recepcion_Insumos_Config__c","etiqueta":"Comentarios Insumos y Config.","tipo":"textarea"}],"asuntosAlternos":["Recepción de Insumos y Configuración completada"]},{"clave":"EntregaFinal","nombre":"Entrega final","grupo":"Entrega final","asunto":"Entrega Final completada","casilla":null,"completo":null,"requeridos":["Fecha_Sesion_Final_Cliente__c","Fecha_Recibo_VoBo_Cliente__c","Comentarios_Sesion_Final__c","Duraci_n_Etapa_Entrega_Final__c"],"generaActividad":true,"soluciones":[],"campos":[{"api":"Fecha_Sesion_Final_Cliente__c","etiqueta":"Fecha Sesión Final Cliente","tipo":"date"},{"api":"Fecha_Envio_Acta_Entrega__c","etiqueta":"Fecha Envío Acta de Entrega","tipo":"date"},{"api":"Duraci_n_Etapa_Entrega_Final__c","etiqueta":"Duración Etapa Entrega Final","tipo":"double"},{"api":"Fecha_Recibo_VoBo_Cliente__c","etiqueta":"Fecha Recibo VoBo Cliente","tipo":"date"},{"api":"Acta_de_Entrega_Firmada_Cliente__c","etiqueta":"Acta de Entrega Firmada Cliente","tipo":"boolean"},{"api":"Encuesta_de_Satisfaccion__c","etiqueta":"Encuesta de Satisfacción Enviada","tipo":"boolean"},{"api":"Satisfacion_del_Cliente__c","etiqueta":"Satisfacion del Cliente","tipo":"double"},{"api":"Comentarios_Sesion_Final__c","etiqueta":"Comentarios Sesión Final","tipo":"textarea"}]},{"clave":"Arranque","nombre":"Arranque","grupo":"Ejecución","asunto":"Arranque completado","casilla":"Arranque__c","completo":"Se_completo_Arranque__c","requeridos":["Fecha_Arranque__c","Fecha_Fin_arranque__c","Duraci_n_Arranque__c","Comentarios_Arranque__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h"],"campos":[{"api":"Fecha_Arranque__c","etiqueta":"Fecha Arranque","tipo":"date"},{"api":"Sesi_n_Sensibilizaci_n__c","etiqueta":"Sesión Sensibilización","tipo":"boolean"},{"api":"Duraci_n_Arranque__c","etiqueta":"Duración Arranque","tipo":"double"},{"api":"Fecha_Fin_arranque__c","etiqueta":"Fecha Fin arranque","tipo":"date"},{"api":"Comentarios_Arranque__c","etiqueta":"Comentarios Arranque","tipo":"textarea"}]},{"clave":"ConfigInicial","nombre":"Configuración inicial de la cuenta","grupo":"Ejecución","asunto":"Habilitamiento completado: Configuración inicial de la cuenta","casilla":"Configuraci_n_inicial_de_la_cuenta__c","completo":null,"requeridos":["Fecha_Hab_Configuracion_Inicial_Cuenta__c","Liga_Sesi_n_Configuraci_n_inicial__c","Lista_de_participantes__c","Comentarios_Configuracion_Inicial__c"],"generaActividad":true,"soluciones":["Evaluatest","Evaluatest IA operativos","Nuevo Evaluatest","Evaluatest Operativos","Etegrity"],"campos":[{"api":"Fecha_Hab_Configuracion_Inicial_Cuenta__c","etiqueta":"Fecha Hab. Configuracion Inicial Cuenta","tipo":"date"},{"api":"Liga_Sesi_n_Configuraci_n_inicial__c","etiqueta":"Liga Sesión Configuración inicial","tipo":"url"},{"api":"Lista_de_participantes__c","etiqueta":"Lista de participantes Configuracion Ini","tipo":"textarea"},{"api":"Comentarios_Configuracion_Inicial__c","etiqueta":"Comentarios Configuracion Inicial","tipo":"textarea"}]},{"clave":"ESICOperativos","nombre":"ESIC Operativos","grupo":"Ejecución","asunto":"Habilitamiento completado: ESIC Operativos","casilla":"ESIC_Operativos__c","completo":null,"requeridos":["Fecha_Hab_ESIC_Operativos__c","Liga_Sesion_ESIC_Operativos__c","Lista_de_participantes_ESIC_Operativos__c","Comentarios_ESIC_Operativos__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest Operativos"],"campos":[{"api":"Fecha_Hab_ESIC_Operativos__c","etiqueta":"Fecha Hab.ESIC Operativos","tipo":"date"},{"api":"Liga_Sesion_ESIC_Operativos__c","etiqueta":"Liga Sesión ESIC Operativos","tipo":"url"},{"api":"Lista_de_participantes_ESIC_Operativos__c","etiqueta":"Lista de participantes ESIC Operativos","tipo":"textarea"},{"api":"Comentarios_ESIC_Operativos__c","etiqueta":"Comentarios ESIC Operativos","tipo":"textarea"}]},{"clave":"EnvioComunicados","nombre":"Envío de comunicados","grupo":"Ejecución","asunto":"Envío de comunicados completado","casilla":"Env_o_de_comunicados__c","completo":"Se_completo_Env_o_Comunicados__c","requeridos":["Fecha_Env_o_de_Comunicados__c","Fecha_Fin_Envio_de_comunicados__c","Comentarios_Env_o_Comunicados__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h"],"campos":[{"api":"Fecha_Env_o_de_Comunicados__c","etiqueta":"Fecha Envío de Comunicados","tipo":"date"},{"api":"Fecha_Fin_Envio_de_comunicados__c","etiqueta":"Fecha Fin Envio de comunicados","tipo":"date"},{"api":"Comentarios_Env_o_Comunicados__c","etiqueta":"Comentarios Envío Comunicados","tipo":"textarea"}]},{"clave":"Aplicacion360","nombre":"Aplicación 360°","grupo":"Ejecución","asunto":"Aplicación 360° completado","casilla":"Aplicaci_n_360__c","completo":"Se_completo_Aplicaci_n_360__c","requeridos":["Fecha_Aplicaci_n_360__c","Duraci_n_Aplicaci_n_360__c","Comentarios_Aplicaci_n_360__c"],"generaActividad":true,"soluciones":["Evou"],"campos":[{"api":"Fecha_Aplicaci_n_360__c","etiqueta":"Fecha Aplicación 360","tipo":"date"},{"api":"Duraci_n_Aplicaci_n_360__c","etiqueta":"Duración Aplicación 360","tipo":"double"},{"api":"Comentarios_Aplicaci_n_360__c","etiqueta":"Comentarios Aplicación 360","tipo":"textarea"}]},{"clave":"NOM035","nombre":"Capacitación o taller especializado","grupo":"Ejecución","asunto":"Habilitamiento completado: Capacitación Cumplimiento NOM 035","casilla":"Capacitacion_Cumplimiento_NOM_035__c","completo":null,"requeridos":["Fecha_Hab_Cumplimiento_NOM_035__c","Liga_Sesion_Cumplimiento_NOM_035__c","Lista_de_participantes_Cumplimiento_NOM__c","Comentarios_Cumplimiento_NOM_035__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h","Evou"],"campos":[{"api":"Lista_Capacitaciones_Especializadas__c","etiqueta":"Lista Capacitaciones Especializadas","tipo":"multipicklist"},{"api":"Otra_Capacitaci_n_Especializada__c","etiqueta":"Otra Capacitación Especializada","tipo":"textarea"},{"api":"Liga_Sesion_Cumplimiento_NOM_035__c","etiqueta":"Liga Sesión Sesión Especializada","tipo":"url"},{"api":"Fecha_Hab_Cumplimiento_NOM_035__c","etiqueta":"Fecha Capacitación Especializada","tipo":"date"},{"api":"Lista_de_participantes_Cumplimiento_NOM__c","etiqueta":"Lista de participantes Capacitación Espe","tipo":"textarea"},{"api":"Comentarios_Cumplimiento_NOM_035__c","etiqueta":"Comentarios Capacitación Especializada","tipo":"textarea"}]},{"clave":"CargaPerfiles","nombre":"Carga de perfiles","grupo":"Ejecución","asunto":"Carga de Perfiles completado","casilla":"Carga_de_Perfiles__c","completo":"Se_completo_Carga_de_Perfiles__c","requeridos":["Fecha_Carga_de_Perfiles__c","Duraci_n_Carga_de_Perfiles__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_Carga_de_Perfiles__c","etiqueta":"Fecha Carga de Perfiles","tipo":"date"},{"api":"Duraci_n_Carga_de_Perfiles__c","etiqueta":"Duración Carga de Perfiles","tipo":"double"}]},{"clave":"ConfigPerfil","nombre":"Configuración de un perfil","grupo":"Ejecución","asunto":"Habilitamiento completado: Configuración de un perfil","casilla":"Configuraci_n_de_un_perfil__c","completo":null,"requeridos":["Fecha_Hab_Configuraci_n_de_un_Perfil__c","Liga_Sesion_Configuracion_de_un_Perfil__c","Lista_de_participantes_Config_1_perfil__c","Comentarios_Configuraci_n_un_Perfil__c"],"generaActividad":true,"soluciones":["Evaluatest","Evaluatest IA operativos","Nuevo Evaluatest","Evaluatest Operativos","Etegrity"],"campos":[{"api":"Fecha_Hab_Configuraci_n_de_un_Perfil__c","etiqueta":"Fecha Hab.Configuración de un Perfil","tipo":"date"},{"api":"Liga_Sesion_Configuracion_de_un_Perfil__c","etiqueta":"Liga Sesión Configuración de un Perfil","tipo":"url"},{"api":"Lista_de_participantes_Config_1_perfil__c","etiqueta":"Lista de participantes Config 1 perfil","tipo":"textarea"},{"api":"Comentarios_Configuraci_n_un_Perfil__c","etiqueta":"Comentarios Configuración un Perfil","tipo":"textarea"}]},{"clave":"DesHomMetodo","nombre":"Desarrollo/homologación de método de evaluación","grupo":"Ejecución","asunto":"Desarrollo/homologación de método de evaluación completado","casilla":"Desarrollo_homologaci_n_de_m_todo_evalua__c","completo":"Se_completo_Des_Hom_M_todo_Evaluaci_n__c","requeridos":["Fecha_Desarrollo_Homologaci_n_M_todo__c","Duraci_n_Des_Hom_M_todo_de_evaluaci_n__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_Desarrollo_Homologaci_n_M_todo__c","etiqueta":"Fecha Desarrollo Homologación Método","tipo":"date"},{"api":"Duraci_n_Des_Hom_M_todo_de_evaluaci_n__c","etiqueta":"Duración Des/Hom Método de evaluación","tipo":"double"}]},{"clave":"DesHomTextos","nombre":"Desarrollo/homologación de textos de interpretación","grupo":"Ejecución","asunto":"Desarrollo/homologación de textos de interpretación completado","casilla":"Desarrollo_homologaci_n_de_textos_de_int__c","completo":"Se_Completo_Des_Hom_Textos_de_Interpre__c","requeridos":["Fecha_Desarrollo_Homologaci_n_Textos_Int__c","Duraci_n_Des_Hom_Textos_de_Interpre__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_Desarrollo_Homologaci_n_Textos_Int__c","etiqueta":"Fecha Desarrollo Homologación Textos Int","tipo":"date"},{"api":"Duraci_n_Des_Hom_Textos_de_Interpre__c","etiqueta":"Duración Des/Hom Textos de Interpre","tipo":"double"}]},{"clave":"ConfigPlataforma","nombre":"Configuración en plataforma","grupo":"Ejecución","asunto":"Configuración en plataforma completado","casilla":"Configuraci_n_en_plataforma__c","completo":"Se_completo_Configuraci_n_Plataforma__c","requeridos":["Fecha_Configuraci_n_Plataforma__c","Duraci_n_Configuraci_n_en_Plataforma__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos"],"campos":[{"api":"Fecha_Configuraci_n_Plataforma__c","etiqueta":"Fecha Configuración Plataforma","tipo":"date"},{"api":"Duraci_n_Configuraci_n_en_Plataforma__c","etiqueta":"Duración Configuración en Plataforma","tipo":"double"}]},{"clave":"Evaluacion","nombre":"Evaluación","grupo":"Ejecución","asunto":"Evaluación completado","casilla":"Evaluaci_n__c","completo":"Se_complet_Evaluaci_n__c","requeridos":["Fecha_Evaluaci_n__c","Fecha_Fin_Evaluaci_n__c","Duraci_n_Evaluaci_n__c","Comentarios_Evaluaci_n__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h"],"campos":[{"api":"Fecha_Evaluaci_n__c","etiqueta":"Fecha Evaluación","tipo":"date"},{"api":"Duraci_n_Evaluaci_n__c","etiqueta":"Duración Evaluación","tipo":"double"},{"api":"Fecha_Fin_Evaluaci_n__c","etiqueta":"Fecha Fin Evaluación","tipo":"date"},{"api":"Comentarios_Evaluaci_n__c","etiqueta":"Comentarios Evaluación","tipo":"textarea"}]},{"clave":"RevisionDataIncidentes","nombre":"Revisión Data e Incidentes","grupo":"Ejecución","asunto":"Revisión Data e Incidentes completado","casilla":"Revisi_n_Data_e_Incidentes__c","completo":"Se_Completo_Revisi_n_Data_e_Incidentes__c","requeridos":["Fecha_Revisi_n_Data_e_Incidentes__c","Duraci_n_Revisi_n_Data_e_Incidentes__c","Comentarios_Revis_n_Data_e_Incidentes__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h"],"campos":[{"api":"Fecha_Revisi_n_Data_e_Incidentes__c","etiqueta":"Fecha Revisión Data e Incidentes","tipo":"date"},{"api":"Duraci_n_Revisi_n_Data_e_Incidentes__c","etiqueta":"Duración Revisión Data e Incidentes","tipo":"double"},{"api":"Comentarios_Revis_n_Data_e_Incidentes__c","etiqueta":"Comentarios Revisón Data e Incidentes","tipo":"textarea"}]},{"clave":"AjustesActualizaciones","nombre":"Ajustes y actualizaciones del proceso","grupo":"Ejecución","asunto":"Ajustes y actualizaciones del proceso completado","casilla":"Ajustes_y_actualizaciones_del_proceso__c","completo":"Se_completo_ajustes_y_actulizaciones__c","requeridos":["Fecha_Actualizaciones_y_Ajustes__c","Duraci_n_ajustes_y_actulizaciones__c","Comentarios_Ajustes_y_actulizaciones__c"],"generaActividad":true,"soluciones":["Evou"],"campos":[{"api":"Fecha_Actualizaciones_y_Ajustes__c","etiqueta":"Fecha Ajustes y Actualizaciones","tipo":"date"},{"api":"Duraci_n_ajustes_y_actulizaciones__c","etiqueta":"Duración ajustes y actualizaciones","tipo":"double"},{"api":"Comentarios_Ajustes_y_actulizaciones__c","etiqueta":"Comentarios Ajustes y actualizaciones","tipo":"textarea"}]},{"clave":"EnvioEstatus","nombre":"Envío de estatus del proceso","grupo":"Ejecución","asunto":"Envío de estatus del proceso completado","casilla":"Env_o_de_estatus_del_proceso__c","completo":"Se_completo_envio_de_estatus__c","requeridos":["Fecha_envio_de_estatus_del_proceso__c","Duracion_envio_estatus_del_proceso__c","Comentarios_Envio_Estatus__c"],"generaActividad":true,"soluciones":["Evou"],"campos":[{"api":"Fecha_envio_de_estatus_del_proceso__c","etiqueta":"Fecha envio de estatus del proceso","tipo":"date"},{"api":"Duracion_envio_estatus_del_proceso__c","etiqueta":"Duracion envio estatus del proceso","tipo":"double"},{"api":"Comentarios_Envio_Estatus__c","etiqueta":"Comentarios envió estatus","tipo":"textarea"}]},{"clave":"AnalisisDatos","nombre":"Análisis de datos","grupo":"Análisis","asunto":null,"casilla":"An_lisis_de_Datos__c","completo":null,"requeridos":[],"generaActividad":false,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_An_lisis_de_datos__c","etiqueta":"Fecha Análisis de datos","tipo":"date"},{"api":"Se_Completo_Analisis_de_Datos__c","etiqueta":"Se Completo Analisis de Datos","tipo":"boolean"},{"api":"Duraci_n_An_lisis_de_Datos__c","etiqueta":"Duración Análisis de Datos","tipo":"double"}]},{"clave":"SeguimientoCandidatos","nombre":"Seguimiento a candidatos","grupo":"Análisis","asunto":"Habilitamiento completado: Seguimiento a candidatos","casilla":"Seguimiento_a_candidatos__c","completo":null,"requeridos":["Fecha_Hab_Seguimiento_a_Candidatos__c","Liga_Sesion_Seguimiento_a_Candidatos__c","Lista_de_participantes_Seguimiento_Candi__c","Comentarios_Seguimiento_a_Candidatos__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Etegrity"],"campos":[{"api":"Fecha_Hab_Seguimiento_a_Candidatos__c","etiqueta":"Fecha Hab.Seguimiento a Candidatos","tipo":"date"},{"api":"Liga_Sesion_Seguimiento_a_Candidatos__c","etiqueta":"Liga Sesión Seguimiento a Candidatos","tipo":"url"},{"api":"Lista_de_participantes_Seguimiento_Candi__c","etiqueta":"Lista de participantes Seguimiento Candi","tipo":"textarea"},{"api":"Comentarios_Seguimiento_a_Candidatos__c","etiqueta":"Comentarios Seguimiento a Candidatos","tipo":"textarea"}]},{"clave":"TemporadaEvaluacion","nombre":"Temporada de evaluación","grupo":"Análisis","asunto":"Temporada de Evaluación completado","casilla":"Temporada_de_Evaluaci_n__c","completo":"Se_completo_Temporada_de_Evaluaci_n__c","requeridos":["Fecha_Temporada_de_Evaluaci_n__c","Duraci_n_Temporada_de_Evaluaci_n__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_Temporada_de_Evaluaci_n__c","etiqueta":"Fecha Temporada de Evaluación","tipo":"date"},{"api":"Duraci_n_Temporada_de_Evaluaci_n__c","etiqueta":"Duración Temporada de Evaluación","tipo":"double"}]},{"clave":"RecoleccionAnalisis","nombre":"Recolección y análisis de información","grupo":"Análisis","asunto":"Recolección y análisis de información completado","casilla":"Recolecci_n_y_an_lisis_de_informaci_n__c","completo":"Se_completo_Recolecci_n_y_An_lisis__c","requeridos":["Fecha_Recoleccion_y_Analisis__c","Duraci_n_Recolecci_n_y_An_lisis_de_Infor__c"],"generaActividad":true,"soluciones":["Evaluatest IA operativos","Evaluatest","Nuevo Evaluatest","Evaluatest Operativos","Evou"],"campos":[{"api":"Fecha_Recoleccion_y_Analisis__c","etiqueta":"Fecha Recoleccion y Analisis","tipo":"date"},{"api":"Duraci_n_Recolecci_n_y_An_lisis_de_Infor__c","etiqueta":"Duración Recolección y Análisis de Infor","tipo":"double"}]},{"clave":"DescargaMatriz","nombre":"Descarga de matriz de resultados","grupo":"Análisis","asunto":"Descarga de matriz de resultados completado","casilla":"Descarga_de_matriz_de_resultados__c","completo":"Se_completo_descarga_matriz_resultados__c","requeridos":["Fecha_descarga_matriz_resultados__c","Comentarios_descarga_matriz_resultados__c"],"generaActividad":true,"soluciones":["Evou"],"campos":[{"api":"Fecha_descarga_matriz_resultados__c","etiqueta":"Fecha descarga matriz resultados","tipo":"date"},{"api":"Comentarios_descarga_matriz_resultados__c","etiqueta":"Comentarios descarga matriz resultados","tipo":"textarea"}]},{"clave":"ElaboracionPPT","nombre":"Elaboración PPT o Data Explorer","grupo":"Análisis","asunto":"Elaboración PPT o Data Explorer completado","casilla":"Elaboracion_ppt_o_Data_explorer__c","completo":"Se_Completo_Elaboraci_n_DE_o_PPT__c","requeridos":["Fecha_Elaboraci_n_DE_o_PPT__c","Duraci_n_Elaboraci_n_DE_o_PPT__c","Comentarios_Elaboracion_DE_o_PPT__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ Clima","Entorno+ NOM035","Entorno+ Clima y NOM035","Exprésate24h","Evou"],"campos":[{"api":"Fecha_Elaboraci_n_DE_o_PPT__c","etiqueta":"Fecha Elaboración DE o PPT","tipo":"date"},{"api":"Duraci_n_Elaboraci_n_DE_o_PPT__c","etiqueta":"Duración Elaboración DE o PPT","tipo":"double"},{"api":"Comentarios_Elaboracion_DE_o_PPT__c","etiqueta":"Comentarios Elaboracion DE o PPT","tipo":"textarea"}]},{"clave":"DescargaReportes","nombre":"Descarga de reportes individuales","grupo":"Análisis","asunto":"Descarga de reportes individuales completado","casilla":"Descarga_de_reportes_individuales__c","completo":"Se_completo_descarga_reportes_individual__c","requeridos":["Fecha_Descarga_reportes_individuales__c","Comentarios_reportes_individuales__c"],"generaActividad":true,"soluciones":["Evou"],"campos":[{"api":"Fecha_Descarga_reportes_individuales__c","etiqueta":"Fecha Descarga reportes individuales","tipo":"date"},{"api":"Comentarios_reportes_individuales__c","etiqueta":"Comentarios reportes individuales","tipo":"textarea"}]},{"clave":"Resultados","nombre":"Resultados","grupo":"Análisis","asunto":"Resultados completado","casilla":"Resultados__c","completo":"Se_complet_Resultados__c","requeridos":["Fecha_Resultados__c","Duraci_n_Resultados__c","Comentarios_Resultados_Entorno__c"],"generaActividad":true,"soluciones":["Entorno+","Entorno+ NOM035","Entorno+ Clima","Entorno+ Clima y NOM035","Exprésate24h","Evou"],"campos":[{"api":"Fecha_Resultados__c","etiqueta":"Fecha Resultados","tipo":"date"},{"api":"Duraci_n_Resultados__c","etiqueta":"Duración Resultados","tipo":"double"},{"api":"Comentarios_Resultados_Entorno__c","etiqueta":"Comentarios Resultados Entorno","tipo":"textarea"}]},{"clave":"Recomendaciones","nombre":"Recomendaciones","grupo":"Otras","asunto":"Recomendaciones completado","casilla":"Recomendaciones__c","completo":"Se_complet_Recomendaciones__c","requeridos":["Fecha_Recomendaciones__c","Duracion_Recomendaciones__c","Comentarios_Recomendaciones__c"],"generaActividad":true,"soluciones":[],"campos":[{"api":"Fecha_Recomendaciones__c","etiqueta":"Fecha Recomendaciones","tipo":"date"},{"api":"Duracion_Recomendaciones__c","etiqueta":"Duracion Recomendaciones","tipo":"double"},{"api":"Comentarios_Recomendaciones__c","etiqueta":"Comentarios Recomendaciones","tipo":"textarea"}]}]';

    public class CampoDef { public String api; public String etiqueta; public String tipo; }
    public class SeccionDef {
        public String clave; public String nombre; public String grupo; public String asunto; public String casilla; public String completo;
        public List<String> requeridos; public List<String> soluciones; public List<String> asuntosAlternos; public Boolean generaActividad;
        public List<CampoDef> campos;
    }

    static List<SeccionDef> definicionesCache;
    @TestVisible static List<SeccionDef> definiciones() {
        if (definicionesCache == null) definicionesCache = (List<SeccionDef>) JSON.deserialize(SECCIONES_JSON, List<SeccionDef>.class);
        return definicionesCache;
    }

    // ---------- forma de la respuesta ----------

    public class Dato {
        @AuraEnabled public String etiqueta;
        @AuraEnabled public String valor;
        @AuraEnabled public String tipo;
    }
    public class Seccion {
        @AuraEnabled public String clave;
        @AuraEnabled public String nombre;
        @AuraEnabled public String grupo;
        @AuraEnabled public Boolean disponible;     // la página la ofrece para la solución del registro
        @AuraEnabled public Boolean seleccionada;   // casilla marcada (Kick Off, Planeación y Entrega final no tienen casilla)
        @AuraEnabled public Boolean completa;       // todos los campos que pide el flow están llenos
        @AuraEnabled public Boolean generaActividad;
        @AuraEnabled public List<Dato> datos = new List<Dato>();
    }
    public class Actividad {
        @AuraEnabled public Id id;
        @AuraEnabled public String asunto;
        @AuraEnabled public String estado;
        @AuraEnabled public Date fecha;
        @AuraEnabled public String resumen;
        @AuraEnabled public String liga;
        @AuraEnabled public String seccion;         // clave de la sección que la detonó (null si el asunto no coincide con ninguna)
        @AuraEnabled public String grupo;
        @AuraEnabled public String etapa;
        @AuraEnabled public Decimal horas;          // "Duracion (horas)" del resumen, si lo trae
    }
    public class Cambio {
        @AuraEnabled public String campo;
        @AuraEnabled public String hito;
        @AuraEnabled public String anterior;
        @AuraEnabled public String nuevo;
        @AuraEnabled public String registrado;      // fecha en que se registró el cambio
        @AuraEnabled public Integer dias;           // nuevo - anterior, si ambos son fechas
    }
    public class TiempoEtapa {
        @AuraEnabled public String etapa;
        @AuraEnabled public Decimal horas;
        @AuraEnabled public Integer veces;
    }
    public class Producto {
        @AuraEnabled public String nombre;
        @AuraEnabled public String categoria;      // Categoria__c del producto (null si no la tiene o el usuario no la ve)
    }
    public class Implementacion {
        @AuraEnabled public Id id;
        @AuraEnabled public String nombre;
        @AuraEnabled public String tipo;
        @AuraEnabled public String etapa;           // noIniciada | agendada | kickoff | enPausa | enProceso | entregaFinal | finalizada
        @AuraEnabled public String etapaOriginal;
        @AuraEnabled public Id cuentaId;
        @AuraEnabled public String empresa;
        @AuraEnabled public Boolean esPrueba;
        @AuraEnabled public Id oportunidadId;
        @AuraEnabled public String oportunidad;
        @AuraEnabled public List<Producto> productos = new List<Producto>();   // productos de la oportunidad (sin repetir)
        @AuraEnabled public String responsable;
        @AuraEnabled public List<String> asociados = new List<String>();
        @AuraEnabled public String solucion;
        @AuraEnabled public String propietario;
        @AuraEnabled public String contacto;
        @AuraEnabled public List<String> poliza = new List<String>();
        @AuraEnabled public String ordenCompra;
        @AuraEnabled public Datetime creadoEn;
        @AuraEnabled public Datetime cambioEstatus;
        @AuraEnabled public Date fechaAcordadaKickoff;
        @AuraEnabled public Date fechaKickoff;
        @AuraEnabled public Date fechaFinImplementacion;
        @AuraEnabled public Decimal horasContratadas;
        @AuraEnabled public Decimal horasConsumidas;
        @AuraEnabled public Decimal horasRestantes;
        @AuraEnabled public Decimal pausas;
        @AuraEnabled public Decimal tiempoPausa;
        @AuraEnabled public String evidenciaPausa;
        @AuraEnabled public List<String> historialPausas = new List<String>();
        @AuraEnabled public List<Seccion> secciones = new List<Seccion>();
        @AuraEnabled public List<Actividad> actividades = new List<Actividad>();
        @AuraEnabled public List<Cambio> cambios = new List<Cambio>();
        @AuraEnabled public List<TiempoEtapa> tiempos = new List<TiempoEtapa>();
    }

    /** incluirPruebas (opcional): también trae la cuenta de pruebas (Patito), marcada con esPrueba. */
    // sin cacheable: el panel lo llama de forma imperativa y "Actualizar" tiene que traer datos nuevos, no la copia guardada en el navegador
    @AuraEnabled
    public static List<Implementacion> obtenerImplementaciones(Boolean incluirPruebas) {
        try {
            Map<Id, List<Task>> tareas = consultarTareas();
            List<Delivery_y_Desarrollo__c> registros = consultarRegistros(tareas.keySet(), incluirPruebas == true);
            return armar(registros, tareas, consultarProductos(registros));
        } catch (Exception e) {
            throw new AuraHandledException('No se pudieron cargar las implementaciones: ' + e.getMessage());
        }
    }

    // ---------- consulta ----------

    // actividades fechadas desde el corte, por registro
    static Map<Id, List<Task>> consultarTareas() {
        Map<Id, List<Task>> porRegistro = new Map<Id, List<Task>>();
        for (Task t : [
            SELECT Id, WhatId, Subject, Status, ActivityDate, Description, Link_a_video_de_sesion__c
            FROM Task
            WHERE What.Type = 'Delivery_y_Desarrollo__c' AND ActivityDate >= :FECHA_INICIO_DATOS
            WITH USER_MODE
            ORDER BY ActivityDate ASC, CreatedDate ASC
        ]) {
            if (!porRegistro.containsKey(t.WhatId)) porRegistro.put(t.WhatId, new List<Task>());
            porRegistro.get(t.WhatId).add(t);
        }
        return porRegistro;
    }

    @TestVisible static List<String> camposConsulta() {
        Set<String> campos = new Set<String>{
            'Id', 'Name', 'Tipo_de_Ejecucion__c', 'Etapa_del_Proyecto__c', 'Cuenta_Comercial__c', 'Cuenta_Comercial__r.Name',
            'Nombre_Comercial_de_la_Cuenta__c', 'Oportunidad__c', 'Oportunidad__r.Name', 'toLabel(Responsable_de_la_Implementaci_n__c)',
            'toLabel(Consultor_Asociado__c)', 'toLabel(Soluci_n_adquirida__c)', 'Poliza_Adquirida__c', 'Usuario__r.Name',
            'Contacto__r.Name', 'Orden_de_Compra__c', 'CreatedDate', 'Fecha_de_Estatus__c', 'Fecha_acordada__c',
            'Fecha_inicio_Kick_Off__c', 'Fecha_Fin_de_Implementaci_n__c', 'Horas_Contratadas__c', 'Horas__c', 'Horas_Disponibles__c', 'Contador_pausas__c',
            'Tiempo_total_en_pausa__c', 'Historial_de_pausas__c', 'Evidencia_de_Pausa__c'
        };
        for (SeccionDef s : definiciones()) {
            if (s.casilla != null) campos.add(s.casilla);
            if (s.completo != null) campos.add(s.completo);
            campos.addAll(s.requeridos);
            for (CampoDef c : s.campos) campos.add(c.api);
        }
        campos.addAll(REPROGRAMACIONES.keySet());
        campos.addAll(HISTORIAL_ETAPAS.keySet());
        return new List<String>(campos);
    }

    // registros con alguna fecha de trabajo o actividad desde el corte; solo etapas vigentes y tipo definido
    static List<Delivery_y_Desarrollo__c> consultarRegistros(Set<Id> conActividad, Boolean incluirPruebas) {
        Map<String, Object> binds = new Map<String, Object>{
            'tipos' => TIPOS,
            'etapas' => ETAPAS.keySet(),
            'inicio' => FECHA_INICIO_DATOS,
            'creadoDesde' => Datetime.newInstance(FECHA_INICIO_DATOS, Time.newInstance(0, 0, 0, 0)),
            'conActividad' => conActividad
        };
        String consulta = 'SELECT ' + String.join(camposConsulta(), ', ') + ' FROM Delivery_y_Desarrollo__c'
            + ' WHERE Tipo_de_Ejecucion__c IN :tipos AND Etapa_del_Proyecto__c IN :etapas'
            + filtroPruebas(incluirPruebas, binds)
            + ' AND (CreatedDate >= :creadoDesde OR Fecha_de_Estatus__c >= :creadoDesde OR Fecha_acordada__c >= :inicio'
            + ' OR Fecha_inicio_Kick_Off__c >= :inicio OR Id IN :conActividad)'
            + ' ORDER BY CreatedDate DESC';
        return (List<Delivery_y_Desarrollo__c>) Database.queryWithBinds(consulta, binds, AccessLevel.USER_MODE);
    }

    static String filtroPruebas(Boolean incluirPruebas, Map<String, Object> binds) {
        if (incluirPruebas) return '';
        binds.put('prueba', CUENTA_PRUEBA);
        return ' AND (Cuenta_Comercial__c = null OR (NOT Cuenta_Comercial__r.Name LIKE :prueba))';
    }

    // productos de la oportunidad de cada registro (con su categoría). Si el usuario no ve productos, el panel sigue sin ellos.
    static Map<Id, List<Producto>> consultarProductos(List<Delivery_y_Desarrollo__c> registros) {
        Set<Id> oportunidades = new Set<Id>();
        for (Delivery_y_Desarrollo__c r : registros) {
            if (r.Oportunidad__c != null) oportunidades.add(r.Oportunidad__c);
        }
        if (oportunidades.isEmpty() || !Schema.sObjectType.OpportunityLineItem.isAccessible()) return new Map<Id, List<Producto>>();
        // la categoría es un campo propio de Product2: se pide solo si el usuario puede leerla
        Boolean conCategoria = Schema.sObjectType.Product2.fields.getMap().containsKey('Categoria__c')
            && Schema.sObjectType.Product2.fields.getMap().get('Categoria__c').getDescribe().isAccessible();
        String consulta = 'SELECT OpportunityId, Product2.Name' + (conCategoria ? ', Product2.Categoria__c' : '')
            + ' FROM OpportunityLineItem WHERE OpportunityId IN :oportunidades ORDER BY Product2.Name';
        try {
            return agruparProductos((List<OpportunityLineItem>) Database.queryWithBinds(
                consulta, new Map<String, Object>{ 'oportunidades' => oportunidades }, AccessLevel.USER_MODE));
        } catch (QueryException e) {
            return new Map<Id, List<Producto>>();
        }
    }

    // oportunidad -> productos sin repetir (una oportunidad puede traer el mismo producto en varias líneas)
    @TestVisible static Map<Id, List<Producto>> agruparProductos(List<OpportunityLineItem> lineas) {
        Map<Id, List<Producto>> salida = new Map<Id, List<Producto>>();
        Map<Id, Set<String>> vistos = new Map<Id, Set<String>>();
        for (OpportunityLineItem l : lineas) {
            String nombre = l.Product2 != null ? l.Product2.Name : null;
            if (String.isBlank(nombre)) continue;
            if (!salida.containsKey(l.OpportunityId)) {
                salida.put(l.OpportunityId, new List<Producto>());
                vistos.put(l.OpportunityId, new Set<String>());
            }
            if (!vistos.get(l.OpportunityId).add(nombre)) continue;
            Producto p = new Producto();
            p.nombre = nombre;
            p.categoria = l.Product2.isSet('Categoria__c') ? (String) l.Product2.get('Categoria__c') : null;
            salida.get(l.OpportunityId).add(p);
        }
        return salida;
    }

    // ---------- armado ----------

    static List<Implementacion> armar(List<Delivery_y_Desarrollo__c> registros, Map<Id, List<Task>> tareas, Map<Id, List<Producto>> productos) {
        List<Implementacion> salida = new List<Implementacion>();
        for (Delivery_y_Desarrollo__c r : registros) {
            Implementacion i = new Implementacion();
            i.id = r.Id;
            i.nombre = r.Name;
            i.tipo = r.Tipo_de_Ejecucion__c;
            i.etapaOriginal = r.Etapa_del_Proyecto__c;
            i.etapa = ETAPAS.get(r.Etapa_del_Proyecto__c);
            i.cuentaId = r.Cuenta_Comercial__c;
            i.empresa = r.Cuenta_Comercial__r != null ? r.Cuenta_Comercial__r.Name : r.Nombre_Comercial_de_la_Cuenta__c;
            i.esPrueba = i.empresa != null && i.empresa.toLowerCase().contains('patito');
            i.oportunidadId = r.Oportunidad__c;
            i.oportunidad = r.Oportunidad__r != null ? r.Oportunidad__r.Name : null;
            if (productos.containsKey(r.Oportunidad__c)) i.productos = productos.get(r.Oportunidad__c);
            i.responsable = (String) r.get('Responsable_de_la_Implementaci_n__c');
            i.asociados = partir((String) r.get('Consultor_Asociado__c'));
            i.solucion = (String) r.get('Soluci_n_adquirida__c');
            i.propietario = r.Usuario__r != null ? r.Usuario__r.Name : null;
            i.contacto = r.Contacto__r != null ? r.Contacto__r.Name : null;
            i.poliza = partir(r.Poliza_Adquirida__c);
            i.ordenCompra = r.Orden_de_Compra__c;
            i.creadoEn = r.CreatedDate;
            i.cambioEstatus = r.Fecha_de_Estatus__c;
            i.fechaAcordadaKickoff = r.Fecha_acordada__c;
            i.fechaKickoff = r.Fecha_inicio_Kick_Off__c;
            i.fechaFinImplementacion = r.Fecha_Fin_de_Implementaci_n__c;
            // horas: lo que ya calculan los flows (Horas_Contratadas_desde_Productos, Horas_Consumidas_Delivery y la fórmula de disponibles)
            i.horasContratadas = r.Horas_Contratadas__c;
            i.horasConsumidas = r.Horas__c;
            i.horasRestantes = r.Horas_Disponibles__c;
            i.pausas = r.Contador_pausas__c;
            i.tiempoPausa = r.Tiempo_total_en_pausa__c;
            i.evidenciaPausa = r.Evidencia_de_Pausa__c;
            i.historialPausas = desdeCorte(lineasDesde(r.Historial_de_pausas__c));

            armarSecciones(i, r);
            armarActividades(i, tareas.get(r.Id));
            armarCambios(i, r);
            armarTiempos(i, r);
            salida.add(i);
        }
        return salida;
    }

    static void armarSecciones(Implementacion i, Delivery_y_Desarrollo__c r) {
        for (SeccionDef d : definiciones()) {
            Seccion s = new Seccion();
            s.clave = d.clave;
            s.nombre = d.nombre;
            s.grupo = d.grupo;
            s.generaActividad = d.generaActividad == true;
            s.disponible = d.soluciones.isEmpty() || d.soluciones.contains(i.solucion);
            s.seleccionada = d.casilla == null ? true : r.get(d.casilla) == true;
            Boolean completa = s.seleccionada && (d.completo == null || r.get(d.completo) == true);
            for (String api : d.requeridos) completa = completa && lleno(r.get(api));
            s.completa = completa;
            for (CampoDef c : d.campos) {
                Object valor = r.get(c.api);
                if (!lleno(valor) && c.tipo != 'boolean') continue;
                if (c.tipo == 'boolean' && valor != true) continue;
                Dato dato = new Dato();
                dato.etiqueta = c.etiqueta;
                dato.tipo = c.tipo;
                dato.valor = texto(valor);
                s.datos.add(dato);
            }
            i.secciones.add(s);
        }
    }

    static void armarActividades(Implementacion i, List<Task> tareas) {
        if (tareas == null) return;
        for (Task t : tareas) {
            Actividad a = new Actividad();
            a.id = t.Id;
            a.asunto = t.Subject;
            a.estado = t.Status;
            a.fecha = t.ActivityDate;
            a.resumen = t.Description;
            a.liga = t.Link_a_video_de_sesion__c;
            a.horas = horasDe(t.Description);
            SeccionDef d = seccionDe(t.Subject);
            if (d != null) {
                a.seccion = d.clave;
                a.grupo = d.grupo;
                a.etapa = d.grupo == 'Kickoff' ? 'Kickoff' : (d.grupo == 'Entrega final' ? 'Entrega final' : 'En proceso');
            }
            i.actividades.add(a);
        }
    }

    // el flow nombra la actividad "{Sección} completado - {Cuenta}": se busca la sección cuyo asunto la inicia
    @TestVisible static SeccionDef seccionDe(String asunto) {
        if (String.isBlank(asunto)) return null;
        SeccionDef mejor = null;
        Integer largo = 0;
        for (SeccionDef d : definiciones()) {
            List<String> asuntos = new List<String>();
            if (d.asunto != null) asuntos.add(d.asunto);
            if (d.asuntosAlternos != null) asuntos.addAll(d.asuntosAlternos);
            for (String a : asuntos) {
                if (asunto.startsWith(a + ' - ') && a.length() > largo) { mejor = d; largo = a.length(); }
            }
        }
        return mejor;
    }

    @TestVisible static Decimal horasDe(String descripcion) {
        if (String.isBlank(descripcion)) return null;
        Matcher m = HORAS_ACTIVIDAD.matcher(descripcion);
        return m.find() ? Decimal.valueOf(m.group(1).replace(',', '.')) : null;
    }

    // Control de Cambios: cada línea "anterior -> nuevo (fecha)" de los campos Reprogramacion_*; solo desde el corte
    static void armarCambios(Implementacion i, Delivery_y_Desarrollo__c r) {
        for (String campo : REPROGRAMACIONES.keySet()) {
            for (String linea : lineasDesde((String) r.get(campo))) {
                Cambio c = cambioDe(linea);
                if (c == null) continue;
                c.campo = campo;
                c.hito = REPROGRAMACIONES.get(campo);
                i.cambios.add(c);
            }
        }
    }

    @TestVisible static Cambio cambioDe(String linea) {
        Matcher m = CAMBIO.matcher(linea);
        if (!m.matches()) return null;
        Date registrado = Date.valueOf(m.group(3));
        if (registrado < FECHA_INICIO_DATOS) return null;
        Cambio c = new Cambio();
        c.anterior = m.group(1);
        c.nuevo = m.group(2);
        c.registrado = m.group(3);
        try {
            c.dias = Date.valueOf(c.anterior).daysBetween(Date.valueOf(c.nuevo));
        } catch (Exception e) {
            c.dias = null;
        }
        return c;
    }

    // horas que el registro pasó en cada etapa (líneas del historial de etapas desde el corte)
    static void armarTiempos(Implementacion i, Delivery_y_Desarrollo__c r) {
        for (String campo : HISTORIAL_ETAPAS.keySet()) {
            TiempoEtapa t = new TiempoEtapa();
            t.etapa = HISTORIAL_ETAPAS.get(campo);
            t.horas = 0;
            t.veces = 0;
            for (String linea : lineasDesde((String) r.get(campo))) {
                Matcher m = PASO_ETAPA.matcher(linea);
                if (!m.matches() || Date.valueOf(m.group(1)) < FECHA_INICIO_DATOS) continue;
                t.horas += Decimal.valueOf(m.group(2));
                t.veces++;
            }
            if (t.veces > 0) i.tiempos.add(t);
        }
    }

    // ---------- utilidades ----------

    // de las líneas del historial de pausas se quedan las que tienen su última fecha del corte en adelante
    @TestVisible static List<String> desdeCorte(List<String> lineas) {
        List<String> salida = new List<String>();
        for (String l : lineas) {
            Matcher m = FECHA.matcher(l);
            String ultima = null;
            while (m.find()) ultima = m.group(1);
            if (ultima != null && Date.valueOf(ultima) >= FECHA_INICIO_DATOS) salida.add(l);
        }
        return salida;
    }

    @TestVisible static List<String> lineasDesde(String texto) {
        List<String> salida = new List<String>();
        if (String.isBlank(texto)) return salida;
        for (String l : texto.split('\n')) {
            if (String.isNotBlank(l)) salida.add(l.trim());
        }
        return salida;
    }

    static List<String> partir(String valor) {
        List<String> salida = new List<String>();
        if (String.isBlank(valor)) return salida;
        for (String v : valor.split(';')) {
            if (String.isNotBlank(v) && v.trim() != 'N/A') salida.add(v.trim());
        }
        return salida;
    }

    static Boolean lleno(Object v) {
        if (v == null) return false;
        if (v instanceof Boolean) return (Boolean) v;
        if (v instanceof String) return String.isNotBlank((String) v);
        return true;
    }

    static String texto(Object v) {
        if (v instanceof Boolean) return (Boolean) v ? 'Sí' : 'No';
        if (v instanceof Decimal) return ((Decimal) v).stripTrailingZeros().toPlainString();
        return String.valueOf(v);
    }
}
