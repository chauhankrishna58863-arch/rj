# Blackmagic AI - Rules Document

## Overview
This document defines the business rules, validation rules, and system constraints that govern the behavior of the Blackmagic AI application. These rules ensure consistency, security, and proper operation across all components of the system.

## Business Rules

### BR-001: Subscription Tier Access Control
**Description**: Users can only access AI models included in their subscribed tier.
**Specification**:
- Pro Tier: Access to Gemini 1.5 Flash, GPT-4o-mini, Claude 3.5 Haiku
- Premium Tier: Access to Gemini 1.5 Pro, GPT-4o, Claude 3.5 Sonnet
- Ultra Tier: Access to Gemini 1.5 Pro, GPT-4o, Claude 3 Opus
**Enforcement**: 
- Backend API validates model availability before processing requests
- UI grays out unavailable model options based on user's current tier
- Attempt to access restricted model returns error: "Model not available in your current plan"

### BR-002: Token Consumption and Cascading Cutoff
**Description**: When any single model's token balance reaches zero, all models become unavailable for that user until token balance is restored.
**Specification**:
- Each token deduction operation checks all three model balances after deduction
- If gemini_token_balance ≤ 0 OR openai_token_balance ≤ 0 OR claude_token_balance ≤ 0 → trigger cascading cutoff
- Upon cutoff: user status set to 'Suspended', all API calls rejected with message: "Model balance depleted. Cascading cutoff triggered."
**Exceptions**:
- Administrative token additions can restore access even if other models remain at zero
- Plan upgrades/downgrades follow queue rules and preserve existing balances

### BR-003: Subscription Plan Transition Rules
**Description**: Governs how users can change subscription tiers and what happens to their token balances.
**Specification**:
- **Upgrade**: Current token balances preserved in queue, new tier grants full 1.5M per model
- **Downgrade**: Not allowed until current plan period ends; queued for future application
- **Same-tier change**: Treated as renewal; maintains current balances
- **Cancellation**: Service continues until end of paid period; no prorated refunds
**Enforcement**:
- Upgrade/downgrade requests stored in subscription_plan_queue with pending status
- Only one active waiting plan per user at any time
- System automatically processes queue when current period ends (simulated via webhook)

### BR-004: Session Persistence Rules
**Description**: Defines when and how user sessions are maintained or invalidated.
**Specification**:
- Session maintained via encrypted local file (~/.blackmagic_session.json)
- Session valid until: explicit logout, password change, admin lockout, or token depletion
- Automatic login attempted on application startup if valid session exists
- Session invalidated immediately upon: password reset, admin lock/delete, suspension
- Session survives application updates and reboots unless explicitly cleared

### BR-005: Feedback Rate Limiting
**Description**: Limits frequency of user feedback submission to prevent abuse.
**Specification**:
- Maximum 3 feedback submissions per 24-hour period per user
- Timer resets at first submission; window rolls forward
- Attempt exceeded returns error: "Feedback limit hit: max 3 per 24 hours."
- Administrators exempt from this limit for official communications

### BR-006: Data Retention and Privacy
**Description**: Governs how long different types of data are retained and when they are purged.
**Specification**:
- Chat History: Stored locally only; user-controlled deletion; no cloud retention
- Feedback Data: Auto-deleted after 7 days unless manually retained by admin
- Session Logs: Retained for 30 days for audit purposes
- User Account Data: Retained until account deletion; anonymized after 90 days of inactivity
- Token Transaction Logs: Retained for 90 days for billing and dispute resolution
- System Upgrade Proposals: Retained indefinitely until actioned or explicitly rejected

### BR-007: Administrative Privileges
**Description**: Defines what actions administrators can perform and under what conditions.
**Specification**:
- User Management: Create, read, update, delete users (including password reset)
- Token Management: Add/subtract tokens for any user, reset to tier defaults
- Account Control: Lock/unlock/suspend accounts, force password resets
- Content Moderation: View, approve, delete user feedback
- System Management: Approve/reject proposed system upgrades, view audit logs
- Restrictions: Administrators cannot modify their own permission level to avoid self-escalation

