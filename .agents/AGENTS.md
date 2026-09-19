# Blackmagic AI — Agent Configuration

> This file defines the rules, architecture, conventions, and constraints for any AI agent
> operating on the Blackmagic AI codebase. Treat every rule here as **mandatory** unless the
> user explicitly overrides it in-conversation.

---

## 1. Project Identity

| Field | Value |
|-------|-------|
| **Name** | Blackmagic AI |
| **Type** | Desktop AI Chat Application (Windows `.exe`) |
| **Stack** | Python 3.12 · Flask · psycopg2 · pywebview · PyInstaller |
| **UI** | Single-file HTML/CSS/JS (`src/ui/index.html`) — cyberpunk dark theme |
| **Database** | Dual Supabase PostgreSQL (USA + India mirroring) + Local SQLite |
| **Packaging** | Two standalone `.exe` files: `blackmagic_ai.exe` (client) and `admin_panel.exe` (admin) |
| **Target OS** | Windows 10/11 (x64) |

---

## 2. Repository Structure

```
blackmagic/
├── .agents/                     # Agent configuration (this file lives here)
│   ├── AGENTS.md                # ← YOU ARE HERE
│   └── skills/                  # Supabase skills
├── src/
│   ├── backend/
│   │   ├── app.py               # Flask API server — all REST endpoints
│   │   ├── auth_service.py      # Authentication: register, login, lockout, sessions
│   │   ├── db_manager.py        # Dual-region database connection manager
│   │   ├── desktop_wrapper.py   # pywebview native window launcher
│   │   ├── otp_service.py       # Email OTP generation, delivery, verification
│   │   ├── sentiment_service.py # Keyword-based sentiment analysis and storage
│   │   ├── token_service.py     # Token pool management and cascading cutoff
│   │   └── upgrade_service.py   # AI-proposed system upgrade queue
│   └── ui/
│       └── index.html           # Full UI: login, chatbox, settings, admin panel
├── build/                       # PyInstaller build output
├── dist/                        # Final compiled executables
├── requirements.txt             # Python dependencies (pinned versions)
├── compile.py                   # PyInstaller build automation script
├── blackmagic_ai.spec           # PyInstaller spec for client app
├── admin_panel.spec             # PyInstaller spec for admin panel
└── implementation_plan.md       # Full architecture and feature specification
```

---

## 3. Architecture Rules

### 3.1 Dual-Region Database Mirroring

The system operates two identical Supabase PostgreSQL databases:

| Region | Host |
|--------|------|
| **USA** (primary) | `db.kuppqqerqqeqcjjljkpo.supabase.co` |
| **India** (mirror) | `db.gbtxsopitwrqumxznkwm.supabase.co` |

**Rules:**
- **READS** go to the preferred region first; failover to the secondary.
- **WRITES** go to **BOTH** databases simultaneously. A write is considered successful if at least one database accepts it.
- **UUIDs MUST be generated in Python** using `uuid.uuid4()` before inserting. Never rely on `gen_random_uuid()` at the database level for new rows that will be written to both mirrors — the two databases would generate different UUIDs, breaking cross-mirror foreign key consistency.
- Connection strings are hardcoded in `db_manager.py`. If they need to change, update **only** that file.
- Never import connection strings or credentials from environment variables; this is a self-contained desktop app.

### 3.2 Chat Privacy — Zero Cloud Chat Data

- **ALL chat text** is stored in a local SQLite file (`~/.blackmagic_history.db`).
- **ZERO** chat strings, prompts, or AI responses are ever sent to Supabase.
- Only metadata reaches the cloud: token counts, sentiment scores, user status, OTP records.
- This is a **hard privacy boundary** — never violate it.

### 3.3 Session Persistence

- After successful login, a session file (`~/.blackmagic_session.json`) is written locally containing `user_id`, `username`, and `password_hash`.
- On subsequent app launches, `check_persistent_session()` validates the stored hash against the database.
- If the user's password was changed or the username was deleted from the DB, the session is automatically invalidated and the user must re-authenticate.
- **Never store plaintext passwords** in the session file — only the SHA-256 hash.

---

## 4. Database Schema

All tables below exist identically on both USA and India databases.

### Custom Types

```sql
CREATE TYPE subscription_tier AS ENUM ('Pro', 'Premium', 'Ultra');
CREATE TYPE user_status AS ENUM ('Active', 'Locked', 'Suspended');
CREATE TYPE host_permission_profile AS ENUM ('Full', 'Restricted', 'Sandbox');
```

### Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `users` | Core user accounts | `user_id` (UUID PK), `username`, `email`, `password_hash`, `status`, `permission_level`, `tier`, `failed_login_attempts`, `lockout_until` |
| `user_otp_ledger` | OTP tracking | `otp_id`, `user_id` (FK), `generated_otp`, `expires_at`, `attempts_count`, `hourly_resend_count` |
| `user_token_pools` | API token balances | `pool_id`, `user_id` (FK, UNIQUE), `gemini_token_balance`, `openai_token_balance`, `claude_token_balance`, `last_updated_at` |
| `subscription_plan_queue` | Plan stashing on upgrade | `queue_id`, `user_id` (FK), `tier`, `preserved_*_balance`, `is_active_waiting` |
| `human_feeling_metrics` | Sentiment records | `metric_id`, `user_id` (FK), `feeling_category`, `sentiment_score`, `detected_context` |
| `system_auto_upgrades` | AI-proposed upgrades | `upgrade_id`, `title`, `description`, `upgrade_payload`, `benefit_explanation`, `is_approved` |
| `live_user_feedback` | User feedback (auto-prunes 7d) | `feedback_id`, `username`, `feedback_payload`, `submitted_at` |
| `user_api_keys` | External API key vault | `key_id`, `user_id` (FK), `provider_name`, `encrypted_key_value`, `is_active_state` |
| `historical_session_logs` | Audit trail | `log_id`, `user_id` (FK), `session_timestamp`, `context_payload` (JSONB) |

### Foreign Key Cascade

All child tables use `ON DELETE CASCADE` referencing `users(user_id)`. Deleting a user automatically removes all associated records.

---

## 5. API Endpoint Map

All endpoints are served by Flask at `http://127.0.0.1:5000` (client) or `:5001` (admin).

### Authentication

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/auth/register` | Create account (username, email, password, tier) |
| `POST` | `/api/auth/verify_otp` | Verify email OTP to activate account |
| `POST` | `/api/auth/login` | Login with credentials |
| `POST` | `/api/auth/check_session` | Validate persistent session |
| `POST` | `/api/auth/logout` | Wipe session file |
| `POST` | `/api/auth/request_password_reset` | Trigger OTP for password reset |
| `POST` | `/api/auth/reset_password` | Verify OTP + set new password |

### Chat & Projects

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/projects/list` | List all local projects |
| `POST` | `/api/projects/create` | Create a new project workspace |
| `GET` | `/api/chat/history?project=...` | Get chat history for a project |
| `POST` | `/api/chat/clear` | Clear chat history for a project |
| `POST` | `/api/chat/ask` | Send a prompt; returns model response + sentiment |

### Plans & Billing

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/api/plans/upgrade` | Initiate Stripe checkout for plan upgrade |
| `POST` | `/api/stripe/webhook` | Stripe webhook handler (activate tier) |

### Admin

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/api/admin/users` | List all users |
| `POST` | `/api/admin/users/lock` | Lock a user account |
| `POST` | `/api/admin/users/unlock` | Unlock a user account |
| `POST` | `/api/admin/users/delete` | Delete a user (cascading) |
| `POST` | `/api/admin/users/increase_tokens` | Add tokens to a user's pool |
| `GET/POST` | `/api/admin/feedback` | View or submit feedback |
| `GET` | `/api/admin/upgrades` | List pending AI-proposed upgrades |
| `POST` | `/api/admin/upgrades/approve` | Approve an upgrade proposal |

---

## 6. Business Logic Rules

### 6.1 Authentication & Security

| Rule | Detail |
|------|--------|
| **3-strike lockout** | After 3 consecutive failed login attempts, account status → `Locked` for 30 minutes |
| **Password hashing** | SHA-256 via `hashlib.sha256()` — never store or transmit plaintext |
| **OTP constraints** | Max 5 verification attempts per OTP, max 5 resends per hour, OTP expires after 30 minutes |
| **OTP delivery** | Sent via Gmail SMTP from `blackmagicai29@gmail.com` using app password |
| **Session invalidation** | If DB password changes or username is deleted, local session is wiped on next check |

### 6.2 Token Economy

| Rule | Detail |
|------|--------|
| **Per-model allocation** | Each plan grants 1.5M tokens per model (Gemini + OpenAI + Claude = 4.5M total) |
| **Cascading cutoff** | If **any single model** hits 0 tokens, **ALL three models** are instantly cut off — user status → `Suspended` |
| **Plan queue** | Upgrading stashes old plan balances; when new plan ends, old balances restore automatically |
| **Token deduction** | Every chat request costs a flat 5,000 tokens (configurable in `app.py`) |

### 6.3 Subscription Tiers

| Tier | Price | Gemini Model | OpenAI Model | Claude Model |
|------|-------|-------------|-------------|-------------|
| **Pro** | $5 | Gemini 1.5 Flash | GPT-4o-mini | Claude 3.5 Haiku |
| **Premium** | $39 | Gemini 1.5 Pro | GPT-4o | Claude 3.5 Sonnet |
| **Ultra** | $99 | Gemini 1.5 Pro | GPT-4o | Claude 3 Opus |

