# 🚨 Emergency Alert System - POC

A real-time earthquake monitoring and SMS alert system built with Next.js, TypeScript, and Prisma.

## ✨ Features

- **Real-time Earthquake Monitoring**: Fetches data from USGS API every 60 seconds
- **SMS Alerts**: Sends immediate SMS notifications via Twilio for earthquakes >= 6.0 magnitude
- **Contact Management**: Add/manage emergency contacts with persistent SQLite database
- **Dashboard**: Modern web interface to monitor system status and recent alerts
- **Automatic Deduplication**: Prevents spam by tracking processed earthquakes
- **Manual Testing**: Test SMS service and manually check for new earthquakes

## 🚀 Quick Start

1. **Install Dependencies**
   ```bash
   pnpm install
   ```

2. **Set up Database**
   ```bash
   pnpm db:generate
   pnpm db:push
   ```

3. **Configure Twilio (Optional)**
   - Get credentials from [Twilio Console](https://console.twilio.com/)
   - Edit `.env.local` and uncomment/fill in Twilio credentials
   - Without Twilio, the system works but won't send SMS

4. **Start the Application**
   ```bash
   pnpm dev
   ```

5. **Open Dashboard**
   - Navigate to http://localhost:3000
   - Click "Start Monitoring" to begin earthquake detection
   - Use "Test SMS" to verify Twilio integration
   - Use "Manual Check" to force an immediate earthquake check

## 🏗️ Architecture

- **Frontend**: Next.js 14 + React + TypeScript + Tailwind CSS
- **Backend**: Next.js API Routes
- **Database**: SQLite with Prisma ORM
- **External APIs**: USGS Earthquake API, Twilio SMS API
- **Real-time Updates**: Polling-based (5-second dashboard refresh, 60-second earthquake check)

## 📊 Database Schema

- **contacts**: Emergency contact information
- **alert_logs**: Historical alert records
- **earthquake_cache**: Tracks processed earthquakes to prevent duplicates

## 🔧 Configuration

### Environment Variables (.env.local)

- `TWILIO_ACCOUNT_SID`: Your Twilio Account SID
- `TWILIO_AUTH_TOKEN`: Your Twilio Auth Token  
- `TWILIO_PHONE_NUMBER`: Your Twilio phone number (with +1 prefix)
- `MIN_MAGNITUDE`: Minimum earthquake magnitude to trigger alerts (default: 6.0)
- `ALERT_CHECK_INTERVAL`: How often to check for earthquakes in ms (default: 60000)

### Default Test Contacts

The system creates two test contacts on first run:
- Emergency Contact 1: +1234567890
- Emergency Contact 2: +0987654321

**Replace these with real phone numbers for testing!**

## 🧪 Testing

1. **Without Twilio**: System works in demo mode - shows earthquake detection but won't send SMS
2. **With Twilio**: 
   - Add your real phone number as a contact
   - Use "Test SMS" button to verify integration
   - Monitor real earthquakes or wait for magnitude 6+ events

## 🚀 Production Deployment

For production use, consider:

1. **Database**: Migrate from SQLite to PostgreSQL
2. **Real-time**: WebSocket connections instead of polling
3. **Queue System**: Bull/BullMQ for reliable message delivery
4. **Monitoring**: Error tracking, uptime monitoring
5. **Security**: Rate limiting, input validation, HTTPS
6. **Scalability**: Load balancing, caching, CDN

## 📝 Next Steps

This POC demonstrates core functionality. For a production system:

- Add email and WhatsApp notifications
- Implement geographic filtering
- Add user authentication
- Create mobile app
- Integrate with local emergency services
- Add advanced analytics and reporting

## ⚠️ Important Notes

- **Test Responsibly**: Use your own phone numbers for testing
- **Magnitude Threshold**: Currently set to 6.0+ (significant earthquakes)
- **Rate Limits**: Respects USGS API limits and Twilio rate limits
- **Data Retention**: All alerts and contacts are stored permanently

## 🔗 APIs Used

- **USGS Earthquake API**: https://earthquake.usgs.gov/earthquakes/feed/v1.0/geojson.php
- **Twilio SMS API**: https://www.twilio.com/docs/sms

Built with ❤️ for emergency preparedness and public safety.
