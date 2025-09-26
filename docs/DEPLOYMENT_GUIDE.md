# Emergency Weather Alert System - Deployment Guide

## Overview
This guide covers the complete deployment process for the Emergency Weather Alert System with enterprise-grade security features implemented in Phases 1 & 2.

## Table of Contents
- [Prerequisites](#prerequisites)
- [Environment Setup](#environment-setup)
- [Security Configuration](#security-configuration)
- [Database Setup](#database-setup)
- [Redis Configuration](#redis-configuration)
- [External Services](#external-services)
- [Production Deployment](#production-deployment)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Security Hardening](#security-hardening)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### System Requirements
- **Node.js**: v18.17.0 or higher
- **PostgreSQL**: v14.0 or higher
- **Redis**: v6.0 or higher (for rate limiting and caching)
- **SSL Certificate**: Valid certificate for HTTPS
- **Domain**: Registered domain with DNS access

### Required Accounts & Services
- **Twilio Account**: For SMS delivery
- **SendGrid Account**: For email notifications
- **hCaptcha Account**: For bot protection
- **IPInfo.io Account** (optional): For enhanced geolocation
- **Cloud Provider**: AWS, Google Cloud, or Azure

## Environment Setup

### 1. Clone and Install
```bash
git clone <repository-url>
cd weather-alert
npm install
```

### 2. Environment Variables
Create `.env.local` file with the following configuration:

```bash
# Database Configuration
DATABASE_URL="postgresql://username:password@localhost:5432/weather_alert_db"

# Authentication & Security
NEXTAUTH_SECRET="your-super-secure-secret-key-here"
NEXTAUTH_URL="https://yourdomain.com"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="+1234567890"

# Email Service (SendGrid)
SENDGRID_API_KEY="your-sendgrid-api-key"
SENDGRID_FROM_EMAIL="alerts@yourdomain.com"

# External APIs
USGS_API_BASE_URL="https://earthquake.usgs.gov/fdsnws/event/1"
NOAA_API_BASE_URL="https://api.weather.gov"

# Redis (Rate Limiting & Caching)
REDIS_URL="redis://localhost:6379"
UPSTASH_REDIS_REST_URL="your-upstash-redis-url"
UPSTASH_REDIS_REST_TOKEN="your-upstash-token"

# CAPTCHA (hCaptcha)
HCAPTCHA_SITE_KEY="your-hcaptcha-site-key"
HCAPTCHA_SECRET_KEY="your-hcaptcha-secret-key"
NEXT_PUBLIC_HCAPTCHA_SITE_KEY="your-hcaptcha-site-key"

# Geolocation Services
IPINFO_TOKEN="your-ipinfo-token"

# Security Configuration
CAPTCHA_FAIL_OPEN="false"
EXPECTED_HOSTNAME="yourdomain.com"

# Application Settings
NODE_ENV="production"
LOG_LEVEL="info"

# Optional Monitoring
SENTRY_DSN="your-sentry-dsn"
DATADOG_API_KEY="your-datadog-key"
```

### 3. Database Migration
```bash
# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate deploy

# Seed initial data (optional)
npx prisma db seed
```

### 4. Build Application
```bash
npm run build
```

## Security Configuration

### SSL/TLS Setup
1. **Obtain SSL Certificate**
   ```bash
   # Using Let's Encrypt (certbot)
   sudo certbot certonly --standalone -d yourdomain.com
   ```

2. **Configure HTTPS Redirect**
   ```nginx
   # Nginx configuration
   server {
       listen 80;
       server_name yourdomain.com;
       return 301 https://$server_name$request_uri;
   }
   ```

### Security Headers Configuration
The application automatically applies comprehensive security headers:
- Content Security Policy (CSP)
- HTTP Strict Transport Security (HSTS)
- X-Frame-Options: DENY
- X-Content-Type-Options: nosniff
- Referrer-Policy: strict-origin-when-cross-origin

### CAPTCHA Setup
1. **Register with hCaptcha**
   - Visit [hCaptcha.com](https://hcaptcha.com)
   - Create account and obtain site key & secret key
   - Configure domains in hCaptcha dashboard

2. **Test CAPTCHA Integration**
   ```bash
   npm run test:security:captcha
   ```

## Database Setup

### PostgreSQL Configuration
1. **Create Database**
   ```sql
   CREATE DATABASE weather_alert_db;
   CREATE USER weather_alert_user WITH PASSWORD 'secure_password';
   GRANT ALL PRIVILEGES ON DATABASE weather_alert_db TO weather_alert_user;
   ```

2. **Performance Optimization**
   ```sql
   -- Recommended PostgreSQL settings for production
   ALTER SYSTEM SET shared_preload_libraries = 'pg_stat_statements';
   ALTER SYSTEM SET max_connections = 200;
   ALTER SYSTEM SET shared_buffers = '256MB';
   ALTER SYSTEM SET effective_cache_size = '1GB';
   ALTER SYSTEM SET work_mem = '4MB';
   ```

3. **Backup Strategy**
   ```bash
   # Daily backup script
   #!/bin/bash
   pg_dump weather_alert_db | gzip > backup_$(date +%Y%m%d).sql.gz
   
   # Retention: Keep 30 days of backups
   find /backup/path -name "backup_*.sql.gz" -mtime +30 -delete
   ```

## Redis Configuration

### Redis Setup
1. **Install and Configure Redis**
   ```bash
   # Ubuntu/Debian
   sudo apt update
   sudo apt install redis-server
   
   # Configure for production
   sudo nano /etc/redis/redis.conf
   ```

2. **Redis Production Settings**
   ```conf
   # /etc/redis/redis.conf
   bind 127.0.0.1
   port 6379
   requirepass your_secure_redis_password
   maxmemory 256mb
   maxmemory-policy allkeys-lru
   save 900 1
   save 300 10
   save 60 10000
   ```

3. **Redis Monitoring**
   ```bash
   # Monitor Redis performance
   redis-cli info memory
   redis-cli info stats
   ```

## External Services

### Twilio SMS Configuration
1. **Account Setup**
   - Create Twilio account
   - Purchase phone number
   - Configure webhook URLs

2. **Rate Limiting**
   ```javascript
   // Twilio rate limits (built into our system)
   const SMS_RATE_LIMITS = {
     perSecond: 1,
     perMinute: 5,
     perHour: 100,
     perDay: 1000
   }
   ```

### SendGrid Email Configuration
1. **Domain Authentication**
   - Add CNAME records for domain verification
   - Configure sender reputation

2. **Email Templates**
   ```bash
   # Create email templates in SendGrid dashboard
   - Alert notifications
   - System status updates
   - Security alerts
   ```

## Production Deployment

### Option 1: Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine AS runner
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
    depends_on:
      - postgres
      - redis
    
  postgres:
    image: postgres:14
    environment:
      POSTGRES_DB: weather_alert_db
      POSTGRES_USER: weather_alert_user
      POSTGRES_PASSWORD: secure_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
    
  redis:
    image: redis:7-alpine
    command: redis-server --requirepass your_redis_password
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### Option 2: Serverless Deployment (Vercel)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to Vercel
vercel --prod

# Configure environment variables in Vercel dashboard
```

### Option 3: Traditional VPS/Cloud Deployment
```bash
# PM2 Process Manager
npm install -g pm2

# PM2 Ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'weather-alert',
    script: 'npm',
    args: 'start',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start application
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Load Balancer Configuration (Nginx)
```nginx
upstream weather_alert {
    server 127.0.0.1:3000;
    server 127.0.0.1:3001;
    server 127.0.0.1:3002;
}

server {
    listen 443 ssl http2;
    server_name yourdomain.com;
    
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;
    
    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload";
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    
    location / {
        proxy_pass http://weather_alert;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    location /api/ {
        limit_req zone=api burst=20 nodelay;
        proxy_pass http://weather_alert;
    }
}
```

## Monitoring & Maintenance

### Health Checks
```bash
# System health check script
#!/bin/bash
curl -f http://localhost:3000/api/health || exit 1
curl -f http://localhost:3000/api/security/metrics || exit 1
```

### Log Management
```bash
# Rotate logs daily
0 0 * * * /usr/sbin/logrotate /etc/logrotate.d/weather-alert

# /etc/logrotate.d/weather-alert
/var/log/weather-alert/*.log {
    daily
    missingok
    rotate 30
    compress
    notifempty
    create 644 www-data www-data
    postrotate
        systemctl reload nginx
    endscript
}
```

### Performance Monitoring
```javascript
// Monitor key metrics
const MONITOR_ENDPOINTS = [
  '/api/health',
  '/api/security/metrics',
  '/api/auth/otp/request',
  '/api/alerts/send'
]

// Alerting thresholds
const THRESHOLDS = {
  responseTime: 5000, // 5 seconds
  errorRate: 5, // 5%
  threatLevel: 'high',
  diskUsage: 85 // 85%
}
```

## Security Hardening

### Operating System Security
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Configure firewall
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable

# Disable unnecessary services
sudo systemctl disable bluetooth
sudo systemctl disable cups
sudo systemctl disable avahi-daemon

# Configure automatic security updates
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### Application Security Checklist
- [ ] All environment variables configured
- [ ] HTTPS enabled with valid certificate
- [ ] CAPTCHA configured and tested
- [ ] Rate limiting active
- [ ] Security headers implemented
- [ ] Database connections encrypted
- [ ] Redis password protected
- [ ] Log files protected (600 permissions)
- [ ] Sensitive endpoints authenticated
- [ ] CORS properly configured
- [ ] CSP headers customized for domain
- [ ] Backup procedures tested

## Troubleshooting

### Common Issues

#### 1. Database Connection Issues
```bash
# Check PostgreSQL status
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# Test connection
npx prisma db pull
```

#### 2. Redis Connection Issues
```bash
# Check Redis status
redis-cli ping

# Monitor Redis logs
sudo tail -f /var/log/redis/redis-server.log
```

#### 3. High Memory Usage
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head

# Clear Redis cache if needed
redis-cli flushdb
```

#### 4. High CPU Usage
```bash
# Monitor processes
top -p $(pgrep -d',' -f weather-alert)

# Check for infinite loops in logs
tail -f /var/log/weather-alert/app.log | grep -i error
```

#### 5. CAPTCHA Issues
```bash
# Test CAPTCHA endpoint
curl -X POST http://localhost:3000/api/test/captcha \
  -H "Content-Type: application/json" \
  -d '{"token":"test-token"}'
```

### Debug Mode
```bash
# Enable debug logging
export LOG_LEVEL=debug
export NODE_ENV=development

# Run with debugging
npm run dev
```

### Performance Profiling
```bash
# Profile application
npm run build
npm run start --inspect

# Open Chrome DevTools: chrome://inspect
```

## Maintenance Schedule

### Daily Tasks
- Monitor security alerts
- Check system resource usage
- Review error logs
- Verify backup completion

### Weekly Tasks  
- Update security threat intelligence
- Review performance metrics
- Test disaster recovery procedures
- Update documentation

### Monthly Tasks
- Security vulnerability assessment
- Performance optimization review
- Backup restoration testing
- Dependency updates

### Quarterly Tasks
- Full security audit
- Disaster recovery drill
- Capacity planning review
- Security training update

## Support & Resources

### Emergency Contacts
- **System Administrator**: admin@yourdomain.com
- **Security Team**: security@yourdomain.com
- **On-Call Engineer**: +1-XXX-XXX-XXXX

### Documentation Links
- [Security Features Guide](./SECURITY.md)
- [API Documentation](./API.md)
- [Monitoring Guide](./MONITORING.md)
- [Troubleshooting Guide](./TROUBLESHOOTING.md)

### External Resources
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [Redis Documentation](https://redis.io/documentation)
- [hCaptcha Documentation](https://docs.hcaptcha.com/)

---
**Last Updated**: December 2024
**Version**: 2.0.0 (Phase 2 Complete)
