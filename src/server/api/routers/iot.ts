import { z } from "zod";
import { createTRPCRouter, protectedProcedure, publicProcedure } from "~/server/api/trpc";
import { TRPCError } from "@trpc/server";
import { devices, deviceUsers, temperatures } from "~/server/db/schema";
import { and, eq, between } from "drizzle-orm";

export const iotRouter = createTRPCRouter({
  // Zmiana konfiguracji urządzenia
//   updateDeviceConfig: protectedProcedure
//     .input(
//       z.object({
//         deviceId: z.string(),
//         config: z.object({
//           contrast: z.enum(["low", "medium", "high"]).optional(),
//           orientation: z.boolean().optional(),
//           interval: z.number().min(1000).max(60000).optional(), // między 1s a 60s
//           tempThresholdHigh: z.number().min(-50).max(100).optional(),
//           tempThresholdLow: z.number().min(-50).max(100).optional(),
//         }),
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//       // Sprawdź czy użytkownik ma dostęp do urządzenia
//       const deviceUser = await ctx.db
//         .select()
//         .from(deviceUsers)
//         .where(
//           and(
//             eq(deviceUsers.deviceId, input.deviceId),
//             eq(deviceUsers.userId, ctx.session.user.id)
//           )
//         )
//         .execute();

//       if (deviceUser.length === 0) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "You don't have access to this device",
//         });
//       }

//       // Zaktualizuj konfigurację
//       return ctx.db
//         .update(devices)
//         .set({
//           ...input.config,
//           updatedAt: new Date(),
//         })
//         .where(eq(devices.id, input.deviceId))
//         .returning();
//     }),

//   // Przypisanie nowego użytkownika do urządzenia
//   assignUserToDevice: protectedProcedure
//     .input(
//       z.object({
//         macAddress: z.string(),
//         secretCode: z.string(),
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//       // Znajdź urządzenie po MAC address i sprawdź secret code
//       const device = await ctx.db
//         .select()
//         .from(devices)
//         .where(eq(devices.macAddress, input.macAddress))
//         .execute();

//       if (device.length === 0) {
//         throw new TRPCError({
//           code: "NOT_FOUND",
//           message: "Device not found",
//         });
//       }

//       if (device[0].secretCode !== input.secretCode) {
//         throw new TRPCError({
//           code: "UNAUTHORIZED",
//           message: "Invalid secret code",
//         });
//       }

//       // Sprawdź czy relacja już istnieje
//       const existingRelation = await ctx.db
//         .select()
//         .from(deviceUsers)
//         .where(
//           and(
//             eq(deviceUsers.deviceId, device[0].id),
//             eq(deviceUsers.userId, ctx.session.user.id)
//           )
//         )
//         .execute();

//       if (existingRelation.length > 0) {
//         throw new TRPCError({
//           code: "CONFLICT",
//           message: "Device is already assigned to this user",
//         });
//       }

//       // Dodaj nową relację
//       return ctx.db.insert(deviceUsers).values({
//         deviceId: device[0].id,
//         userId: ctx.session.user.id,
//       }).returning();
//     }),

//   // Pobranie pomiarów temperatury z przedziału czasowego
//   getTemperatures: protectedProcedure
//     .input(
//       z.object({
//         deviceId: z.string(),
//         from: z.date(),
//         to: z.date(),
//       })
//     )
//     .query(async ({ ctx, input }) => {
//       // Sprawdź czy użytkownik ma dostęp do urządzenia
//       const deviceUser = await ctx.db
//         .select()
//         .from(deviceUsers)
//         .where(
//           and(
//             eq(deviceUsers.deviceId, input.deviceId),
//             eq(deviceUsers.userId, ctx.session.user.id)
//           )
//         )
//         .execute();

//       if (deviceUser.length === 0) {
//         throw new TRPCError({
//           code: "FORBIDDEN",
//           message: "You don't have access to this device",
//         });
//       }

//       // Pobierz pomiary z zadanego przedziału
//       return ctx.db
//         .select()
//         .from(temperatures)
//         .where(
//           and(
//             eq(temperatures.deviceId, input.deviceId),
//             between(temperatures.timestamp, input.from, input.to)
//           )
//         )
//         .orderBy(temperatures.timestamp)
//         .execute();
//     }),

//   // Dodanie nowego pomiaru temperatury
//   addTemperature: publicProcedure
//     .input(
//       z.object({
//         deviceId: z.string(),
//         value: z.number(),
//         timestamp: z.date().optional(),
//       })
//     )
//     .mutation(async ({ ctx, input }) => {
//       // Dodaj nowy pomiar
//       return ctx.db
//         .insert(temperatures)
//         .values({
//           deviceId: input.deviceId,
//           value: input.value,
//           timestamp: input.timestamp ?? new Date(),
//         })
//         .returning();
//     }),

    testData: publicProcedure.query(async ({ ctx }) => {
        const allDevices = await ctx.db.select().from(devices);
        const allTemps = await ctx.db.select().from(temperatures);
        
        return {
          devices: allDevices,
          temperatures: allTemps
        };
      }),
});