- **Hard tier locking**: Users cannot access models from a higher tier than their active subscription.
- All tiers receive the same 4.5M token cap (1.5M × 3 models).

### 6.4 Sentiment Tracking

- Runs **silently** in the background on every chat prompt.
- Uses a keyword-based lexicon (not ML) to classify feelings: `Frustrated`, `Satisfied`, `Neutral`, `Curious`, `Confused`, `Happy`.
- Stores category + score + context snippet (max 200 chars) in `human_feeling_metrics`.
- Results are visible **only** in the admin panel — never shown to the user.

### 6.5 Emergency Halt — "magic stop"

- When the user says `"magic stop"` (voice command or typed), **ALL running operations instantly stop**: API calls, code generation, file writes, background tasks — everything freezes immediately.
- This is a hard interrupt, not a graceful shutdown.

### 6.6 Permission Levels (User-Controlled)

Permissions are **set by the user** in Settings, not by the admin:

| Level | Capabilities |
|-------|-------------|
| `Full` | Full filesystem and command integration |
| `Restricted` | Partial system capability, prompts before actions |
| `Sandbox` | Complete runtime isolation, zero file read/write |

---

## 7. UI/UX Rules

### 7.1 Design Language

- **Theme**: Cyberpunk dark with indigo/violet accent palette (`#6366f1`, `#8b5cf6`).
- **Background**: Near-black (`#0b0c0e`) with subtle grid patterns.
- **Font**: Monospace (`JetBrains Mono`, `Fira Code`, or system monospace fallback).
- **Animations**: Smooth CSS transitions, glowing borders, pulse effects on active elements.
- **Glass morphism**: Semi-transparent panels with backdrop blur.

### 7.2 Chatbox Sidebar — Auto-Expand/Collapse

The chatbox sidebar uses a **smart hover-based toggle** system:

| State | Width | Trigger |
|-------|-------|---------|
| **Collapsed** | 40px (slim strip) | Default state; icons only visible |
| **Expanded** | 280px (full panel) | Mouse enters the 40px collapsed zone |
| **Auto-collapse** | Back to 40px | Mouse leaves the 280px expanded zone |

- The two boundary sizes are intentionally different to prevent accidental triggers.
- Sidebar contents: Project switcher, chat history, upgrade plan button, model indicator, new chat.

### 7.3 Single-File UI Architecture

- The entire UI lives in `src/ui/index.html` — a single self-contained HTML file.
- All CSS is inline in `<style>` tags.
- All JavaScript is inline in `<script>` tags.
- No external CSS/JS dependencies, no CDN links, no build tools.
- This ensures the `.exe` bundles everything and runs offline.

---

## 8. Coding Conventions

### 8.1 Python (Backend)

- **Python 3.12** target. Use type hints where practical.
- All services are classes that receive `DBManager` via constructor injection.
- Use `psycopg2` with `RealDictCursor` for all database reads (returns `dict` rows).
- Always use parameterized queries (`%s` placeholders) — never string interpolation for SQL.
- Logging via `logging` module — never `print()` for production messages.
- Error handling: catch exceptions at the service boundary, return `(bool, message)` tuples.
- UUIDs: always generate with `uuid.uuid4()` in Python, pass as explicit parameters.

### 8.2 JavaScript (Frontend)

- Vanilla JS only — no React, no Vue, no frameworks.
- Use `fetch()` for all API calls to `http://127.0.0.1:5000/api/...`.
- Use `async/await` pattern for API calls.
- DOM manipulation via `getElementById`, `querySelector`, `innerHTML`.
- Event delegation where possible to minimize listener count.

### 8.3 SQL

- Always use `IF NOT EXISTS` for `CREATE TABLE` and `ADD COLUMN` statements.
- Always use `ON DELETE CASCADE` for foreign keys referencing `users(user_id)`.
- Timestamps default to `NOW()` with `TIMESTAMP WITH TIME ZONE`.
- Use PostgreSQL `GREATEST(0, value - N)` pattern for safe non-negative token deductions.

### 8.4 File Naming

- Python: `snake_case.py`
- HTML: `index.html` (single file)
- No TypeScript, no SCSS, no build tooling.

---

## 9. Dependency Management

### Python Dependencies (pinned in `requirements.txt`)

| Package | Version | Purpose |
|---------|---------|---------|
| `Flask` | 3.0.0 | REST API server |
| `Flask-Cors` | 4.0.0 | Cross-origin request support |
| `psycopg2-binary` | 2.9.9 | PostgreSQL driver |
| `pywebview` | 4.4.1 | Native desktop window wrapper |
| `pyinstaller` | 6.3.0 | Compile to standalone `.exe` |