### BR-008: Password and Security Policies
**Description**: Defines requirements for authentication credentials and security practices.
**Specification**:
- Minimum password length: 8 characters
- Password complexity: Requires mix of uppercase, lowercase, numbers, special characters
- Failed login attempts: Account locked after 3 consecutive failures
- Lockout duration: Until admin unlock or successful password reset via OTP
- Password reuse: Prevents reuse of last 5 passwords
- Session timeout: No timeout for active sessions; persistent until explicit logout
- Password change: Forces logout from all other sessions upon change

### BR-009: Regional Data Routing
**Description**: Governs how user data is routed between USA and India database instances.
**Specification**:
- Users can explicitly prefer USA, India, or Auto/Failover mode
- Automatic routing based on latency measurements when in Auto mode
- Data consistency: Eventual consistency model with conflict resolution via timestamp
- Fallback: Automatic switch to secondary region if primary becomes unavailable
- Manual override: Users can force specific region regardless of auto-detection results

### BR-010: Voice Command Protocols
**Description**: Defines behavior for voice-activated system controls.
**Specification**:
- Wake Phrase: "hey magic" (case-insensitive, partial matching allowed)
- Sleep/Stop Command: "magic stop" (case-insensitive, triggers emergency halt)
- Listening State: Active only when application window is foregrounded
- Audio Processing: Local processing only; no audio sent to external servers
- Command Scope: 
  - "hey magic": Focuses application window, enables voice dictation for chat input
  - "magic stop": Immediately halts all API requests, token deductions, background processes
- False Positive Mitigation: Requires clear audio signal; ignores background noise

## Validation Rules

### VR-001: Input Validation
**Field**: Username
- **Type**: String
- **Length**: 3-30 characters
- **Allowed**: Alphanumeric, underscore, hyphen
- **Format**: ^[a-zA-Z0-9_-]{3,30}$
- **Uniqueness**: Must be unique across all users
- **Case Sensitivity**: Case-insensitive for lookup, preserves original case

**Field**: Email
- **Type**: String
- **Format**: Standard email regex ^[^@\s]+@[^@\s]+\.[^@\s]+$
- **Length**: Maximum 254 characters
- **Uniqueness**: Must be unique across all users
- **Verification**: Must be validated via OTP before account activation

**Field**: Password
- **Type**: String
- **Length**: Minimum 8 characters
- **Complexity**: At least one uppercase, one lowercase, one digit, one special character
- **Allowed Specials**: !@#$%^&*()_+-=[]{}|;':",./<>?
- **Encoding**: bcrypt hash with salt (cost factor 12)

**Field**: OTP Code
- **Type**: String
- **Format**: Exactly 6 digits
- **Pattern**: ^\d{6}$
- **Validity**: Expires 30 minutes after generation
- **Attempts**: Maximum 5 verification attempts per OTP request

**Field**: Project Name
- **Type**: String
- **Length**: 1-50 characters
- **Allowed**: Alphanumeric, spaces, hyphen, underscore
- **Format**: ^[a-zA-Z0-9 _-]{1,50}$
- **Uniqueness**: Unique per user (different users can have same project name)

**Field**: Feedback Text
- **Type**: String
- **Length**: Minimum 10 characters, maximum 500 characters
- **Profanity Filter**: Basic screening for prohibited content
- **Spam Check**: Rate-limited and checked for repetitive patterns

### VR-002: Data Integrity Rules
**Rule DI-001**: Token Balance Consistency
- The sum of tokens used + tokens remaining MUST equal initial allocation for each billing period
- Regular reconciliation jobs verify this invariant

**Rule DI-002**: Referential Integrity
- All foreign key relationships MUST be maintained
- ON DELETE CASCADE appropriately configured for child tables
- Application-level checks for orphaned records

**Rule DI-003**: Status Transition Validity
- User status transitions follow defined lifecycle:
  Active → Locked (via failed login or admin action)
  Locked → Active (via admin unlock)
  Active → Suspended (via token depletion or admin action)
  Suspended → Active (via token replenishment or admin action)
  *Any* → Deleted (via admin delete or user request with confirmation)
  Deleted state is terminal

