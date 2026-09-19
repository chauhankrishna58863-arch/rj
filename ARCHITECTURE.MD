# Blackmagic AI - Architecture Document

## Overview
Blackmagic AI is a hybrid desktop/web application that combines a rich client-side interface with a robust backend API service. The architecture follows a modular, service-oriented design with clear separation of concerns between presentation, business logic, and data layers.

## System Context
```
+---------------------+       +---------------------+       +---------------------+
|     User Device     |       |   Cloud Services    |       |  Third-Party APIs   |
|                     |       |                     |       |                     |
|  +----------------+  |       |  +---------------+  |       |  +---------------+  |
|  | Desktop Client |<-------->|   API Gateway     |<------->|  Google Gemini    |  |
|  | (WebView + JS) |  |       |  +---------------+  |       |  +---------------+  |
|  +----------------+  |       |       ||           |       |  +---------------+  |
|                     |       |       ||           |------->|  OpenAI GPT     |  |
|  +----------------+  |       |       ||           |       |  +---------------+  |
|  |  Admin Panel   |<-------->|       ||           |       |  +---------------+  |
|  | (WebView + JS) |  |       |       ||           |------->|  Anthropic Claude|  |
|  +----------------+  |       |       ||           |       |  +---------------+  |
|                     |       |       \/            |       |                     |
|  +----------------+  |       |  +---------------+  |       |                     |
|  | Local SQLite   |<-------->|   PostgreSQL      |       |                     |
|  | (Chat History) |  |       |  (User/Data)      |       |                     |
|  +----------------+  |       |  +---------------+  |       |                     |
|                     |       |                     |       |                     |
+---------------------+       +---------------------+       +---------------------+
           ^                           ^
           |                           |
           |            +--------------+--------------+
           |            |                             |
           v            v                             v
   +-------------+  +----------------+        +-----------------+
   |  OS Layer   |  |  Stripe        |        |  SMTP (Gmail)   |
   |             |  |  Payments      |        |  Email Service  |
   +-------------+  +----------------+        +-----------------+
```

## Architectural Layers

### 1. Presentation Layer (Client)
**Technology Stack**: HTML5, CSS3, JavaScript (ES6+), WebView
**Responsibilities**:
- Rendering user interface with glassmorphism and cyberpunk aesthetics
- Handling user interactions and input validation
- Managing local state and temporary UI data
- Implementing client-side animations and transitions
- Communicating with backend via RESTful API
- Storing non-sensitive user preferences locally
- Rendering chat messages and UI components

**Components**:
- Login/Authentication UI
- Main Chat Interface with model selector
- Sidebar Navigation (projects, settings, etc.)
- Overlay Panels (settings, upgrades, feedback)
- Admin Dashboard Interface
- Notification and Alert Systems
- Theme and Appearance Engine

### 2. Application Layer (Backend API)
**Technology Stack**: Python 3.12+, Flask RESTful API
**Responsibilities**:
- Authentication and session management
- Business logic enforcement (subscription rules, token economics)
- Integration with third-party AI APIs
- Data validation and sanitization
- Background job processing (token sync, sentiment analysis)
- Administrative function exposure
- Webhook handling (Stripe payments)
- Rate limiting and abuse prevention

**Services**:
- `AuthService`: User registration, login, session management, password reset
- `TokenService`: Token balance management, deduction, plan upgrades
- `SentimentService`: Emotion detection and scoring from text
- `UpgradeService`: AI-proposed system improvement handling
- `DBManager`: Database abstraction layer for PostgreSQL operations
- `OTPService`: Email-based one-time password handling
- `Flask App`: REST API endpoints routing and middleware

### 3. Data Layer
**Technology Stack**: 
- PostgreSQL 15+ (primary user/account/data storage)
- SQLite 3+ (local client-side chat history and session storage)
- In-memory caches (for temporary session data)

**Databases**:

**PostgreSQL Schema** (replicated across USA & India regions):
- `users`: Account information, status, tier, permissions
- `user_token_pools`: Token balances per model type (Gemini, OpenAI, Claude)
- `subscription_plan_queue`: Planned tier changes with preserved balances
- `human_feeling_metrics`: Sentiment analysis results
- `live_user_feedback`: User-submitted feedback and suggestions
- `historical_session_logs`: Login sessions and audit trails
- `user_chat_history`: Chat messages (stored locally, not in cloud DB)
- `user_projects`: User-defined project workspaces
- `system_auto_upgrades`: AI-proposed system improvements awaiting approval
- `user_api_keys`: External API keys for user integrations

**SQLite Schema** (local client storage):
- `chat_messages`: Local conversation history per project
- `session_data`: Encrypted session tokens and preferences
- `ui_state`: Window positions, splitter states, temporary UI configs
- `template_cache`: Cached UI templates for offline availability

### 4. Integration Layer
**External Services**:
- **Stripe API**: Payment processing, subscription management, webhooks
- **SMTP/Gmail**: OTP delivery and email notifications
- **Google Gemini API**: Text generation and understanding
- **OpenAI API**: Text generation and understanding
- **Anthropic Claude API**: Text generation and understanding
- **DNS/CDN**: Geographic load balancing for regional database access

