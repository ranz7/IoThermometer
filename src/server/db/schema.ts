import { relations, sql } from "drizzle-orm";
import {
  index,
  integer,
  pgTableCreator,
  primaryKey,
  text,
  timestamp,
  varchar,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { type AdapterAccount } from "next-auth/adapters";

/**
 * This is an example of how to use the multi-project schema feature of Drizzle ORM. Use the same
 * database instance for multiple projects.
 *
 * @see https://orm.drizzle.team/docs/goodies#multi-project-schema
 */
export const createTable = pgTableCreator((name) => `iot_${name}`);

export const posts = createTable(
  "post",
  {
    id: integer("id").primaryKey().generatedByDefaultAsIdentity(),
    name: varchar("name", { length: 256 }),
    createdById: varchar("created_by", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (example) => ({
    createdByIdIdx: index("created_by_idx").on(example.createdById),
    nameIndex: index("name_idx").on(example.name),
  })
);

export const users = createTable("user", {
  id: varchar("id", { length: 255 })
    .notNull()
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: varchar("name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull(),
  emailVerified: timestamp("email_verified", {
    mode: "date",
    withTimezone: true,
  }).default(sql`CURRENT_TIMESTAMP`),
  image: varchar("image", { length: 255 }),
});

export const usersRelations = relations(users, ({ many }) => ({
  accounts: many(accounts),
  devices: many(deviceUsers),
}));

export const accounts = createTable(
  "account",
  {
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    type: varchar("type", { length: 255 })
      .$type<AdapterAccount["type"]>()
      .notNull(),
    provider: varchar("provider", { length: 255 }).notNull(),
    providerAccountId: varchar("provider_account_id", {
      length: 255,
    }).notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: varchar("token_type", { length: 255 }),
    scope: varchar("scope", { length: 255 }),
    id_token: text("id_token"),
    session_state: varchar("session_state", { length: 255 }),
  },
  (account) => ({
    compoundKey: primaryKey({
      columns: [account.provider, account.providerAccountId],
    }),
    userIdIdx: index("account_user_id_idx").on(account.userId),
  })
);

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, { fields: [accounts.userId], references: [users.id] }),
}));

export const sessions = createTable(
  "session",
  {
    sessionToken: varchar("session_token", { length: 255 })
      .notNull()
      .primaryKey(),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (session) => ({
    userIdIdx: index("session_user_id_idx").on(session.userId),
  })
);

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, { fields: [sessions.userId], references: [users.id] }),
}));

export const verificationTokens = createTable(
  "verification_token",
  {
    identifier: varchar("identifier", { length: 255 }).notNull(),
    token: varchar("token", { length: 255 }).notNull(),
    expires: timestamp("expires", {
      mode: "date",
      withTimezone: true,
    }).notNull(),
  },
  (vt) => ({
    compoundKey: primaryKey({ columns: [vt.identifier, vt.token] }),
  })
);

export const devices = createTable(
  "device",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    macAddress: varchar("mac_address", { length: 255 }).notNull().unique(),
    secretCode: varchar("secret_code", { length: 255 }).notNull(),
    // Konfiguracja urządzenia
    contrast: varchar("contrast", { length: 10 }).default("medium"),
    orientation: boolean("orientation").default(false), // false = 0, true = 1
    interval: integer("interval").default(4000),
    tempThresholdHigh: decimal("temp_threshold_high", { precision: 4, scale: 1 }).default("23.0"),
    tempThresholdLow: decimal("temp_threshold_low", { precision: 4, scale: 1 }).default("19.0"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).$onUpdate(
      () => new Date()
    ),
  },
  (device) => ({
    macAddressIdx: index("mac_address_idx").on(device.macAddress),
  })
);

export const deviceUsers = createTable(
  "device_user",
  {
    deviceId: varchar("device_id", { length: 255 })
      .notNull()
      .references(() => devices.id),
    userId: varchar("user_id", { length: 255 })
      .notNull()
      .references(() => users.id),
    createdAt: timestamp("created_at", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (deviceUser) => ({
    compoundKey: primaryKey({
      columns: [deviceUser.deviceId, deviceUser.userId],
    }),
    deviceIdIdx: index("device_user_device_id_idx").on(deviceUser.deviceId),
    userIdIdx: index("device_user_user_id_idx").on(deviceUser.userId),
  })
);

export const temperatures = createTable(
  "temperature",
  {
    id: varchar("id", { length: 255 })
      .notNull()
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    deviceId: varchar("device_id", { length: 255 })
      .notNull()
      .references(() => devices.id),
    value: decimal("value", { precision: 4, scale: 1 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (temperature) => ({
    deviceIdIdx: index("temperature_device_id_idx").on(temperature.deviceId),
    timestampIdx: index("temperature_timestamp_idx").on(temperature.timestamp),
  })
);

// Dodaj relacje

export const devicesRelations = relations(devices, ({ many }) => ({
  users: many(deviceUsers),
  temperatures: many(temperatures),
}));

export const deviceUsersRelations = relations(deviceUsers, ({ one }) => ({
  device: one(devices, { fields: [deviceUsers.deviceId], references: [devices.id] }),
  user: one(users, { fields: [deviceUsers.userId], references: [users.id] }),
}));

export const temperaturesRelations = relations(temperatures, ({ one }) => ({
  device: one(devices, { fields: [temperatures.deviceId], references: [devices.id] }),
}));