**Rule DI-004**: Session Validity
- Session token MUST correspond to existing, active user
- Session data MUST be properly encrypted and decryptable
- Session expiry MUST be enforced client-side even if server validation delayed

## System Constraints

### SC-001: Resource Limits
- **Maximum concurrent API requests per user**: 10 (prevents overwhelming AI services)
- **Maximum message length**: 8,000 characters (approximately 2,000 tokens)
- **Minimum token deduction per request**: 100 tokens (prevents gaming the system)
- **Maximum token deduction per request**: 5,000 tokens (reasonable single interaction limit)
- **Background polling interval**: Minimum 180 seconds (token balance sync)

### SC-002: Performance Thresholds
- **API response time 95th percentile**: < 1,200ms
- **Database query execution time 95th percentile**: < 300ms
- **UI frame rate during animation**: ≥ 30 fps
- **Application startup time**: < 3 seconds on modern hardware
- **Memory usage**: < 500MB RAM during typical usage

### SC-003: Compatibility Requirements
- **Minimum OS versions**: Windows 10, macOS 11.0, Ubuntu 20.04 LTS
- **Minimum hardware**: 4GB RAM, dual-core CPU, 1GB available storage
- **Supported browsers (for webview)**: Chromium-based engines equivalent to Chrome 90+
- **Network requirements**: Minimum 1Mbps sustained bandwidth for reliable operation

### SC-004: Legal and Compliance Constraints
- **Data Export**: Must comply with GDPR Article 20 (right to data portability)
- **Data Deletion**: Must comply with GDPR Article 17 (right to be forgotten)
- **Age Restriction**: Service not knowingly available to users under 13 years old (COPPA)
- **Content Restrictions**: Prohibits generation of illegal, harmful, or NSFW content per provider policies
- **Export Controls**: Complies with applicable international trade regulations

## Error Handling Rules

### EH-001: Error Response Format
All API errors RETURN consistent JSON structure:
{
  "success": false,
  "message": "Human-readable error description",
  "error_code": "UNIQUE_ERROR_IDENTIFIER",
  "details": {/* Optional technical details for debugging */}
}

### EH-002: User-Friendly Error Messages
- Technical details NEVER exposed to end-users in production
- Error messages SHOULD suggest corrective action when possible
- Language MUST be consistent with application tone and branding
- Error codes MUST be unique and documented for troubleshooting

### EH-003: Retry and Recovery
- Network failures: Automatic retry with exponential backoff (max 3 attempts)
- Service unavailable: Queue request for later processing when possible
- Data corruption: Automatic recovery from backups where feasible
- Critical failures: Fail-safe to preserve user data and prevent loss

## Change Management Rules

### CM-001: Feature Flag Requirements
All major feature releases MUST be behind feature flags until:
- Passes automated test suite (>90% pass rate)
- Completes staging environment validation
- Receives approval from product and security teams

### CM-002: Database Migration Rules
- All schema changes MUST be backward compatible or include migration scripts
- Migrations MUST be tested against production-equivalent dataset
- Rollback procedures MUST be documented and tested
- Migrations during peak hours REQUIRED explicit approval

### CM-003: Dependency Update Policy
- Security patches: MUST be applied within 48 hours of release
- Minor version updates: Evaluated and deployed within 2 weeks
- Major version updates: Requires regression testing and stakeholder approval
- All updates MUST be logged in change management system

## Exception Handling Rules

### EX-001: Emergency Overrides
- "magic stop" voice command IMMEDIATELY halts ALL processing regardless of state
- Administrative emergency access PROCEDURES documented and regularly tested
- Data recovery procedures MAINTAINED and tested quarterly
- Failover to manual processes DEFINED for critical business functions

### EX-002: Degraded Mode Operations
When core services partially unavailable:
- Local chat history access REMAINS available
- Basic UI functionality PRESERVED
- Non-critical features DISABLED gracefully
- Clear communication PROVIDED to users about degraded functionality
- Automatic recovery ATTEMPTED with user notification upon restoration

---
*Version: 1.0*
*Last Updated: 2024-07-18*
*Approved by: Architecture Review Board*