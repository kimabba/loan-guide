import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

interface AuthState {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setSession: (session: Session | null) => void;
  setLoading: (loading: boolean) => void;
  initialize: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      loading: true,
      initialized: false,

      setUser: (user) => set({ user }),
      setSession: (session) => set({ session }),
      setLoading: (loading) => set({ loading }),

      initialize: async () => {
        if (get().initialized) return;

        try {
          const { data: { session } } = await supabase.auth.getSession();

          set({
            session,
            user: session?.user ?? null,
            loading: false,
            initialized: true,
          });

          // Auth 상태 변경 리스너
          supabase.auth.onAuthStateChange((_event, session) => {
            set({
              session,
              user: session?.user ?? null,
            });
          });
        } catch (error) {
          console.error("Auth initialization error:", error);
          set({ loading: false, initialized: true });
        }
      },

      signOut: async () => {
        set({ loading: true });
        await supabase.auth.signOut();
        set({ user: null, session: null, loading: false });
      },
    }),
    {
      name: "auth-storage",
      partialize: (state) => ({
        // 세션은 Supabase가 관리하므로 저장하지 않음
      }),
    }
  )
);
