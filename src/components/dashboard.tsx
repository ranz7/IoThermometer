"use client";

import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api, RouterOutputs } from "~/trpc/react";

const POLLING_INTERVAL = 30000; // 30 sekund

export default function Dashboard() {
  const router = useRouter();
  
  // Pobieramy listę urządzeń z automatycznym pollingiem
  const { data: devices } = api.device.getAll.useQuery(undefined, {
    refetchInterval: POLLING_INTERVAL,
  });

  // Dla każdego urządzenia pobieramy dane z dzisiaj
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-6">Moje urządzenia</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {devices?.map((device) => (
          <DeviceCard 
            key={device.id} 
            device={device}
            startDate={today}
            endDate={tomorrow}
          />
        ))}
      </div>
    </div>
  );
}

// Komponent karty pojedynczego urządzenia
function DeviceCard({ 
  device, 
  startDate, 
  endDate 
}: { 
  device: RouterOutputs["device"]["getAll"][number];
  startDate: Date;
  endDate: Date;
}) {
  const router = useRouter();

  // Pobieramy historię temperatur dla urządzenia
  const { data: temperatures } = api.device.getTemperatures.useQuery({
    deviceId: device.id,
    from: startDate,
    to: endDate,
  }, {
    refetchInterval: POLLING_INTERVAL,
  });

  // Formatujemy dane do wykresu
  const chartData = temperatures?.map((temp) => ({
    time: new Date(temp.timestamp).toLocaleTimeString(),
    value: parseFloat(temp.value),
  })) ?? [];

  // Sprawdzamy, czy temperatura jest poza progami
  const lastTemp = parseFloat(device.lastTemperature?.value ?? "0");
  const isHighTemp = lastTemp > parseFloat(device.tempThresholdHigh!);
  const isLowTemp = lastTemp < parseFloat(device.tempThresholdLow!);
  
  const tempStatusColor = isHighTemp ? "text-red-500" : 
                         isLowTemp ? "text-blue-500" : 
                         "text-green-500";

  return (
    <Card className="hover:shadow-lg transition-shadow cursor-pointer"
          onClick={() => router.push(`/device/${device.id}`)}>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Urządzenie {device.macAddress}</span>
          <span className={`text-2xl font-bold ${tempStatusColor}`}>
            {device.lastTemperature?.value ?? "N/A"}°C
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-48 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <XAxis 
                dataKey="time" 
                tick={{ fontSize: 12 }}
                interval="preserveStartEnd"
              />
              <YAxis 
                domain={[
                  Math.min(parseFloat(device.tempThresholdLow!) - 1, 
                          Math.min(...chartData.map(d => d.value))),
                  Math.max(parseFloat(device.tempThresholdHigh!) + 1, 
                          Math.max(...chartData.map(d => d.value)))
                ]}
              />
              <Tooltip />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#2563eb"
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        
        <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
          <div>Próbkowanie: {device.interval}ms</div>
          <div>Orientacja: {device.orientation ? "Odwrócona" : "Standardowa"}</div>
          <div>Kontrast: {device.contrast}</div>
          <div>Progi: {device.tempThresholdLow}°C - {device.tempThresholdHigh}°C</div>
        </div>
      </CardContent>
    </Card>
  );
}