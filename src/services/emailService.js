// src/services/emailService.js
const nodemailer = require('nodemailer');

class EmailService {
    constructor() {
        // ✅ Updated with metasage.net email settings
        this.transporter = nodemailer.createTransport({
            host: 'mail.metasage.net',
            port: 587,
            secure: false, // TLS
            auth: {
                user: 'iot@metasage.net',
                pass: 'ABC@123sgl'
            },
            tls: {
                rejectUnauthorized: false
            }
        });
        
        this.fromEmail = 'iot@metasage.net';
    }

    /**
     * Send Critical Alert Email
     */
    async sendCriticalAlert(freezer) {
        const to = process.env.ALERT_EMAILS || 'iot@metasage.net';
        
        const mailOptions = {
            from: `"Temperature Monitor" <${this.fromEmail}>`,
            to: to,
            subject: `🚨 CRITICAL ALERT: ${freezer.freezer_name} - ${freezer.temperature}°C`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: #dc3545; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .alert-icon { font-size: 48px; text-align: center; margin: 20px 0; }
                        .detail { padding: 12px 0; border-bottom: 1px solid #eee; }
                        .detail strong { display: inline-block; width: 130px; color: #555; }
                        .detail .value { color: #333; font-weight: bold; }
                        .critical-temp { color: #dc3545; font-size: 28px; font-weight: bold; }
                        .status-badge { display: inline-block; background: #dc3545; color: white; padding: 5px 15px; border-radius: 20px; font-size: 14px; }
                        .footer { margin-top: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🚨 CRITICAL TEMPERATURE ALERT</h1>
                        </div>
                        
                        <div class="alert-icon">🌡️</div>
                        
                        <div style="text-align: center; margin-bottom: 20px;">
                            <span class="critical-temp">${freezer.temperature}°C</span>
                            <br>
                            <span class="status-badge">⚠️ CRITICAL</span>
                            <p style="color: #dc3545; font-weight: bold; margin-top: 10px;">
                                Temperature is above critical threshold!
                            </p>
                        </div>
                        
                        <div class="detail">
                            <strong>❄️ Freezer:</strong>
                            <span class="value">${freezer.freezer_name}</span>
                        </div>
                        
                        <div class="detail">
                            <strong>🏪 Shop:</strong>
                            <span class="value">${freezer.shop_name || 'N/A'}</span>
                        </div>
                        
                        <div class="detail">
                            <strong>📍 City:</strong>
                            <span class="value">${freezer.city || 'N/A'}</span>
                        </div>
                        
                        <div class="detail">
                            <strong>🗺️ Region:</strong>
                            <span class="value">${freezer.region || 'N/A'}</span>
                        </div>
                        
                        <div class="detail">
                            <strong>🕐 Time:</strong>
                            <span class="value">${new Date().toLocaleString()}</span>
                        </div>
                        
                        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
                            <p style="color: #856404; font-weight: bold;">
                                ⚠️ Please take immediate action!
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated alert from Temperature Monitoring System.</p>
                            <p>© ${new Date().getFullYear()} All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log('✅ Critical alert email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send critical alert email:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Send multiple critical alerts in one email
     */
    async sendCriticalAlertBatch(freezers) {
        if (!freezers || freezers.length === 0) {
            console.log('No critical freezers to alert');
            return { success: false, error: 'No critical freezers' };
        }

        const to = process.env.ALERT_EMAILS || 'iot@metasage.net';
        
        const freezerListHtml = freezers.map((f, index) => `
            <tr style="${index % 2 === 0 ? 'background: #f8f9fa;' : ''}">
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd;">${index + 1}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd;"><strong>${f.freezer_name}</strong></td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd; color: #dc3545; font-weight: bold;">${f.temperature}°C</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd;">${f.shop_name || 'N/A'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd;">${f.city || 'N/A'}</td>
                <td style="padding: 8px 12px; border-bottom: 1px solid #ddd;">${f.region || 'N/A'}</td>
            </tr>
        `).join('');

        const mailOptions = {
            from: `"Temperature Monitor" <${this.fromEmail}>`,
            to: to,
            subject: `🚨 CRITICAL ALERT: ${freezers.length} freezer(s) in critical state!`,
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <style>
                        body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
                        .container { max-width: 700px; margin: 0 auto; background: white; border-radius: 10px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                        .header { background: #dc3545; color: white; padding: 20px; border-radius: 10px 10px 0 0; text-align: center; margin: -30px -30px 20px -30px; }
                        .header h1 { margin: 0; font-size: 24px; }
                        .count { font-size: 36px; font-weight: bold; color: #dc3545; text-align: center; margin: 15px 0; }
                        table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                        th { background: #dc3545; color: white; padding: 10px 12px; text-align: left; }
                        td { padding: 8px 12px; border-bottom: 1px solid #ddd; }
                        .footer { margin-top: 20px; text-align: center; color: #888; font-size: 12px; border-top: 1px solid #eee; padding-top: 20px; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>🚨 CRITICAL TEMPERATURE ALERT</h1>
                        </div>
                        
                        <div class="count">${freezers.length} Freezer(s) Critical</div>
                        
                        <table>
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Freezer</th>
                                    <th>Temperature</th>
                                    <th>Shop</th>
                                    <th>City</th>
                                    <th>Region</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${freezerListHtml}
                            </tbody>
                        </table>
                        
                        <div style="text-align: center; margin-top: 20px; padding: 15px; background: #fff3cd; border-radius: 5px;">
                            <p style="color: #856404; font-weight: bold;">
                                ⚠️ Please take immediate action on all critical freezers!
                            </p>
                        </div>
                        
                        <div class="footer">
                            <p>This is an automated alert from Temperature Monitoring System.</p>
                            <p>© ${new Date().getFullYear()} All rights reserved.</p>
                        </div>
                    </div>
                </body>
                </html>
            `
        };

        try {
            const info = await this.transporter.sendMail(mailOptions);
            console.log(`✅ Batch critical alert email sent for ${freezers.length} freezers:`, info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('❌ Failed to send batch critical alert email:', error);
            return { success: false, error: error.message };
        }
    }
}

module.exports = new EmailService();