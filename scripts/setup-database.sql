-- Create database and user for emergency alert system
CREATE DATABASE emergency_alerts;
CREATE USER emergency_user WITH PASSWORD 'emergency_pass';

-- Grant privileges
GRANT ALL PRIVILEGES ON DATABASE emergency_alerts TO emergency_user;

-- Connect to the emergency_alerts database and grant schema privileges
\c emergency_alerts

-- Grant usage and create on schema
GRANT USAGE ON SCHEMA public TO emergency_user;
GRANT CREATE ON SCHEMA public TO emergency_user;

-- Grant all privileges on all tables in schema public (for existing tables)
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO emergency_user;

-- Grant all privileges on all sequences in schema public (for existing sequences)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO emergency_user;

-- Grant privileges on future tables and sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO emergency_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO emergency_user;
