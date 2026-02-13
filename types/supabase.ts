export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[];

export interface Database {
  public: {
    Tables: {
      mc_chat_messages: {
        Row: {
          id: string;
          channel: string;
          sender_type: "user" | "agent";
          sender_user_id: string | null;
          sender_agent_id: string | null;
          body: string;
          meta: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel: string;
          sender_type: "user" | "agent";
          sender_user_id?: string | null;
          sender_agent_id?: string | null;
          body: string;
          meta?: Json | null;
          created_at?: string;
        };
        Update: {
          channel?: string;
          sender_type?: "user" | "agent";
          sender_user_id?: string | null;
          sender_agent_id?: string | null;
          body?: string;
          meta?: Json | null;
        };
      };
    };
    Views: {};
    Functions: {};
    Enums: {};
    CompositeTypes: {};
  };
}
