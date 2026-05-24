#!/bin/bash

BASE_URL="http://localhost:3000"
API_URL="$BASE_URL/api"

# Helpers JSON con Node.js (no requiere jq)
json_pretty() {
  node -e "
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try { console.log(JSON.stringify(JSON.parse(d), null, 2)); }
      catch (e) { process.stdout.write(d); }
    });
  "
}

json_get() {
  local keys="$1"
  node -e "
    let d = '';
    process.stdin.on('data', c => d += c);
    process.stdin.on('end', () => {
      try {
        let v = JSON.parse(d);
        '$keys'.split('.').forEach(k => v = v[k]);
        console.log(v ?? '');
      } catch (e) { console.log(''); }
    });
  "
}

echo "Testing Fleet Tracker API"
echo "=============================="

# Health check
echo -e "\n1. Health Check"
curl -s "$BASE_URL/health" | json_pretty

# Crear vehículo
echo -e "\n2. Crear Vehículo"
VEHICLE=$(curl -s -X POST "$API_URL/vehicles" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "user-001",
    "plate": "ABC123",
    "brand": "Chevrolet",
    "model": "NPR",
    "year": 2024,
    "type": "truck"
  }')

echo "$VEHICLE" | json_pretty
VEHICLE_ID=$(echo "$VEHICLE" | json_get "data.vehicleId")
echo "Vehicle ID: $VEHICLE_ID"

# Crear GPS
echo -e "\n3. Crear GPS"
GPS=$(curl -s -X POST "$API_URL/gps" \
  -H "Content-Type: application/json" \
  -d "{
    \"brand\": \"Teltonika\",
    \"model\": \"FMC920\",
    \"imei\": \"1130267052\",
    \"simNumber\": \"+573116534760\",
    \"vehicleId\": \"$VEHICLE_ID\"
  }")

echo "$GPS" | json_pretty
GPS_ID=$(echo "$GPS" | json_get "data.gps.gpsId")
echo "GPS ID: $GPS_ID"

# Listar GPS
echo -e "\n4. Listar GPS"
curl -s "$API_URL/gps" | json_pretty

# Obtener certificados
echo -e "\n5. Info Certificados"
curl -s "$API_URL/certificates/$GPS_ID" | json_pretty

echo -e "\nTests completados"
