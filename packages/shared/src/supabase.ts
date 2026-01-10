// Supabase 테이블 타입 정의

export interface Branch {
  id: string;
  name: string;
  code: string | null;
  owner_id: string | null;
  max_users: number;
  plan: "free" | "basic" | "pro";
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  branch_id: string | null;
  display_name: string | null;
  role: "admin" | "member";
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface LoanGuide {
  id: number;
  item_cd: string;
  pfi_name: string | null;
  depth1: string | null;
  depth2: string | null;
  fi_memo: string | null;
  depth3: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface ChatSession {
  id: string;
  user_id: string;
  branch_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  session_id: string;
  role: "user" | "assistant";
  content: string;
  guide_ids: string[] | null;
  created_at: string;
}

export interface Announcement {
  id: string;
  type: "update" | "notice" | "maintenance" | "new_feature";
  title: string;
  content: string;
  important: boolean;
  published_at: string;
  created_at: string;
}

export interface BugReport {
  id: string;
  user_id: string | null;
  branch_id: string | null;
  type: "bug" | "guide_fix" | "feature" | "other";
  title: string;
  description: string;
  email: string | null;
  guide_id: string | null;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  updated_at: string;
}

export interface BranchInvite {
  id: string;
  branch_id: string;
  email: string;
  role: "admin" | "member";
  token: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
}

// Database 타입 (Supabase 클라이언트용)
export interface Database {
  public: {
    Tables: {
      branches: {
        Row: Branch;
        Insert: Omit<Branch, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<Branch, "id" | "created_at" | "updated_at">>;
      };
      user_profiles: {
        Row: UserProfile;
        Insert: Omit<UserProfile, "created_at" | "updated_at">;
        Update: Partial<Omit<UserProfile, "id" | "created_at" | "updated_at">>;
      };
      loan_guides: {
        Row: LoanGuide;
        Insert: Omit<LoanGuide, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<LoanGuide, "id" | "created_at" | "updated_at">>;
      };
      chat_sessions: {
        Row: ChatSession;
        Insert: Omit<ChatSession, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<ChatSession, "id" | "created_at" | "updated_at">>;
      };
      chat_messages: {
        Row: ChatMessage;
        Insert: Omit<ChatMessage, "id" | "created_at">;
        Update: Partial<Omit<ChatMessage, "id" | "created_at">>;
      };
      announcements: {
        Row: Announcement;
        Insert: Omit<Announcement, "id" | "created_at">;
        Update: Partial<Omit<Announcement, "id" | "created_at">>;
      };
      bug_reports: {
        Row: BugReport;
        Insert: Omit<BugReport, "id" | "created_at" | "updated_at">;
        Update: Partial<Omit<BugReport, "id" | "created_at" | "updated_at">>;
      };
      branch_invites: {
        Row: BranchInvite;
        Insert: Omit<BranchInvite, "id" | "created_at">;
        Update: Partial<Omit<BranchInvite, "id" | "created_at">>;
      };
    };
  };
}
