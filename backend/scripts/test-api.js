const BASE_URL = "http://localhost:3000";
const API_URL = `${BASE_URL}/api`;

const print = (label, data) => {
  console.log(`\n${label}`);
  console.log("=".repeat(40));
  console.log(JSON.stringify(data, null, 2));
};

async function main() {
  console.log("Testing Fleet Tracker API");
  console.log("=".repeat(40));

  // 1. Health check
  const health = await fetch(`${BASE_URL}/health`);
  print("1. Health Check", await health.json());

  // 2. Crear vehículo
  const vehicleRes = await fetch(`${API_URL}/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId: "user-001",
      plate: "ABC123",
      brand: "Chevrolet",
      model: "NPR",
      year: 2024,
      type: "truck",
      driverName: "Alfredo Dominguez",
      driverPhone: "3116534760",
      fuelType:"gasoline"
    }),
  });

  const vehicle = await vehicleRes.json();
  print("2. Crear Vehículo", vehicle);

  const vehicleId = vehicle?.data?.vehicleId;
  console.log("Vehicle ID:", vehicleId);

  // 3. Crear GPS
  const gpsRes = await fetch(`${API_URL}/gps`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      deviceId: "1130267052",
      brand: "Teltonika",
      model: "FMC920",
      imei: "1130267052",
      simNumber: "+573116534760",
      vehicleId,
    }),
  });
  const gps = await gpsRes.json();
  print("3. Crear GPS", gps);

  const gpsId = gps?.data?.gps?.gpsId;
  console.log("GPS ID:", gpsId);

  // 4. Listar GPS
  const listRes = await fetch(`${API_URL}/gps`);
  print("4. Listar GPS", await listRes.json());

  // 5. Certificados
  const certRes = await fetch(`${API_URL}/certificates/${gpsId}`);
  print("5. Info Certificados", await certRes.json());

  console.log("\nTests completados");
}

main().catch((err) => {
  console.error("Error:", err.message);
  process.exit(1);
});
