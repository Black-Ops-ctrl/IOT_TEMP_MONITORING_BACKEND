require('dotenv').config();
require('./mqtt/subscriber');

console.log('================================================');
console.log('📡 MQTT Consumer Service Started');
console.log('================================================');
console.log(`🔗 Broker: ${process.env.MQTT_BROKER_HOST || 'localhost'}:${process.env.MQTT_BROKER_PORT || 1883}`);
console.log(`📡 Topic: ${process.env.MQTT_TOPIC || '#'}`);
console.log(`🆔 Client ID: ${process.env.MQTT_CLIENT_ID || 'mqtt_consumer_001'}`);
console.log('================================================');
console.log('⏳ Waiting for messages...');

process.on('SIGINT', () => {
    console.log('\n⚠️ Shutting down MQTT Consumer...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n⚠️ Shutting down MQTT Consumer...');
    process.exit(0);
});