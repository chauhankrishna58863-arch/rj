# Blackmagic AI - Technical Requirements Document (TRD)

## Overview
Blackmagic AI is a desktop application that provides users with access to multiple AI models (Google Gemini, OpenAI GPT, Anthropic Claude) through a unified interface. The application features subscription-based token management, local chat history storage, administrative controls, and AI-powered sentiment analysis.

## Core Functional Requirements

### 1. Authentication & User Management
- User registration with username, email, password, and subscription tier
- Email verification via OTP (6-digit code) sent via SMTP
- Secure password hashing using bcrypt
- Persistent session management via encrypted local storage
- Password reset functionality with OTP verification
- Admin capabilities to create, lock, unlock, delete users
- User-controlled permission levels (Sandbox, Restricted, Full)

### 2. Subscription & Token Management
- Three subscription tiers: Pro ($5), Premium ($39), Ultra ($99)
- Each tier provides access to specific AI models:
  - Pro: Gemini 1.5 Flash, GPT-4o-mini, Claude 3.5 Haiku
  - Premium: Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet
  - Ultra: Gemini 1.5 Pro, GPT-4o, Claude 3 Opus
- Flat token allocation: 1.5M tokens per model (4.5M total) per billing cycle
- Cascading token cutoff: If any model's tokens reach 0, all models are suspended for that user
- Plan queue system for seamless upgrades/downgrades with balance preservation
- Administrative token adjustments and resets

### 3. AI Chat Functionality
- Real-time chat interface with selected AI model
- Model selection: Gemini, OpenAI, Claude (tier-restricted)
- Local chat history storage in SQLite database (zero cloud storage of chat content)
- Project-based workspace isolation (separate chat histories per project)
- Voice wake words: "hey magic" (activate), "magic stop" (emergency halt)
- Smart sidebar with project switching, settings, and upgrade options

### 4. Administrative Features
- Admin panel for user management, token allocation, and system oversight
- Live user feedback monitoring and moderation
- Sentiment analytics dashboard (aggregated user emotion tracking)
- Session and audit logging
- Subscription plan management
- Auto-upgrade approval system (AI-proposed, admin-approved system improvements)

### 5. Sentiment Analysis & Monitoring
- Real-time keyword-based sentiment detection from chat conversations
- Emotion categorization: Frustrated, Satisfied, Curious, Confused, Happy, Neutral
- Sentiment scoring (-1.0 to +1.0 scale)
- Storage of sentiment metrics in database for admin dashboard
- Live sentiment updates to admin panel without requiring restart

### 6. System Architecture & Deployment
- Electron-based desktop application using webview for UI
- Flask-based REST API backend serving both client and admin interfaces
- Dual regional PostgreSQL databases (USA & India) for low-latency access
- Automatic database synchronization and failover capability
- Local SQLite database for chat history and session persistence
- Stripe payment gateway integration for subscription management
- Background processes for token balancing, sentiment analysis, circuit breaking

### 7. Security & Privacy
- End-to-end encryption for local session storage
- Zero chat data transmission to cloud servers (chat history remains local)
- Role-based access control (RBAC) for admin functions
- Input validation and sanitization across all API endpoints
- Rate limiting for feedback submissions (3 per 24 hours)
- Automatic data pruning (feedback older than 7 days, configurable)
- Emergency halt functionality via voice command ("magic stop")

### 8. Non-Functional Requirements
- Cross-platform compatibility (Windows, macOS, Linux via Electron/webview)
- Offline capability for chat history viewing and local operations
- Responsive UI with glassmorphism design and cyberpunk aesthetic
- Configurable themes (Cyberpunk Dark, Assistly Pro, Pastel Light)
- Adjustable UI scaling and font sizes
- Regional database preference (USA, India, or auto-failover)
- Configurable hotkeys and voice commands
- Automatic cleanup of temporary data and logs

## Technical Constraints
- Backend Python 3.12+ with Flask framework
- Frontend HTML/CSS/JavaScript with webview rendering
- PostgreSQL 15+ for primary databases, SQLite 3+ for local storage
- Stripe API integration for payment processing
- SMTP integration for email notifications (Gmail with app password)
- Maximum token deduction per request: 5,000 tokens (simulated)
- Sentiment analysis limited to keyword matching (no ML models)

## Dependencies
- Flask, Flask-CORS
- psycopg2-binary (PostgreSQL adapter)
- webview (for desktop window)
- stripe (payment processing)
- Various Python standard library modules

## Performance Requirements
- API response time < 500ms for standard operations
- Database query response time < 100ms
- UI frame rate > 30fps for animations
- Background token sync every 3 minutes
- Sentiment analysis processing < 50ms per message

## Security Requirements
- Passwords hashed using industry-standard bcrypt
- Session tokens stored encrypted locally
- API keys encrypted at rest in database
- Regular security audits of dependencies
- OWASP Top 10 considerations implemented