# Blackmagic AI Ecosystem — Implementation Plan (v5)

---

## 1. Regional Database Mirroring (USA & India)

Both databases contain **identical schemas and data**, routed by user region for low latency.

| Region | Host | Connection |
|--------|------|------------|
| **USA** | `db.kuppqqerqqeqcjjljkpo.supabase.co` | `postgresql://postgres:mI3pHotuKee0q3aB@db.kuppqqerqqeqcjjljkpo.supabase.co:5432/postgres` |
| **India** | `db.gbtxsopitwrqumxznkwm.supabase.co` | `postgresql://postgres:45eHeNirTkFYsTU8@db.gbtxsopitwrqumxznkwm.supabase.co:5432/postgres` |

### Schema (applied to both databases)

```sql
CREATE TYPE subscription_tier AS ENUM ('Pro', 'Premium', 'Ultra');
CREATE TYPE user_status AS ENUM ('Active', 'Locked', 'Suspended');
CREATE TYPE host_permission_profile AS ENUM ('Full', 'Restricted', 'Sandbox');

CREATE TABLE users (
    user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    status user_status DEFAULT 'Active',
    permission_level host_permission_profile DEFAULT 'Sandbox',
    failed_login_attempts INT DEFAULT 0,
    lockout_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_otp_ledger (
    otp_id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    generated_otp VARCHAR(6) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    attempts_count INT DEFAULT 0,
    hourly_resend_count INT DEFAULT 0,
    last_resend_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_token_pools (
    pool_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE UNIQUE,
    gemini_token_balance INT DEFAULT 1500000,
    openai_token_balance INT DEFAULT 1500000,
    claude_token_balance INT DEFAULT 1500000,
    last_updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscription_plan_queue (
    queue_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    tier subscription_tier NOT NULL,
    preserved_gemini_balance INT NOT NULL,
    preserved_openai_balance INT NOT NULL,
    preserved_claude_balance INT NOT NULL,
    queued_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    is_active_waiting BOOLEAN DEFAULT TRUE
);

CREATE TABLE human_feeling_metrics (
    metric_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    feeling_category VARCHAR(100) NOT NULL,
    sentiment_score NUMERIC(3,2) NOT NULL,
    detected_context TEXT,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE system_auto_upgrades (
    upgrade_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    upgrade_payload TEXT NOT NULL,
    benefit_explanation TEXT NOT NULL,
    is_approved BOOLEAN DEFAULT FALSE,
    admin_reviewed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE live_user_feedback (
    feedback_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL,
    feedback_payload TEXT NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE user_api_keys (
    key_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    provider_name VARCHAR(100) NOT NULL,
    encrypted_key_value TEXT NOT NULL,
    is_active_state BOOLEAN DEFAULT TRUE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE historical_session_logs (
    log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
    session_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    context_payload JSONB
);
```

---

## 2. UI/UX Pages

- Username + password input fields with cyberpunk dark theme.
- **3 failed attempts** → account locks.
- **Forget Password** button → asks for username → fetches email from DB → displays `"Sir, the OTP has been sent to [masked_email]"` → sends OTP via `blackmagicai29@gmail.com` (app password: `bfro uwou kppw buce`).
- OTP rules: **5 attempts in 30 min**, **5 resends per hour**, OTP auto-expires after 30 min.
- **Persistent Session Auto-Login**: Once a user logs in successfully, the desktop client saves an encrypted local session file. On subsequent launches, the client automatically logs the user in without asking for username/password.
  - **Exception**: If the database record is updated (e.g. password is changed by user or admin, or if the username is deleted from the DB), the session verification fails. The client instantly wipes the local session and forces the user to re-enter their username and password.

### B. Main Chatbox Dashboard
- The primary workspace where users interact with the Tri-Brain AI (GPT generates, Claude codes, Gemini checks/fixes).
- All chat history stored **locally only** in SQLite `local_history.db`. Zero chat data reaches the cloud.

### C. Admin Panel (`admin_panel.exe`)

The admin panel is a separate standalone desktop app with full management capabilities over the Blackmagic AI user base. It connects to both regional databases (USA & India) simultaneously.

