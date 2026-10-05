const pool = require('../config/database');
const notificationService = require('../services/notificationService');

class MQTTMessageHandler {
    
    async handleMessage(topic, message) {
        try {
            console.log(`📨 Received message on topic: ${topic}`);
            
            const messageStr = message.toString();
            
            // ============================================
            // SKIP STATUS MESSAGES (online/offline)
            // ============================================
            if (messageStr === 'online' || messageStr === 'offline') {
                console.log(`⏭️ Skipping status message: ${messageStr}`);
                return;
            }
            
            // ============================================
            // SKIP NON-JSON MESSAGES
            // ============================================
            let payload;
            try {
                payload = JSON.parse(messageStr);
            } catch (parseError) {
                console.log(`⏭️ Skipping non-JSON message: ${messageStr.substring(0, 50)}...`);
                return;
            }
            
            const { ts, dev, sensors } = payload;
            
            if (!dev || !dev.mac) {
                console.error('❌ Invalid payload: Missing dev.mac');
                return;
            }
            
            // ============================================
            // SAVE TO YOUR TABLES
            // ============================================
            const shopId = await this.saveShop(dev);
            
            if (!shopId) {
                console.error('❌ Failed to save shop');
                return;
            }
            
            if (sensors && Array.isArray(sensors)) {
                for (const sensor of sensors) {
                    await this.processSensorAndCheckStatus(shopId, ts, sensor);
                }
            }
            
            console.log('✅ Data processed successfully');
            
        } catch (error) {
            console.error('❌ Error processing message:', error.message);
        }
    }
    
    // ============================================
    // SAVE TO SHOPS TABLE  (✅ UPDATED — gateway replace safe, no duplicate shops)
    // ============================================
    async saveShop(dev) {
        try {
            const shopName = dev.name || 'Unknown Shop';

            // 1. Isi MAC ki shop already hai? → bas updated_at
            const byMac = await pool.query(
                'SELECT id FROM shops WHERE device_mac = $1',
                [dev.mac]
            );
            if (byMac.rows.length > 0) {
                await pool.query('UPDATE shops SET updated_at = NOW() WHERE id = $1', [byMac.rows[0].id]);
                return byMac.rows[0].id;
            }

            // 2. MAC nayi hai lekin isi NAAM ki shop hai? → gateway badla hai, MAC update karo
            const byName = await pool.query(
                'SELECT id, device_mac FROM shops WHERE shop_name = $1 ORDER BY created_at LIMIT 1',
                [shopName]
            );
            if (byName.rows.length > 0) {
                console.log(`🔄 Gateway replaced for "${shopName}": ${byName.rows[0].device_mac} → ${dev.mac}`);
                await pool.query(
                    'UPDATE shops SET device_mac = $1, updated_at = NOW() WHERE id = $2',
                    [dev.mac, byName.rows[0].id]
                );
                return byName.rows[0].id;
            }

            // 3. Bilkul nayi shop → banao
            const regionId = await this.getExistingRegion();
            if (!regionId) {
                console.error('❌ No region found. Please create a region first.');
                return null;
            }
            
            const cityId = await this.getExistingCity(regionId);
            if (!cityId) {
                console.error('❌ No city found in region. Please create a city first.');
                return null;
            }

            const result = await pool.query(
                `INSERT INTO shops (city_id, shop_name, device_mac, created_at, updated_at)
                 VALUES ($1, $2, $3, NOW(), NOW())
                 RETURNING id`,
                [cityId, shopName, dev.mac]
            );
            console.log(`🆕 New shop created: "${shopName}" (${dev.mac}) — set correct city in Device Management`);
            return result.rows[0].id;
            
        } catch (error) {
            console.error('❌ Error saving shop:', error.message);
            return null;
        }
    }
    
    // ============================================
    // GET EXISTING REGION
    // ============================================
    async getExistingRegion() {
        try {
            const result = await pool.query('SELECT id FROM regions LIMIT 1');
            if (result.rows.length > 0) {
                return result.rows[0].id;
            }
            console.error('❌ No region found in database');
            return null;
        } catch (error) {
            console.error('❌ Error getting region:', error.message);
            return null;
        }
    }
    
