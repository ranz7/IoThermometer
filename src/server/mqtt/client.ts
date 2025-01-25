// src/server/mqtt/client.ts
import * as mqtt from "mqtt";
import { db } from "~/server/db";
import { devices, temperatures } from "~/server/db/schema";
import { eq } from "drizzle-orm";

declare global {
  var globalMqttClient: {
    client: mqtt.Client;
    isInitialized: boolean;
  } | undefined;
}

const createMqttClient = () => {
  if (global.globalMqttClient) {
    console.log("Returning existing MQTT client");
    return global.globalMqttClient.client;
  }

  console.log("Creating new MQTT client");
  const client = mqtt.connect('mqtt://localhost:1883');

  client.on("connect", () => {
    console.log("Connected to MQTT broker");
    setupSubscriptions(client);
  });

  client.on("error", (error) => {
    console.error("MQTT Error:", error);
  });

  global.globalMqttClient = {
    client,
    isInitialized: true
  };

  return client;
};

const setupSubscriptions = (client: mqtt.Client) => {
  client.subscribe("initial_configuration");
  client.subscribe("users/+/devices/+/temperature");

  client.on("message", async (topic, message) => {
    console.log(`Received message on topic: ${topic}`);
    
    if (topic === "initial_configuration") {
      await handleInitialConfiguration(message);
    } else if (topic.includes("/temperature")) {
      await handleTemperature(topic, message);
    }
  });
};

const handleInitialConfiguration = async (message: Buffer) => {
  try {
    const config = JSON.parse(message.toString());
    const { userEmail, macAddress, secretCode } = config;

    console.log(`Received initial configuration for device: ${macAddress}`);

    const existingDevice = await db
      .select()
      .from(devices)
      .where(eq(devices.macAddress, macAddress))
      .execute();

    if (existingDevice.length === 0) {
      await db.insert(devices).values({
        macAddress,
        secretCode,
      });
      console.log(`Created new device: ${macAddress}`);
    }
  } catch (error) {
    console.error("Error handling initial configuration:", error);
  }
};

const handleTemperature = async (topic: string, message: Buffer) => {
  try {
    const value = JSON.parse(message.toString()).value;
    const topicParts = topic.split("/");
    const macAddress = topicParts[topicParts.indexOf("devices") + 1];

    console.log(`Received temperature ${value} for device: ${macAddress}`);

    const device = await db
      .select()
      .from(devices)
      .where(eq(devices.macAddress, macAddress))
      .execute();

    if (device.length > 0) {
      await db.insert(temperatures).values({
        deviceId: device[0].id,
        value,
      });
      console.log(`Saved temperature reading for device: ${macAddress}`);
    }
  } catch (error) {
    console.error("Error handling temperature:", error);
  }
};

const publishConfig = (
  userEmail: string, 
  macAddress: string, 
  config: {
    contrast?: "low" | "medium" | "high";
    orientation?: boolean;
    interval?: number;
    temp_threshold_high?: number;
    temp_threshold_low?: number;
  }
) => {
  const client = createMqttClient();
  const topic = `users/${userEmail}/devices/${macAddress}/config`;
  
  console.log(`Publishing config to ${topic}:`, config);
  
  client.publish(topic, JSON.stringify(config), (err) => {
    if (err) {
      console.error(`Error publishing config to ${topic}:`, err);
    } else {
      console.log(`Successfully published config to ${topic}`);
    }
  });
};

// Inicjalizacja przy imporcie
createMqttClient();

export const mqttService = {
  publishConfig
};