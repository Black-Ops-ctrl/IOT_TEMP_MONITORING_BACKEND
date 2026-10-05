const mqtt = require('mqtt');
const client = mqtt.connect('mqtt://localhost:1883');

client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker');
    console.log('📨 Sending test message...');
    
    const payload = {
        ts: Math.floor(Date.now() / 1000),
        dev: {
            name: "Test Unit 001",
            mac: "80:F1:B2:BB:CB:38",
            fw: "1.0.2",
            uptime: 61,
            rssi: -39,
            link: "wifi"
        },
        sensors: [
            { id: "1", rom: "00000000ABCDEFGH", name: "Sensor 1", t: 29.0, status: "OK" },
            { id: "2", rom: "00000000ABCDEFGH", name: "Sensor 2", t: 28.6, status: "OK" }
        ]
    };
    
    client.publish('test/topic', JSON.stringify(payload), { qos: 1 }, (error) => {
        if (error) {
            console.error('❌ Error sending:', error.message);
        } else {
            console.log('✅ Message sent successfully!');
            console.log('📦 Payload:', JSON.stringify(payload, null, 2));
        }
    });
    
    setTimeout(() => {
        client.end();
        console.log('✅ Test complete');
        process.exit(0);
    }, 2000);
});

client.on('error', (error) => {
    console.error('❌ Connection error:', error.message);
    process.exit(1);
});