"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { Input } from "~/components/ui/input";
import { Label } from "~/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/components/ui/select";
import { Switch } from "~/components/ui/switch";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { api } from "~/trpc/react";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar } from "~/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

export function DeviceDetails({ id }: { id: string }) {
  const router = useRouter();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());

  const utils = api.useContext();

  // Pobieramy szczegóły urządzenia
  const { data: devices } = api.device.getAll.useQuery();
  const device = devices?.find(d => d.id === id);

  // Pobieramy historię temperatur dla wybranego okresu
  const { data: temperatures } = api.device.getTemperatures.useQuery({
    deviceId: id,
    from: startDate,
    to: endDate,
  }, {
    refetchInterval: 30000, // 30 sekund
  });

  // Mutacja do aktualizacji konfiguracji
  const updateConfig = api.device.updateConfig.useMutation({
    onSuccess: () => {
      void utils.device.getAll.invalidate();
    },
  });

  if (!device) {
    return <div>Ładowanie...</div>;
  }

  // Formatujemy dane do wykresu
  const chartData = temperatures?.map((temp) => ({
    time: new Date(temp.timestamp).toLocaleString(),
    value: parseFloat(temp.value),
  })) ?? [];

  return (
    <div className="container mx-auto p-4">
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={() => router.back()}
      >
        ← Powrót
      </Button>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Konfiguracja urządzenia */}
        <Card>
          <CardHeader>
            <CardTitle>Konfiguracja urządzenia</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="space-y-4">
              <div className="space-y-2">
                <Label>Kontrast</Label>
                <Select
                  defaultValue={device.contrast!}
                  onValueChange={(value) => {
                    updateConfig.mutate({
                      deviceId: device.id,
                      contrast: value as "low" | "medium" | "high",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Niski</SelectItem>
                    <SelectItem value="medium">Średni</SelectItem>
                    <SelectItem value="high">Wysoki</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Orientacja ekranu</Label>
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={device.orientation!}
                    onCheckedChange={(checked) => {
                      updateConfig.mutate({
                        deviceId: device.id,
                        orientation: checked,
                      });
                    }}
                  />
                  <span>{device.orientation ? "Odwrócona" : "Standardowa"}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Interwał próbkowania (ms)</Label>
                <Input
                  type="number"
                  min="1000"
                  max="60000"
                  step="1000"
                  defaultValue={device.interval!}
                  onBlur={(e) => {
                    const value = parseInt(e.target.value);
                    if (value >= 1000 && value <= 60000) {
                      updateConfig.mutate({
                        deviceId: device.id,
                        interval: value,
                      });
                    }
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Próg dolny temperatury (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  defaultValue={device.tempThresholdLow!}
                  onBlur={(e) => {
                    updateConfig.mutate({
                      deviceId: device.id,
                      tempThresholdLow: e.target.value,
                    });
                  }}
                />
              </div>

              <div className="space-y-2">
                <Label>Próg górny temperatury (°C)</Label>
                <Input
                  type="number"
                  step="0.1"
                  defaultValue={device.tempThresholdHigh!}
                  onBlur={(e) => {
                    updateConfig.mutate({
                      deviceId: device.id,
                      tempThresholdHigh: e.target.value,
                    });
                  }}
                />
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Wykres temperatur */}
        <Card>
          <CardHeader>
            <CardTitle>Historia temperatur</CardTitle>
            <div className="flex space-x-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(startDate, "PPP", { locale: pl })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={startDate}
                    onSelect={(date) => date && setStartDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-48">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(endDate, "PPP", { locale: pl })}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={endDate}
                    onSelect={(date) => date && setEndDate(date)}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96">
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}