# GPS Vehicle Tracking System

Plataforma de rastreo vehicular en tiempo real para gestión de flotas: ubicación GPS en vivo, geofencing, historial de rutas, alertas y comandos remotos.

---

## Descripción

- Monitoreo de ubicación GPS en tiempo real
- Comandos remotos al vehículo (bloqueo de motor, alarmas, etc.)
- Notificaciones automáticas de encendido/apagado
- Historial de rutas y eventos
- Dashboard web con mapas interactivos
- Usuarios: Administradores de flotas vehiculares
- Dispositivo GPS: Teltonika FMC920 (MQTT over TLS)
- Zona horaria: America/Bogota

---

## Documentación por módulo

- [Backend (Node.js + Express)](backend/README.md) — API REST, DynamoDB, comandos MQTT
- [Frontend (React + Vite)](frontend/README.md) — Dashboard, mapas, panel de comandos

---

## Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                         │
│  - Dashboard                                                    │
│  - Mapas (AWS Location Service)                                │
│  - Comandos                                                     │
│  - Notificaciones                                               │
└─────────────────┬───────────────────────────────────────────────┘
                  │ HTTPS / REST API
                  ↓
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND (Node.js + Express)                  │
│  - API REST                                                     │
│  - Autenticación JWT                                            │
│  - Lógica de negocio                                            │
│  - Gestión de comandos                                          │
└─────┬───────────┬───────────────┬──────────────┬────────────────┘
      │           │               │              │
      ↓           ↓               ↓              ↓
┌──────────┐ ┌─────────┐ ┌──────────────┐ ┌──────────┐
│DynamoDB  │ │AWS IoT  │ │AWS Location  │ │AWS SNS   │
│- GPS     │ │Core     │ │Service       │ │- Alertas │
│- Veh.    │ │- MQTT   │ │- Mapas       │ └──────────┘
│- Coord.  │ │- Rules  │ │- Geofencing  │
│- Comandos│ └────┬────┘ └──────────────┘
│- Eventos │      │
└──────────┘      │ MQTT (TLS 8883)
                  ↓
         ┌────────────────────┐
         │  GPS Teltonika     │
         │  FMC920            │
         │  - Publicar datos  │
         │  - Recibir comandos│
         └────────────────────┘
                  │
                  ↓
         ┌────────────────────┐
         │     VEHÍCULO       │
         │  - Ignición        │
         │  - Motor           │
         │  - Alarma          │
         │  - Luces           │
         └────────────────────┘
```

---

## Flujos de Datos

**Ubicación:**
```
GPS → MQTT (vehicles/{id}/data) → IoT Rule → Lambda ProcessGPSData →
→ DynamoDB (Coordenadas) + AWS Location Service → Frontend
```

**Comandos:**
```
Frontend → Backend API → MQTT (vehicles/{id}/commands) → GPS →
→ GPS ejecuta → MQTT (vehicles/{id}/data con RSP) →
→ Lambda ProcessGPSData → DynamoDB (Comandos: executed)
```

**Notificaciones:**
```
GPS (ignición cambia) → Lambda detecta cambio →
→ DynamoDB (Eventos) + SNS → Email/SMS → Usuario
```

---

## Tecnologías

### Frontend

| Tecnología   | Versión | Propósito    |
| ------------ | ------- | ------------ |
| React        | 18.3.1  | Framework UI |
| Vite         | 5.4.2   | Build tool   |
| React Router | 6.26.2  | Routing      |
| Axios        | 1.7.7   | HTTP client  |
| MapLibre GL  | 4.7.1   | Mapas        |
| TailwindCSS  | 3.4.1   | Estilos      |

### Backend

| Tecnología   | Versión  | Propósito         |
| ------------ | -------- | ----------------- |
| Node.js      | 18.x     | Runtime           |
| Express      | 4.19.2   | Web framework     |
| AWS SDK      | 2.1691.0 | AWS services      |
| jsonwebtoken | 9.0.2    | JWT auth          |

### AWS Services

| Servicio         | Propósito                |
| ---------------- | ------------------------ |
| DynamoDB         | Base de datos NoSQL      |
| IoT Core         | Broker MQTT              |
| Lambda           | Procesamiento serverless |
| Location Service | Mapas y geolocalización  |
| SNS              | Notificaciones           |
| IAM              | Autenticación y permisos |
| CloudWatch       | Logs y monitoreo         |

### Hardware

| Dispositivo | Modelo           | Firmware        |
| ----------- | ---------------- | --------------- |
| GPS Tracker | Teltonika FMC920 | 04.00.00 Rev-14 |

---

## Requisitos Previos

```bash
node --version  # v18.x o superior
npm --version   # v9.x o superior
```

Cuenta AWS con permisos en: DynamoDB, IoT Core, Lambda, Location Service, SNS, IAM.

## Estructura del Proyecto

```
gps-vehicle-tracking-system/
├── backend/          # Node.js + Express API
├── frontend/         # React + Vite app
├── lambda/
│   ├── process-gps-data.js
│   └── check-command-timeout.js
└── README.md
```

---

## AWS IoT Core

### Policy: VehicleGPSPolicy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "iot:Connect",
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:client/${iot:Connection.Thing.ThingName}"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Publish",
      "Resource": [
        "arn:aws:iot:us-east-1:ACCOUNT_ID:topic/vehicles/${iot:Connection.Thing.ThingName}/data",
        "arn:aws:iot:us-east-1:ACCOUNT_ID:topic/vehicles/${iot:Connection.Thing.ThingName}/response"
      ]
    },
    {
      "Effect": "Allow",
      "Action": "iot:Subscribe",
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:topicfilter/vehicles/${iot:Connection.Thing.ThingName}/commands"
    },
    {
      "Effect": "Allow",
      "Action": "iot:Receive",
      "Resource": "arn:aws:iot:us-east-1:ACCOUNT_ID:topic/vehicles/${iot:Connection.Thing.ThingName}/commands"
    }
  ]
}
```

