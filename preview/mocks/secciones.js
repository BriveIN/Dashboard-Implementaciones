// Generado desde scripts/secciones.json (mismas secciones que el Apex): solo lo usa el generador de datos ficticios.
export const SECCIONES = [
 {
  "clave": "KickOff",
  "nombre": "Kick Off",
  "grupo": "Kickoff",
  "asunto": "Kick Off completada",
  "casilla": null,
  "completo": null,
  "requeridos": [
   "Fecha_inicio_Kick_Off__c",
   "Comentarios_Kick_Off__c",
   "Duraci_n_Etapa_Kickoff__c"
  ],
  "generaActividad": true,
  "soluciones": [],
  "campos": [
   {
    "api": "Fecha_acordada__c",
    "etiqueta": "Fecha Acordada Kick Off",
    "tipo": "date"
   },
   {
    "api": "Fecha_inicio_Kick_Off__c",
    "etiqueta": "Fecha Kick Off",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Etapa_Kickoff__c",
    "etiqueta": "Duración Etapa Kickoff",
    "tipo": "double"
   },
   {
    "api": "Objetivos_estrat_gicos_del_cliente__c",
    "etiqueta": "Objetivos estratégicos del cliente",
    "tipo": "textarea"
   },
   {
    "api": "Plan_de_Trabajo_Aprobado__c",
    "etiqueta": "Plan de Trabajo Aprobado",
    "tipo": "boolean"
   },
   {
    "api": "Evidencia_Plan_de_Trabajo__c",
    "etiqueta": "Evidencia Plan de Trabajo",
    "tipo": "url"
   },
   {
    "api": "Comentarios_Kick_Off__c",
    "etiqueta": "Comentarios Kick Off",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "Insumos",
  "nombre": "Planeación",
  "grupo": "Planeación",
  "asunto": "Planeación completada",
  "casilla": null,
  "completo": null,
  "requeridos": [
   "Fecha_Recibo_Insumos__c",
   "Insumos_Completos__c",
   "Fecha_Acordada_Configuracion__c",
   "Perfiles__c",
   "Comentarios_Recepcion_Insumos_Config__c",
   "Duraci_n_Etapa_Insumos_y_Configuraci_n__c"
  ],
  "generaActividad": true,
  "soluciones": [],
  "campos": [
   {
    "api": "Fecha_Acordada_Recepcion_Insumos__c",
    "etiqueta": "Fecha Acordada Recepción Insumos",
    "tipo": "date"
   },
   {
    "api": "Fecha_Solicitud_Insumos__c",
    "etiqueta": "Fecha Solicitud Insumos",
    "tipo": "date"
   },
   {
    "api": "Fecha_Recibo_Insumos__c",
    "etiqueta": "Fecha Recibo Insumos",
    "tipo": "date"
   },
   {
    "api": "Fecha_Acordada_Configuracion__c",
    "etiqueta": "Fecha Inicio Configuración",
    "tipo": "date"
   },
   {
    "api": "Insumos_Completos__c",
    "etiqueta": "Insumos Completos",
    "tipo": "boolean"
   },
   {
    "api": "Lista_de_Insumos_Recibidos__c",
    "etiqueta": "Lista de Insumos Recibidos",
    "tipo": "multipicklist"
   },
   {
    "api": "Duraci_n_Etapa_Insumos_y_Configuraci_n__c",
    "etiqueta": "Duración Etapa Insumos y Configuración",
    "tipo": "double"
   },
   {
    "api": "Perfiles__c",
    "etiqueta": "Se Crearon Perfiles",
    "tipo": "boolean"
   },
   {
    "api": "Comentarios_Recepcion_Insumos_Config__c",
    "etiqueta": "Comentarios Insumos y Config.",
    "tipo": "textarea"
   }
  ],
  "asuntosAlternos": [
   "Recepción de Insumos y Configuración completada"
  ]
 },
 {
  "clave": "EntregaFinal",
  "nombre": "Entrega final",
  "grupo": "Entrega final",
  "asunto": "Entrega Final completada",
  "casilla": null,
  "completo": null,
  "requeridos": [
   "Fecha_Sesion_Final_Cliente__c",
   "Fecha_Recibo_VoBo_Cliente__c",
   "Comentarios_Sesion_Final__c",
   "Duraci_n_Etapa_Entrega_Final__c"
  ],
  "generaActividad": true,
  "soluciones": [],
  "campos": [
   {
    "api": "Fecha_Sesion_Final_Cliente__c",
    "etiqueta": "Fecha Sesión Final Cliente",
    "tipo": "date"
   },
   {
    "api": "Fecha_Envio_Acta_Entrega__c",
    "etiqueta": "Fecha Envío Acta de Entrega",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Etapa_Entrega_Final__c",
    "etiqueta": "Duración Etapa Entrega Final",
    "tipo": "double"
   },
   {
    "api": "Fecha_Recibo_VoBo_Cliente__c",
    "etiqueta": "Fecha Recibo VoBo Cliente",
    "tipo": "date"
   },
   {
    "api": "Acta_de_Entrega_Firmada_Cliente__c",
    "etiqueta": "Acta de Entrega Firmada Cliente",
    "tipo": "boolean"
   },
   {
    "api": "Encuesta_de_Satisfaccion__c",
    "etiqueta": "Encuesta de Satisfacción Enviada",
    "tipo": "boolean"
   },
   {
    "api": "Satisfacion_del_Cliente__c",
    "etiqueta": "Satisfacion del Cliente",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Sesion_Final__c",
    "etiqueta": "Comentarios Sesión Final",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "Arranque",
  "nombre": "Arranque",
  "grupo": "Ejecución",
  "asunto": "Arranque completado",
  "casilla": "Arranque__c",
  "completo": "Se_completo_Arranque__c",
  "requeridos": [
   "Fecha_Arranque__c",
   "Fecha_Fin_arranque__c",
   "Duraci_n_Arranque__c",
   "Comentarios_Arranque__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h"
  ],
  "campos": [
   {
    "api": "Fecha_Arranque__c",
    "etiqueta": "Fecha Arranque",
    "tipo": "date"
   },
   {
    "api": "Sesi_n_Sensibilizaci_n__c",
    "etiqueta": "Sesión Sensibilización",
    "tipo": "boolean"
   },
   {
    "api": "Duraci_n_Arranque__c",
    "etiqueta": "Duración Arranque",
    "tipo": "double"
   },
   {
    "api": "Fecha_Fin_arranque__c",
    "etiqueta": "Fecha Fin arranque",
    "tipo": "date"
   },
   {
    "api": "Comentarios_Arranque__c",
    "etiqueta": "Comentarios Arranque",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "ConfigInicial",
  "nombre": "Configuración inicial de la cuenta",
  "grupo": "Ejecución",
  "asunto": "Habilitamiento completado: Configuración inicial de la cuenta",
  "casilla": "Configuraci_n_inicial_de_la_cuenta__c",
  "completo": null,
  "requeridos": [
   "Fecha_Hab_Configuracion_Inicial_Cuenta__c",
   "Liga_Sesi_n_Configuraci_n_inicial__c",
   "Lista_de_participantes__c",
   "Comentarios_Configuracion_Inicial__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest",
   "Evaluatest IA operativos",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Etegrity"
  ],
  "campos": [
   {
    "api": "Fecha_Hab_Configuracion_Inicial_Cuenta__c",
    "etiqueta": "Fecha Hab. Configuracion Inicial Cuenta",
    "tipo": "date"
   },
   {
    "api": "Liga_Sesi_n_Configuraci_n_inicial__c",
    "etiqueta": "Liga Sesión Configuración inicial",
    "tipo": "url"
   },
   {
    "api": "Lista_de_participantes__c",
    "etiqueta": "Lista de participantes Configuracion Ini",
    "tipo": "textarea"
   },
   {
    "api": "Comentarios_Configuracion_Inicial__c",
    "etiqueta": "Comentarios Configuracion Inicial",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "ESICOperativos",
  "nombre": "ESIC Operativos",
  "grupo": "Ejecución",
  "asunto": "Habilitamiento completado: ESIC Operativos",
  "casilla": "ESIC_Operativos__c",
  "completo": null,
  "requeridos": [
   "Fecha_Hab_ESIC_Operativos__c",
   "Liga_Sesion_ESIC_Operativos__c",
   "Lista_de_participantes_ESIC_Operativos__c",
   "Comentarios_ESIC_Operativos__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest Operativos"
  ],
  "campos": [
   {
    "api": "Fecha_Hab_ESIC_Operativos__c",
    "etiqueta": "Fecha Hab.ESIC Operativos",
    "tipo": "date"
   },
   {
    "api": "Liga_Sesion_ESIC_Operativos__c",
    "etiqueta": "Liga Sesión ESIC Operativos",
    "tipo": "url"
   },
   {
    "api": "Lista_de_participantes_ESIC_Operativos__c",
    "etiqueta": "Lista de participantes ESIC Operativos",
    "tipo": "textarea"
   },
   {
    "api": "Comentarios_ESIC_Operativos__c",
    "etiqueta": "Comentarios ESIC Operativos",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "EnvioComunicados",
  "nombre": "Envío de comunicados",
  "grupo": "Ejecución",
  "asunto": "Envío de comunicados completado",
  "casilla": "Env_o_de_comunicados__c",
  "completo": "Se_completo_Env_o_Comunicados__c",
  "requeridos": [
   "Fecha_Env_o_de_Comunicados__c",
   "Fecha_Fin_Envio_de_comunicados__c",
   "Comentarios_Env_o_Comunicados__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h"
  ],
  "campos": [
   {
    "api": "Fecha_Env_o_de_Comunicados__c",
    "etiqueta": "Fecha Envío de Comunicados",
    "tipo": "date"
   },
   {
    "api": "Fecha_Fin_Envio_de_comunicados__c",
    "etiqueta": "Fecha Fin Envio de comunicados",
    "tipo": "date"
   },
   {
    "api": "Comentarios_Env_o_Comunicados__c",
    "etiqueta": "Comentarios Envío Comunicados",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "Aplicacion360",
  "nombre": "Aplicación 360°",
  "grupo": "Ejecución",
  "asunto": "Aplicación 360° completado",
  "casilla": "Aplicaci_n_360__c",
  "completo": "Se_completo_Aplicaci_n_360__c",
  "requeridos": [
   "Fecha_Aplicaci_n_360__c",
   "Duraci_n_Aplicaci_n_360__c",
   "Comentarios_Aplicaci_n_360__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Aplicaci_n_360__c",
    "etiqueta": "Fecha Aplicación 360",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Aplicaci_n_360__c",
    "etiqueta": "Duración Aplicación 360",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Aplicaci_n_360__c",
    "etiqueta": "Comentarios Aplicación 360",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "NOM035",
  "nombre": "Capacitación o taller especializado",
  "grupo": "Ejecución",
  "asunto": "Habilitamiento completado: Capacitación Cumplimiento NOM 035",
  "casilla": "Capacitacion_Cumplimiento_NOM_035__c",
  "completo": null,
  "requeridos": [
   "Fecha_Hab_Cumplimiento_NOM_035__c",
   "Liga_Sesion_Cumplimiento_NOM_035__c",
   "Lista_de_participantes_Cumplimiento_NOM__c",
   "Comentarios_Cumplimiento_NOM_035__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h",
   "Evou"
  ],
  "campos": [
   {
    "api": "Lista_Capacitaciones_Especializadas__c",
    "etiqueta": "Lista Capacitaciones Especializadas",
    "tipo": "multipicklist"
   },
   {
    "api": "Otra_Capacitaci_n_Especializada__c",
    "etiqueta": "Otra Capacitación Especializada",
    "tipo": "textarea"
   },
   {
    "api": "Liga_Sesion_Cumplimiento_NOM_035__c",
    "etiqueta": "Liga Sesión Sesión Especializada",
    "tipo": "url"
   },
   {
    "api": "Fecha_Hab_Cumplimiento_NOM_035__c",
    "etiqueta": "Fecha Capacitación Especializada",
    "tipo": "date"
   },
   {
    "api": "Lista_de_participantes_Cumplimiento_NOM__c",
    "etiqueta": "Lista de participantes Capacitación Espe",
    "tipo": "textarea"
   },
   {
    "api": "Comentarios_Cumplimiento_NOM_035__c",
    "etiqueta": "Comentarios Capacitación Especializada",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "CargaPerfiles",
  "nombre": "Carga de perfiles",
  "grupo": "Ejecución",
  "asunto": "Carga de Perfiles completado",
  "casilla": "Carga_de_Perfiles__c",
  "completo": "Se_completo_Carga_de_Perfiles__c",
  "requeridos": [
   "Fecha_Carga_de_Perfiles__c",
   "Duraci_n_Carga_de_Perfiles__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Carga_de_Perfiles__c",
    "etiqueta": "Fecha Carga de Perfiles",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Carga_de_Perfiles__c",
    "etiqueta": "Duración Carga de Perfiles",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "ConfigPerfil",
  "nombre": "Configuración de un perfil",
  "grupo": "Ejecución",
  "asunto": "Habilitamiento completado: Configuración de un perfil",
  "casilla": "Configuraci_n_de_un_perfil__c",
  "completo": null,
  "requeridos": [
   "Fecha_Hab_Configuraci_n_de_un_Perfil__c",
   "Liga_Sesion_Configuracion_de_un_Perfil__c",
   "Lista_de_participantes_Config_1_perfil__c",
   "Comentarios_Configuraci_n_un_Perfil__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest",
   "Evaluatest IA operativos",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Etegrity"
  ],
  "campos": [
   {
    "api": "Fecha_Hab_Configuraci_n_de_un_Perfil__c",
    "etiqueta": "Fecha Hab.Configuración de un Perfil",
    "tipo": "date"
   },
   {
    "api": "Liga_Sesion_Configuracion_de_un_Perfil__c",
    "etiqueta": "Liga Sesión Configuración de un Perfil",
    "tipo": "url"
   },
   {
    "api": "Lista_de_participantes_Config_1_perfil__c",
    "etiqueta": "Lista de participantes Config 1 perfil",
    "tipo": "textarea"
   },
   {
    "api": "Comentarios_Configuraci_n_un_Perfil__c",
    "etiqueta": "Comentarios Configuración un Perfil",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "DesHomMetodo",
  "nombre": "Desarrollo/homologación de método de evaluación",
  "grupo": "Ejecución",
  "asunto": "Desarrollo/homologación de método de evaluación completado",
  "casilla": "Desarrollo_homologaci_n_de_m_todo_evalua__c",
  "completo": "Se_completo_Des_Hom_M_todo_Evaluaci_n__c",
  "requeridos": [
   "Fecha_Desarrollo_Homologaci_n_M_todo__c",
   "Duraci_n_Des_Hom_M_todo_de_evaluaci_n__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Desarrollo_Homologaci_n_M_todo__c",
    "etiqueta": "Fecha Desarrollo Homologación Método",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Des_Hom_M_todo_de_evaluaci_n__c",
    "etiqueta": "Duración Des/Hom Método de evaluación",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "DesHomTextos",
  "nombre": "Desarrollo/homologación de textos de interpretación",
  "grupo": "Ejecución",
  "asunto": "Desarrollo/homologación de textos de interpretación completado",
  "casilla": "Desarrollo_homologaci_n_de_textos_de_int__c",
  "completo": "Se_Completo_Des_Hom_Textos_de_Interpre__c",
  "requeridos": [
   "Fecha_Desarrollo_Homologaci_n_Textos_Int__c",
   "Duraci_n_Des_Hom_Textos_de_Interpre__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Desarrollo_Homologaci_n_Textos_Int__c",
    "etiqueta": "Fecha Desarrollo Homologación Textos Int",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Des_Hom_Textos_de_Interpre__c",
    "etiqueta": "Duración Des/Hom Textos de Interpre",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "ConfigPlataforma",
  "nombre": "Configuración en plataforma",
  "grupo": "Ejecución",
  "asunto": "Configuración en plataforma completado",
  "casilla": "Configuraci_n_en_plataforma__c",
  "completo": "Se_completo_Configuraci_n_Plataforma__c",
  "requeridos": [
   "Fecha_Configuraci_n_Plataforma__c",
   "Duraci_n_Configuraci_n_en_Plataforma__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos"
  ],
  "campos": [
   {
    "api": "Fecha_Configuraci_n_Plataforma__c",
    "etiqueta": "Fecha Configuración Plataforma",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Configuraci_n_en_Plataforma__c",
    "etiqueta": "Duración Configuración en Plataforma",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "Evaluacion",
  "nombre": "Evaluación",
  "grupo": "Ejecución",
  "asunto": "Evaluación completado",
  "casilla": "Evaluaci_n__c",
  "completo": "Se_complet_Evaluaci_n__c",
  "requeridos": [
   "Fecha_Evaluaci_n__c",
   "Fecha_Fin_Evaluaci_n__c",
   "Duraci_n_Evaluaci_n__c",
   "Comentarios_Evaluaci_n__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h"
  ],
  "campos": [
   {
    "api": "Fecha_Evaluaci_n__c",
    "etiqueta": "Fecha Evaluación",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Evaluaci_n__c",
    "etiqueta": "Duración Evaluación",
    "tipo": "double"
   },
   {
    "api": "Fecha_Fin_Evaluaci_n__c",
    "etiqueta": "Fecha Fin Evaluación",
    "tipo": "date"
   },
   {
    "api": "Comentarios_Evaluaci_n__c",
    "etiqueta": "Comentarios Evaluación",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "RevisionDataIncidentes",
  "nombre": "Revisión Data e Incidentes",
  "grupo": "Ejecución",
  "asunto": "Revisión Data e Incidentes completado",
  "casilla": "Revisi_n_Data_e_Incidentes__c",
  "completo": "Se_Completo_Revisi_n_Data_e_Incidentes__c",
  "requeridos": [
   "Fecha_Revisi_n_Data_e_Incidentes__c",
   "Duraci_n_Revisi_n_Data_e_Incidentes__c",
   "Comentarios_Revis_n_Data_e_Incidentes__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h"
  ],
  "campos": [
   {
    "api": "Fecha_Revisi_n_Data_e_Incidentes__c",
    "etiqueta": "Fecha Revisión Data e Incidentes",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Revisi_n_Data_e_Incidentes__c",
    "etiqueta": "Duración Revisión Data e Incidentes",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Revis_n_Data_e_Incidentes__c",
    "etiqueta": "Comentarios Revisón Data e Incidentes",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "AjustesActualizaciones",
  "nombre": "Ajustes y actualizaciones del proceso",
  "grupo": "Ejecución",
  "asunto": "Ajustes y actualizaciones del proceso completado",
  "casilla": "Ajustes_y_actualizaciones_del_proceso__c",
  "completo": "Se_completo_ajustes_y_actulizaciones__c",
  "requeridos": [
   "Fecha_Actualizaciones_y_Ajustes__c",
   "Duraci_n_ajustes_y_actulizaciones__c",
   "Comentarios_Ajustes_y_actulizaciones__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Actualizaciones_y_Ajustes__c",
    "etiqueta": "Fecha Ajustes y Actualizaciones",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_ajustes_y_actulizaciones__c",
    "etiqueta": "Duración ajustes y actualizaciones",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Ajustes_y_actulizaciones__c",
    "etiqueta": "Comentarios Ajustes y actualizaciones",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "EnvioEstatus",
  "nombre": "Envío de estatus del proceso",
  "grupo": "Ejecución",
  "asunto": "Envío de estatus del proceso completado",
  "casilla": "Env_o_de_estatus_del_proceso__c",
  "completo": "Se_completo_envio_de_estatus__c",
  "requeridos": [
   "Fecha_envio_de_estatus_del_proceso__c",
   "Duracion_envio_estatus_del_proceso__c",
   "Comentarios_Envio_Estatus__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_envio_de_estatus_del_proceso__c",
    "etiqueta": "Fecha envio de estatus del proceso",
    "tipo": "date"
   },
   {
    "api": "Duracion_envio_estatus_del_proceso__c",
    "etiqueta": "Duracion envio estatus del proceso",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Envio_Estatus__c",
    "etiqueta": "Comentarios envió estatus",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "AnalisisDatos",
  "nombre": "Análisis de datos",
  "grupo": "Análisis",
  "asunto": null,
  "casilla": "An_lisis_de_Datos__c",
  "completo": null,
  "requeridos": [],
  "generaActividad": false,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_An_lisis_de_datos__c",
    "etiqueta": "Fecha Análisis de datos",
    "tipo": "date"
   },
   {
    "api": "Se_Completo_Analisis_de_Datos__c",
    "etiqueta": "Se Completo Analisis de Datos",
    "tipo": "boolean"
   },
   {
    "api": "Duraci_n_An_lisis_de_Datos__c",
    "etiqueta": "Duración Análisis de Datos",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "SeguimientoCandidatos",
  "nombre": "Seguimiento a candidatos",
  "grupo": "Análisis",
  "asunto": "Habilitamiento completado: Seguimiento a candidatos",
  "casilla": "Seguimiento_a_candidatos__c",
  "completo": null,
  "requeridos": [
   "Fecha_Hab_Seguimiento_a_Candidatos__c",
   "Liga_Sesion_Seguimiento_a_Candidatos__c",
   "Lista_de_participantes_Seguimiento_Candi__c",
   "Comentarios_Seguimiento_a_Candidatos__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Etegrity"
  ],
  "campos": [
   {
    "api": "Fecha_Hab_Seguimiento_a_Candidatos__c",
    "etiqueta": "Fecha Hab.Seguimiento a Candidatos",
    "tipo": "date"
   },
   {
    "api": "Liga_Sesion_Seguimiento_a_Candidatos__c",
    "etiqueta": "Liga Sesión Seguimiento a Candidatos",
    "tipo": "url"
   },
   {
    "api": "Lista_de_participantes_Seguimiento_Candi__c",
    "etiqueta": "Lista de participantes Seguimiento Candi",
    "tipo": "textarea"
   },
   {
    "api": "Comentarios_Seguimiento_a_Candidatos__c",
    "etiqueta": "Comentarios Seguimiento a Candidatos",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "TemporadaEvaluacion",
  "nombre": "Temporada de evaluación",
  "grupo": "Análisis",
  "asunto": "Temporada de Evaluación completado",
  "casilla": "Temporada_de_Evaluaci_n__c",
  "completo": "Se_completo_Temporada_de_Evaluaci_n__c",
  "requeridos": [
   "Fecha_Temporada_de_Evaluaci_n__c",
   "Duraci_n_Temporada_de_Evaluaci_n__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Temporada_de_Evaluaci_n__c",
    "etiqueta": "Fecha Temporada de Evaluación",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Temporada_de_Evaluaci_n__c",
    "etiqueta": "Duración Temporada de Evaluación",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "RecoleccionAnalisis",
  "nombre": "Recolección y análisis de información",
  "grupo": "Análisis",
  "asunto": "Recolección y análisis de información completado",
  "casilla": "Recolecci_n_y_an_lisis_de_informaci_n__c",
  "completo": "Se_completo_Recolecci_n_y_An_lisis__c",
  "requeridos": [
   "Fecha_Recoleccion_y_Analisis__c",
   "Duraci_n_Recolecci_n_y_An_lisis_de_Infor__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evaluatest IA operativos",
   "Evaluatest",
   "Nuevo Evaluatest",
   "Evaluatest Operativos",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Recoleccion_y_Analisis__c",
    "etiqueta": "Fecha Recoleccion y Analisis",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Recolecci_n_y_An_lisis_de_Infor__c",
    "etiqueta": "Duración Recolección y Análisis de Infor",
    "tipo": "double"
   }
  ]
 },
 {
  "clave": "DescargaMatriz",
  "nombre": "Descarga de matriz de resultados",
  "grupo": "Análisis",
  "asunto": "Descarga de matriz de resultados completado",
  "casilla": "Descarga_de_matriz_de_resultados__c",
  "completo": "Se_completo_descarga_matriz_resultados__c",
  "requeridos": [
   "Fecha_descarga_matriz_resultados__c",
   "Comentarios_descarga_matriz_resultados__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_descarga_matriz_resultados__c",
    "etiqueta": "Fecha descarga matriz resultados",
    "tipo": "date"
   },
   {
    "api": "Comentarios_descarga_matriz_resultados__c",
    "etiqueta": "Comentarios descarga matriz resultados",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "ElaboracionPPT",
  "nombre": "Elaboración PPT o Data Explorer",
  "grupo": "Análisis",
  "asunto": "Elaboración PPT o Data Explorer completado",
  "casilla": "Elaboracion_ppt_o_Data_explorer__c",
  "completo": "Se_Completo_Elaboraci_n_DE_o_PPT__c",
  "requeridos": [
   "Fecha_Elaboraci_n_DE_o_PPT__c",
   "Duraci_n_Elaboraci_n_DE_o_PPT__c",
   "Comentarios_Elaboracion_DE_o_PPT__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ Clima",
   "Entorno+ NOM035",
   "Entorno+ Clima y NOM035",
   "Exprésate24h",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Elaboraci_n_DE_o_PPT__c",
    "etiqueta": "Fecha Elaboración DE o PPT",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Elaboraci_n_DE_o_PPT__c",
    "etiqueta": "Duración Elaboración DE o PPT",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Elaboracion_DE_o_PPT__c",
    "etiqueta": "Comentarios Elaboracion DE o PPT",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "DescargaReportes",
  "nombre": "Descarga de reportes individuales",
  "grupo": "Análisis",
  "asunto": "Descarga de reportes individuales completado",
  "casilla": "Descarga_de_reportes_individuales__c",
  "completo": "Se_completo_descarga_reportes_individual__c",
  "requeridos": [
   "Fecha_Descarga_reportes_individuales__c",
   "Comentarios_reportes_individuales__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Descarga_reportes_individuales__c",
    "etiqueta": "Fecha Descarga reportes individuales",
    "tipo": "date"
   },
   {
    "api": "Comentarios_reportes_individuales__c",
    "etiqueta": "Comentarios reportes individuales",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "Resultados",
  "nombre": "Resultados",
  "grupo": "Análisis",
  "asunto": "Resultados completado",
  "casilla": "Resultados__c",
  "completo": "Se_complet_Resultados__c",
  "requeridos": [
   "Fecha_Resultados__c",
   "Duraci_n_Resultados__c",
   "Comentarios_Resultados_Entorno__c"
  ],
  "generaActividad": true,
  "soluciones": [
   "Entorno+",
   "Entorno+ NOM035",
   "Entorno+ Clima",
   "Entorno+ Clima y NOM035",
   "Exprésate24h",
   "Evou"
  ],
  "campos": [
   {
    "api": "Fecha_Resultados__c",
    "etiqueta": "Fecha Resultados",
    "tipo": "date"
   },
   {
    "api": "Duraci_n_Resultados__c",
    "etiqueta": "Duración Resultados",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Resultados_Entorno__c",
    "etiqueta": "Comentarios Resultados Entorno",
    "tipo": "textarea"
   }
  ]
 },
 {
  "clave": "Recomendaciones",
  "nombre": "Recomendaciones",
  "grupo": "Otras",
  "asunto": "Recomendaciones completado",
  "casilla": "Recomendaciones__c",
  "completo": "Se_complet_Recomendaciones__c",
  "requeridos": [
   "Fecha_Recomendaciones__c",
   "Duracion_Recomendaciones__c",
   "Comentarios_Recomendaciones__c"
  ],
  "generaActividad": true,
  "soluciones": [],
  "campos": [
   {
    "api": "Fecha_Recomendaciones__c",
    "etiqueta": "Fecha Recomendaciones",
    "tipo": "date"
   },
   {
    "api": "Duracion_Recomendaciones__c",
    "etiqueta": "Duracion Recomendaciones",
    "tipo": "double"
   },
   {
    "api": "Comentarios_Recomendaciones__c",
    "etiqueta": "Comentarios Recomendaciones",
    "tipo": "textarea"
   }
  ]
 }
];
