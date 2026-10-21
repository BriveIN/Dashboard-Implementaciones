# Análisis del Panel de implementaciones (producción, Brive)

Elaborado leyendo el código desplegado: el Apex, los 5 componentes LWC y los metadatos. No se abrió el panel en la org, así que no se confirmó cómo se ve con datos reales.

## 1. Objetivo del panel

Un solo panel para que consultores, postventa, gerencia y dirección entiendan qué pasa dentro de cada implementación y proyecto. Cubre cuatro usos: detectar lo atrasado, medir cumplimiento, repartir carga y exportar cifras.

El recorrido que sigue es: **indicador → registro → etapa → sección → actividad → resumen y datos → horas y controles de cambio**. Se llega de la cifra al registro en dos clics. Es solo lectura.

## 2. Qué se necesita para que se vea

### Acceso
- **Pestaña:** `Panel_de_Implementaciones`, que apunta a una página de aplicación (`AppPage`) con el componente `implementacionesPanel` en la región `main`.
- **Permiso:** el usuario necesita el permission set `Panel_Implementaciones`. Da la pestaña y acceso a la clase Apex. Hoy está asignado solo al usuario de la sesión de deploy.
- **Datos:** la clase corre `with sharing` y `USER_MODE`, así que cada usuario ve solo los registros y campos que ya tiene permitidos.

### Recursos
- **Logo:** el static resource `QSA_BriveLogo`.
- **Apex:** `ImplementacionesPanelController.obtenerImplementaciones(incluirPruebas)`. Es cacheable y hace una sola llamada que trae todo.
- **Fuentes de datos:**
  - Objeto `Delivery_y_Desarrollo__c`: unos 150 campos, entre ellos los de las secciones, los `Reprogramacion_*` y los `Historial_*`.
  - Objeto `Task`: usa `WhatId`, `Subject`, `Status`, `ActivityDate`, `Description` y `Link_a_video_de_sesion__c`.
  - Los flows que llenan esos datos: `Horas_Contratadas_desde_Productos`, `Horas_Consumidas_Delivery` y `Delivery_y_Desarrollo_Generar_Actividades`.

### Reglas que filtran lo que entra
1. **Corte:** 1 de octubre de 2026, aplicado en Apex. Entra un registro si tiene alguna fecha de trabajo o actividad desde ese día. Las fechas consideradas son creación, último cambio de etapa, Kickoff acordado, Kickoff real o una Task fechada desde el corte. De cada registro solo se devuelven actividades, cambios y tiempos desde ese día.
2. **Tipo:** `Tipo_de_Ejecucion__c` debe ser `Implementación` o `Proyecto`. Los 136 registros sin tipo no entran.
3. **Etapa:** solo 7 valores vigentes de `Etapa_del_Proyecto__c`. "Recepción de Insumos" se muestra como "En proceso". Los valores heredados (Back log, Entrega del Proyecto, Cancelada/o, No aplica, En Proceso) no entran.
4. **Cuenta de pruebas:** se excluyen las cuentas con "patito" en el nombre, salvo que se active el interruptor.
5. **Preferencias:** se guardan en `localStorage` (si el navegador lo permite) las secciones abiertas o cerradas y el interruptor de pruebas.

## 3. Estructura de la pantalla, de arriba abajo

### 3.1 Encabezado
- Logo, título "Implementaciones y proyectos" y "Actualizado a las HH:MM · registros desde el 1 de octubre de 2026".
- Botón **Exportar CSV**, que exporta los registros filtrados en 16 columnas.
- Botón de **actualizar**, que vuelve a llamar a Apex.

### 3.2 Filtros
La barra siempre muestra el periodo, los chips de filtros activos (cada uno con su "x"), "Quitar todos" y el botón Cambiar/Ocultar filtros. Al abrirla aparecen:
- **Aviso del corte** e interruptor "Cuenta de pruebas: oculta/visible".
- **8 combos:** Estatus, Responsable (con opción "Sin responsable"), Asociado, Cuenta comercial, Solución adquirida, Controles de cambio (con/sin), Consumo de horas y Actividades realizadas (por grupo).
- **Periodo:** "Rango según" (creación, Kickoff acordado, Kickoff o último cambio de etapa), más Desde y Hasta. No deja elegir fechas anteriores al corte.
- Las opciones de cuenta, responsable, asociado y solución salen de los registros de la vista activa.