    // ============================================
    // GET EXISTING CITY
    // ============================================
    async getExistingCity(regionId) {
        try {
            if (!regionId) {
                console.error('❌ Cannot get city: regionId is null');
                return null;
            }
            
            const result = await pool.query(
                'SELECT id FROM cities WHERE region_id = $1 LIMIT 1',
                [regionId]
            );
            
            if (result.rows.length > 0) {
                return result.rows[0].id;
            }
            
            console.error(`❌ No city found in region ${regionId}`);
            return null;
            
        } catch (error) {
            console.error('❌ Error getting city:', error.message);
            return null;
        }
    }
    
    // ============================================
    // PROCESS SENSOR AND CHECK STATUS CHANGE INSTANTLY
    // ============================================
    async processSensorAndCheckStatus(shopId, ts, sensor) {
        try {
            const temperature = sensor.t !== undefined ? sensor.t : null;
            console.log(`🔍 Processing sensor: ${sensor.name || sensor.id}, Temp: ${temperature}°C`);
            
            // ✅ Step 1: Save sensor
            const sensorQuery = `
                INSERT INTO sensors (shop_id, sensor_rom, sensor_id, sensor_name, 
                                     temperature, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                ON CONFLICT (sensor_rom) 
                DO UPDATE SET 
                    shop_id = EXCLUDED.shop_id,
                    sensor_id = EXCLUDED.sensor_id,
                    sensor_name = EXCLUDED.sensor_name,
                    temperature = EXCLUDED.temperature,
                    updated_at = NOW()
                RETURNING id
            `;
            
            const sensorValues = [
                shopId,
                sensor.rom || null,
                sensor.id || '0',
                sensor.name || `Sensor ${sensor.id}`,
                temperature
            ];
            
            await pool.query(sensorQuery, sensorValues);
            console.log(`✅ Sensor saved: ${sensor.name} (${sensor.rom})`);
            
            const recordedAt = new Date();            
            const readingQuery = `
                INSERT INTO sensor_readings (sensor_rom, ts_raw, "timestamp", temperature, sensor_status)
                VALUES ($1, $2, $3, $4, $5)
            `;
            
            await pool.query(readingQuery, [
                sensor.rom || null,
                ts || null,
                recordedAt,
                temperature,
                sensor.status || 'OK'
            ]);
            
            console.log(`✅ Reading saved for: ${sensor.name}`);
            
            // ✅ Step 3: Check status change instantly
            await this.checkAndSendInstantNotification(sensor, temperature, shopId);
            
        } catch (error) {
            console.error(`❌ Error processing sensor ${sensor.id}:`, error.message);
        }
    }
    
