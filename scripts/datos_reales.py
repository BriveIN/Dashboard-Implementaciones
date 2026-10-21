#!/usr/bin/env python3
"""
Lee las implementaciones y proyectos reales de la org (solo lectura, con `sf data query`) y escribe
preview/datos-reales.json con la misma forma y las mismas reglas que ImplementacionesPanelController.
Así el visor local (http://localhost:3000/?datos=reales) muestra cifras reales sin desplegar nada.

Uso:  python3 scripts/datos_reales.py [alias_org]      (por defecto: Brive)
El archivo resultante contiene datos de clientes: no se versiona (.gitignore) y se borra con
`rm preview/datos-reales.json`.

Corte de información: 2026-10-01. Solo entran registros con alguna fecha de trabajo o actividad desde ese día, y de
ellos solo se guardan las actividades, cambios y tiempos fechados desde ese día (igual que Apex).
"""
import json
import os
import re
import subprocess
import sys

ORG = sys.argv[1] if len(sys.argv) > 1 else 'Brive'
RAIZ = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SALIDA = os.path.join(RAIZ, 'preview', 'datos-reales.json')
SECCIONES = json.load(open(os.path.join(RAIZ, 'scripts', 'secciones.json')))  # mismo mapeo que el Apex
CORTE = '2026-10-01'

# valor real del picklist -> etapa del panel. "Recepción de Insumos" se muestra como "En proceso".
# Los valores heredados (Back log, Entrega del Proyecto, Cancelada/o, No aplica, En Proceso) no entran.
ETAPAS = {'No iniciada': 'noIniciada', 'Agendada': 'agendada', 'Kick Off': 'kickoff', 'En Pausa': 'enPausa',
          'Recepción de Insumos': 'enProceso', 'Entrega Final': 'entregaFinal', 'Implementación Finalizada': 'finalizada'}
REPROGRAMACIONES = {
    'Reprogramacion_Inicio_Kick_Off__c': 'Inicio de Kickoff', 'Reprogramacion_Fin_Kick_Off__c': 'Fin de Kickoff',
    'Reprogramacion_Recepcion_Insumos__c': 'Recepción de insumos', 'Reprog_Fecha_Acordada_Config__c': 'Inicio de configuración',
    'Reprogramacion_Final_Config__c': 'Final de configuración', 'Reprogramacion_Recibo_VoBo_Cliente__c': 'Recibo de VoBo del cliente',
    'Reprogramacion_Envio_Acta_Entrega__c': 'Envío del acta de entrega', 'Reprogramacion_Sesion_Final_Cliente__c': 'Sesión final con el cliente',
    'Reprogramacion_Sesion_Final_Real__c': 'Sesión final real', 'Reprogramacion_Fin_Implement_Real__c': 'Fin real de la implementación'}
HISTORIAL_ETAPAS = {
    'Historial_No_Iniciada__c': 'No iniciada', 'Historial_Agendada__c': 'Agendada', 'Historial_Kick_Off__c': 'Kickoff',
    'Historial_Recepcion_de_Insumos__c': 'En proceso', 'Historial_Entrega_Final__c': 'Entrega final',
    'Historial_Implementacion_Finalizada__c': 'Finalizada'}
CAMBIO = re.compile(r'^(.*?)\s*->\s*(.*?)\s*\((\d{4}-\d{2}-\d{2})[^)]*\)\s*$')
PASO_ETAPA = re.compile(r'^(\d{4}-\d{2}-\d{2})[^:]*:?\d*:?\d*Z?: paso a .+? \(([0-9.]+) h\)\s*$')
HORAS_ACTIVIDAD = re.compile(r'Duracion \(horas\):\s*([0-9]+(?:[.,][0-9]+)?)')
FECHA = re.compile(r'(\d{4}-\d{2}-\d{2})')


def consultar(soql):
    r = subprocess.run(['sf', 'data', 'query', '-o', ORG, '--json', '-q', soql],
                       capture_output=True, text=True, env={**os.environ, 'SF_DISABLE_AUTOUPDATE': 'true'})
    texto = r.stdout[r.stdout.find('{'):]
    datos = json.loads(texto)
    if datos.get('status') != 0:
        sys.exit(f"Error en la consulta: {datos.get('message')}")
    return datos['result']['records']


def partir(valor):
    return [v.strip() for v in (valor or '').split(';') if v.strip() and v.strip() != 'N/A']


def lineas(texto):
    return [l.strip() for l in (texto or '').split('\n') if l.strip()]


def lleno(v):
    if v is None:
        return False
    if isinstance(v, bool):
        return v
    if isinstance(v, str):
        return v.strip() != ''
    return True