### 5. Infrastructure & Deployment
**Deployment Model**:
- Desktop application distributed via packaged executable (Electron/WebView wrapper)
- Backend services can be self-hosted or cloud-deployed
- Regional database pairs for latency optimization
- Horizontal scaling capability for API services
- Containerization support (Docker) for backend services

**Key Infrastructure Components**:
- Load balancer for distributing API traffic across regions
- Database replication setup for USA-Ireland-India synchronization
- Backup and disaster recovery procedures
- Monitoring and logging infrastructure (ELK stack or similar)
- CI/CD pipeline for automated testing and deployment

## Architectural Characteristics

### Scalability
- **Horizontal Scaling**: API layer can scale across multiple instances behind load balancer
- **Database Sharding**: User data distributed across regional databases based on geographic proximity
- **Caching Layer**: Redis or similar for session storage and frequent query results
- **Async Processing**: Background jobs handled via worker queues (Celery/RQ equivalent)

### Performance
- **Edge Computing**: Regional database deployment minimizes latency for global users
- **Connection Pooling**: Database connections reused efficiently
- **Asset Optimization**: Static assets served via CDN with compression and caching
- **Database Indexing Strategy**: Proper indexing on frequently queried columns (user_id, timestamps, status)
- **Payload Optimization**: JSON responses minimized, pagination for large datasets

### Availability
- **Multi-Region Deployment**: Active-active setup across USA and India regions
- **Database Replication**: Real-time synchronization between regional instances
- **Failover Mechanisms**: Automatic traffic rerouting during regional outages
- **Health Checks**: Continuous monitoring of service dependencies
- **Graceful Degradation**: Core functionality available with limited features during partial outages

### Security
- **Defense in Depth**: Multiple layers of security controls
- **Data Encryption**: AES-256 for sensitive data at rest, TLS 1.3 for data in transit
- **Authentication**: Strong password hashing (bcrypt), session tokens with expiration
- **Authorization**: Role-based access control (RBAC) with least privilege principle
- **Input Validation**: Strict validation and sanitization of all user inputs
- **Audit Logging**: Comprehensive logging of security-relevant events
- **Dependency Scanning**: Regular vulnerability assessment of third-party libraries
- **OWASP Compliance**: Protection against top 10 web application vulnerabilities

### Maintainability
- **Modular Design**: Loosely coupled services with well-defined interfaces
- **Code Organization**: Separation of concerns with clear module responsibilities
- **Documentation**: Comprehensive inline documentation and architectural diagrams
- **Testing Strategy**: Unit tests (>80% coverage), integration tests, end-to-end tests
- **Dependency Management**: Version-controlled dependencies with regular updates
- **Configuration Management**: Environment-based configuration without hardcoded values
- **Logging Standards**: Structured logging with appropriate levels and context

### Data Management
- **Data Governance**: Clear data ownership and retention policies
- **Privacy by Design**: Personal data minimization and purpose limitation
- **Backup Strategy**: Regular automated backups with point-in-time recovery
- **Archival Policy**: Long-term storage for compliance requirements
- **Data Portability**: Export capabilities for user data in standard formats
- **Data Quality**: Validation constraints and regular data hygiene processes

## Communication Patterns

### Synchronous Communication
- **RESTful API**: Standard HTTP/JSON communication between client and server
- **WebSocket Alternatives**: Considered for real-time features but not implemented due to local-first approach
- **Database Queries**: Direct SQL connections with connection pooling

### Asynchronous Communication
- **Email Notifications**: SMTP-based delivery with retry mechanisms
- **Webhooks**: Stripe outgoing/incoming webhook handling
- **Background Jobs**: Periodic tasks (token sync, sentiment analysis, cleanup)
- **Event Processing**: Internal event bus for decoupled service communication

### Data Flow Examples

#### User Login Flow
1. User enters credentials in client UI
2. Client sends POST /api/auth/login with username/password
3. AuthService validates credentials against users table
4. On success: returns user data and establishes session
5. Client stores encrypted session token locally
6. Subsequent requests include session token in Authorization header

#### Chat Message Flow
1. User types message and presses Enter
2. Client sends POST /api/chat/ask with user_id, project, model_provider, prompt
3. TokenService validates available tokens for requested model
4. SentimentService analyzes prompt for emotional content
5. Request forwarded to appropriate AI API (Gemini/OpenAI/Claude)
6. AI response received and processed
7. Response stored in local SQLite chat history
8. Response returned to client for display
9. Sentiment data stored in human_feeling_metrics table
10. Token balance updated and checked for cascading cutoff conditions

#### Subscription Upgrade Flow
1. User selects new tier in upgrade overlay
2. Client sends POST /api/plans/upgrade with user_id and target_tier
3. TokenService.upgrade_plan() called:
   - Current balances saved to subscription_plan_queue
   - New tier token balances applied (1.5M per model)
   - User status set to Active
4. Client simulates Stripe redirect (in production: actual Stripe Checkout)
5. Webhook received: POST /api/stripe/webhook with completion event
6. UpgradeService processes webhook:
   - Verifies payment completion
   - Updates user tier in database
   - Sends confirmation notification

#### Admin Action Flow
1. Admin selects action in admin panel (e.g., user token increase)
2. Client sends POST request to appropriate admin endpoint
3. AuthService verifies admin privileges
4. Target service performs requested operation
5. Operation logged to audit trail
6. Result returned to client for display
7. Affected data synchronized across regional databases