// src/instrumentation.ts
export async function register() {
    if (process.env.NEXT_RUNTIME === 'nodejs') {
      const { initMQTT } = await import('./server/mqtt');
      console.log("Initializing MQTT client from instrumentation");
      initMQTT();
    }
  }