    // ============================================
    // CHECK STATUS CHANGE AND SEND EMAIL INSTANTLY
    // ============================================
    async checkAndSendInstantNotification(sensor, temperature, shopId) {
        try {
            const sensorRom = sensor.rom;
            if (!sensorRom) {
                console.log('⏭️ Skipping: No sensor ROM');
                return;
            }
            
            console.log(`🔍 Checking status change for: ${sensor.name} (${sensorRom})`);
            
            // ✅ Get current status
            const currentTempStatus = this.getTempStatus(temperature);
            console.log(`📊 Current temp status: ${currentTempStatus}`);
            
            // ✅ Get last history entry
            const historyQuery = `
                SELECT temp_status, activity_status
                FROM sensor_status_history
                WHERE sensor_rom = $1
                ORDER BY changed_at DESC
                LIMIT 1
            `;
            const historyResult = await pool.query(historyQuery, [sensorRom]);
            
            const prevTemp = historyResult.rows[0]?.temp_status || null;
            const prevActivity = historyResult.rows[0]?.activity_status || null;
            
            console.log(`📊 Previous temp status: ${prevTemp}`);
            
            // ✅ Get activity status
            const readingQuery = `
                SELECT timestamp FROM sensor_readings 
                WHERE sensor_rom = $1 
                ORDER BY timestamp DESC 
                LIMIT 1
            `;
            const readingResult = await pool.query(readingQuery, [sensorRom]);
            
            let currentActivityStatus = 'Active';
            if (readingResult.rows.length > 0) {
                const lastReading = new Date(readingResult.rows[0].timestamp);
                const diffMinutes = (Date.now() - lastReading.getTime()) / (1000 * 60);
                if (diffMinutes > 15) {
                    currentActivityStatus = 'Inactive';
                }
            }
            console.log(`📊 Current activity status: ${currentActivityStatus}`);
            
            // ✅ If no history, save initial status (no email)
            if (prevTemp === null || prevActivity === null) {
                console.log(`📝 First time for ${sensor.name}, saving initial status without email`);
                
                const shopDetails = await this.getShopDetails(shopId);
                
                await pool.query(
                    `INSERT INTO sensor_status_history 
                     (sensor_rom, temp_status, activity_status, temperature, freezer_name, shop_name, city, region, notified, notification_sent_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        sensorRom,
                        currentTempStatus,
                        currentActivityStatus,
                        temperature,
                        sensor.name || sensorRom,
                        shopDetails.shop_name || 'N/A',
                        shopDetails.city || 'N/A',
                        shopDetails.region || 'N/A',
                        false,
                        null
                    ]
                );
                console.log(`✅ Initial status saved for ${sensor.name}`);
                return;
            }
            
            // ✅ Check if status actually changed
            const tempChanged = (prevTemp !== currentTempStatus);
            const activityChanged = (prevActivity !== currentActivityStatus);
            
            console.log(`🔍 Temp changed: ${tempChanged}, Activity changed: ${activityChanged}`);
            
            if (!tempChanged && !activityChanged) {
                console.log(`⏭️ No change for ${sensor.name}`);
                return;
            }
            
            console.log(`🔄 INSTANT CHANGE detected for ${sensor.name}: Temp=${prevTemp}→${currentTempStatus}, Activity=${prevActivity}→${currentActivityStatus}`);
            
            // ✅ Get full sensor details for email
            const sensorDetails = await this.getSensorDetails(sensorRom);
            
            let emailResult = null;
            let statusType = '';
            
            // ============================================
            // ✅ TEMPERATURE STATUS CHANGES
            // ============================================
            
            // Normal → Critical
            if (prevTemp === 'Normal' && currentTempStatus === 'Critical') {
                statusType = 'temp_critical';
                console.log(`📧 Sending email: Normal → Critical for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Critical', statusType);
            }
            // Critical → Normal
            else if (prevTemp === 'Critical' && currentTempStatus === 'Normal') {
                statusType = 'temp_normal';
                console.log(`📧 Sending email: Critical → Normal for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Normal', statusType);
            }
            // Warning → Critical
            else if (prevTemp === 'Warning' && currentTempStatus === 'Critical') {
                statusType = 'temp_critical';
                console.log(`📧 Sending email: Warning → Critical for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Critical', statusType);
            }
            // Critical → Warning
            else if (prevTemp === 'Critical' && currentTempStatus === 'Warning') {
                statusType = 'temp_warning';
                console.log(`📧 Sending email: Critical → Warning for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Warning', statusType);
            }
            // Normal → Warning
            else if (prevTemp === 'Normal' && currentTempStatus === 'Warning') {
                statusType = 'temp_warning';
                console.log(`📧 Sending email: Normal → Warning for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Warning', statusType);
            }
            // Warning → Normal
            else if (prevTemp === 'Warning' && currentTempStatus === 'Normal') {
                statusType = 'temp_normal';
                console.log(`📧 Sending email: Warning → Normal for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Normal', statusType);
            }
            
            // ============================================
            // ✅ ACTIVITY STATUS CHANGES
            // ============================================
            else if (prevActivity === 'Active' && currentActivityStatus === 'Inactive') {
                statusType = 'sensor_inactive';
                console.log(`📧 Sending email: Active → Inactive for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Inactive', statusType);
            }
            else if (prevActivity === 'Inactive' && currentActivityStatus === 'Active') {
                statusType = 'sensor_active';
                console.log(`📧 Sending email: Inactive → Active for ${sensor.name}`);
                emailResult = await notificationService.sendStatusChangeEmail(sensorDetails, 'Active', statusType);
            }
            else {
                console.log(`⏭️ No email condition matched for ${sensor.name}`);
                return;
            }
            
            // ✅ Save history with email status
            await pool.query(
                `INSERT INTO sensor_status_history 
                 (sensor_rom, temp_status, activity_status, temperature, freezer_name, shop_name, city, region, notified, notification_sent_at)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                [
                    sensorRom,
                    currentTempStatus,
                    currentActivityStatus,
                    temperature,
                    sensorDetails.freezer_name || sensor.name || sensorRom,
                    sensorDetails.shop_name || 'N/A',
                    sensorDetails.city || 'N/A',
                    sensorDetails.region || 'N/A',
                    emailResult?.success || false,
                    emailResult?.success ? new Date() : null
                ]
            );
            
            if (emailResult?.success) {
                console.log(`✅✅✅ INSTANT EMAIL SENT for ${sensor.name}: ${prevTemp}→${currentTempStatus}`);
            } else {
                console.log(`❌ Email failed for ${sensor.name}:`, emailResult);
            }
            
        } catch (error) {
            console.error('❌ Error checking instant notification:', error);
        }
    }
    
    // ============================================
    // GET SHOP DETAILS
    // ============================================
    async getShopDetails(shopId) {
        try {
            const query = `
                SELECT 
                    sh.shop_name,
                    c.name as city,
                    r.name as region
                FROM shops sh
                JOIN cities c ON sh.city_id = c.id
                JOIN regions r ON c.region_id = r.id
                WHERE sh.id = $1
            `;
            const result = await pool.query(query, [shopId]);
            return result.rows[0] || { shop_name: 'N/A', city: 'N/A', region: 'N/A' };
        } catch (error) {
            console.error('Error getting shop details:', error);
            return { shop_name: 'N/A', city: 'N/A', region: 'N/A' };
        }
    }
    
    // ============================================
    // GET SENSOR DETAILS FOR EMAIL
    // ============================================
    async getSensorDetails(sensorRom) {
        try {
            const query = `
                SELECT 
                    s.sensor_rom,
                    COALESCE(s.freezer_name, s.sensor_name, s.sensor_rom) as freezer_name,
                    s.sensor_name,
                    s.temperature,
                    sh.shop_name,
                    c.name as city,
                    r.name as region
                FROM sensors s
                JOIN shops sh ON s.shop_id = sh.id
                JOIN cities c ON sh.city_id = c.id
                JOIN regions r ON c.region_id = r.id
                WHERE s.sensor_rom = $1
            `;
            const result = await pool.query(query, [sensorRom]);
            return result.rows[0] || {
                sensor_rom: sensorRom,
                freezer_name: sensorRom,
                temperature: 0,
                shop_name: 'N/A',
                city: 'N/A',
                region: 'N/A'
            };
        } catch (error) {
            console.error('Error getting sensor details:', error);
            return {
                sensor_rom: sensorRom,
                freezer_name: sensorRom,
                temperature: 0,
                shop_name: 'N/A',
                city: 'N/A',
                region: 'N/A'
            };
        }
    }
    
    // ============================================
    // GET TEMP STATUS
    // ============================================
    getTempStatus(temperature) {
        if (temperature === null || temperature === undefined) return 'Unknown';
        if (temperature <= -16) return 'Normal';
        if (temperature > -16 && temperature <= -12) return 'Warning';
        if (temperature > -12) return 'Critical';
        return 'Unknown';
    }
}

module.exports = new MQTTMessageHandler();