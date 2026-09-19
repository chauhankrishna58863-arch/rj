import pg from 'pg';
const { Pool } = pg;
import { User, Project, FeedbackItem, SecurityThreatAlert } from './types.js';

const SUPABASE_DB_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:8851345825%40@db.vggutoszxazjjlralkyo.supabase.co:5432/postgres';

export const pool = new Pool({
  connectionString: SUPABASE_DB_URL,
  ssl: { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

pool.on('error', (err) => {
  console.error('Unexpected Supabase PostgreSQL client pool error:', err.message);
});

let isDbConnected = false;

export async function testDbConnection(): Promise<boolean> {
  try {
    const client = await pool.connect();
    const res = await client.query('SELECT NOW() AS connected_time');
    client.release();
    isDbConnected = true;
    console.log('⚡ Supabase PostgreSQL connected successfully at:', res.rows[0].connected_time);
    return true;
  } catch (err: any) {
    console.warn('⚠️ Supabase connection test warning:', err.message);
    isDbConnected = false;
    return false;
  }
}

export function isDatabaseConnected(): boolean {
  return isDbConnected;
}

// ---------------------------------------------------------------------------
// Session Persistence
// ---------------------------------------------------------------------------
export async function persistSessionToDb(token: string, userId: string, username: string, ip?: string, userAgent?: string): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000); // 30 days
    await pool.query(
      `INSERT INTO user_sessions (session_token, user_id, username, ip_address, user_agent, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (session_token) DO UPDATE SET last_activity = NOW()`,
      [token, userId, username, ip && !ip.includes(':') ? ip : null, userAgent || null, expiresAt]
    );
    return true;
  } catch (err: any) {
    console.warn('Could not persist session to Supabase:', err.message);
    return false;
  }
}

export async function deleteSessionFromDb(token: string): Promise<boolean> {
  try {
    await pool.query(`DELETE FROM user_sessions WHERE session_token = $1`, [token]);
    return true;
  } catch (err: any) {
    console.warn('Could not delete session from Supabase:', err.message);
    return false;
  }
}

export async function loadSessionsFromDb(): Promise<Array<{ token: string; userId: string; username: string; ip?: string; userAgent?: string }>> {
  try {
    const res = await pool.query(
      `SELECT session_token, user_id, username, ip_address, user_agent 
       FROM user_sessions 
       WHERE expires_at > NOW() AND is_active = TRUE`
    );
    return res.rows.map(r => ({
      token: r.session_token,
      userId: r.user_id,
      username: r.username,
      ip: r.ip_address,
      userAgent: r.user_agent
    }));
  } catch (err: any) {
    console.warn('Could not load sessions from Supabase:', err.message);
    return [];
  }
}


// ---------------------------------------------------------------------------
// OTP Ledger Persistence
// ---------------------------------------------------------------------------
export async function recordOtpInLedger(params: {
  email: string;
  mobile: string;
  gmailOtp: string;
  phoneOtp: string;
  expiresAt: Date;
}): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO user_otp_ledger (email, mobile, gmail_otp, phone_otp, generated_otp, expires_at, is_verified, attempts_count)
       VALUES ($1, $2, $3, $4, $5, $6, FALSE, 0)`,
      [
        params.email.toLowerCase(),
        params.mobile,
        params.gmailOtp,
        params.phoneOtp,
        params.phoneOtp,
        params.expiresAt
      ]
    );
    console.log(`📝 OTP recorded in Supabase user_otp_ledger for ${params.email} / ${params.mobile}`);
    return true;
  } catch (err: any) {
    console.warn('Could not record OTP in Supabase ledger:', err.message);
    return false;
  }
}

export async function markOtpVerifiedInLedger(email: string, mobile: string): Promise<boolean> {
  try {
    await pool.query(
      `UPDATE user_otp_ledger 
       SET is_verified = TRUE 
       WHERE (LOWER(email) = $1 OR mobile = $2) AND expires_at > NOW()`,
      [email.toLowerCase(), mobile]
    );
    return true;
  } catch (err: any) {
    console.warn('Could not mark OTP verified in Supabase ledger:', err.message);
    return false;
  }
}

export async function getLatestOtpFromLedger(email?: string, mobile?: string): Promise<{
  gmail_otp: string;
  phone_otp: string;
  expires_at: Date;
  is_verified: boolean;
} | null> {
  try {
    const res = await pool.query(
      `SELECT gmail_otp, phone_otp, expires_at, is_verified 
       FROM user_otp_ledger 
       WHERE (expires_at > NOW()) AND ($1::text IS NOT NULL AND LOWER(email) = LOWER($1) OR $2::text IS NOT NULL AND mobile = $2)
       ORDER BY created_at DESC LIMIT 1`,
      [email || null, mobile || null]
    );
    if (res.rows.length > 0) {
      return res.rows[0];
    }
    return null;
  } catch (err: any) {
    console.warn('Could not fetch OTP from Supabase ledger:', err.message);
    return null;
  }
}

// ---------------------------------------------------------------------------
// User Persistence & Sync
// ---------------------------------------------------------------------------
export async function persistUserToDb(user: User): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO users (
        user_id, username, email, password_hash, name, gmail, mobile, age,
        status, permission_level, tier, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      ON CONFLICT (username) DO UPDATE SET
        email = EXCLUDED.email,
        password_hash = EXCLUDED.password_hash,
        name = EXCLUDED.name,
        gmail = EXCLUDED.gmail,
        mobile = EXCLUDED.mobile,
        age = EXCLUDED.age,
        status = EXCLUDED.status,
        permission_level = EXCLUDED.permission_level,
        tier = EXCLUDED.tier`,
      [
        user.user_id,
        user.username,
        user.email,
        user.password_hash,
        user.name || null,
        user.gmail || user.email,
        user.mobile || null,
        user.age || null,
        user.status || 'Active',
        user.permission_level || 'Sandbox',
        user.tier || 'Pro',
        user.created_at || new Date().toISOString()
      ]
    );

    // Also persist token pool
    await pool.query(
      `INSERT INTO user_token_pools (
        user_id, gemini_token_balance, openai_token_balance, claude_token_balance
      ) VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id) DO UPDATE SET
        gemini_token_balance = EXCLUDED.gemini_token_balance,
        openai_token_balance = EXCLUDED.openai_token_balance,
        claude_token_balance = EXCLUDED.claude_token_balance,
        last_updated_at = NOW()`,
      [
        user.user_id,
        user.gemini_token_balance || 1500000,
        user.openai_token_balance || 1500000,
        user.claude_token_balance || 1500000
      ]
    );

    console.log(`💾 User ${user.username} synced to Supabase users & user_token_pools tables.`);
    return true;
  } catch (err: any) {
    console.warn('Failed to persist user to Supabase:', err.message);
    return false;
  }
}

