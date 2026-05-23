#!/bin/bash

API_URL="http://localhost:5000/api"

echo "🧪 Testing Fleet Tracker API"
echo "=============================="

# Health check
echo -e "\n1️⃣ Health Check"
curl -s $API_URL/../health | jq

# Crear vehículo
echo -e "\n2️⃣ Crear Vehículo"
VEHICLE=$(curl -s -X POST $API_URL/vehicles \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "plate": "ABC123",
    "brand": "Chevrolet",
    "model": "NPR",
    "year": 2024,
    "type": "truck"
  }' | jq)

echo $VEHICLE

VEHICLE_ID=$(echo $VEHICLE | jq -r '.data.vehicleId')
echo "Vehicle ID: $VEHICLE_ID"

# Crear GPS
echo -e "\n3️⃣ Crear GPS"
GPS=$(curl -s -X POST $API_URL/gps \
  -H "Content-Type: application/json" \
  -d "{
    \"brand\": \"Teltonika\",
    \"model\": \"FMC920\",
    \"imei\": \"123456789012345\",
    \"simNumber\": \"+573001234567\",
    \"vehicleId\": \"$VEHICLE_ID\"
  }" | jq)

echo $GPS

GPS_ID=$(echo $GPS | jq -r '.data.gps.gpsId')
echo "GPS ID: $GPS_ID"

# Listar GPS
echo -e "\n4️⃣ Listar GPS"
curl -s $API_URL/gps | jq

# Obtener certificados
echo -e "\n5️⃣ Info Certificados"
curl -s $API_URL/certificates/$GPS_ID | jq

echo -e "\n✅ Tests completados"