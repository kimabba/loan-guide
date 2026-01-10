// Shared types for loan-guide-chatbot

// Supabase types
export * from "./supabase";

export interface User {
  id: string;
  email: string;
  name: string;
  branchId: string;
  role: "admin" | "member";
  createdAt: string;
}

export interface Branch {
  id: string;
  name: string;
  planType: "starter" | "growth" | "business" | "enterprise";
  maxUsers: number;
  createdAt: string;
}

export interface LoanGuide {
  id: string;
  itemCd: string;
  company: string;
  productType: string;
  category: string;
  content: Record<string, unknown>;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  type: "update" | "notice" | "guide_change";
  createdAt: string;
}

export interface BugReport {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: "open" | "in_progress" | "resolved";
  createdAt: string;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