export async function loadUsersFromDb(): Promise<User[]> {
  try {
    const res = await pool.query(`
      SELECT 
        u.user_id, u.username, u.email, u.password_hash, u.name, u.gmail, u.mobile, u.age,
        u.status, u.permission_level, u.tier, u.created_at,
        COALESCE(p.gemini_token_balance, 1500000) as gemini_token_balance,
        COALESCE(p.openai_token_balance, 1500000) as openai_token_balance,
        COALESCE(p.claude_token_balance, 1500000) as claude_token_balance
      FROM users u
      LEFT JOIN user_token_pools p ON u.user_id = p.user_id
    `);

    return res.rows.map((row) => ({
      user_id: row.user_id,
      username: row.username,
      email: row.email,
      password_hash: row.password_hash,
      name: row.name,
      gmail: row.gmail,
      mobile: row.mobile,
      age: row.age,
      status: row.status,
      permission_level: row.permission_level,
      tier: row.tier,
      created_at: row.created_at?.toISOString() || new Date().toISOString(),
      gemini_token_balance: row.gemini_token_balance,
      openai_token_balance: row.openai_token_balance,
      claude_token_balance: row.claude_token_balance
    }));
  } catch (err: any) {
    console.warn('Could not load users from Supabase:', err.message);
    return [];
  }
}

// ---------------------------------------------------------------------------
// Project Persistence
// ---------------------------------------------------------------------------
export async function persistProjectToDb(project: Project): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO projects (id, project_name, user_id, created_at)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO UPDATE SET project_name = EXCLUDED.project_name`,
      [project.id, project.project_name, project.user_id, project.created_at]
    );
    return true;
  } catch (err: any) {
    console.warn('Failed to persist project to Supabase:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Feedback Persistence
// ---------------------------------------------------------------------------
export async function persistFeedbackToDb(item: FeedbackItem): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO live_user_feedback (username, feedback_payload, category, rating, status, submitted_at)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        item.username,
        item.feedback_payload,
        item.category || 'General',
        item.rating || 5,
        item.status || 'Pending',
        item.created_at || new Date().toISOString()
      ]
    );
    return true;
  } catch (err: any) {
    console.warn('Failed to persist feedback to Supabase:', err.message);
    return false;
  }
}

// ---------------------------------------------------------------------------
// Security Threats Persistence
// ---------------------------------------------------------------------------
export async function persistThreatToDb(threat: SecurityThreatAlert): Promise<boolean> {
  try {
    await pool.query(
      `INSERT INTO security_threats (
        alert_id, user_id, username, full_name, email, mobile, age, tier,
        permission_level, prompt_message, threat_type, severity, detection_rule,
        appliance_trace_id, status, timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
      ON CONFLICT (alert_id) DO NOTHING`,
      [
        threat.alert_id,
        threat.user_id,
        threat.username,
        threat.full_name,
        threat.email,
        threat.mobile,
        threat.age,
        threat.tier,
        threat.permission_level,
        threat.prompt_message,
        threat.threat_type,
        threat.severity,
        threat.detection_rule,
        threat.appliance_trace_id,
        threat.status,
        threat.timestamp
      ]
    );
    return true;
  } catch (err: any) {
    console.warn('Failed to persist threat alert to Supabase:', err.message);
    return false;
  }
}
