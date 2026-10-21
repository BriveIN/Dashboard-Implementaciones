# Panel de implementaciones y proyectos (prototipo)

Componente LWC `implementacionesPanel` sobre `Delivery_y_Desarrollo__c` ("Implementación"). Tres vistas: **Vista general | Implementaciones | Proyectos** (se separan con `Tipo_de_Ejecucion__c`). Diseño visual tomado de la maqueta `diseno-de-panel-de-implementaciones/` (tokens y componentes portados a los CSS de los LWC; la maqueta es solo referencia y no se despliega).

## Ver en local

```bash
npm install
npm run dev        # http://localhost:3000, recarga sola al guardar
```

- `http://localhost:3000/` datos ficticios (`preview/mocks/datos.js`).
- `http://localhost:3000/?datos=reales` datos reales de Brive (ver abajo).
- `?error=1` muestra cómo se ve un error de Apex.
- **Exportar CSV** sigue la estructura de `Modelo_Capacitaciones_OKR(Pagadas).csv`: fila de grupos + fila de columnas, separador `;`, coma decimal y fechas `dd-mmm-aaaa`, con las columnas de Implementaciones (35, una fila por registro filtrado). Va en UTF-8 con BOM para que Excel respete los acentos.
- `force-app/.../lwc/`: `implementacionesPanel` (panel), `implementacionesDetalle` (detalle expandible de cada fila), `implementacionesBarras` (barras) e `implementacionesUtil` (etapas, umbrales de horas y formatos).
- `preview/stubs` y `preview/mocks`: versiones simuladas de `lightning-*`, navegación, recursos y Apex.

## Datos reales en local (solo lectura)

```bash
python3 scripts/datos_reales.py Brive    # -> preview/datos-reales.json (no se versiona)
npm run dev                              # http://localhost:3000/?datos=reales
rm preview/datos-reales.json             # borrar la copia local
```

El script usa las mismas reglas que `ImplementacionesPanelController`. Si cambian los flows, regenera `scripts/secciones.json` (secciones, casillas, campos y soluciones salen del flow `Delivery_y_Desarrollo_Generar_Actividades` y de la página de registro) y copia su contenido a `SECCIONES_JSON` del Apex y a `preview/mocks/secciones.js`.

## Reglas de datos

- **Corte: 1 de octubre de 2026.** Lo aplica Apex (`FECHA_INICIO_DATOS`) en la consulta: entra un registro con alguna fecha de trabajo desde ese día (creación, última etapa, Kickoff acordado o real) o con una actividad fechada desde ese día; y de él solo se devuelven actividades, cambios y tiempos desde ese día. Los filtros de fecha no dejan elegir fechas anteriores.
- **Etapas.** `Recepción de Insumos` se muestra como **En proceso**. No entran los valores heredados (Back log, Entrega del Proyecto, Cancelada/o, No aplica, En Proceso) ni los registros sin tipo.
- **Producto ≠ solución.** La solución es el picklist `Soluci_n_adquirida__c`; el producto sale de las líneas de producto de la oportunidad del registro (`OpportunityLineItem` → `Product2.Name`), sin repetir. Un registro puede tener varios; la distribución "Por producto" cuenta cuántos registros incluyen cada uno. Si el usuario no ve productos, el panel sigue funcionando sin esa distribución.
- **Estatus ≠ actividades.** El estatus es `Etapa_del_Proyecto__c`. Las actividades (Task) confirman qué sección se completó; cada una se liga a su sección por el asunto que arma el flow (`{Sección} completado - {Cuenta}`).
- **Horas: no se calcula nada.** Contratadas = `Horas_Contratadas__c` (flow `Horas_Contratadas_desde_Productos`, suma de productos de la oportunidad con medición HORAS); consumidas = `Horas__c` (flow `Horas_Consumidas_Delivery`); restantes = `Horas_Disponibles__c`. Las horas por actividad se leen de "Duracion (horas)" en el resumen de la Task.
- **Controles de cambio** = sección "Control de Cambios" de la página del registro: historiales `Reprogramacion_*` ("anterior -> nuevo (fecha)"), pausas y tiempo por etapa (`Historial_*`). Solo se cuentan cambios registrados desde el corte.
- **Ejecución / Análisis**: las casillas y la solución para la que se ofrece cada una salen de la página de registro. Tipo (Implementación o Proyecto) no cambia qué casillas se ofrecen.

## Desplegar a Brive (visible solo para quien tenga el permiso)

EvaTest hoy es una copia vieja del objeto (55 campos, sin las secciones ni los flows): para validar ahí primero hay que sincronizar su metadata. La org con el esquema vigente es **Brive**.

```bash
# 1. validar sin instalar (compila y corre solo la prueba del panel)
sf project deploy validate --source-dir force-app --target-org Brive \
  --test-level RunSpecifiedTests --tests ImplementacionesPanelControllerTest --wait 30
# 2. instalar lo validado (usa el Id que devuelve el paso 1)
sf project deploy quick --job-id <Id de la validación> --target-org Brive --wait 30
# 3. dar acceso solo al usuario de la sesión
sf org assign permset --name Panel_Implementaciones --target-org Brive
```

Retirarlo: quitar la asignación del permiso y desplegar `manifest/retirar` con `--post-destructive-changes`, igual que en Capacitaciones.

## Reportes en Excel (Implementaciones y Proyectos)

Botón **Descargar reportes** en el encabezado del panel v2 (`implementacionesDescargaV2`), con menú Implementaciones / Proyectos. Cada descarga usa los filtros que el panel tiene en ese momento; el rango de fechas se aplica siempre a `CreatedDate` (inclusivo, hora de Ciudad de México). Sin fechas: desde el corte del panel (1-oct-2026) hasta hoy.

- Apex: `ReportesImplementacionesController.getReporteImplementaciones` (hoja "Por fecha creación") y `getReporteProyectos` (hoja "Fecha de creación"). Una consulta `USER_MODE` por página de 1,000 registros, paginada por (CreatedDate, Id); el LWC junta las páginas.
- Excel: `generarXlsxTabla` en `planTrabajoXlsx` (mismo módulo del Plan de trabajo, sin dependencias). Prueba local: `node scripts/probar_reporte_xlsx.mjs <salida.xlsx>` y `node scripts/reporte_desde_json.mjs <respuesta.json> <carpeta>`.
- Los encabezados son las etiquetas de **producción**; el sandbox tiene tres etiquetas viejas (Fecha Inicio Implementación, Fecha estimada fin implementación/proyecto, Fecha Kick Off), por eso el mapeo es por nombre de API.
- Falta (siguiente etapa): Reporte 3 de Capacitaciones.

## Pendiente

- **Umbrales de horas por confirmar** (`UMBRAL_BAJO` 25% y `UMBRAL_CERCANO` 90% en `implementacionesUtil`): no existen en Salesforce.
- La prueba Apex no se ha corrido en una org (esta etapa fue solo local).
- Qué fecha define el corte para registros anteriores con actividad nueva (hoy: cualquier fecha de trabajo o actividad desde el 1 de octubre).
