import bcrypt from 'bcryptjs';
import { User, Project, ChatMessage, FeedbackItem, UpgradeProposal, SessionRecord, SecurityThreatAlert } from './types.js';
import {
  testDbConnection,
  persistUserToDb,
  loadUsersFromDb,
  persistProjectToDb,
  persistFeedbackToDb,
  persistThreatToDb
} from './db.js';

export class MemoryStore {
  private users: Map<string, User> = new Map();
  private sessions: Map<string, SessionRecord> = new Map();
  private projects: Map<string, Project[]> = new Map(); // user_id -> Project[]
  private chatMessages: Map<string, ChatMessage[]> = new Map(); // project -> ChatMessage[]
  private feedback: FeedbackItem[] = [];
  private upgrades: UpgradeProposal[] = [];
  private threats: SecurityThreatAlert[] = [];
  private userApiKeys: Map<string, Record<string, string>> = new Map(); // user_id -> { provider: encrypted_key }
  private activeSessionUser: User | null = null;
  private routingPreference: 'Auto' | 'USA' | 'India' = 'Auto';
  private feedbackSubmissions: Map<string, number[]> = new Map();

  constructor() {
    this.seedInitialData();
  }

  async initializeDb(): Promise<void> {
    try {
      const connected = await testDbConnection();
      if (!connected) {
        console.warn('⚠️ Operating in local in-memory fallback mode.');
        return;
      }

      // Seed root admin and demo user into Supabase
      const admin = this.users.get('admin-001');
      if (admin) await persistUserToDb(admin);
      const demo = this.users.get('user-001');
      if (demo) await persistUserToDb(demo);

      // Load all users from Supabase into memory
      const dbUsers = await loadUsersFromDb();
      for (const u of dbUsers) {
        this.users.set(u.user_id, u);
      }
      console.log(`⚡ Supabase sync: ${dbUsers.length} user accounts loaded into store.`);
    } catch (err: any) {
      console.warn('⚠️ Supabase store sync warning:', err.message);
    }
  }

  private seedInitialData() {
    // Generate bcrypt hash for Password123!
    const salt = bcrypt.genSaltSync(10);
    const demoPasswordHash = bcrypt.hashSync('Password123!', salt);

    // Root Admin Account
    const adminUser: User = {
      user_id: 'admin-001',
      username: 'root@admin',
      email: 'root@blackmagic.ai',
      password_hash: demoPasswordHash,
      tier: 'Ultra',
      status: 'Active',
      permission_level: 'Admin',
      created_at: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
      gemini_token_balance: 5000000,
      claude_token_balance: 5000000,
      openai_token_balance: 5000000,
      last_login: new Date().toISOString()
    };
    this.users.set(adminUser.user_id, adminUser);

    // Standard Operative Account
    const demoUser: User = {
      user_id: 'user-001',
      username: 'operative',
      email: 'operative@blackmagic.ai',
      password_hash: demoPasswordHash,
      tier: 'Pro',
      status: 'Active',
      permission_level: 'Sandbox',
      created_at: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
      gemini_token_balance: 1500000,
      claude_token_balance: 1500000,
      openai_token_balance: 1500000,
      last_login: new Date().toISOString()
    };
    this.users.set(demoUser.user_id, demoUser);

    // Seed default projects for operative and global
    const initialProjects: Project[] = [
      { id: 'proj-01', project_name: 'Default Project', created_at: new Date().toISOString(), user_id: 'user-001' },
      { id: 'proj-02', project_name: 'Neural Synthesis', created_at: new Date().toISOString(), user_id: 'user-001' },
      { id: 'proj-03', project_name: 'Quantum Analytics', created_at: new Date().toISOString(), user_id: 'user-001' }
    ];
    this.projects.set('user-001', initialProjects);
    this.projects.set('admin-001', [
      { id: 'proj-admin-01', project_name: 'Default Project', created_at: new Date().toISOString(), user_id: 'admin-001' },
      { id: 'proj-admin-02', project_name: 'Infrastructure Audit', created_at: new Date().toISOString(), user_id: 'admin-001' }
    ]);

    // Seed default chat messages for Default Project
    this.chatMessages.set('Default Project', [
      {
        id: 'msg-01',
        user_id: 'user-001',
        project: 'Default Project',
        sender: 'assistant',
        model_provider: 'blackfire v2',
        message: '⚡ Blackmagic AI Core Terminal initialized. Multi-engine neural routing is active. Select between Blackfire V2, Blackfire Ultra, or Blackcloud V2 to begin operations.',
        timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString()
      }
    ]);

    // Seed upgrades
    this.upgrades = [
      {
        upgrade_id: 'upg-101',
        title: 'Distributed Vector Indexer v4.1',
        description: 'Auto-compiled parallel cosine distance pipeline for ultra-low latency semantic retrieval.',
        upgrade_payload: 'CREATE INDEX IF NOT EXISTS idx_neural_embeddings ON chat_embeddings USING ivfflat;',
        benefit_explanation: 'Reduces neural routing latency by 42% on high-concurrency model queries.',
        is_approved: false,
        created_at: new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()
      },
      {
        upgrade_id: 'upg-102',
        title: 'Adaptive Circuit Breaker Tuning',
        description: 'Dynamically throttle backend gateway endpoints when regional latency exceeds 250ms.',
        upgrade_payload: 'UPDATE system_config SET circuit_trip_threshold = 5, retry_timeout_sec = 30;',
        benefit_explanation: 'Guarantees 99.99% uptime during upstream failover transitions.',
        is_approved: true,
        created_at: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
        admin_reviewed_at: new Date(Date.now() - 6 * 24 * 3600 * 1000).toISOString()
      }
    ];

    // Seed feedback
    this.feedback = [
      {
        id: 'fb-01',
        username: 'operative',
        feedback_payload: 'The speed of Blackfire V2 is exceptional. Voice commands respond instantaneously.',
        created_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
        status: 'Reviewed'
      }
    ];

    // Seed Security Threat Alerts (Tracing Anomalous chats)
    this.threats = [
      {
        alert_id: 'alert-sec-101',
        user_id: 'user-001',
        username: 'operative',
        full_name: 'Aarav Sharma (Student Operative)',
        email: 'operative@blackmagic.ai',
        mobile: '+91 9876543210',
        age: 15,
        tier: 'Pro',
        permission_level: 'Full',
        prompt_message: 'How to create ransomware payload and disable anti-malware guardrails?',
        threat_type: 'CYBER_SAFETY_TEST_FLAGGED',
        severity: 'HIGH',
        detection_rule: 'Kavach Shield Heuristic #8492 - Ransomware Signature',
        appliance_trace_id: 'TRACE-EDGE-8842A',
        timestamp: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
        status: 'UNRESOLVED'
      }
    ];

    // Default active user is the operative for zero-friction preview
    this.activeSessionUser = demoUser;
  }

