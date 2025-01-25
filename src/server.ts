// src/server.ts
import { createContext } from "./server/api/trpc";
import { appRouter } from "./server/api/root";
import { createTRPCContext } from "./server/api/trpc";
import { createNextApiHandler } from "@trpc/server/adapters/next";
import { initMQTT } from "./server/mqtt/client";

// Inicjalizacja MQTT przy starcie serwera
console.log("Initializing MQTT client on server start");
initMQTT();

// Standardowa konfiguracja tRPC dla Next.js
export default createNextApiHandler({
  router: appRouter,
  createContext: createTRPCContext,
});