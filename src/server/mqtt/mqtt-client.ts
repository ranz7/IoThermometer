import * as mqtt from 'mqtt';
import { type MqttClient } from 'mqtt';
import { env } from "~/env";

/**
 * Klasa MQTTClientManager implementuje wzorzec Singleton dla połączenia MQTT.
 * Zapewnia pojedyncze, współdzielone połączenie z brokerem MQTT dla całej aplikacji.
 */
export class MQTTClientManager {
    private static instance: MQTTClientManager;
    private client: MqttClient | null = null;
    private connectionPromise: Promise<MqttClient> | null = null;
    private subscribers = new Set<(topic: string, message: Buffer) => void>();

    private constructor() {
        // Prywatny konstruktor zapobiega tworzeniu nowych instancji
    }

    /**
     * Zwraca pojedynczą instancję MQTTClientManager.
     * Jeśli instancja nie istnieje, zostanie utworzona.
     */
    public static getInstance(): MQTTClientManager {
        if (!MQTTClientManager.instance) {
            MQTTClientManager.instance = new MQTTClientManager();
        }
        return MQTTClientManager.instance;
    }

    /**
     * Zwraca istniejącego klienta MQTT lub tworzy nowego.
     * Implementuje wzorzec "lazy loading" - klient jest tworzony tylko gdy jest potrzebny.
     */
    public async getClient(): Promise<MqttClient> {
        // Jeśli klient już istnieje i jest połączony, zwróć go
        if (this.client?.connected) {
            return this.client;
        }

        // Jeśli trwa proces łączenia, zwróć istniejącą promesę
        if (this.connectionPromise) {
            return this.connectionPromise;
        }

        // Utwórz nowe połączenie
        this.connectionPromise = new Promise((resolve, reject) => {
            console.log('Connecting to MQTT broker...');
            
            const client = mqtt.connect(`mqtt://${env.MOSQUITTO_HOST}:${env.MOSQUITTO_PORT}`);

            client.on('connect', () => {
                console.log('Connected to MQTT broker');
                this.client = client;
                this.connectionPromise = null;
                this.setupMessageHandler(client);
                resolve(client);
            });

            client.on('error', (error) => {
                console.error('MQTT connection error:', error);
                reject(error);
            });

            client.on('close', () => {
                console.log('MQTT connection closed');
                this.client = null;
            });

            // Obsługa procesu zamykania aplikacji
            process.on('SIGTERM', () => {
                void this.cleanup(client);
            });
            process.on('SIGINT', () => {
                void this.cleanup(client);
            });
        });

        return this.connectionPromise;
    }

    /**
     * Konfiguruje obsługę wiadomości MQTT i przekazuje je do wszystkich subskrybentów.
     */
    private setupMessageHandler(client: MqttClient): void {
        client.on('message', (topic: string, message: Buffer) => {
            this.subscribers.forEach(subscriber => {
                try {
                    subscriber(topic, message);
                } catch (error) {
                    console.error('Error in MQTT message subscriber:', error);
                }
            });
        });
    }

    /**
     * Dodaje nowego subskrybenta wiadomości MQTT.
     */
    public addMessageSubscriber(
        subscriber: (topic: string, message: Buffer) => void
    ): void {
        this.subscribers.add(subscriber);
    }

    /**
     * Usuwa subskrybenta wiadomości MQTT.
     */
    public removeMessageSubscriber(
        subscriber: (topic: string, message: Buffer) => void
    ): void {
        this.subscribers.delete(subscriber);
    }

    /**
     * Zamyka połączenie z brokerem MQTT w sposób kontrolowany.
     */
    private async cleanup(client: MqttClient): Promise<void> {
        console.log('Cleaning up MQTT connection...');
        return new Promise((resolve) => {
            client.end(false, {}, () => {
                console.log('MQTT connection cleaned up');
                this.client = null;
                resolve();
            });
        });
    }

    /**
     * Subskrybuje podany topic MQTT.
     */
    public async subscribe(topic: string): Promise<void> {
        const client = await this.getClient();
        return new Promise((resolve, reject) => {
            client.subscribe(topic, (error) => {
                if (error) {
                    console.error(`Error subscribing to ${topic}:`, error);
                    reject(error);
                } else {
                    console.log(`Subscribed to ${topic}`);
                    resolve();
                }
            });
        });
    }

    /**
     * Publikuje wiadomość na podanym topicu MQTT.
     */
    public async publish(topic: string, message: string | Buffer): Promise<void> {
        const client = await this.getClient();
        return new Promise((resolve, reject) => {
            client.publish(topic, message, (error) => {
                if (error) {
                    console.error(`Error publishing to ${topic}:`, error);
                    reject(error);
                } else {
                    resolve();
                }
            });
        });
    }
}