def texto_valor(v):
    if isinstance(v, bool):
        return 'Sí' if v else 'No'
    if isinstance(v, float) and v == int(v):
        return str(int(v))
    return str(v)


def dias_entre(a, b):
    from datetime import date
    try:
        return (date.fromisoformat(b) - date.fromisoformat(a)).days
    except ValueError:
        return None


def seccion_de(asunto):
    mejor, largo = None, 0
    for d in SECCIONES:
        for a in ([d['asunto']] if d.get('asunto') else []) + d.get('asuntosAlternos', []):
            if (asunto or '').startswith(a + ' - ') and len(a) > largo:
                mejor, largo = d, len(a)
    return mejor


campos = {'Id', 'Name', 'Tipo_de_Ejecucion__c', 'Etapa_del_Proyecto__c', 'Cuenta_Comercial__c', 'Cuenta_Comercial__r.Name',
          'Nombre_Comercial_de_la_Cuenta__c', 'Oportunidad__c', 'Oportunidad__r.Name', 'toLabel(Responsable_de_la_Implementaci_n__c)',
          'toLabel(Consultor_Asociado__c)', 'toLabel(Soluci_n_adquirida__c)', 'Poliza_Adquirida__c', 'Usuario__r.Name',
          'Contacto__r.Name', 'Orden_de_Compra__c', 'CreatedDate', 'Fecha_de_Estatus__c', 'Fecha_acordada__c',
          'Fecha_inicio_Kick_Off__c', 'Horas_Contratadas__c', 'Horas__c', 'Horas_Disponibles__c', 'Contador_pausas__c',
          'Tiempo_total_en_pausa__c', 'Historial_de_pausas__c', 'Evidencia_de_Pausa__c'}
for s in SECCIONES:
    if s['casilla']: campos.add(s['casilla'])
    if s['completo']: campos.add(s['completo'])
    campos.update(s['requeridos'])
    campos.update(c['api'] for c in s['campos'])
campos.update(REPROGRAMACIONES)
campos.update(HISTORIAL_ETAPAS)

tareas = {}
for t in consultar("SELECT Id, WhatId, Subject, Status, ActivityDate, Description, Link_a_video_de_sesion__c FROM Task"
                   f" WHERE What.Type = 'Delivery_y_Desarrollo__c' AND ActivityDate >= {CORTE} ORDER BY ActivityDate ASC, CreatedDate ASC"):
    tareas.setdefault(t['WhatId'], []).append(t)

etapas = ", ".join(f"'{e}'" for e in ETAPAS)
con_actividad = ", ".join(f"'{i}'" for i in tareas) or "'000000000000000'"
registros = consultar(
    f"SELECT {', '.join(sorted(campos))} FROM Delivery_y_Desarrollo__c"
    f" WHERE Tipo_de_Ejecucion__c IN ('Implementación','Proyecto') AND Etapa_del_Proyecto__c IN ({etapas})"
    f" AND (CreatedDate >= {CORTE}T00:00:00Z OR Fecha_de_Estatus__c >= {CORTE}T00:00:00Z OR Fecha_acordada__c >= {CORTE}"
    f" OR Fecha_inicio_Kick_Off__c >= {CORTE} OR Id IN ({con_actividad})) ORDER BY CreatedDate DESC")

# productos de la oportunidad de cada registro (sin repetir), igual que consultarProductos del Apex
productos = {}
oportunidades = sorted({r['Oportunidad__c'] for r in registros if r.get('Oportunidad__c')})
for ini in range(0, len(oportunidades), 150):
    ids = ", ".join(f"'{i}'" for i in oportunidades[ini:ini + 150])
    for l in consultar(f"SELECT OpportunityId, Product2.Name, Product2.Categoria__c FROM OpportunityLineItem WHERE OpportunityId IN ({ids}) ORDER BY Product2.Name"):
        nombre = (l.get('Product2') or {}).get('Name')
        lista = productos.setdefault(l['OpportunityId'], [])
        if nombre and nombre not in [p['nombre'] for p in lista]:
            lista.append({'nombre': nombre, 'categoria': (l.get('Product2') or {}).get('Categoria__c')})