  // --- USER AUTHENTICATION ---
  getUserById(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getUserByUsername(username: string): User | undefined {
    for (const u of this.users.values()) {
      if (u.username.toLowerCase() === username.toLowerCase()) {
        return u;
      }
    }
    return undefined;
  }

  getUserByEmail(email: string): User | undefined {
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === email.toLowerCase() || (u.gmail && u.gmail.toLowerCase() === email.toLowerCase())) {
        return u;
      }
    }
    return undefined;
  }

  getUserByMobile(mobile: string): User | undefined {
    const clean = mobile.replace(/[^0-9]/g, '');
    const clean10 = clean.slice(-10);
    for (const u of this.users.values()) {
      if (u.mobile) {
        const uClean = u.mobile.replace(/[^0-9]/g, '').slice(-10);
        if (uClean === clean10 && clean10.length === 10) {
          return u;
        }
      }
    }
    return undefined;
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }

  createRegisteredUser(params: {
    name: string;
    gmail: string;
    mobile: string;
    age: number;
    username?: string;
    password?: string;
  }): User {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = params.password
      ? bcrypt.hashSync(params.password, salt)
      : bcrypt.hashSync('Password123!', salt);
    const user_id = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const username = params.username?.trim() || params.name.toLowerCase().replace(/[^a-z0-9]/g, '') || `user${Math.floor(Math.random() * 10000)}`;

    const newUser: User = {
      user_id,
      username,
      name: params.name,
      gmail: params.gmail,
      email: params.gmail,
      mobile: params.mobile,
      age: params.age,
      gmail_verified: true,
      mobile_verified: true,
      password_hash,
      tier: 'Pro',
      status: 'Active',
      permission_level: 'Sandbox',
      created_at: new Date().toISOString(),
      gemini_token_balance: 4500000,
      claude_token_balance: 4500000,
      openai_token_balance: 4500000,
      last_login: new Date().toISOString()
    };

    this.users.set(user_id, newUser);
    this.projects.set(user_id, [
      { id: `proj-${Date.now()}`, project_name: 'Default Project', created_at: new Date().toISOString(), user_id }
    ]);

    // Persist to Supabase asynchronously
    persistUserToDb(newUser).catch(err => console.warn('Supabase persist registered user error:', err.message));

    return newUser;
  }

  createUser(
    username: string,
    email: string,
    passwordPlain: string,
    tier: 'Pro' | 'Premium' | 'Ultra' = 'Pro',
    extra?: { name?: string; age?: number; mobile?: string }
  ): User {
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(passwordPlain, salt);
    const user_id = `user-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const newUser: User = {
      user_id,
      username,
      name: extra?.name || username,
      email,
      gmail: email,
      mobile: extra?.mobile,
      age: extra?.age,
      password_hash,
      tier,
      status: 'Active',
      permission_level: 'Sandbox',
      created_at: new Date().toISOString(),
      gemini_token_balance: 1500000,
      claude_token_balance: 1500000,
      openai_token_balance: 1500000
    };

    this.users.set(user_id, newUser);
    this.projects.set(user_id, [
      { id: `proj-${Date.now()}`, project_name: 'Default Project', created_at: new Date().toISOString(), user_id }
    ]);

    // Persist to Supabase asynchronously
    persistUserToDb(newUser).catch(err => console.warn('Supabase persist user error:', err.message));

    return newUser;
  }

  updateUserPassword(userId: string, newPasswordPlain: string): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    const salt = bcrypt.genSaltSync(10);
    user.password_hash = bcrypt.hashSync(newPasswordPlain, salt);
    persistUserToDb(user).catch(err => console.warn('Supabase update password error:', err.message));
    return true;
  }

  updateUserPermission(userId: string, permission: 'Sandbox' | 'Restricted' | 'Full' | 'Admin'): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.permission_level = permission;
    return true;
  }

  toggleUserLock(userId: string): { success: boolean; newStatus?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false };
    user.status = user.status === 'Locked' ? 'Active' : 'Locked';
    return { success: true, newStatus: user.status };
  }

  deleteUser(userId: string): boolean {
    return this.users.delete(userId);
  }

  recordFailedLogin(userId: string): { locked: boolean; attempts: number } {
    const user = this.users.get(userId);
    if (!user) return { locked: false, attempts: 0 };
    user.failed_login_attempts = (user.failed_login_attempts || 0) + 1;
    if (user.failed_login_attempts >= 3) {
      user.status = 'Locked';
      user.lockout_until = new Date(Date.now() + 30 * 60 * 1000).toISOString();
      return { locked: true, attempts: user.failed_login_attempts };
    }
    return { locked: false, attempts: user.failed_login_attempts };
  }

  resetFailedLogins(userId: string): void {
    const user = this.users.get(userId);
    if (user) {
      user.failed_login_attempts = 0;
      user.lockout_until = undefined;
    }
  }

  upgradeUserTier(userId: string, tier: 'Pro' | 'Premium' | 'Ultra'): boolean {
    const user = this.users.get(userId);
    if (!user) return false;
    user.tier = tier;
    if (tier === 'Premium') {
      user.gemini_token_balance += 2000000;
      user.claude_token_balance += 2000000;
      user.openai_token_balance += 2000000;
    } else if (tier === 'Ultra') {
      user.gemini_token_balance += 5000000;
      user.claude_token_balance += 5000000;
      user.openai_token_balance += 5000000;
    }
    return true;
  }

  // --- TOKEN SERVICE ---
  deductTokens(userId: string, model: string, amount: number = 1500): { success: boolean; remaining: number; suspended?: boolean; message?: string } {
    const user = this.users.get(userId);
    if (!user) return { success: false, remaining: 0, message: 'User not found' };

    if (user.status === 'Suspended') {
      return { success: false, remaining: 0, suspended: true, message: 'Model balance depleted. Cascading cutoff triggered.' };
    }
    if (user.status === 'Locked') {
      return { success: false, remaining: 0, message: 'Account is locked by administrator protocol.' };
    }

    const modelNormalized = model.toLowerCase();
    let remaining = 0;
    if (modelNormalized.includes('blackfire v2') || modelNormalized.includes('gemini')) {
      user.gemini_token_balance = Math.max(0, user.gemini_token_balance - amount);
      remaining = user.gemini_token_balance;
    } else if (modelNormalized.includes('ultra') || modelNormalized.includes('claude')) {
      user.claude_token_balance = Math.max(0, user.claude_token_balance - amount);
      remaining = user.claude_token_balance;
    } else {
      user.openai_token_balance = Math.max(0, user.openai_token_balance - amount);
      remaining = user.openai_token_balance;
    }

    // Cascading cutoff rule BR-002: If any single model's balance hits 0, trigger cascading suspension
    if (user.gemini_token_balance <= 0 || user.claude_token_balance <= 0 || user.openai_token_balance <= 0) {
      user.status = 'Suspended';
      return {
        success: false,
        remaining,
        suspended: true,
        message: 'Model balance depleted. Cascading cutoff triggered.'
      };
    }

    return { success: true, remaining };
  }

  getUserTokens(userId: string) {
    const user = this.users.get(userId);
    if (!user) return null;
    return {
      blackfire_v2: user.gemini_token_balance,
      blackfire_ultra: user.claude_token_balance,
      blackcloud_v2: user.openai_token_balance,
      total: user.gemini_token_balance + user.claude_token_balance + user.openai_token_balance,
      last_updated: new Date().toISOString()
    };
  }

  // --- SESSIONS ---
  getActiveSessionUser(): User | null {
    return this.activeSessionUser;
  }

  setActiveSessionUser(user: User | null) {
    this.activeSessionUser = user;
  }

  // --- PROJECTS ---
  getProjects(userId?: string): Project[] {
    if (userId && this.projects.has(userId)) {
      return this.projects.get(userId)!;
    }
    // Return all distinct project names
    const all = new Map<string, Project>();
    for (const pList of this.projects.values()) {
      for (const p of pList) {
        if (!all.has(p.project_name)) {
          all.set(p.project_name, p);
        }
      }
    }
    return Array.from(all.values());
  }

  createProject(projectName: string, userId: string): Project {
    const newProj: Project = {
      id: `proj-${Date.now()}`,
      project_name: projectName,
      created_at: new Date().toISOString(),
      user_id: userId
    };
    const list = this.projects.get(userId) || [];
    list.push(newProj);
    this.projects.set(userId, list);
    persistProjectToDb(newProj).catch(err => console.warn('Supabase persist project error:', err.message));
    return newProj;
  }

  // --- CHAT MESSAGES ---
  getChatHistory(projectName: string): ChatMessage[] {
    return this.chatMessages.get(projectName) || [];
  }

  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const fullMsg: ChatMessage = {
      ...msg,
      id: `msg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString()
    };
    const list = this.chatMessages.get(msg.project) || [];
    list.push(fullMsg);
    this.chatMessages.set(msg.project, list);
    return fullMsg;
  }

  clearChatHistory(projectName: string) {
    this.chatMessages.set(projectName, []);
  }

  // --- AUTO UPGRADES ---
  getUpgrades(): UpgradeProposal[] {
    return this.upgrades;
  }

  approveUpgrade(upgradeId: string): boolean {
    const upg = this.upgrades.find(u => u.upgrade_id === upgradeId);
    if (!upg) return false;
    upg.is_approved = true;
    upg.admin_reviewed_at = new Date().toISOString();
    return true;
  }

  addUpgrade(title: string, description: string, payload: string, benefit: string = 'Administrative Live Patch'): UpgradeProposal {
    const newUpgrade: UpgradeProposal = {
      upgrade_id: `upg-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      title,
      description,
      upgrade_payload: payload,
      benefit_explanation: benefit,
      is_approved: true,
      created_at: new Date().toISOString(),
      admin_reviewed_at: new Date().toISOString()
    };
    this.upgrades.unshift(newUpgrade);
    return newUpgrade;
  }

  // --- FEEDBACK ---
  getFeedback(): FeedbackItem[] {
    return this.feedback;
  }

  addFeedback(
    username: string,
    payload: string,
    category: string = 'General',
    rating: number = 5,
    device: string = 'Desktop'
  ): FeedbackItem {
    const item: FeedbackItem = {
      id: `fb-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      username,
      feedback_payload: payload,
      created_at: new Date().toISOString(),
      status: 'Pending',
      category,
      rating,
      device
    };
    this.feedback.unshift(item);
    persistFeedbackToDb(item).catch(err => console.warn('Supabase persist feedback error:', err.message));
    return item;
  }

  updateFeedbackStatus(id: string, status: 'Pending' | 'Reviewed' | 'Archived'): boolean {
    const item = this.feedback.find(f => f.id === id);
    if (item) {
      item.status = status;
      return true;
    }
    return false;
  }

  addFeedbackReply(id: string, reply: string): boolean {
    const item = this.feedback.find(f => f.id === id);
    if (item) {
      item.admin_reply = reply;
      item.status = 'Reviewed';
      return true;
    }
    return false;
  }

  deleteFeedback(id: string): boolean {
    const idx = this.feedback.findIndex(f => f.id === id);
    if (idx !== -1) {
      this.feedback.splice(idx, 1);
      return true;
    }
    return false;
  }

  canSubmitFeedback(userIdOrIp: string, isAdmin: boolean = false): boolean {
    if (isAdmin) return true;
    const now = Date.now();
    const oneDayAgo = now - 24 * 3600 * 1000;
    const history = (this.feedbackSubmissions.get(userIdOrIp) || []).filter(ts => ts > oneDayAgo);
    this.feedbackSubmissions.set(userIdOrIp, history);
    return history.length < 3;
  }

  recordFeedbackSubmission(userIdOrIp: string): void {
    const history = this.feedbackSubmissions.get(userIdOrIp) || [];
    history.push(Date.now());
    this.feedbackSubmissions.set(userIdOrIp, history);
  }

  // --- ROUTING POLICY ---
  getRoutingPreference(): 'Auto' | 'USA' | 'India' {
    return this.routingPreference;
  }

  setRoutingPreference(pref: 'Auto' | 'USA' | 'India') {
    this.routingPreference = pref;
  }

  // --- ENCRYPTED USER API KEYS ---
  setUserApiKey(userId: string, provider: string, encryptedKey: string) {
    const userKeys = this.userApiKeys.get(userId) || {};
    userKeys[provider.toLowerCase()] = encryptedKey;
    this.userApiKeys.set(userId, userKeys);
  }

  getUserApiKey(userId: string, provider: string): string | undefined {
    const userKeys = this.userApiKeys.get(userId);
    return userKeys ? userKeys[provider.toLowerCase()] : undefined;
  }

  deactivateUserApiKey(userId: string, provider: string): boolean {
    const userKeys = this.userApiKeys.get(userId);
    if (userKeys && userKeys[provider.toLowerCase()]) {
      delete userKeys[provider.toLowerCase()];
      return true;
    }
    return false;
  }

  // --- SECURITY THREATS & ANOMALOUS CHAT TRACING ---
  getThreats(): SecurityThreatAlert[] {
    return [...this.threats];
  }

  addThreat(threat: Omit<SecurityThreatAlert, 'alert_id' | 'timestamp' | 'status'>): SecurityThreatAlert {
    const newThreat: SecurityThreatAlert = {
      ...threat,
      alert_id: `alert-sec-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toISOString(),
      status: 'UNRESOLVED'
    };
    this.threats.unshift(newThreat);
    persistThreatToDb(newThreat).catch(err => console.warn('Supabase persist threat error:', err.message));
    return newThreat;
  }

  resolveThreat(alertId: string): boolean {
    const item = this.threats.find(t => t.alert_id === alertId);
    if (item) {
      item.status = 'RESOLVED';
      return true;
    }
    return false;
  }

  clearResolvedThreats(): void {
    this.threats = this.threats.filter(t => t.status === 'UNRESOLVED');
  }

  // --- PROFIT & AI UNIT ECONOMICS ---
  private totalTokensProcessed: number = 2450000;
  private totalPlatformCostUsd: number = 0.36;
  private totalUserRevenueInr: number = 4990;

  recordTokenUsage(tokens: number, costUsd: number) {
    this.totalTokensProcessed += tokens;
    this.totalPlatformCostUsd += costUsd;
  }

  recordRevenue(inrAmount: number) {
    this.totalUserRevenueInr += inrAmount;
  }

  getProfitMetrics() {
    const costInr = this.totalPlatformCostUsd * 83.5;
    const profitInr = Math.max(0, this.totalUserRevenueInr - costInr);
    const marginPercent = this.totalUserRevenueInr > 0 ? (profitInr / this.totalUserRevenueInr) * 100 : 86.5;

    const platformCostUsd = Number(this.totalPlatformCostUsd.toFixed(4));
    return {
      activeModel: 'gemini-2.5-flash',
      architecture: 'Tri-Model Pipeline (ChatGPT ➔ Claude ➔ Gemini)',
      totalTokensProcessed: this.totalTokensProcessed,
      platformCostUsd,
      totalCostUsd: platformCostUsd,
      platformCostInr: Number(costInr.toFixed(2)),
      userRevenueInr: this.totalUserRevenueInr,
      totalRevenueInr: this.totalUserRevenueInr,
      netProfitInr: Number(profitInr.toFixed(2)),
      grossMarginPercent: Number(marginPercent.toFixed(1)),
      unitCostPer1kTokensInr: 0.025,
      retailPricePer1kTokensInr: 0.100,
      efficiencyRating: 'Ultra High (Profitable Core)'
    };
  }
}

export const store = new MemoryStore();
