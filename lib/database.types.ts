// Run `npm run types` after creating tables to regenerate this file
// from your Supabase project. This stub lets TypeScript compile in the
// meantime.

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  public: {
    Tables: {
      households: {
        Row: { id: string; name: string; created_at: string };
        Insert: { id?: string; name?: string; created_at?: string };
        Update: { id?: string; name?: string; created_at?: string };
      };
      profiles: {
        Row: {
          id: string;
          household_id: string;
          display_name: string;
          theme: 'dnd' | 'alien' | 'horror' | 'marquee' | 'cozy';
          avatar_glyph: string | null;
          class_name: string | null;
          xp: number;
          gold: number;
          level: number;
          created_at: string;
        };
        Insert: {
          id: string;
          household_id: string;
          display_name: string;
          theme?: 'dnd' | 'alien' | 'horror' | 'marquee' | 'cozy';
          avatar_glyph?: string | null;
          class_name?: string | null;
          xp?: number;
          gold?: number;
          level?: number;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['profiles']['Insert']>;
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string;
          assignee_id: string | null;
          created_by: string | null;
          tier: 'common' | 'rare' | 'epic' | 'urgent';
          xp_reward: number;
          gold_reward: number;
          due_at: string | null;
          completed_at: string | null;
          completed_by: string | null;
          recurring: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['tasks']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['tasks']['Row']>;
      };
      inventory_categories: {
        Row: { id: string; household_id: string; name: string; sort_order: number };
        Insert: Omit<Database['public']['Tables']['inventory_categories']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['inventory_categories']['Row']>;
      };
      inventory_items: {
        Row: {
          id: string;
          household_id: string;
          category_id: string | null;
          name: string;
          quantity: number;
          unit: string;
          low_threshold: number;
          updated_at: string;
          updated_by: string | null;
        };
        Insert: Omit<Database['public']['Tables']['inventory_items']['Row'], 'id' | 'updated_at'> & {
          id?: string;
          updated_at?: string;
        };
        Update: Partial<Database['public']['Tables']['inventory_items']['Row']>;
      };
      recipes: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string;
          prep_minutes: number;
          cook_minutes: number;
          serves: number;
          difficulty: 'easy' | 'medium' | 'hard';
          instructions: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['recipes']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['recipes']['Row']>;
      };
      recipe_ingredients: {
        Row: { id: string; recipe_id: string; item_name: string; quantity: number; unit: string };
        Insert: Omit<Database['public']['Tables']['recipe_ingredients']['Row'], 'id'> & { id?: string };
        Update: Partial<Database['public']['Tables']['recipe_ingredients']['Row']>;
      };
      notifications: {
        Row: {
          id: string;
          household_id: string;
          recipient_id: string | null;
          sender_id: string | null;
          title: string;
          body: string;
          kind: 'info' | 'task' | 'inventory' | 'reminder' | 'achievement';
          read_at: string | null;
          created_at: string;
        };
        Insert: Omit<Database['public']['Tables']['notifications']['Row'], 'id' | 'created_at'> & {
          id?: string;
          created_at?: string;
        };
        Update: Partial<Database['public']['Tables']['notifications']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_household_id: { Args: Record<string, never>; Returns: string };
    };
    Enums: Record<string, never>;
  };
};