salida = []
for r in registros:
    cuenta = (r.get('Cuenta_Comercial__r') or {}).get('Name')
    empresa = cuenta or r.get('Nombre_Comercial_de_la_Cuenta__c')
    solucion = r['Soluci_n_adquirida__c']
    i = {
        'id': r['Id'], 'nombre': r['Name'], 'tipo': r['Tipo_de_Ejecucion__c'], 'etapa': ETAPAS[r['Etapa_del_Proyecto__c']],
        'etapaOriginal': r['Etapa_del_Proyecto__c'], 'cuentaId': r['Cuenta_Comercial__c'], 'empresa': empresa,
        'esPrueba': 'patito' in (empresa or '').lower(), 'oportunidadId': r['Oportunidad__c'], 'oportunidad': (r.get('Oportunidad__r') or {}).get('Name'), 'productos': productos.get(r['Oportunidad__c'], []),
        'responsable': r['Responsable_de_la_Implementaci_n__c'], 'asociados': partir(r['Consultor_Asociado__c']),
        'solucion': solucion, 'propietario': (r.get('Usuario__r') or {}).get('Name'),
        'contacto': (r.get('Contacto__r') or {}).get('Name'), 'poliza': partir(r['Poliza_Adquirida__c']),
        'ordenCompra': r['Orden_de_Compra__c'], 'creadoEn': r['CreatedDate'], 'cambioEstatus': r['Fecha_de_Estatus__c'],
        'fechaAcordadaKickoff': r['Fecha_acordada__c'], 'fechaKickoff': r['Fecha_inicio_Kick_Off__c'],
        # horas: lo que ya calculan los flows de la org; no se recalcula nada
        'horasContratadas': r['Horas_Contratadas__c'], 'horasConsumidas': r['Horas__c'], 'horasRestantes': r['Horas_Disponibles__c'],
        'pausas': r['Contador_pausas__c'], 'tiempoPausa': r['Tiempo_total_en_pausa__c'], 'evidenciaPausa': r['Evidencia_de_Pausa__c'],
        'historialPausas': [l for l in lineas(r['Historial_de_pausas__c'])
                            if (FECHA.findall(l) or ['0'])[-1] >= CORTE],
        'secciones': [], 'actividades': [], 'cambios': [], 'tiempos': []}
    for d in SECCIONES:
        seleccionada = True if not d['casilla'] else r.get(d['casilla']) is True
        completa = seleccionada and (not d['completo'] or r.get(d['completo']) is True)
        for api in d['requeridos']:
            completa = completa and lleno(r.get(api))
        datos = []
        for c in d['campos']:
            v = r.get(c['api'])
            if c['tipo'] == 'boolean':
                if v is not True:
                    continue
            elif not lleno(v):
                continue
            datos.append({'etiqueta': c['etiqueta'], 'valor': texto_valor(v), 'tipo': c['tipo']})
        i['secciones'].append({
            'clave': d['clave'], 'nombre': d['nombre'], 'grupo': d['grupo'], 'generaActividad': bool(d.get('generaActividad')),
            'disponible': not d['soluciones'] or solucion in d['soluciones'], 'seleccionada': seleccionada,
            'completa': bool(completa), 'datos': datos})
    for t in tareas.get(r['Id'], []):
        d = seccion_de(t['Subject'])
        m = HORAS_ACTIVIDAD.search(t['Description'] or '')
        i['actividades'].append({
            'id': t['Id'], 'asunto': t['Subject'], 'estado': t['Status'], 'fecha': t['ActivityDate'], 'resumen': t['Description'],
            'liga': t['Link_a_video_de_sesion__c'], 'horas': float(m.group(1).replace(',', '.')) if m else None,
            'seccion': d['clave'] if d else None, 'grupo': d['grupo'] if d else None,
            'etapa': None if not d else ('Kickoff' if d['grupo'] == 'Kickoff' else 'Entrega final' if d['grupo'] == 'Entrega final' else 'En proceso')})
    for campo, hito in REPROGRAMACIONES.items():
        for linea in lineas(r.get(campo)):
            m = CAMBIO.match(linea)
            if not m or m.group(3) < CORTE:
                continue
            i['cambios'].append({'campo': campo, 'hito': hito, 'anterior': m.group(1), 'nuevo': m.group(2),
                                 'registrado': m.group(3), 'dias': dias_entre(m.group(1), m.group(2))})
    for campo, etapa in HISTORIAL_ETAPAS.items():
        horas, veces = 0.0, 0
        for linea in lineas(r.get(campo)):
            m = PASO_ETAPA.match(linea)
            if m and m.group(1) >= CORTE:
                horas += float(m.group(2))
                veces += 1
        if veces:
            i['tiempos'].append({'etapa': etapa, 'horas': round(horas, 2), 'veces': veces})
    salida.append(i)

json.dump(salida, open(SALIDA, 'w'), ensure_ascii=False)
imp = sum(1 for i in salida if i['tipo'] == 'Implementación')
print(f"{len(salida)} registros ({imp} implementaciones, {len(salida) - imp} proyectos), "
      f"{sum(len(i['actividades']) for i in salida)} actividades, {sum(len(i['cambios']) for i in salida)} controles de cambio "
      f"-> {os.path.relpath(SALIDA, RAIZ)}")
