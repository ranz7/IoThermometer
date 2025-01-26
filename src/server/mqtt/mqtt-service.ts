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

// We'll add a type for possible MQTT message payloads
type MQTTPayload = InitialConfiguration | TemperatureData;

export class MQTTService {
    private static instance: MQTTService;
    private mqttManager: MQTTClientManager;
    private isInitialized = false;

    private constructor() {
        this.mqttManager = MQTTClientManager.getInstance();
        if (!this.isInitialized) {
            this.initialize().catch(console.error);
            this.isInitialized = true;
        }
    }

    public static getInstance(): MQTTService {
        if (!MQTTService.instance) {
            MQTTService.instance = new MQTTService();
        }
        return MQTTService.instance;
    }

    private async initialize() {
        // We wrap the async handler in a sync function to satisfy TypeScript
        this.mqttManager.addMessageSubscriber((topic, message) => {
            void this.handleMessage(topic, message);
        });

        await this.mqttManager.subscribe('initial_configuration');
        await this.mqttManager.subscribe('users/+/devices/+/temperature');

        console.log('MQTT Service initialized');
    }

    private async handleMessage(topic: string, message: Buffer) {
        try {
            // We add type checking for the parsed JSON
            const payload = JSON.parse(message.toString()) as MQTTPayload;

            // Type guard functions to ensure type safety
            const isInitialConfig = (p: MQTTPayload): p is InitialConfiguration => 
                'userEmail' in p && 'macAddress' in p && 'secretCode' in p;

            const isTemperatureData = (p: MQTTPayload): p is TemperatureData =>
                'value' in p && typeof p.value === 'number';

            if (topic === 'initial_configuration' && isInitialConfig(payload)) {
                await this.handleInitialConfiguration(payload);
            } else if (topic.includes('/temperature') && isTemperatureData(payload)) {
                await this.handleTemperatureReading(topic, payload);
            } else {
                console.error('Invalid message format for topic:', topic);
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

    public async updateDeviceConfig(device: typeof devices.$inferSelect, user: typeof users.$inferSelect) {
        const configTopic = `users/${user.email}/devices/${device.macAddress}/config`;
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