### 3.3 Estados de la pantalla
Un error de Apex se muestra como alerta. Mientras carga, aparece un spinner. Si no hay datos desde el corte, hay un aviso. Si los filtros no dejan ningún resultado, hay otro aviso con el botón "Quitar todos".

### 3.4 Pestañas de vista
**Vista general | Implementaciones | Proyectos**, cada una con su conteo. Se separan por `Tipo_de_Ejecucion__c`.

### 3.5 Indicadores (4 tarjetas)
| Tarjeta | Qué cuenta | ¿Interactiva? |
|---|---|---|
| Registros | Registros de la vista filtrada | No |
| Actividades generadas | Suma de Tasks (secciones completadas desde el corte) | No |
| Registros con controles de cambio | Registros con al menos 1 cambio de fecha | Sí, filtra y despliega la lista |
| Controles de cambio | Suma de cambios de fechas de hitos | No |

### 3.6 Estatus actual
- **Camino de etapas:** botones con el conteo de registros en No iniciada, Agendada, Kickoff, En proceso, Entrega final e Implementación finalizada. "En pausa" aparece aparte, como condición especial.
- **Notas de actividad:** Kickoff, En proceso y Entrega final muestran "N con su actividad".
- **Cuatro avisos "Requiere atención":**
  - Horas excedidas.
  - Próximos a agotar horas (90% o más, sin llegar al 100%).
  - Con controles de cambio.
  - Sin responsable.
- **Nota al pie:** el estatus no depende de las actividades. Un registro puede estar en una etapa sin haber completado todas sus secciones.
- Cada botón filtra y despliega los registros en una lista justo debajo.

### 3.7 Dónde se concentran
Cuatro gráficas de barras horizontales (top 8), todas seleccionables: **por solución, por responsable** (con barra "Sin responsable"), **por asociado y por cuenta comercial**. Tocar una barra filtra; volver a tocarla quita el filtro. Cada gráfica se calcula sin su propio filtro, para poder cambiar de selección sin quitarla antes.

### 3.8 Registros (tablas de detalle)
Hay una tabla plegable por tipo: "Detalle de Implementaciones" y "Detalle de Proyectos". En la vista general salen ambas. Cada una trae un buscador (nombre, cuenta, responsable o solución), el conteo "X de Y", encabezados ordenables y "Mostrar más" de 12 en 12. Por defecto se ordenan por etapa.

**14 columnas:** Nombre (con etiqueta "Prueba" si aplica), Cuenta comercial, Responsable (en rojo si falta), Asociado, Solución, Estatus (chip), Kickoff acordado, Kickoff, Contratadas, Consumidas, Restantes (en rojo si es negativo), % consumido (barra, porcentaje y estado), Actividades y Cambios (en alerta si hay).

Al expandir una fila se abre el **detalle del registro** (sección 4).

### 3.9 Análisis complementario (3 bloques plegados por defecto)

**A. Actividades**
- 5 tarjetas por grupo (Kickoff, Planeación, Ejecución, Análisis, Entrega final), que filtran.
- Barras por sección, por etapa y por solución (top 10).
- Lista "Qué se capturó en cada actividad":
  - Va de la más reciente a la más antigua y tiene selector de grupo.
  - Cada actividad trae asunto, sección, etapa, fecha, horas y vista previa del comentario.
  - Al abrirla muestra el resumen completo, el enlace al registro y la liga de la sesión.
  - Carga de 8 en 8.

**B. Horas contratadas, consumidas y restantes**
- 6 estados de consumo con conteo:
  - Bajo consumo (menos de 25%).
  - Consumo normal.
  - Próximo a agotar (de 90% a menos de 100%).
  - Completo.
  - Excedido.
  - Sin horas contratadas.
- Top 8 de registros más avanzados en el consumo, coloreados por estado.
- Horas de las actividades por etapa y por sección.
- Una línea de referencia con la suma global.

**C. Tiempos y controles de cambio**
- **Duración desde el Kickoff:** promedio de días para finalizadas y abiertas, por tipo. Para las finalizadas mide hasta el último cambio de etapa; para las abiertas, hasta hoy.
- **Tiempo por etapa:** horas acumuladas según los historiales.
- **Hitos afectados:** cuántas veces se cambió la fecha de cada hito.
- **Registros con más cambios.**
- **Mayores desviaciones de fechas:** tabla con las 8 mayores. Un número positivo es atraso y uno negativo es adelanto.

## 4. Detalle de un registro (`implementacionesDetalle`)

