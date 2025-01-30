import { z } from "zod";
import { desc, eq, and, gte, lte } from "drizzle-orm";
import { createTRPCRouter, protectedProcedure } from "~/server/api/trpc";
import { MQTTService } from "~/server/mqtt/mqtt-service";
import { 
  devices,
  temperatures,
  users,
  deviceUsers,
} from "~/server/db/schema";
import { randomBytes } from "crypto";

const deviceConfigSchema = z.object({
  deviceId: z.string(),
  contrast: z.enum(["low", "medium", "high"]).optional(),
  orientation: z.boolean().optional(),
  interval: z.number().min(1000).max(60000).optional(),
  tempThresholdHigh: z.string().optional(), // używamy string bo w bazie mamy decimal
  tempThresholdLow: z.string().optional(),
});

export const deviceRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    const userDevices = await ctx.db.query.deviceUsers.findMany({
      where: (du) => eq(du.userId, ctx.session.user.id),
      with: {
        device: true,
      },
    });

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

  getTemperatures: protectedProcedure
    .input(
      z.object({
        deviceId: z.string(),
        from: z.date().optional(),
        to: z.date().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
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

      const conditions = [eq(temperatures.deviceId, input.deviceId)];
      
      if (input.from) {
        conditions.push(gte(temperatures.timestamp, input.from));
      }
      
      if (input.to) {
        conditions.push(lte(temperatures.timestamp, input.to));
      }

      return ctx.db.query.temperatures.findMany({
        where: and(...conditions),
        orderBy: (temp) => [desc(temp.timestamp)],
      });
    }),

  updateConfig: protectedProcedure
    .input(deviceConfigSchema)
    .mutation(async ({ ctx, input }) => {
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

      const updates: Partial<typeof devices.$inferSelect> = {
        updatedAt: new Date(),
      };

      if (input.contrast !== undefined) updates.contrast = input.contrast;
      if (input.orientation !== undefined) updates.orientation = input.orientation;
      if (input.interval !== undefined) updates.interval = input.interval;
      if (input.tempThresholdHigh !== undefined) updates.tempThresholdHigh = input.tempThresholdHigh;
      if (input.tempThresholdLow !== undefined) updates.tempThresholdLow = input.tempThresholdLow;

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
      
      const updatedDevice = await ctx.db.query.devices.findFirst({
        where: (d) => eq(d.id, input.deviceId),
      });

      if (!updatedDevice) {
        throw new Error("Device not found after update");
      }

      await MQTTService.getInstance().updateDeviceConfig(updatedDevice, user);

      return updatedDevice;
    }),

  getDeviceUsers: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .query(async ({ ctx, input }) => {
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

      const deviceUsersList = await ctx.db.query.deviceUsers.findMany({
        where: (du) => eq(du.deviceId, input.deviceId),
        with: {
          user: true,
        },
      });

      return deviceUsersList.map(du => ({
        user: du.user,
        isOwner: du.userId === ctx.session.user.id
      }));
    }),

  addDeviceUser: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      email: z.string().email(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      const targetUser = await ctx.db.query.users.findFirst({
        where: (u) => eq(u.email, input.email),
      });

      if (!targetUser) {
        throw new Error("User not found");
      }

      const existingAccess = await ctx.db.query.deviceUsers.findFirst({
        where: (du) => 
          and(
            eq(du.deviceId, input.deviceId),
            eq(du.userId, targetUser.id),
          ),
      });

      if (existingAccess) {
        throw new Error("User already has access to this device");
      }

      await ctx.db.insert(deviceUsers).values({
        deviceId: input.deviceId,
        userId: targetUser.id,
        createdAt: new Date(),
      });

      return { success: true };
    }),

  removeDeviceUser: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
      userId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      const usersCount = await ctx.db.query.deviceUsers.findMany({
        where: (du) => eq(du.deviceId, input.deviceId),
      });

      if (usersCount.length <= 1) {
        throw new Error("Cannot remove the last user");
      }

      await ctx.db.delete(deviceUsers)
        .where(
          and(
            eq(deviceUsers.deviceId, input.deviceId),
            eq(deviceUsers.userId, input.userId),
          ),
        );

      return { success: true };
    }),

  clearTemperatureHistory: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      await ctx.db.delete(temperatures)
        .where(eq(temperatures.deviceId, input.deviceId));

      return { success: true };
    }),

  regenerateSecretCode: protectedProcedure
    .input(z.object({
      deviceId: z.string(),
    }))
    .mutation(async ({ ctx, input }) => {
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

      const newSecretCode = randomBytes(16).toString('hex');

      await ctx.db.update(devices)
        .set({ 
          secretCode: newSecretCode,
          updatedAt: new Date(),
        })
        .where(eq(devices.id, input.deviceId));

      return { secretCode: newSecretCode };
    }),
});