#### C.1 Account Formation (Create New User)
- Admin fills: username, email, initial password, subscription tier (Pro/Premium/Ultra).
- System hashes the password and inserts into `users` table.
- Sends an **email verification OTP** to the new user's email from `blackmagicai29@gmail.com`.
- User must verify OTP before account activates (`status` stays `Suspended` until verified).
- **DB Connection**: `INSERT INTO users (...)` → both USA & India databases.

#### C.2 API Token Management (Increase / Reset)
- View any user's current token balances (Gemini / OpenAI / Claude).
- **Increase tokens**: Admin can manually add tokens to any model slot for any user.
- **Reset tokens**: Restore all 3 slots back to the tier default (1.5M each = 4.5M total).
- **DB Connection**: `UPDATE user_token_pools SET gemini_token_balance = ... WHERE user_id = ...`

#### C.3 Account Lock / Unlock
- **Lock**: Manually lock a user account (sets `status = 'Locked'`, clears active sessions).
- **Unlock**: Remove lockout, reset `failed_login_attempts` to 0, clear `lockout_until`.
- View lock reason (auto-locked after 3 failed attempts vs. manually locked by admin).
- **DB Connection**: `UPDATE users SET status = ..., failed_login_attempts = 0, lockout_until = NULL WHERE user_id = ...`

#### C.4 Account Delete
- Permanently remove a user and all associated data (tokens, OTP history, API keys, sentiment logs, feedback, session logs).
- Requires admin confirmation prompt before deletion.
- **DB Connection**: `DELETE FROM users WHERE user_id = ...` (cascades to all child tables via `ON DELETE CASCADE`).

#### C.5 Feedback Review Dashboard
- View all user-submitted feedback from `live_user_feedback` table.
- Sort by date, filter by username.
- Mark feedback as reviewed / archived.
- Feedback auto-prunes after 7 days but admin can view before that.
- **DB Connection**: `SELECT * FROM live_user_feedback ORDER BY submitted_at DESC`

#### C.6 Auto-Upgrade Approval Queue
- AI proposes system/structure upgrades and writes them to `system_auto_upgrades` table with:
  - `title` — Short upgrade name.
  - `description` — What the upgrade changes.
  - `benefit_explanation` — Why it benefits users and the company.
  - `upgrade_payload` — The actual code/structure/SQL migration content.
- Admin reviews each proposal and clicks **Approve** or **Reject**.
- Approved upgrades are pushed to client apps dynamically (no reinstall needed).
- **Cannot change AI models** — only system structure changes allowed.
- **DB Connection**: `UPDATE system_auto_upgrades SET is_approved = TRUE, admin_reviewed_at = NOW() WHERE upgrade_id = ...`



#### C.7 User Sentiment Overview
- View aggregated human feeling metrics per user from `human_feeling_metrics` table.
- Categories: Frustrated, Satisfied, Neutral, Curious, Confused, Happy.
- Filter by date range, user, or feeling category.
- Live updates — sentiment data pushed in real-time without panel reinstall.
- **DB Connection**: `SELECT * FROM human_feeling_metrics WHERE user_id = ... ORDER BY recorded_at DESC`

#### C.8 Session & Audit Logs
- View login timestamps, session durations, and context payloads from `historical_session_logs`.
- Track which users are currently active.
- **DB Connection**: `SELECT * FROM historical_session_logs WHERE user_id = ... ORDER BY session_timestamp DESC`

#### C.9 Subscription Plan Management
- View each user's current active tier and any queued (suspended) plans.
- Manually force-activate a queued plan or cancel it.
- View preserved token balances on suspended plans.
- **DB Connection**: `SELECT * FROM subscription_plan_queue WHERE user_id = ...`

---

### Admin Panel — Database Connection Summary