### IoT Rules

**Rule 1 — ProcessGPSData** (datos de ubicación):
```sql
SELECT *, topic(2) as deviceId, clientId() as clientId
FROM 'vehicles/+/data'
WHERE NOT isUndefined(latlng)
```

**Rule 2 — ProcessCommandResponse** (respuestas de comandos):
```sql
SELECT *, topic(2) as deviceId, clientId() as clientId
FROM 'vehicles/+/data'
WHERE NOT isUndefined(RSP)
```

Ambas reglas disparan la Lambda `ProcessGPSData`.

---

## GPS Teltonika FMC920

### Conexión de Cables

```
PIN         COLOR               CONEXIÓN
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
+12V        Rojo                → Batería (+12V permanente)
GND         Negro               → Tierra del vehículo
DIN1        Naranja/Amarillo    → Cable de ignición (12V cuando encendido)
DOUT1       Azul                → Relay del motor (bloqueo)
DOUT2       Verde               → Sirena/alarma
DOUT3       Blanco              → Luces
```

### Configuración via Teltonika Configurator

- **Data Protocol**: Codec JSON
- **Domain**: `a28bbd2b4768x7-ats.iot.us-east-1.amazonaws.com`
- **Port**: `8883`
- **Protocol**: MQTT / TLS/DTLS
- **MQTT Client Type**: AWS IoT Custom
- **Device ID**: IMEI del GPS (ej. `863238073517528`)
- **Data Topic**: `vehicles/%imei%/data`
- **Command Topic**: `vehicles/%imei%/commands`
- Subir certificados: root CA, device certificate, private key

### I/O Elements relevantes

| ID  | Nombre           | Descripción                           |
| --- | ---------------- | ------------------------------------- |
| 66  | External Voltage | Voltaje externo (mV)                  |
| 67  | Battery Voltage  | Voltaje batería (mV)                  |
| 239 | Ignition         | Ignición (0=OFF, 1=ON)                |
| 240 | Movement         | Movimiento (0=detenido, 1=en marcha)  |
| 21  | GSM Signal       | Señal GSM (0-5)                       |
| 16  | Odometer         | Odómetro total (metros)               |

---

## Lambda Functions

### ProcessGPSData

- Runtime: Node.js 18.x | Timeout: 30s | Memory: 256 MB
- Trigger: IoT Rules (ambas rules anteriores)
- Permisos IAM necesarios: `dynamodb:PutItem/UpdateItem/GetItem/Query`, `geo:BatchUpdateDevicePosition`, `sns:Publish`, `logs:*`

Funciones principales:
- `processLocationData()` — guarda coordenadas en DynamoDB y actualiza AWS Location Service
- `processCommandResponse()` — marca el comando como ejecutado
- `detectIgnitionChange()` — compara estado anterior con el actual
- `sendIgnitionNotification()` — publica alerta en SNS

### CheckCommandTimeout

