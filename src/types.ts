export interface User {
  user_id: string;
  username: string;
  email: string;
  password_hash: string;
  name?: string;
  gmail?: string;
  mobile?: string;
  age?: number;
  gmail_verified?: boolean;
  mobile_verified?: boolean;
  tier: 'Pro' | 'Premium' | 'Ultra';
  status: 'Active' | 'Suspended' | 'Locked';
  permission_level: 'Sandbox' | 'Restricted' | 'Full' | 'Admin';
  created_at: string;
  gemini_token_balance: number;
  claude_token_balance: number;
  openai_token_balance: number;
  last_login?: string;
  failed_login_attempts?: number;
  lockout_until?: string;
}

export type RoutingPreference = 'Auto' | 'USA' | 'India';

export interface ChatMessage {
  id: string;
  user_id: string;
  project: string;
  sender: 'user' | 'assistant';
  model_provider: string;
  message: string;
  timestamp: string;
  sentiment?: {
    polarity: number;
    emotion: string;
    recommendation: string;
  };
}

export interface Project {
  id: string;
  project_name: string;
  created_at: string;
  user_id: string;
}

export interface FeedbackItem {
  id: string;
  username: string;
  feedback_payload: string;
  created_at: string;
  status: 'Pending' | 'Reviewed' | 'Archived';
  category?: string;
  rating?: number;
  device?: string;
  admin_reply?: string;
}

export interface UpgradeProposal {
  upgrade_id: string;
  title: string;
  description: string;
  upgrade_payload: string;
  benefit_explanation: string;
  is_approved: boolean;
  created_at: string;
  admin_reviewed_at?: string;
}

export interface SessionRecord {
  session_id: string;
  user_id: string;
  username: string;
  ip: string;
  user_agent: string;
  login_time: string;
  last_active: string;
  status: 'Active' | 'Terminated';
}

export interface SentimentAnalysisResult {
  polarity: number;
  emotion: string;
  confidence: number;
  recommendation: string;
}

export interface SecurityThreatAlert {
  alert_id: string;
  user_id: string;
  username: string;
  full_name: string;
  email: string;
  mobile: string;
  age?: number;
  tier: string;
  permission_level: string;
  prompt_message: string;
  threat_type: string;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  detection_rule: string;
  appliance_trace_id: string;
  timestamp: string;
  status: 'UNRESOLVED' | 'RESOLVED' | 'LOCKED_USER';
}
