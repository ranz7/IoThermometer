import { z } from "zod";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { MQTTService } from "~/server/mqtt/mqtt-service";
import { 
  devices,
  temperatures,
  users,
} from "~/server/db/schema";

// Schemat walidacji dla aktualizacji konfiguracji
const deviceConfigSchema = z.object({
  deviceId: z.string(),
  contrast: z.enum(["low", "medium", "high"]).optional(),
  orientation: z.boolean().optional(),
  interval: z.number().min(1000).max(60000).optional(),
  tempThresholdHigh: z.string().optional(), // używamy string bo w bazie mamy decimal
  tempThresholdLow: z.string().optional(),
});

export const deviceRouter = createTRPCRouter({
  // Pobieranie wszystkich urządzeń użytkownika wraz z ostatnim odczytem temperatury
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // Pobieramy ID urządzeń przypisanych do użytkownika
    const userDevices = await ctx.db.query.deviceUsers.findMany({
      where: (du) => eq(du.userId, ctx.session.user.id),
      with: {
        device: true, // dołączamy dane urządzenia
      },
    });

    // Dla każdego urządzenia pobieramy ostatni odczyt temperatury
    const devicesWithTemperatures = await Promise.all(
      userDevices.map(async ({ device }) => {
        const lastTemperature = await ctx.db.query.temperatures.findFirst({
          where: (temp) => eq(temp.deviceId, device.id),
          orderBy: (temp) => [desc(temp.timestamp)],
        });

        return {
          ...device,
          lastTemperature,
        };
      }),
    );

    return devicesWithTemperatures;
  }),

  // Pobieranie historii temperatur dla konkretnego urządzenia
  getTemperatures: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      // Sprawdzamy, czy użytkownik ma dostęp do tego urządzenia
      const hasAccess = await ctx.db.query.deviceUsers.findFirst({
        where: (du) => 
          and(
            eq(du.deviceId, input.deviceId),
            eq(du.userId, ctx.session.user.id),
          ),
      });

      if (!hasAccess) {
        throw new Error("Unauthorized access to device");
      }

      // Budujemy warunki dla zapytania
      const conditions = [eq(temperatures.deviceId, input.deviceId)];
      
      if (input.from) {
        conditions.push(gte(temperatures.timestamp, input.from));
      }
      
      if (input.to) {
        conditions.push(lte(temperatures.timestamp, input.to));
      }

      // Pobieramy historię temperatur
      return ctx.db.query.temperatures.findMany({
        where: and(...conditions),
        orderBy: (temp) => [desc(temp.timestamp)],
      });
    }),

  // Aktualizacja konfiguracji urządzenia
  updateConfig: protectedProcedure
    .input(deviceConfigSchema)
    .mutation(async ({ ctx, input }) => {
      // Sprawdzamy, czy użytkownik ma dostęp do urządzenia
      const hasAccess = await ctx.db.query.deviceUsers.findFirst({
        where: (du) => 
          and(
            eq(du.deviceId, input.deviceId),
            eq(du.userId, ctx.session.user.id),
          ),
      });

      if (!hasAccess) {
        throw new Error("Unauthorized access to device");
      }

      

      // Przygotowujemy obiekt z aktualizacjami
      const updates: Partial<typeof devices.$inferSelect> = {
        updatedAt: new Date(),
      };

      // Dodajemy tylko te pola, które zostały przekazane
      if (input.contrast !== undefined) updates.contrast = input.contrast;
      if (input.orientation !== undefined) updates.orientation = input.orientation;
      if (input.interval !== undefined) updates.interval = input.interval;
      if (input.tempThresholdHigh !== undefined) updates.tempThresholdHigh = input.tempThresholdHigh;
      if (input.tempThresholdLow !== undefined) updates.tempThresholdLow = input.tempThresholdLow;

      // Aktualizujemy konfigurację w bazie
      await ctx.db
        .update(devices)
        .set(updates)
        .where(eq(devices.id, input.deviceId));

      const user = await ctx.db.query.users.findFirst({
        where: (u) => eq(u.id, hasAccess.userId),
      });
      
      if (!user) {
        throw new Error("User not found after update");
      }
      
      // Pobieramy zaktualizowane urządzenie
      const updatedDevice = await ctx.db.query.devices.findFirst({
        where: (d) => eq(d.id, input.deviceId),
      });

      if (!updatedDevice) {
        throw new Error("Device not found after update");
      }

      // Wysyłamy nową konfigurację przez MQTT
      await MQTTService.getInstance().updateDeviceConfig(updatedDevice, user);

      return updatedDevice;
    }),
});