- Runtime: Node.js 18.x | Timeout: 60s
- Trigger: EventBridge cada 1 minuto
- Marca como `timeout` los comandos en estado `pending` o `sent` con más de 5 minutos de antigüedad

---

## Notificaciones SNS

### Crear Topic

1. AWS SNS → Topics → Create topic
2. Type: Standard | Name: `VehicleIgnitionAlerts`

### Suscripciones

- **Email**: Protocol Email → `tu-email@example.com` (confirmar el email recibido)
- **SMS**: Protocol SMS → `+573001234567`

### Variable de entorno Lambda

```
SNS_TOPIC_ARN=arn:aws:sns:us-east-1:123456789:VehicleIgnitionAlerts
```

### Ejemplo de notificación

```
Subject: Vehículo ENCENDIDO - Toyota ABC-123

ALERTA DE IGNICIÓN - ENCENDIDO

Vehículo: Toyota ABC-123
Fecha y Hora: 5 de marzo de 2026, 10:30 a.m.
Velocidad: 0 km/h | Batélería: 12450 mV | Satélites: 12

Ubicación:
Latitud: 4.608083 | Longitud: -74.090113
https://www.google.com/maps?q=4.608083,-74.090113
```

---

## Testing MQTT

1. AWS IoT Core → Test → MQTT test client
2. Suscribirse a `vehicles/+/data` para ver datos del GPS
3. Publicar en `vehicles/863238073517528/commands` con payload `{"CMD": "getinfo"}` para probar comandos

**Test event para Lambda:**
```json
{
  "state": {
    "reported": {
      "latlng": "4.608083,-74.090113",
      "alt": 2614,
      "sp": 0,
      "ang": 317,
      "sat": 14,
      "239": 1,
      "67": 4104,
      "66": 12787
    }
  },
  "clientId": "863238073517528"
}
```

---

## Troubleshooting

### GPS no envía datos

1. Verificar en IoT Test Client: `vehicles/+/data`
2. Confirmar que los certificados en el GPS son correctos y la policy está adjunta
3. Verificar SIM card con plan de datos activo y APN configurado
4. Teltonika Configurator → Leer Registros → buscar errores MQTT

### Comandos quedan en "sent" sin ejecutarse

1. Confirmar que el topic del GPS es `vehicles/%imei%/commands` (no otro formato)
2. Verificar formato del payload: `{"CMD": "getinfo"}` es correcto, `{"command": "getinfo"}` no
3. CloudWatch → `/aws/lambda/ProcessGPSData` → buscar "Comando encontrado"

### Notificaciones no llegan

1. SNS → Topics → VehicleIgnitionAlerts → Subscriptions → Status: **Confirmed**
2. Verificar permisos IAM de Lambda: `sns:Publish` sobre el ARN correcto
3. CloudWatch → buscar "Notificación SNS enviada"

### Lambda timeout

- Aumentar timeout a 30s y memoria a 256 MB en Lambda → Configuration → General

---

## Costos Estimados AWS (mensual)

| Servicio         | Uso estimado       | Costo     |
| ---------------- | ------------------ | --------- |
| DynamoDB         | 10GB + 1M requests | ~$2.50    |
| IoT Core         | 1M messages        | ~$1.00    |
| Lambda           | 1M invocations     | ~$0.20    |
| Location Service | 10K requests       | ~$0.50    |
| SNS              | 100 notificaciones | ~$0.50    |
| CloudWatch       | Logs básicos       | ~$0.50    |
| **TOTAL**        |                    | **~$5.20**|

Para 100 vehículos: ~$80/mes (AWS + EC2 t3.medium).

---

## Mantenimiento

- **Diario**: Verificar GPS online, revisar comandos ejecutados y notificaciones recibidas
- **Semanal**: Revisar logs CloudWatch, verificar costos AWS, backup On-Demand DynamoDB
- **Mensual**: Actualizar dependencias npm, revisar políticas IAM, verificar certificados GPS

---

## Changelog

### v1.0.0 — 2026-03-05

- Backend completo (Node.js + Express)
- Frontend completo (React + Vite)
- Integración AWS IoT Core + GPS Teltonika FMC920
- 8 comandos remotos
- Notificaciones de ignición por email/SMS
- Mapas en tiempo real (AWS Location Service)
- Historial de rutas y gestión de eventos

---

## Referencias

- [Teltonika Wiki](https://wiki.teltonika-gps.com/)
- [AWS IoT Core Docs](https://docs.aws.amazon.com/iot/)
- [AWS Location Service](https://docs.aws.amazon.com/location/)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)