| Admin Option | Database Table | SQL Operation |
|--------------|---------------|---------------|
| **Account Formation** | `users` | `INSERT` |
| **Email Verification** | `user_otp_ledger` | `INSERT` + `SELECT` |
| **API Token Increase** | `user_token_pools` | `UPDATE` |
| **Account Lock/Unlock** | `users` | `UPDATE` |
| **Account Delete** | `users` (cascades all) | `DELETE` |
| **Feedback Review** | `live_user_feedback` | `SELECT` |
| **Auto-Upgrade Approval** | `system_auto_upgrades` | `SELECT` + `UPDATE` |
| **Sentiment Overview** | `human_feeling_metrics` | `SELECT` |
| **Session/Audit Logs** | `historical_session_logs` | `SELECT` |
| **Plan Management** | `subscription_plan_queue` | `SELECT` + `UPDATE` + `DELETE` |

---

## 3. Settings Panel Options

### 3.1 Account & API Portal
- View account details (username, email, tier, status).
- Generate/manage up to 10 authorization tokens for external API access.
- Toggle persistent login cookies and session preferences.

### 3.2 System Governance Permissions (User-Controlled)
- **The user chooses their own permission level** — not set by admin.
- `Full System Access` — Full filesystem and command integration.
- `Restricted Mode` — Partial system capability, prompts before actions.
- `Sandbox Bounds` — Complete runtime isolation, zero file read/write.
- User can switch level anytime from Settings; change syncs to DB immediately.
- **DB Connection**: `UPDATE users SET permission_level = ... WHERE user_id = [self]`

### 3.3 Visual Appearance
- Theme scaling (compact / standard / expanded).
- Window opacity and transparency controls.
- Color accent customization within the dark cyberpunk palette.
- Font size adjustment.

### 3.4 Models Dashboard
- Live API token balance display per model (Gemini / OpenAI / Claude).
- Auto-refreshes every 3 minutes via the background sync loop.
- Visual indicator when cascading cutoff is triggered.

### 3.5 Customization Panel
- Configure active skill packs and behavioral presets.
- Manage MCP workspace server connections.
- Set default agent persona and response style.

### 3.6 Feedback
- Submit feedback directly to the database (`live_user_feedback` table).
- **3 submissions max per 24-hour cycle**.
- Feedback records auto-prune after **7 days**.
- View history of previously submitted feedback.

### 3.7 Shortcut Keys
- Configure and view hotkey bindings:

| Shortcut | Action |
|----------|--------|
| `ALT` (long-press) | Snap focus to Blackmagic AI window |
| `Ctrl + N` | New chat session |
| `Ctrl + H` | Open/close chat history panel |
| `Ctrl + S` | Open settings |
| `Ctrl + Shift + F` | Submit feedback |
| `Ctrl + P` | Open projects panel |
| `Escape` | Close active overlay / modal |
| Voice: `"hey magic"` | Wake voice input (suspends when window loses focus) |
| Voice: `"magic stop"` | **Emergency halt** — instantly stops ALL running operations (API calls, code generation, file writes, background tasks). Everything freezes immediately. |

- Users can remap keys from this panel.

### 3.8 Projects
- **Workspace Switcher**: Select and switch between active project workspace containers (e.g. "make a website", "api backend").
- **Dynamic Branching**: When a user selects or creates a project, the client instantly loads that project's chat history and local codebase state.
- Switching projects automatically points the active chat view and local SQLite context to that project's database records.
- Configures regional routing (USA / India database preference) for the selected project.
- Supports importing and exporting project configuration templates.

---

## 4. Chatbox Options (Inside the Chat Interface)

These controls are available **within the chatbox dashboard** during an active conversation.

### Auto-Expand / Collapse Sidebar Behavior
The chatbox has a **smart sidebar** with automatic hover-based toggle:
- **Collapsed state** (default): A slim strip (40px wide) sits on the side of the chat window.
- **Expanded state**: When the mouse pointer **enters** the collapsed strip boundary, the sidebar smoothly expands to full width (280px) revealing all chatbox option panels below.
- **Auto-collapse**: When the mouse pointer **leaves** the expanded boundary (280px zone), the sidebar contracts back to the slim 40px strip.
- The two boundary sizes are intentionally different — the collapsed trigger zone (40px) is small so it doesn't interfere with typing, while the expanded zone (280px) gives enough room to interact with the panels before it collapses.

