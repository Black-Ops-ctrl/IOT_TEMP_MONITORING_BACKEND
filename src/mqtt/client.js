const mqtt = require('mqtt');
require('dotenv').config();

const MQTT_HOST = process.env.MQTT_BROKER_HOST || 'localhost';
const MQTT_PORT = process.env.MQTT_BROKER_PORT || 1883;
const MQTT_USERNAME = process.env.MQTT_USERNAME || '';
const MQTT_PASSWORD = process.env.MQTT_PASSWORD || '';
const MQTT_CLIENT_ID = process.env.MQTT_CLIENT_ID || 'mqtt_consumer_001';

const MQTT_URL = `mqtts://${MQTT_HOST}:${MQTT_PORT}`;  // mqtts:// for SSL

const options = {
    clientId: MQTT_CLIENT_ID,
    clean: true,
    connectTimeout: 4000,
    reconnectPeriod: 1000,
    username: MQTT_USERNAME || undefined,
    password: MQTT_PASSWORD || undefined,
    rejectUnauthorized: false,  // For testing, set to false
};

const client = mqtt.connect(MQTT_URL, options);

client.on('connect', () => {
    console.log(`✅ Connected to MQTT Broker at ${MQTT_HOST}:${MQTT_PORT}`);
});

client.on('error', (error) => {
    console.error('❌ MQTT Connection Error:', error.message);
});

client.on('close', () => {
    console.log('⚠️ MQTT Connection Closed');
});

client.on('reconnect', () => {
    console.log('🔄 Reconnecting to MQTT Broker...');
});

client.on('offline', () => {
    console.log('📡 MQTT Client Offline');
});

module.exports = { client };