Aparece debajo de la fila, o dentro de una lista de indicador. Trae el botón "Abrir registro", que navega al registro estándar de Salesforce, y el de cerrar. Sus secciones son:

1. **Información general:** tipo, etapa, cuenta, responsable, asociado, propietario, contacto, solución, póliza, Kickoff acordado y real, último cambio de etapa y creación.
2. **Horas:**
   - Cadena Contratadas → Consumidas → Restantes → % utilizado, con barra de progreso y chip de estado.
   - Tabla de actividades que consumieron horas.
   - Aviso de las horas no ligadas a una actividad fechada desde el corte.
3. **Avance por etapa y sección:**
   - Resumen por grupo, en el orden Kickoff, Planeación, Ejecución, Análisis, Otras y Entrega final.
   - Cada sección se muestra con su estado: Completa con actividad, Completa sin actividad, No genera actividad, Con actividad, Incompleta en captura o Sin datos.
   - Cada sección abre "Datos capturados" y "Actividad generada".
   - Al final, las secciones disponibles para esa solución que no se seleccionaron.
4. **Actividades:** todas, con su resumen y la opción de abrir o cerrar todas.
5. **Controles de cambio:**
   - Tabla con hito, fecha anterior, fecha nueva, desviación y fecha de registro.
   - Pausas: contador, tiempo total, motivo e historial.
   - Tiempo por etapa.

## 5. Componentes

| Componente | Qué hace |
|---|---|
| `implementacionesPanel` | Contenedor principal: carga, filtros, indicadores, estatus, distribución, tablas y análisis complementario |
| `implementacionesDetalle` | Detalle expandible de cada registro |
| `implementacionesLista` | Lista de registros que explica un indicador, desplegada justo debajo de él |
| `implementacionesBarras` | Barras horizontales reutilizables (seleccionables o no) |
| `implementacionesUtil` | Etapas, umbrales de horas, estados de consumo, formatos y lectura del resumen de la Task |

## 6. De dónde sale cada dato

| Se muestra | Fuente | Cómo se obtiene |
|---|---|---|
| Etapa | `Etapa_del_Proyecto__c` | Mapeada a 7 etapas |
| Horas contratadas, consumidas y restantes | `Horas_Contratadas__c`, `Horas__c`, `Horas_Disponibles__c` | Tal cual; no se recalculan |
| Restantes y % en tabla y detalle | Calculado en pantalla | Contratadas − consumidas; consumidas ÷ contratadas |
| Secciones (27) | Casillas, campos de "completo" y campos requeridos | Se definen en un JSON generado a partir de los flows y la página de registro |
| Disponibilidad de una sección | Solución adquirida | Cada sección declara para qué soluciones aplica |
| Actividades | Tasks ligadas al registro | Se ligan a su sección por el asunto "{Sección} completado - {Cuenta}" |
| Horas por actividad | Texto "Duracion (horas)" de la descripción | Se extrae con una expresión regular |
| Controles de cambio | 10 campos `Reprogramacion_*` | Se leen líneas "anterior -> nuevo (fecha)" |
| Tiempo por etapa | 6 campos `Historial_*` | Se leen líneas "paso a … (n h)" |
| Pausas | `Contador_pausas__c`, `Tiempo_total_en_pausa__c`, `Historial_de_pausas__c`, `Evidencia_de_Pausa__c` | Tal cual; solo se muestran las líneas con fecha desde el corte |

## 7. Puntos a tener presentes

- **Umbrales sin confirmar:** 25% y 90% no existen en Salesforce. Son una suposición, y el panel lo avisa en pantalla.
- **Dependencia del asunto de la Task:** si un flow cambia el texto del asunto, la actividad queda como "Sin sección identificada".
- **Mismo mecanismo para las horas de actividad:** si cambia el formato de la descripción ("Duracion (horas)"), esas horas dejan de leerse.
- **Texto del detalle que no coincide con el código:** la nota de Horas dice que las consumidas son "horas registradas en las actividades". En realidad vienen de `Horas__c`, que calcula un flow.
- **Duración desde el Kickoff:** usa la fecha del navegador para "hoy".
- **Caso sin probar:** el caso "sin tipo" quedó fuera de las pruebas Apex; no entra al panel porque la consulta filtra por tipo.
- **Dos cosas por definir con negocio:** qué fecha define el corte para registros anteriores con actividad nueva, y los umbrales de horas.
