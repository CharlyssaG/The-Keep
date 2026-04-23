// Database types matching what `supabase gen types typescript` produces
// for @supabase/supabase-js v2.45+. Each table has Row/Insert/Update plus
// a Relationships array. Once your Supabase project is live you can run
// `npm run types` to regenerate this from the real schema; the structure
// will match.

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      households: {
        Row: {
          id: string;
          name: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          household_id: string;
          display_name: string;
          theme: string;
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
          theme?: string;
          avatar_glyph?: string | null;
          class_name?: string | null;
          xp?: number;
          gold?: number;
          level?: number;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          display_name?: string;
          theme?: string;
          avatar_glyph?: string | null;
          class_name?: string | null;
          xp?: number;
          gold?: number;
          level?: number;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'profiles_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      tasks: {
        Row: {
          id: string;
          household_id: string;
          title: string;
          description: string;
          assignee_id: string | null;
          created_by: string | null;
          tier: string;
          xp_reward: number;
          gold_reward: number;
          due_at: string | null;
          completed_at: string | null;
          completed_by: string | null;
          recurring: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string;
          assignee_id?: string | null;
          created_by?: string | null;
          tier?: string;
          xp_reward?: number;
          gold_reward?: number;
          due_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          recurring?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string;
          assignee_id?: string | null;
          created_by?: string | null;
          tier?: string;
          xp_reward?: number;
          gold_reward?: number;
          due_at?: string | null;
          completed_at?: string | null;
          completed_by?: string | null;
          recurring?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'tasks_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_assignee_id_fkey';
            columns: ['assignee_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_created_by_fkey';
            columns: ['created_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'tasks_completed_by_fkey';
            columns: ['completed_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      inventory_categories: {
        Row: {
          id: string;
          household_id: string;
          name: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          household_id: string;
          name: string;
          sort_order?: number;
        };
        Update: {
          id?: string;
          household_id?: string;
          name?: string;
          sort_order?: number;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_categories_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
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
        Insert: {
          id?: string;
          household_id: string;
          category_id?: string | null;
          name: string;
          quantity?: number;
          unit?: string;
          low_threshold?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Update: {
          id?: string;
          household_id?: string;
          category_id?: string | null;
          name?: string;
          quantity?: number;
          unit?: string;
          low_threshold?: number;
          updated_at?: string;
          updated_by?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: 'inventory_items_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'inventory_items_category_id_fkey';
            columns: ['category_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_categories';
            referencedColumns: ['id'];
          }
        ];
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
          difficulty: string;
          instructions: string;
          created_by: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          title: string;
          description?: string;
          prep_minutes?: number;
          cook_minutes?: number;
          serves?: number;
          difficulty?: string;
          instructions?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          title?: string;
          description?: string;
          prep_minutes?: number;
          cook_minutes?: number;
          serves?: number;
          difficulty?: string;
          instructions?: string;
          created_by?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recipes_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          }
        ];
      };
      recipe_ingredients: {
        Row: {
          id: string;
          recipe_id: string;
          item_name: string;
          quantity: number;
          unit: string;
        };
        Insert: {
          id?: string;
          recipe_id: string;
          item_name: string;
          quantity?: number;
          unit?: string;
        };
        Update: {
          id?: string;
          recipe_id?: string;
          item_name?: string;
          quantity?: number;
          unit?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'recipe_ingredients_recipe_id_fkey';
            columns: ['recipe_id'];
            isOneToOne: false;
            referencedRelation: 'recipes';
            referencedColumns: ['id'];
          }
        ];
      };
      notifications: {
        Row: {
          id: string;
          household_id: string;
          recipient_id: string | null;
          sender_id: string | null;
          title: string;
          body: string;
          kind: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          recipient_id?: string | null;
          sender_id?: string | null;
          title: string;
          body?: string;
          kind?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          recipient_id?: string | null;
          sender_id?: string | null;
          title?: string;
          body?: string;
          kind?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'notifications_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_recipient_id_fkey';
            columns: ['recipient_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'notifications_sender_id_fkey';
            columns: ['sender_id'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          }
        ];
      };
      shopping_list: {
        Row: {
          id: string;
          household_id: string;
          item_name: string;
          quantity: string;
          notes: string;
          added_by: string | null;
          added_at: string;
          checked_at: string | null;
          checked_by: string | null;
          source_item_id: string | null;
          category: string;
        };
        Insert: {
          id?: string;
          household_id: string;
          item_name: string;
          quantity?: string;
          notes?: string;
          added_by?: string | null;
          added_at?: string;
          checked_at?: string | null;
          checked_by?: string | null;
          source_item_id?: string | null;
          category?: string;
        };
        Update: {
          id?: string;
          household_id?: string;
          item_name?: string;
          quantity?: string;
          notes?: string;
          added_by?: string | null;
          added_at?: string;
          checked_at?: string | null;
          checked_by?: string | null;
          source_item_id?: string | null;
          category?: string;
        };
        Relationships: [
          {
            foreignKeyName: 'shopping_list_household_id_fkey';
            columns: ['household_id'];
            isOneToOne: false;
            referencedRelation: 'households';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_added_by_fkey';
            columns: ['added_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_checked_by_fkey';
            columns: ['checked_by'];
            isOneToOne: false;
            referencedRelation: 'profiles';
            referencedColumns: ['id'];
          },
          {
            foreignKeyName: 'shopping_list_source_item_id_fkey';
            columns: ['source_item_id'];
            isOneToOne: false;
            referencedRelation: 'inventory_items';
            referencedColumns: ['id'];
          }
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      current_household_id: {
        Args: Record<PropertyKey, never>;
        Returns: string;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

// Helper shorthands — matches what `supabase gen types typescript` emits.
type PublicSchema = Database[Extract<keyof Database, 'public'>];

export type Tables<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Row'];

export type TablesInsert<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Insert'];

export type TablesUpdate<T extends keyof PublicSchema['Tables']> =
  PublicSchema['Tables'][T]['Update'];
