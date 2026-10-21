# Product

## Platform

web (Lightning, App Page / Home Page)

## Users

Personal interno de Brivé que da seguimiento a implementaciones y proyectos vendidos: consultores responsables y asociados, Clientes Felices / postventa, gerencia y dirección. Mismos cuatro usos que el panel de Capacitaciones: detectar lo atrasado, medir cumplimiento, repartir carga y exportar cifras.

## Product Purpose

Un solo panel para entender qué ocurre dentro de cada implementación y proyecto y consultar la evidencia registrada en Salesforce: indicador → registro → etapa → sección → actividad → resumen y datos → horas y controles de cambio.

## Reglas confirmadas

- Corte de información: 1 de octubre de 2026, parte de la consulta (no un filtro visual).
- Implementaciones y Proyectos son el mismo objeto (`Delivery_y_Desarrollo__c`), separados por `Tipo_de_Ejecucion__c`.
- Estatus (etapa actual) no es lo mismo que actividades completadas. `Recepción de Insumos` se muestra como "En proceso"; los valores heredados no entran. "En pausa" es una condición aparte.
- Horas: se toman de los campos que ya llenan los flows; no se recalculan.
- Controles de cambio: sección "Control de Cambios" de la página del registro.

## Abierto, por confirmar

- Umbrales de consumo de horas (bajo < 25%, próximo a agotar ≥ 90%): no están definidos en Salesforce.
- Registros anteriores al corte con actividad nueva: hoy entran si tienen alguna fecha de trabajo o actividad desde el 1 de octubre.
- 136 registros no tienen `Tipo_de_Ejecucion__c`: no se pueden clasificar y no entran.

## Brand Commitments

Marca Brivé (`QSA_BriveLogo`), mismo diseño y vocabulario que el panel de Capacitaciones. Español de México.

## Product Principles

1. La cifra tiene que coincidir con el registro; si un dato no existe en Salesforce, decirlo.
2. El contenido de cada actividad es evidencia: se muestra completo, no solo se cuenta.
3. De la cifra al registro en dos clics.
4. Lo urgente primero; mantenerlo simple de sostener.
