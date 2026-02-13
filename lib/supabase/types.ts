export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      mc_tickets: {
        Row: {
          id: string;
          title: string;
          description: string | null;
          status: 'not_done' | 'ongoing' | 'done';
          owner_agent_id: string | null;
          parent_id: string | null;
          meta: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          title: string;
          description?: string | null;
          status?: 'not_done' | 'ongoing' | 'done';
          owner_agent_id?: string | null;
          parent_id?: string | null;
          meta?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mc_tickets']['Insert']>;
      };
      mc_comments: {
        Row: {
          id: string;
          ticket_id: string;
          author_user_id: string | null;
          author_agent_id: string | null;
          body: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          ticket_id: string;
          author_user_id?: string | null;
          author_agent_id?: string | null;
          body: string;
          meta?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mc_comments']['Insert']>;
      };
      mc_chat_messages: {
        Row: {
          id: string;
          channel: string;
          sender_type: 'user' | 'agent';
          sender_user_id: string | null;
          sender_agent_id: string | null;
          body: string;
          meta: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          channel: string;
          sender_type: 'user' | 'agent';
          sender_user_id?: string | null;
          sender_agent_id?: string | null;
          body: string;
          meta?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mc_chat_messages']['Insert']>;
      };
      mc_requests: {
        Row: {
          id: string;
          request_type: string;
          payload: Json;
          created_by: string;
          status: string;
          result: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          request_type: string;
          payload: Json;
          created_by: string;
          status?: string;
          result?: Json;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['mc_requests']['Insert']>;
      };
    };
  };
}
