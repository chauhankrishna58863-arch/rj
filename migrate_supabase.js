import pg from 'pg';
const { Client } = pg;

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:8851345825%40@db.vggutoszxazjjlralkyo.supabase.co:5432/postgres';

const migrationSql = `
DO $$ BEGIN
    CREATE TYPE subscription_tier AS ENUM ('Pro', 'Premium', 'Ultra');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('Active', 'Locked', 'Suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE host_permission_profile AS ENUM ('Full', 'Restricted', 'Sandbox', 'Admin');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(255) PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    name VARCHAR(255),
    gmail VARCHAR(255),
    mobile VARCHAR(50),
    age INT,
    status user_status DEFAULT 'Active',
    permission_level host_permission_profile DEFAULT 'Sandbox',
    failed_login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    tier subscription_tier DEFAULT 'Pro',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    session_id SERIAL PRIMARY KEY,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    username VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS user_otp_ledger (
    otp_id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE SET NULL,
    email VARCHAR(255),
    mobile VARCHAR(50),
    gmail_otp VARCHAR(10),
    phone_otp VARCHAR(10),
    generated_otp VARCHAR(10),
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    attempts_count INT DEFAULT 0,
    hourly_resend_count INT DEFAULT 0,
    last_resend_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_token_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    gemini_token_balance INT DEFAULT 1500000,
    openai_token_balance INT DEFAULT 1500000,
    claude_token_balance INT DEFAULT 1500000,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_plan_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    preserved_gemini_balance INT NOT NULL,
    preserved_openai_balance INT NOT NULL,
    preserved_claude_balance INT NOT NULL,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active_waiting BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS human_feeling_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    feeling_category VARCHAR(100) NOT NULL,
    sentiment_score NUMERIC(3,2) NOT NULL,
    detected_context TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_auto_upgrades (
    upgrade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    upgrade_payload TEXT NOT NULL,
    benefit_explanation TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    admin_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS live_user_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL,
    feedback_payload TEXT NOT NULL,
    category VARCHAR(100) DEFAULT 'General',
    rating INT DEFAULT 5,
    device VARCHAR(100) DEFAULT 'Desktop',
    status VARCHAR(50) DEFAULT 'Pending',
    admin_reply TEXT,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_api_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,
    encrypted_key_value TEXT NOT NULL,
    is_active_state BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS historical_session_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) REFERENCES users(user_id) ON DELETE CASCADE,
    session_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_payload JSONB
);

CREATE TABLE IF NOT EXISTS security_threats (
    alert_id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    username VARCHAR(255),
    full_name VARCHAR(255),
    email VARCHAR(255),
    mobile VARCHAR(50),
    age INT,
    tier VARCHAR(50),
    permission_level VARCHAR(50),
    prompt_message TEXT,
    threat_type VARCHAR(100),
    severity VARCHAR(50),
    detection_rule VARCHAR(255),
    appliance_trace_id VARCHAR(100),
    status VARCHAR(50) DEFAULT 'UNRESOLVED',
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS projects (
    id VARCHAR(100) PRIMARY KEY,
    project_name VARCHAR(255) NOT NULL,
    user_id VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_chat_history (
    id VARCHAR(100) PRIMARY KEY,
    user_id VARCHAR(100),
    project VARCHAR(255),
    sender VARCHAR(50),
    model_provider VARCHAR(100),
    message TEXT,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
`;

async function runMigration() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected! Executing schema migration...');
    await client.query(migrationSql);
    console.log('✔ All tables successfully created in Supabase!');

    // Query list of created tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      ORDER BY table_name;
    `);
    console.log('Public tables in Supabase:', res.rows.map(r => r.table_name));

    await client.end();
  } catch (err) {
    console.error('Migration error:', err);
    try { await client.end(); } catch (e) {}
    process.exit(1);
  }
}

runMigration();