- **Never add** npm, webpack, vite, or any Node.js tooling.
- **Never add** SQLAlchemy, Django, or any ORM — use raw SQL via psycopg2.
- If a new dependency is needed, add it to `requirements.txt` with a pinned version.

---

## 10. Build & Packaging

### Compiling to `.exe`

```bash
# Client app
pyinstaller blackmagic_ai.spec

# Admin panel
pyinstaller admin_panel.spec
```

- The `.exe` must run independently — no Python installation required on the target machine.
- PyInstaller bundles the Flask server, UI files, and all dependencies into a single executable.
- The Flask server starts in a background thread; pywebview opens the native window pointing to `127.0.0.1:5000`.

### Runtime Architecture

```
┌─────────────────────────────────────────────┐
│              blackmagic_ai.exe              │
│                                             │
│  ┌────────────┐    ┌─────────────────────┐  │
│  │   Flask     │◄──►│   pywebview Window  │  │
│  │   Server    │    │   (index.html)      │  │
│  │  :5000      │    └─────────────────────┘  │
│  └──────┬─────┘                              │
│         │                                    │
│  ┌──────▼──────────────────────────────────┐ │
│  │         DBManager (psycopg2)            │ │
│  │  ┌──────────┐    ┌──────────┐           │ │
│  │  │ USA DB   │    │ India DB │           │ │
│  │  │ (Supa)   │    │ (Supa)   │           │ │
│  │  └──────────┘    └──────────┘           │ │
│  └─────────────────────────────────────────┘ │
│                                              │
│  ┌──────────────────────────────────────────┐│
│  │  Local SQLite (~/.blackmagic_history.db) ││
│  │  (Chat text stored here ONLY)            ││
│  └──────────────────────────────────────────┘│
└──────────────────────────────────────────────┘
```

---

## 11. Testing & Verification

### Automated Tests

Run verification tests from the project root:

```bash
python -m pytest tests/ -v
```

Or use the scratch verification script:

```bash
python scratch/verify.py
```

### Test Coverage Required

| Area | What to Test |
|------|-------------|
| **Auth** | Registration, login, 3-strike lockout, session persistence, session invalidation on password change |
| **OTP** | Delivery, 5-attempt limit, 5-resend/hour limit, 30-minute expiry |
| **Tokens** | Deduction, cascading cutoff when any model hits 0, plan queue stash/restore |
| **DB** | Dual-region write consistency, failover on single-region outage |
| **Chat** | Local SQLite creation, project isolation, history CRUD |

### Manual Verification

- Confirm `.exe` runs on a clean Windows machine with no Python installed.
- Test login lockout after 3 failed attempts.
- Test OTP email delivery to a real inbox.
- Test cascading token depletion across all 3 models.
- Test plan upgrade → token reset → old plan restoration.

---

## 12. Security Constraints

| Constraint | Enforcement |
|-----------|-------------|
| **No plaintext passwords** | SHA-256 hash only; session file stores hash, not password |
| **No chat data in cloud** | SQLite-only chat storage; Supabase stores metadata only |
| **SQL injection prevention** | All queries use parameterized `%s` placeholders |
| **OTP brute-force protection** | 5-attempt + 5-resend + 30-min expiry triple-lock |
| **Account lockout** | Auto-lock after 3 failed logins; 30-minute cooldown |
| **Feedback rate limiting** | Max 3 feedback submissions per 24-hour window |
| **Auto-upgrade safety** | AI proposes upgrades → Admin must manually approve → Never auto-executes |
| **SMTP credentials** | Hardcoded app password (not user password); scoped to `blackmagicai29@gmail.com` |

---

## 13. Behavioral Guidelines for Agents

1. **Read `implementation_plan.md`** before making any architectural decisions — it is the source of truth.
2. **Never break the dual-write pattern.** Every `execute_write` call in `DBManager` writes to both databases. If you add a new write operation, it must go through `db.execute_write()`.
3. **Never send chat text to Supabase.** If you need to store conversation data, use the local SQLite connection (`get_local_conn()`).
4. **Generate UUIDs in Python** before insertion. Never rely on `gen_random_uuid()` for rows written to both mirrors.
5. **Preserve all existing comments and docstrings** unless the user explicitly asks to remove them.
6. **Keep the single-file UI pattern.** Do not split `index.html` into separate CSS/JS files.
7. **Test after every change.** Run the verification script or relevant test case after making modifications.
8. **Use the service layer.** Don't write raw SQL in `app.py` — create or use the appropriate service class.
9. **Pin dependency versions.** If adding a new package, specify an exact version in `requirements.txt`.
10. **Ask before adding new database tables.** Schema changes affect both regions and require migration coordination.
11. **Respect tier locking.** Never allow a user to access models above their subscription tier.
12. **Maintain the cyberpunk aesthetic.** All UI changes must use the existing dark theme palette — no bright/white themes.
