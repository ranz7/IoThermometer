export const initMQTT = () => {
    import("~/server/mqtt/client")
    .then(() => {
        console.log("MQTT client initialized");
    })
    .catch((err) => {
        console.error("Failed to initialize MQTT client:", err);
    });
};