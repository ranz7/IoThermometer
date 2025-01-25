// src/server/mqtt/mqtt-service.ts
import { MQTTClientManager } from './mqtt-client';
import { db } from "~/server/db";
import { devices, temperatures, deviceUsers, users } from "~/server/db/schema";
import { eq } from 'drizzle-orm';

interface InitialConfiguration {
    userEmail: string;
    macAddress: string;
    secretCode: string;
}

interface TemperatureData {
    value: number;
}

export class MQTTService {
    private static instance: MQTTService;
    private mqttManager: MQTTClientManager;

    private constructor() {
        this.mqttManager = MQTTClientManager.getInstance();
        this.initialize().catch(console.error);
    }

    public static getInstance(): MQTTService {
        if (!MQTTService.instance) {
            MQTTService.instance = new MQTTService();
        }
        return MQTTService.instance;
    }

    private async initialize() {
        // Dodajemy obsługę wiadomości
        this.mqttManager.addMessageSubscriber(this.handleMessage.bind(this));

        // Subskrybujemy wymagane topici
        await this.mqttManager.subscribe('initial_configuration');
        await this.mqttManager.subscribe('users/+/devices/+/temperature');

        console.log('MQTT Service initialized');
    }

    private async handleMessage(topic: string, message: Buffer) {
        try {
            const payload = JSON.parse(message.toString());

            if (topic === 'initial_configuration') {
                await this.handleInitialConfiguration(payload as InitialConfiguration);
            } else if (topic.includes('/temperature')) {
                await this.handleTemperatureReading(topic, payload as TemperatureData);
            }
        } catch (error) {
            console.error('Error handling MQTT message:', error);
        }
    }

    private async handleInitialConfiguration(config: InitialConfiguration) {
        try {
            // Sprawdzamy, czy urządzenie istnieje i czy kod sekretny się zgadza
            const existingDevice = await db.query.devices.findFirst({
                where: (devices) => eq(devices.macAddress, config.macAddress),
            });

            if (!existingDevice || existingDevice.secretCode !== config.secretCode) {
                console.error('Device not found or secret code mismatch');
                return;
            }

            // Sprawdzamy, czy użytkownik istnieje
            const user = await db.query.users.findFirst({
                where: (users) => eq(users.email, config.userEmail),
            });

            if (!user) {
                console.error('User not found:', config.userEmail);
                return;
            }

            // Sprawdzamy, czy powiązanie już istniuje
            const existingLink = await db.query.deviceUsers.findFirst({
                where: (du) => 
                    eq(du.deviceId, existingDevice.id) && 
                    eq(du.userId, user.id),
            });

            if (!existingLink) {
                await db.insert(deviceUsers).values({
                    deviceId: existingDevice.id,
                    userId: user.id,
                    createdAt: new Date(),
                });
                console.log('Device linked to user successfully');
            } else {
                console.log('Device already linked to user');
            }
        } catch (error) {
            console.error('Error handling initial configuration:', error);
        }
    }

    private async handleTemperatureReading(topic: string, data: TemperatureData) {
        const topicParts = topic.split('/');
        const macAddress = topicParts[3];

        try {
            if (!macAddress) {
                console.error('Invalid topic:', topic);
                return;
            }

            const device = await db.query.devices.findFirst({
                where: (devices) => eq(devices.macAddress, macAddress),
            });

            if (!device) {
                console.error('Device not found:', macAddress);
                return;
            }

            await db.insert(temperatures).values({
                deviceId: device.id,
                value: data.value.toString(),
                timestamp: new Date(),
            });
        } catch (error) {
            console.error('Error saving temperature reading:', error);
        }
    }

    public async updateDeviceConfig(device: typeof devices.$inferSelect) {
        const configTopic = `users/${device.id}/devices/${device.macAddress}/config`;
        const configMessage = {
            contrast: device.contrast,
            orientation: device.orientation ? 1 : 0,
            interval: device.interval,
            temp_threshold_high: device.tempThresholdHigh,
            temp_threshold_low: device.tempThresholdLow,
        };

        await this.mqttManager.publish(configTopic, JSON.stringify(configMessage));
    }
}