### 4.1 Chat History Browser & Project Switcher
- View all active projects and switch between them directly from the sidebar.
- Switching a project instantly swaps the active conversation list and SQLite local history context.
- Search, filter, and browse past conversations within the selected project.
- Delete individual chats or clear entire history; export chat sessions as `.txt` or `.json`.

### 4.2 Upgrade Plan Button & Model Pricing Portal
- A prominent, visually impressive cyberpunk-style overlay within the chatbox dashboard.
- Users can view pricing, token allowances, and active models per tier.
- **Plan Pricing & Limits**:
  - **Ultra Plan ($99)**: Allowed Models: Anthropic Claude 3 Opus, OpenAI GPT-4o, Google Gemini 1.5 Pro. (Flat 1.5M tokens per model, 4.5M total maximum cap).
  - **Premium Plan ($39)**: Allowed Models: Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, Google Gemini 1.5 Pro. (Flat 1.5M tokens per model, 4.5M total maximum cap).
  - **Pro Plan ($5)**: Allowed Models: Anthropic Claude 3.5 Haiku, OpenAI GPT-4o-mini, Google Gemini 1.5 Flash. (Flat 1.5M tokens per model, 4.5M total maximum cap).
- **Hard Tier Locking**: Users *cannot* select or use any model that belongs to a tier higher than their active subscription. Upper models are greyed out with a lock icon.
- **Stripe Payment Gateway Integration**:
  - Clicking **Buy** on any plan opens the Stripe Checkout payment screen.
  - If payment succeeds, Stripe webhook trigger (`checkout.session.completed` or `invoice.paid`) fires, updating the user's tier and token balances.
  - If user closes checkout or payment fails, Stripe reports a cancelled session and the plan upgrade is aborted.

### 4.3 Active Model Indicator
- Shows which allowed model in the active tier is currently processing:
  - 🟢 GPT-4o / GPT-4o-mini (Generating prompt/plan)
  - 🔵 Claude 3 Opus / Claude 3.5 Sonnet / Claude 3.5 Haiku (Writing code)
  - 🟡 Gemini 1.5 Pro / Gemini 1.5 Flash (Checking & fixing)

### 4.4 New Chat / Clear Context
- Start a fresh conversation context under the active project branch while preserving history in SQLite.
- Option to pin important conversations for quick access later.

### Background Processes (Hidden from User — run silently)
> [!NOTE]
> The following systems operate **entirely in the background** and are never shown to the user in the chatbox UI:
> - **Token Balance Sync**: Checks remaining tokens every 3 minutes, triggers cascading cutoff if any model hits 0.
> - **Sentiment Detection**: AI silently analyzes user feelings from chat text, stores in `human_feeling_metrics` table, and pushes live updates to the admin panel.
> - **Circuit Breaker**: Monitors API health silently; trips into `FAST_FAIL` after 3 consecutive 5000ms timeouts.
> - **Tool Hooks** (`ponytail tool`, `reticle tool`): Run in the Rust/C# backend layer, not user-facing.

---

## 5. Core Workflow Rules

| Rule | Detail |
|------|--------|
| **Cascading cutoff** | If any single model balance hits 0, all models are instantly cut off for that user |
| **Plan queue** | Upgrading locks old plan tokens; when new plan ends, old plan reactivates with its preserved balances and models |
| **Auto-upgrade** | AI proposes system/structure upgrades (never model changes) → Admin Panel approval required → applied without client reinstall |
| **Chat privacy** | All chat text stored in local SQLite only; zero chat strings reach the cloud databases |
| **Sentiment sync** | Feelings detected from chat are stored in the database and pushed live to the user's panel without reinstall |
| **Session persistence** | If user is already logged in, skip re-authentication on next launch |

---

## 6. Verification Plan

### Automated Tests
1. SMTP OTP delivery test to a real email.
2. OTP constraint simulation (5 attempts, 5 resends, 30-min expiry).
3. Dual-database connectivity and schema verification on both regions.
4. Standalone SQLite creation test on a clean directory.

### Manual Testing
- Login lockout after 3 failures.
- Cascading token depletion across all 3 models.
- Plan queue transition (upgrade → deplete → fallback).
- Admin panel auto-upgrade approval flow.
- Verify `.exe` runs independently without any pre-installed dependencies.
