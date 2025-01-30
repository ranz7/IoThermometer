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
import { CalendarIcon, Copy } from "lucide-react";
import { format } from "date-fns";
import { pl } from "date-fns/locale";
import { Calendar } from "~/components/ui/calendar";
import { useToast } from "~/hooks/use-toast";

import Image from "next/image";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "~/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/components/ui/tabs";
import { UserPlus, UserMinus, Trash2, Key, Users } from "lucide-react";

function AddUserDialog({ deviceId }: { deviceId: string }) {
  const [email, setEmail] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const utils = api.useContext();
  
  const addUser = api.device.addDeviceUser.useMutation({
    onSuccess: () => {
      void utils.device.getDeviceUsers.invalidate();
      setIsOpen(false);
      setEmail("");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addUser.mutate({ deviceId, email });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon">
          <UserPlus className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj użytkownika</DialogTitle>
          <DialogDescription>
            Podaj adres email użytkownika, któremu chcesz przyznać dostęp do urządzenia.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" type="button" onClick={() => setIsOpen(false)}>
              Anuluj
            </Button>
            <Button type="submit" disabled={addUser.isPending}>
              {addUser.isPending ? "Dodawanie..." : "Dodaj"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Komponent listy użytkowników
function DeviceUsersList({ deviceId }: { deviceId: string }) {
  const utils = api.useContext();
  const { data: users, isLoading } = api.device.getDeviceUsers.useQuery({ deviceId });
  
  const removeUser = api.device.removeDeviceUser.useMutation({
    onSuccess: () => {
      void utils.device.getDeviceUsers.invalidate();
    },
  });

  if (isLoading) return <div>Ładowanie...</div>;
  if (!users) return <div>Brak danych</div>;

  return (
    <div className="space-y-2">
      {users.map(({ user, isOwner }) => (
        <div key={user.id} className="flex items-center justify-between p-2 rounded-lg bg-muted">
          <div className="flex items-center gap-2">
            {user.image ? (
              <Image
                src={user.image}
                alt={user.name ?? ""}
                width={32}
                height={32}
                className="rounded-full"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4" />
              </div>
            )}
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>
          {!isOwner && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon">
                  <UserMinus className="h-4 w-4" />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Usuwanie dostępu</AlertDialogTitle>
                  <AlertDialogDescription>
                    Czy na pewno chcesz usunąć dostęp dla użytkownika {user.name}?
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Anuluj</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => removeUser.mutate({ deviceId, userId: user.id })}
                  >
                    Usuń
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      ))}
    </div>
  );
}

function SecretCodeDialog({
  code,
  isOpen,
  onClose,
}: {
  code: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  
  const copyToClipboard = async () => {
    if (code) {
      await navigator.clipboard.writeText(code);
      toast({
        title: "Skopiowano do schowka",
        description: "Kod sekretny został skopiowany",
      });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nowy kod sekretny</DialogTitle>
          <DialogDescription>
            Zapisz ten kod w bezpiecznym miejscu. Po zamknięciu tego okna nie będzie możliwości jego ponownego wyświetlenia.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex items-center space-x-2 bg-muted p-3 rounded-lg">
            <code className="flex-1 break-all text-sm">{code}</code>
            <Button 
              variant="outline" 
              size="icon"
              onClick={copyToClipboard}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <div className="bg-yellow-100 dark:bg-yellow-900/30 p-3 rounded-lg">
            <p className="text-yellow-800 dark:text-yellow-200 text-sm">
              ⚠️ Ten kod jest wymagany do rekonfiguracji urządzenia. Upewnij się, że go zapisałeś przed zamknięciem tego okna.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button 
            onClick={() => onClose()}
            className="w-full sm:w-auto"
          >
            Rozumiem, zapisałem kod
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function DeviceDetails({ id }: { id: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [startDate, setStartDate] = useState<Date>(new Date());
  const [endDate, setEndDate] = useState<Date>(new Date());
  const [newSecretCode, setNewSecretCode] = useState<string | null>(null);

  const utils = api.useContext();

  // Pobieramy szczegóły urządzenia
  const { data: devices } = api.device.getAll.useQuery();
  const device = devices?.find(d => d.id === id);

  // Pobieramy historię temperatur dla wybranego okresu
  const { data: temperatures } = api.device.getTemperatures.useQuery({
    deviceId: id,
    from: startDate,
    to: new Date(endDate.getTime() + 60 * 60 * 24 * 1000),
  }, {
    refetchInterval: 1000,
  });

  // Mutacja do aktualizacji konfiguracji
  const updateConfig = api.device.updateConfig.useMutation({
    onSuccess: () => {
      void utils.device.getAll.invalidate();
    },
  });

  const regenerateSecret = api.device.regenerateSecretCode.useMutation({
    onSuccess: (data) => {
      setNewSecretCode(data.secretCode);
    },
  });
  
  const clearHistory = api.device.clearTemperatureHistory.useMutation({
    onSuccess: () => {
      toast({
        title: "Historia została wyczyszczona",
        description: "Wszystkie odczyty temperatur zostały usunięte",
      });
      void utils.device.getTemperatures.invalidate();
    },
  });
  
  const handleRegenerateSecretCode = () => {
    regenerateSecret.mutate({ deviceId: id });
  };  
  
  const handleClearHistory = () => {
    clearHistory.mutate({ deviceId: id });
  };

  if (!device) {
    return <div>Ładowanie...</div>;
  }

  // Formatujemy dane do wykresu
  const chartData = temperatures
  ?.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime())
  .map((temp) => ({
    time: new Date(temp.timestamp).toLocaleString(),
    value: parseFloat(temp.value),
  }))
  ?? [];

  return (
    <div className="container mx-auto p-4">
      <Button 
        variant="outline" 
        className="mb-4"
        onClick={() => router.back()}
      >
        ← Powrót
      </Button>

      <Tabs defaultValue="readings" className="w-full">
        <TabsList>
          <TabsTrigger value="readings">Odczyty</TabsTrigger>
          <TabsTrigger value="config">Konfiguracja</TabsTrigger>
          <TabsTrigger value="management">Zarządzanie</TabsTrigger>
        </TabsList>

        <TabsContent value="readings">
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
        </TabsContent>

        <TabsContent value="config">
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
        </TabsContent>

        <TabsContent value="management">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Panel użytkowników */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Użytkownicy</span>
                  <AddUserDialog deviceId={id} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                <DeviceUsersList deviceId={id} />
              </CardContent>
            </Card>

            {/* Panel akcji */}
            <Card>
              <CardHeader>
                <CardTitle>Akcje</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Regeneracja kodu sekretnego */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="secondary" className="w-full">
                      <Key className="mr-2 h-4 w-4" />
                      Regeneruj kod sekretny
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Regeneracja kodu sekretnego</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja wygeneruje nowy kod sekretny dla urządzenia. Będziesz musiał zaktualizować kod w urządzeniu.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleRegenerateSecretCode()}>
                        Kontynuuj
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>

                <SecretCodeDialog 
                  code={newSecretCode}
                  isOpen={newSecretCode !== null}
                  onClose={() => setNewSecretCode(null)}
                />

                {/* Czyszczenie historii */}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="destructive" className="w-full">
                      <Trash2 className="mr-2 h-4 w-4" />
                      Wyczyść historię temperatur
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Czyszczenie historii</AlertDialogTitle>
                      <AlertDialogDescription>
                        Ta akcja nieodwracalnie usunie wszystkie zapisane odczyty temperatury. Czy na pewno chcesz kontynuować?
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Anuluj</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleClearHistory()}>
                        Kontynuuj
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};