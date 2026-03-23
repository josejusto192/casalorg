export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export interface Database {
  public: {
    Tables: {
      households: {
        Row: {
          id: string
          name: string
          invite_code: string
          has_children: boolean
          has_pets: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name?: string
          invite_code?: string
          has_children?: boolean
          has_pets?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          invite_code?: string
          has_children?: boolean
          has_pets?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          id: string
          household_id: string | null
          full_name: string
          avatar_url: string | null
          role: string
          dark_mode: boolean
          onboarding_done: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id: string
          household_id?: string | null
          full_name?: string
          avatar_url?: string | null
          role?: string
          dark_mode?: boolean
          onboarding_done?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string | null
          full_name?: string
          avatar_url?: string | null
          role?: string
          dark_mode?: boolean
          onboarding_done?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      transaction_categories: {
        Row: {
          id: string
          household_id: string
          name: string
          color: string
          icon: string
          type: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          color?: string
          icon?: string
          type: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          color?: string
          icon?: string
          type?: string
          created_at?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          id: string
          household_id: string
          user_id: string
          category_id: string | null
          title: string
          amount: number
          type: string
          scope: string
          date: string
          notes: string | null
          recurring: boolean
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          user_id: string
          category_id?: string | null
          title: string
          amount: number
          type: string
          scope?: string
          date?: string
          notes?: string | null
          recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          user_id?: string
          category_id?: string | null
          title?: string
          amount?: number
          type?: string
          scope?: string
          date?: string
          notes?: string | null
          recurring?: boolean
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      savings_goals: {
        Row: {
          id: string
          household_id: string
          name: string
          target_amount: number
          current_amount: number
          deadline: string | null
          color: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          target_amount: number
          current_amount?: number
          deadline?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          target_amount?: number
          current_amount?: number
          deadline?: string | null
          color?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: []
      }
      shopping_lists: {
        Row: {
          id: string
          household_id: string
          name: string
          is_active: boolean
          created_by: string
          created_at: string
          completed_at: string | null
        }
        Insert: {
          id?: string
          household_id: string
          name?: string
          is_active?: boolean
          created_by: string
          created_at?: string
          completed_at?: string | null
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          is_active?: boolean
          created_by?: string
          created_at?: string
          completed_at?: string | null
        }
        Relationships: []
      }
      shopping_items: {
        Row: {
          id: string
          list_id: string
          household_id: string
          name: string
          quantity: number
          unit: string | null
          category: string
          checked: boolean
          checked_by: string | null
          checked_at: string | null
          added_by: string
          created_at: string
        }
        Insert: {
          id?: string
          list_id: string
          household_id: string
          name: string
          quantity?: number
          unit?: string | null
          category?: string
          checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          added_by: string
          created_at?: string
        }
        Update: {
          id?: string
          list_id?: string
          household_id?: string
          name?: string
          quantity?: number
          unit?: string | null
          category?: string
          checked?: boolean
          checked_by?: string | null
          checked_at?: string | null
          added_by?: string
          created_at?: string
        }
        Relationships: []
      }
      recipes: {
        Row: {
          id: string
          household_id: string
          name: string
          description: string | null
          servings: number
          prep_time_min: number | null
          calories: number | null
          ingredients: Json
          instructions: string | null
          image_url: string | null
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          description?: string | null
          servings?: number
          prep_time_min?: number | null
          calories?: number | null
          ingredients?: Json
          instructions?: string | null
          image_url?: string | null
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          description?: string | null
          servings?: number
          prep_time_min?: number | null
          calories?: number | null
          ingredients?: Json
          instructions?: string | null
          image_url?: string | null
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      meal_plans: {
        Row: {
          id: string
          household_id: string
          week_start: string
          created_by: string
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          week_start: string
          created_by: string
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          week_start?: string
          created_by?: string
          created_at?: string
        }
        Relationships: []
      }
      meal_plan_entries: {
        Row: {
          id: string
          plan_id: string
          recipe_id: string | null
          day_of_week: number
          meal_type: string
          custom_name: string | null
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          recipe_id?: string | null
          day_of_week: number
          meal_type: string
          custom_name?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          recipe_id?: string | null
          day_of_week?: number
          meal_type?: string
          custom_name?: string | null
          created_at?: string
        }
        Relationships: []
      }
      workout_plans: {
        Row: {
          id: string
          user_id: string
          household_id: string
          name: string
          description: string | null
          days_per_week: number
          is_active: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id: string
          name: string
          description?: string | null
          days_per_week?: number
          is_active?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string
          name?: string
          description?: string | null
          days_per_week?: number
          is_active?: boolean
          created_at?: string
        }
        Relationships: []
      }
      exercises: {
        Row: {
          id: string
          plan_id: string
          name: string
          sets: number | null
          reps: string | null
          rest_seconds: number | null
          day_of_week: number | null
          order_index: number
          created_at: string
        }
        Insert: {
          id?: string
          plan_id: string
          name: string
          sets?: number | null
          reps?: string | null
          rest_seconds?: number | null
          day_of_week?: number | null
          order_index?: number
          created_at?: string
        }
        Update: {
          id?: string
          plan_id?: string
          name?: string
          sets?: number | null
          reps?: string | null
          rest_seconds?: number | null
          day_of_week?: number | null
          order_index?: number
          created_at?: string
        }
        Relationships: []
      }
      workout_logs: {
        Row: {
          id: string
          user_id: string
          household_id: string
          plan_id: string | null
          date: string
          duration_min: number | null
          notes: string | null
          completed: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          household_id: string
          plan_id?: string | null
          date?: string
          duration_min?: number | null
          notes?: string | null
          completed?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          household_id?: string
          plan_id?: string | null
          date?: string
          duration_min?: number | null
          notes?: string | null
          completed?: boolean
          created_at?: string
        }
        Relationships: []
      }
      workout_log_exercises: {
        Row: {
          id: string
          log_id: string
          exercise_name: string
          sets_done: number | null
          reps_done: string | null
          weight_kg: number | null
          created_at: string
        }
        Insert: {
          id?: string
          log_id: string
          exercise_name: string
          sets_done?: number | null
          reps_done?: string | null
          weight_kg?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          log_id?: string
          exercise_name?: string
          sets_done?: number | null
          reps_done?: string | null
          weight_kg?: number | null
          created_at?: string
        }
        Relationships: []
      }
      children: {
        Row: {
          id: string
          household_id: string
          name: string
          birth_date: string | null
          school: string | null
          avatar_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          birth_date?: string | null
          school?: string | null
          avatar_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          birth_date?: string | null
          school?: string | null
          avatar_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      child_events: {
        Row: {
          id: string
          child_id: string
          household_id: string
          title: string
          type: string
          date: string
          notes: string | null
          reminder_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          household_id: string
          title: string
          type?: string
          date: string
          notes?: string | null
          reminder_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          household_id?: string
          title?: string
          type?: string
          date?: string
          notes?: string | null
          reminder_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      vaccines: {
        Row: {
          id: string
          child_id: string
          household_id: string
          name: string
          applied_at: string | null
          next_dose_at: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          child_id: string
          household_id: string
          name: string
          applied_at?: string | null
          next_dose_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          child_id?: string
          household_id?: string
          name?: string
          applied_at?: string | null
          next_dose_at?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pets: {
        Row: {
          id: string
          household_id: string
          name: string
          species: string
          breed: string | null
          birth_date: string | null
          avatar_url: string | null
          notes: string | null
          created_at: string
        }
        Insert: {
          id?: string
          household_id: string
          name: string
          species?: string
          breed?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          household_id?: string
          name?: string
          species?: string
          breed?: string | null
          birth_date?: string | null
          avatar_url?: string | null
          notes?: string | null
          created_at?: string
        }
        Relationships: []
      }
      pet_events: {
        Row: {
          id: string
          pet_id: string
          household_id: string
          title: string
          type: string
          date: string
          notes: string | null
          reminder_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          pet_id: string
          household_id: string
          title: string
          type?: string
          date: string
          notes?: string | null
          reminder_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          pet_id?: string
          household_id?: string
          title?: string
          type?: string
          date?: string
          notes?: string | null
          reminder_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: Record<string, never>
    Functions: {
      get_household_id: { Args: Record<string, never>; Returns: string }
      find_household_by_invite_code: {
        Args: { code: string }
        Returns: {
          id: string
          name: string
          invite_code: string
          has_children: boolean
          has_pets: boolean
          created_at: string
          updated_at: string
        }[]
      }
    }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}

// Convenience types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type Household = Database['public']['Tables']['households']['Row']
export type Transaction = Database['public']['Tables']['transactions']['Row']
export type TransactionCategory = Database['public']['Tables']['transaction_categories']['Row']
export type SavingsGoal = Database['public']['Tables']['savings_goals']['Row']
export type ShoppingList = Database['public']['Tables']['shopping_lists']['Row']
export type ShoppingItem = Database['public']['Tables']['shopping_items']['Row']
export type Recipe = Database['public']['Tables']['recipes']['Row']
export type MealPlan = Database['public']['Tables']['meal_plans']['Row']
export type MealPlanEntry = Database['public']['Tables']['meal_plan_entries']['Row']
export type WorkoutPlan = Database['public']['Tables']['workout_plans']['Row']
export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutLog = Database['public']['Tables']['workout_logs']['Row']
export type Child = Database['public']['Tables']['children']['Row']
export type ChildEvent = Database['public']['Tables']['child_events']['Row']
export type Pet = Database['public']['Tables']['pets']['Row']
export type PetEvent = Database['public']['Tables']['pet_events']['Row']
