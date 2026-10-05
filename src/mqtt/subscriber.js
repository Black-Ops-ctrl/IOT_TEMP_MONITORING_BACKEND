const { client } = require('./client');
const handler = require('./handler');

const MQTT_TOPIC = process.env.MQTT_TOPIC || '#';

client.on('connect', () => {
    console.log(`📡 Subscribing to topic: ${MQTT_TOPIC}`);
    client.subscribe(MQTT_TOPIC, { qos: 1 }, (error) => {
        if (error) {
            console.error('❌ Subscription error:', error.message);
        } else {
            console.log(`✅ Subscribed to topic: ${MQTT_TOPIC}`);
            console.log('⏳ Waiting for messages...');
        }
    });
});

client.on('message', async (topic, message) => {
    try {
        await handler.handleMessage(topic, message);
    } catch (error) {
        console.error('❌ Error handling message:', error.message);
    }
});

module.exports = { client };