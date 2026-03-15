// Generated types — run `npx supabase gen types typescript` to regenerate
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      brands: {
        Row: {
          id: string
          logo_url: string | null
          name: string
          slug: string
          website_url: string | null
        }
        Insert: {
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          website_url?: string | null
        }
        Update: {
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          website_url?: string | null
        }
        Relationships: []
      }
      closet_entries: {
        Row: {
          color: Database["public"]["Enums"]["color_value"]
          created_at: string | null
          entry_type: Database["public"]["Enums"]["entry_type_enum"]
          id: string
          item_id: string
          user_id: string
        }
        Insert: {
          color: Database["public"]["Enums"]["color_value"]
          created_at?: string | null
          entry_type: Database["public"]["Enums"]["entry_type_enum"]
          id?: string
          item_id: string
          user_id: string
        }
        Update: {
          color?: Database["public"]["Enums"]["color_value"]
          created_at?: string | null
          entry_type?: Database["public"]["Enums"]["entry_type_enum"]
          id?: string
          item_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "closet_entries_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      comparisons: {
        Row: {
          comparison_type: Database["public"]["Enums"]["comparison_type_enum"]
          created_at: string | null
          id: string
          loser_entry_id: string | null
          user_id: string
          winner_entry_id: string | null
        }
        Insert: {
          comparison_type: Database["public"]["Enums"]["comparison_type_enum"]
          created_at?: string | null
          id?: string
          loser_entry_id?: string | null
          user_id: string
          winner_entry_id?: string | null
        }
        Update: {
          comparison_type?: Database["public"]["Enums"]["comparison_type_enum"]
          created_at?: string | null
          id?: string
          loser_entry_id?: string | null
          user_id?: string
          winner_entry_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "comparisons_loser_entry_id_fkey"
            columns: ["loser_entry_id"]
            isOneToOne: false
            referencedRelation: "closet_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comparisons_winner_entry_id_fkey"
            columns: ["winner_entry_id"]
            isOneToOne: false
            referencedRelation: "closet_entries"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          created_at: string | null
          follower_id: string
          following_id: string
          id: string
        }
        Insert: {
          created_at?: string | null
          follower_id: string
          following_id: string
          id?: string
        }
        Update: {
          created_at?: string | null
          follower_id?: string
          following_id?: string
          id?: string
        }
        Relationships: []
      }
      images: {
        Row: {
          created_at: string | null
          id: string
          item_id: string
          sort_order: number
          source_type: Database["public"]["Enums"]["image_source_type"]
          url: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id: string
          sort_order?: number
          source_type?: Database["public"]["Enums"]["image_source_type"]
          url: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string
          sort_order?: number
          source_type?: Database["public"]["Enums"]["image_source_type"]
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "images_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      items: {
        Row: {
          brand_id: string
          category: Database["public"]["Enums"]["item_category"]
          id: string
          is_active: boolean
          model_name: string
          subtype_id: string
        }
        Insert: {
          brand_id: string
          category: Database["public"]["Enums"]["item_category"]
          id?: string
          is_active?: boolean
          model_name: string
          subtype_id: string
        }
        Update: {
          brand_id?: string
          category?: Database["public"]["Enums"]["item_category"]
          id?: string
          is_active?: boolean
          model_name?: string
          subtype_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "items_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "items_subtype_id_fkey"
            columns: ["subtype_id"]
            isOneToOne: false
            referencedRelation: "subtypes"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          id: string
          username: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          id: string
          username: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          id?: string
          username?: string
        }
        Relationships: []
      }
      reviews: {
        Row: {
          body: string
          created_at: string | null
          fit_rating: number
          id: string
          item_id: string
          quality_rating: number
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string | null
          fit_rating: number
          id?: string
          item_id: string
          quality_rating: number
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string | null
          fit_rating?: number
          id?: string
          item_id?: string
          quality_rating?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      scores: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          category_losses: number
          category_rank: number | null
          category_score: number
          category_wins: number
          closet_entry_id: string
          confidence: Database["public"]["Enums"]["confidence_level"]
          id: string
          item_id: string
          losses: number
          overall_score: number
          updated_at: string | null
          user_id: string
          wins: number
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          category_losses?: number
          category_rank?: number | null
          category_score?: number
          category_wins?: number
          closet_entry_id: string
          confidence?: Database["public"]["Enums"]["confidence_level"]
          id?: string
          item_id: string
          losses?: number
          overall_score?: number
          updated_at?: string | null
          user_id: string
          wins?: number
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          category_losses?: number
          category_rank?: number | null
          category_score?: number
          category_wins?: number
          closet_entry_id?: string
          confidence?: Database["public"]["Enums"]["confidence_level"]
          id?: string
          item_id?: string
          losses?: number
          overall_score?: number
          updated_at?: string | null
          user_id?: string
          wins?: number
        }
        Relationships: [
          {
            foreignKeyName: "scores_closet_entry_id_fkey"
            columns: ["closet_entry_id"]
            isOneToOne: true
            referencedRelation: "closet_entries"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "scores_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "items"
            referencedColumns: ["id"]
          },
        ]
      }
      subtypes: {
        Row: {
          category: Database["public"]["Enums"]["item_category"]
          id: string
          name: string
        }
        Insert: {
          category: Database["public"]["Enums"]["item_category"]
          id?: string
          name: string
        }
        Update: {
          category?: Database["public"]["Enums"]["item_category"]
          id?: string
          name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      color_value:
        | "black"
        | "white"
        | "grey"
        | "navy"
        | "brown"
        | "tan"
        | "red"
        | "blue"
        | "green"
        | "yellow"
        | "orange"
        | "pink"
        | "purple"
        | "multicolor"
        | "other"
      comparison_type_enum: "same_category" | "cross_category" | "ranking"
      confidence_level: "low" | "medium" | "high"
      entry_type_enum: "owned" | "interested"
      image_source_type: "seed"
      item_category: "top" | "bottom" | "footwear"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      color_value: [
        "black",
        "white",
        "grey",
        "navy",
        "brown",
        "tan",
        "red",
        "blue",
        "green",
        "yellow",
        "orange",
        "pink",
        "purple",
        "multicolor",
        "other",
      ],
      comparison_type_enum: ["same_category", "cross_category", "ranking"],
      confidence_level: ["low", "medium", "high"],
      entry_type_enum: ["owned", "interested"],
      image_source_type: ["seed"],
      item_category: ["top", "bottom", "footwear"],
    },
  },
} as const
