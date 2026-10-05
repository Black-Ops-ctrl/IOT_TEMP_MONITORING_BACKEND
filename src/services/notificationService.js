// src/services/notificationService.js
const emailService = require('./emailService');
const pool = require('../config/database');

class NotificationService {

    /**
     * Get sensor status based on temperature
     */
    getStatus(temperature) {
        if (temperature <= -16) return 'Normal';
        if (temperature > -16 && temperature <= -12) return 'Warning';
        if (temperature > -12) return 'Critical';
        return 'Unknown';
    }

    /**
     * Send test email
     */
    async sendTestEmail() {
        try {
            console.log('📧 Sending test email...');
            
            const testFreezer = {
                freezer_name: 'Test Freezer',
                temperature: '25.5',
                shop_name: 'Test Shop',
                city: 'Lahore',
                region: 'Central'
            };
            
            const result = await emailService.sendCriticalAlert(testFreezer);
            console.log('✅ Test email sent:', result);
            return result;
        } catch (error) {
            console.error('❌ Error sending test email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check for critical freezers and send alerts
     * Critical = Temperature > -12°C
     */
    async checkAndSendCriticalAlerts() {
        try {
            console.log('🔍 Checking for critical freezers...');
            
            const query = `
                SELECT DISTINCT ON (s.sensor_rom)
                    s.sensor_rom,
                    s.temperature,
                    COALESCE(s.freezer_name, s.sensor_rom) as freezer_name,
                    sh.shop_name,
                    c.name as city,
                    r.name as region,
                    sr.timestamp as last_reading
                FROM sensors s
                JOIN sensor_readings sr ON s.sensor_rom = sr.sensor_rom
                JOIN shops sh ON s.shop_id = sh.id
                JOIN cities c ON sh.city_id = c.id
                JOIN regions r ON c.region_id = r.id
                WHERE s.temperature > -12
                  AND s.temperature IS NOT NULL
                  AND (EXTRACT(EPOCH FROM (NOW() - sr.timestamp)) / 60) <= 5
                ORDER BY s.sensor_rom, sr.timestamp DESC
            `;
            
            const result = await pool.query(query);
            const criticalFreezers = result.rows;
            
            console.log(`📊 Total unique critical freezers found: ${criticalFreezers.length}`);
            
            if (criticalFreezers.length === 0) {
                console.log('✅ No critical freezers found');
                return { success: true, count: 0, message: 'No critical freezers' };
            }
            
            console.log(`⚠️ Found ${criticalFreezers.length} unique critical freezer(s)`);
            
            let sentCount = 0;
            let failedCount = 0;
            
            for (const freezer of criticalFreezers) {
                try {
                    const result = await emailService.sendCriticalAlert(freezer);
                    if (result.success) {
                        sentCount++;
                        console.log(`✅ Critical alert sent for ${freezer.freezer_name}`);
                    } else {
                        failedCount++;
                        console.error(`❌ Failed to send critical alert for ${freezer.freezer_name}:`, result.error);
                    }
                } catch (error) {
                    failedCount++;
                    console.error(`❌ Error sending critical alert for ${freezer.freezer_name}:`, error);
                }
            }
            
            return {
                success: true,
                count: criticalFreezers.length,
                sentCount: sentCount,
                failedCount: failedCount,
                freezers: criticalFreezers
            };
            
        } catch (error) {
            console.error('❌ Error checking critical freezers:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send alert for a single critical freezer
     */
    async sendSingleAlert(freezer) {
        try {
            const result = await emailService.sendCriticalAlert(freezer);
            return result;
        } catch (error) {
            console.error('❌ Error sending single alert:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Check sensor status changes and send notifications
     * ✅ ONLY these 4 conditions:
     *    1. Normal → Critical
     *    2. Critical → Normal
     *    3. Active → Inactive
     *    4. Inactive → Active
     * ✅ History saved to prevent duplicate emails
     */
    // src/services/notificationService.js

async checkAndSendStatusNotifications() {
    try {
        console.log('🔍 Checking sensor status changes...');

        const query = `
            SELECT DISTINCT ON (s.sensor_rom)
                s.sensor_rom,
                s.temperature,
                COALESCE(s.freezer_name, s.sensor_rom) as freezer_name,
                sh.shop_name,
                c.name as city,
                r.name as region,
                sr.timestamp as last_reading,
                CASE 
                    WHEN s.temperature <= -16 THEN 'Normal'
                    WHEN s.temperature > -16 AND s.temperature <= -12 THEN 'Warning'
                    WHEN s.temperature > -12 THEN 'Critical'
                    ELSE 'Unknown'
                END as temp_status,
                CASE 
                    WHEN (EXTRACT(EPOCH FROM (NOW() - sr.timestamp)) / 60) > 5 THEN 'Inactive'
                    ELSE 'Active'
                END as activity_status
            FROM sensors s
            JOIN sensor_readings sr ON s.sensor_rom = sr.sensor_rom
            JOIN shops sh ON s.shop_id = sh.id
            JOIN cities c ON sh.city_id = c.id
            JOIN regions r ON c.region_id = r.id
            WHERE s.temperature IS NOT NULL
            ORDER BY s.sensor_rom, sr.timestamp DESC
        `;

        const result = await pool.query(query);
        const currentSensors = result.rows;

        console.log(`📊 Checking ${currentSensors.length} sensors for status changes...`);

        let sentCount = 0;
        let failedCount = 0;
        let notifications = [];

        for (const sensor of currentSensors) {
            // ✅ Get LAST history entry
            const historyQuery = `
                SELECT temp_status, activity_status, notification_sent_at
                FROM sensor_status_history
                WHERE sensor_rom = $1
                ORDER BY changed_at DESC
                LIMIT 1
            `;
            const historyResult = await pool.query(historyQuery, [sensor.sensor_rom]);

            const prevTemp = historyResult.rows[0]?.temp_status || null;
            const prevActivity = historyResult.rows[0]?.activity_status || null;
            const currentTemp = sensor.temp_status;
            const currentActivity = sensor.activity_status;

            // ✅ If no history exists, create one and skip (don't send email)
            if (prevTemp === null || prevActivity === null) {
                console.log(`📝 First time for ${sensor.freezer_name}, saving initial status without email`);
                
                // Save initial status without sending email
                await pool.query(
                    `INSERT INTO sensor_status_history 
                     (sensor_rom, temp_status, activity_status, temperature, freezer_name, shop_name, city, region, notified, notification_sent_at)
                     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
                    [
                        sensor.sensor_rom,
                        currentTemp,
                        currentActivity,
                        sensor.temperature,
                        sensor.freezer_name,
                        sensor.shop_name,
                        sensor.city,
                        sensor.region,
                        false,
                        null
                    ]
                );
                console.log(`✅ Initial status saved for ${sensor.freezer_name}`);
                continue; // ✅ Skip email for first time
            }

            // ✅ Check if status actually changed
            const tempChanged = (prevTemp !== currentTemp);
            const activityChanged = (prevActivity !== currentActivity);

            // ✅ If no change, skip
            if (!tempChanged && !activityChanged) {
                console.log(`⏭️ No change for ${sensor.freezer_name}: Temp=${prevTemp}→${currentTemp}, Activity=${prevActivity}→${currentActivity}`);
                continue;
            }

            console.log(`🔄 Change detected for ${sensor.freezer_name}: Temp=${prevTemp}→${currentTemp}, Activity=${prevActivity}→${currentActivity}`);

            let statusChanged = false;
            let statusType = '';
            let emailResult = null;

            // ============================================
            // ✅ CONDITION 1: Normal → Critical
            // ============================================
            if (prevTemp === 'Normal' && currentTemp === 'Critical') {
                statusChanged = true;
                statusType = 'Normal → Critical';
                console.log(`📧 Sending email for ${sensor.freezer_name}: ${statusType}`);
                emailResult = await this.sendStatusChangeEmail(sensor, 'Critical', 'temp_critical');
            }

            // ============================================
            // ✅ CONDITION 2: Critical → Normal
            // ============================================
            else if (prevTemp === 'Critical' && currentTemp === 'Normal') {
                statusChanged = true;
                statusType = 'Critical → Normal';
                console.log(`📧 Sending email for ${sensor.freezer_name}: ${statusType}`);
                emailResult = await this.sendStatusChangeEmail(sensor, 'Normal', 'temp_normal');
            }

            // ============================================
            // ✅ CONDITION 3: Active → Inactive
            // ============================================
            else if (prevActivity === 'Active' && currentActivity === 'Inactive') {
                statusChanged = true;
                statusType = 'Active → Inactive';
                console.log(`📧 Sending email for ${sensor.freezer_name}: ${statusType}`);
                emailResult = await this.sendStatusChangeEmail(sensor, 'Inactive', 'sensor_inactive');
            }

            // ============================================
            // ✅ CONDITION 4: Inactive → Active
            // ============================================
            else if (prevActivity === 'Inactive' && currentActivity === 'Active') {
                statusChanged = true;
                statusType = 'Inactive → Active';
                console.log(`📧 Sending email for ${sensor.freezer_name}: ${statusType}`);
                emailResult = await this.sendStatusChangeEmail(sensor, 'Active', 'sensor_active');
            }

            // ✅ Save to history if status changed
            if (statusChanged) {
                const insertQuery = `
                    INSERT INTO sensor_status_history 
                    (sensor_rom, temp_status, activity_status, temperature, freezer_name, shop_name, city, region, notified, notification_sent_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                `;
                
                await pool.query(insertQuery, [
                    sensor.sensor_rom,
                    currentTemp,
                    currentActivity,
                    sensor.temperature,
                    sensor.freezer_name,
                    sensor.shop_name,
                    sensor.city,
                    sensor.region,
                    emailResult?.success || false,
                    emailResult?.success ? new Date() : null
                ]);
                
                console.log(`✅ History saved for ${sensor.freezer_name}: ${prevTemp}→${currentTemp}, ${prevActivity}→${currentActivity}`);
                
                if (emailResult?.success) {
                    sentCount++;
                    notifications.push({
                        sensor: sensor.sensor_rom,
                        change: statusType,
                        email: emailResult
                    });
                } else {
                    failedCount++;
                }
            }
        }

        if (sentCount > 0) {
            console.log(`✅ Sent ${sentCount} status change notification(s)`);
        } else {
            console.log('✅ No status changes detected');
        }

        return {
            success: true,
            notifications: notifications,
            count: notifications.length,
            sentCount: sentCount,
            failedCount: failedCount
        };

    } catch (error) {
        console.error('❌ Error checking status changes:', error);
        return { success: false, error: error.message };
    }
}

    /**
     * Send status change email - MODERN DESIGN
     */
    async sendStatusChangeEmail(sensor, newStatus, type) {
        try {
            const to = process.env.ALERT_EMAILS || 'burhannaeem561@gmail.com';

            const now = new Date();
            const dateStr = now.toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
            });
            const timeStr = now.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: true
            });

            const statusConfigs = {
                'temp_critical': {
                    icon: '🚨',
                    color: '#DC3545',
                    bgColor: '#FFF5F5',
                    borderColor: '#DC3545',
                    title: 'CRITICAL TEMPERATURE ALERT',
                    badge: 'CRITICAL',
                    badgeBg: '#DC3545',
                    message: `${sensor.freezer_name} has reached critical temperature`
                },
                'temp_normal': {
                    icon: '✅',
                    color: '#22C55E',
                    bgColor: '#F0FFF4',
                    borderColor: '#22C55E',
                    title: 'TEMPERATURE NORMAL',
                    badge: 'NORMAL',
                    badgeBg: '#22C55E',
                    message: `${sensor.freezer_name} temperature is back to normal`
                },
                'temp_warning': {
                    icon: '⚠️',
                    color: '#F59E0B',
                    bgColor: '#FFFBEB',
                    borderColor: '#F59E0B',
                    title: 'TEMPERATURE WARNING',
                    badge: 'WARNING',
                    badgeBg: '#F59E0B',
                    message: `${sensor.freezer_name} temperature is in warning range`
                },
                'sensor_inactive': {
                    icon: '📡',
                    color: '#6B7280',
                    bgColor: '#F9FAFB',
                    borderColor: '#6B7280',
                    title: 'SENSOR INACTIVE',
                    badge: 'INACTIVE',
                    badgeBg: '#6B7280',
                    message: `${sensor.freezer_name} has stopped sending data`
                },
                'sensor_active': {
                    icon: '📡',
                    color: '#22C55E',
                    bgColor: '#F0FFF4',
                    borderColor: '#22C55E',
                    title: 'SENSOR ACTIVE',
                    badge: 'ACTIVE',
                    badgeBg: '#22C55E',
                    message: `${sensor.freezer_name} is now active`
                }
            };

            const config = statusConfigs[type] || statusConfigs['temp_warning'];

            const mailOptions = {
                from: `"Temperature Monitor" <${process.env.EMAIL_FROM}>`,
                to: to,
                subject: `${config.icon} ${config.title}: ${sensor.freezer_name}`,
                html: `
                    <!DOCTYPE html>
                    <html lang="en">
                    <head>
                        <meta charset="UTF-8">
                        <meta name="viewport" content="width=device-width, initial-scale=1.0">
                        <title>${config.title}</title>
                        <style>
                            body { margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f4f6f9; }
                            .email-container { max-width: 580px; margin: 40px auto; background: #ffffff; border-radius: 16px; box-shadow: 0 20px 60px rgba(0,0,0,0.08); overflow: hidden; border: 1px solid #e9edf2; }
                            .header { padding: 32px 40px 24px; text-align: center; background: ${config.bgColor}; border-bottom: 4px solid ${config.borderColor}; }
                            .header-icon { font-size: 48px; display: block; margin-bottom: 8px; }
                            .header-title { font-size: 22px; font-weight: 700; color: #1a2332; margin: 0; letter-spacing: -0.5px; }
                            .header-badge { display: inline-block; background: ${config.badgeBg}; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 18px; border-radius: 20px; text-transform: uppercase; letter-spacing: 0.5px; margin-top: 6px; }
                            .body-content { padding: 32px 40px 24px; }
                            .greeting { font-size: 16px; color: #1a2332; margin: 0 0 6px 0; font-weight: 600; }
                            .sub-greeting { font-size: 14px; color: #6b7a8f; margin: 0 0 24px 0; }
                            .alert-card { background: ${config.bgColor}; border-left: 5px solid ${config.borderColor}; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; }
                            .alert-message { font-size: 15px; font-weight: 600; color: #1a2332; margin: 0 0 4px 0; }
                            .alert-desc { font-size: 13px; color: #4a5a6e; margin: 0; }
                            .details-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px 20px; background: #f8fafc; border-radius: 10px; padding: 18px 22px; margin-bottom: 24px; }
                            .detail-item { display: flex; flex-direction: column; }
                            .detail-label { font-size: 11px; font-weight: 600; color: #8a9aa8; text-transform: uppercase; letter-spacing: 0.5px; }
                            .detail-value { font-size: 15px; font-weight: 600; color: #1a2332; margin-top: 1px; }
                            .timestamp { text-align: center; font-size: 12px; color: #8a9aa8; padding: 12px 0 0 0; border-top: 1px solid #e9edf2; margin-top: 4px; }
                            .footer { background: #f8fafc; padding: 20px 40px 24px; text-align: center; border-top: 1px solid #e9edf2; }
                            .footer-text { font-size: 12px; color: #8a9aa8; margin: 0; line-height: 1.6; }
                            .footer-divider { width: 40px; height: 2px; background: #dce1e8; margin: 12px auto 10px; border-radius: 2px; }
                            @media (max-width: 480px) {
                                .email-container { margin: 16px; border-radius: 12px; }
                                .header { padding: 24px 20px 18px; }
                                .header-title { font-size: 18px; }
                                .body-content { padding: 24px 20px 18px; }
                                .details-grid { grid-template-columns: 1fr; gap: 8px; }
                                .footer { padding: 16px 20px 20px; }
                            }
                        </style>
                    </head>
                    <body>
                        <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f6f9;padding:20px 0;">
                            <tr>
                                <td align="center">
                                    <div class="email-container">
                                        <div class="header">
                                            <span class="header-icon">${config.icon}</span>
                                            <h1 class="header-title">${config.title}</h1>
                                            <span class="header-badge">${config.badge}</span>
                                        </div>
                                        <div class="body-content">
                                            <p class="greeting">Hello,</p>
                                            <p class="sub-greeting">A status change has been detected in your temperature monitoring system.</p>
                                            <div class="alert-card">
                                                <p class="alert-message">${config.message}</p>
                                                <p class="alert-desc">Current temperature: <strong>${sensor.temperature}°C</strong></p>
                                            </div>
                                            <div class="details-grid">
                                                <div class="detail-item">
                                                    <span class="detail-label">❄️ Freezer</span>
                                                    <span class="detail-value">${sensor.freezer_name}</span>
                                                </div>
                                                <div class="detail-item">
                                                    <span class="detail-label">🌡️ Temperature</span>
                                                    <span class="detail-value">${sensor.temperature}°C</span>
                                                </div>
                                                <div class="detail-item">
                                                    <span class="detail-label">🏪 Shop</span>
                                                    <span class="detail-value">${sensor.shop_name || 'N/A'}</span>
                                                </div>
                                                <div class="detail-item">
                                                    <span class="detail-label">📍 City</span>
                                                    <span class="detail-value">${sensor.city || 'N/A'}</span>
                                                </div>
                                                <div class="detail-item" style="grid-column: 1 / -1;">
                                                    <span class="detail-label">🗺️ Region</span>
                                                    <span class="detail-value">${sensor.region || 'N/A'}</span>
                                                </div>
                                            </div>
                                            <div class="timestamp">
                                                ${dateStr} at ${timeStr}
                                            </div>
                                        </div>
                                        <div class="footer">
                                            <p class="footer-text">
                                                This is an automated alert from the <strong>Temperature Monitoring System</strong>.<br>
                                                Please check your dashboard for more details.
                                            </p>
                                            <div class="footer-divider"></div>
                                            <p class="footer-text" style="font-size:11px;color:#a0aaba;">
                                                &copy; ${new Date().getFullYear()} Temperature Monitor. All rights reserved.
                                            </p>
                                        </div>
                                    </div>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `
            };

            const info = await emailService.transporter.sendMail(mailOptions);
            console.log(`✅ Status change email sent for ${sensor.freezer_name}:`, info.messageId);
            return { success: true, messageId: info.messageId };

        } catch (error) {
            console.error(`❌ Failed to send status change email for ${sensor.freezer_name}:`, error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get recent notifications - ONLY CRITICAL AND INACTIVE
     */
    async getRecentNotifications(limit = 20) {
    try {
        const query = `
            SELECT 
                sensor_rom,
                freezer_name,
                shop_name,
                city,
                region,
                temperature,
                temp_status,
                activity_status,
                changed_at as timestamp,
                notification_sent_at,
                CASE 
                    WHEN temp_status = 'Critical' THEN 'critical'
                    WHEN temp_status = 'Warning' THEN 'warning'
                    WHEN temp_status = 'Normal' THEN 'normal'
                    WHEN activity_status = 'Inactive' THEN 'inactive'
                    WHEN activity_status = 'Active' THEN 'active'
                    ELSE 'info'
                END as type,
                CASE 
                    WHEN temp_status = 'Critical' THEN '🚨 Critical Alert'
                    WHEN temp_status = 'Warning' THEN '⚠️ Warning Alert'
                    WHEN temp_status = 'Normal' THEN '✅ Normal'
                    WHEN activity_status = 'Inactive' THEN '❄️ Sensor Inactive'
                    WHEN activity_status = 'Active' THEN '📡 Sensor Active'
                    ELSE '📊 Status Change'
                END as title,
                CASE 
                    WHEN temp_status = 'Critical' THEN freezer_name || ' is critical at ' || temperature || '°C'
                    WHEN temp_status = 'Warning' THEN freezer_name || ' is warning at ' || temperature || '°C'
                    WHEN temp_status = 'Normal' THEN freezer_name || ' is normal at ' || temperature || '°C'
                    WHEN activity_status = 'Inactive' THEN freezer_name || ' is inactive'
                    WHEN activity_status = 'Active' THEN freezer_name || ' is active'
                    ELSE freezer_name || ' status changed'
                END as message
            FROM sensor_status_history
            WHERE notified = true  -- ✅ ALL notifications
            ORDER BY changed_at DESC
            LIMIT $1
        `;
        
        const result = await pool.query(query, [limit]);
        console.log(`📊 Found ${result.rows.length} notifications`);
        return result.rows;
    } catch (error) {
        console.error('Error getting recent notifications:', error);
        return [];
    }
}
}

module.exports = new NotificationService();