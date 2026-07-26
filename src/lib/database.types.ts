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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      b2c_transaction_items: {
        Row: {
          created_at: string
          id: string
          line_total_cents: number
          product_name: string
          product_price_id: string | null
          quantity: number
          sell_quantity: number
          sell_unit: string
          transaction_id: string
          unit_price_cents: number
          variety_id: string | null
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_cents: number
          product_name: string
          product_price_id?: string | null
          quantity?: number
          sell_quantity: number
          sell_unit: string
          transaction_id: string
          unit_price_cents: number
          variety_id?: string | null
        }
        Update: {
          created_at?: string
          id?: string
          line_total_cents?: number
          product_name?: string
          product_price_id?: string | null
          quantity?: number
          sell_quantity?: number
          sell_unit?: string
          transaction_id?: string
          unit_price_cents?: number
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "b2c_transaction_items_product_price_id_fkey"
            columns: ["product_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_transaction_items_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "b2c_transactions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_transaction_items_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      b2c_transactions: {
        Row: {
          club_id: string
          confirmed_at: string | null
          courier_reference: string | null
          created_at: string
          delivered_at: string | null
          delivery_fee_cents: number
          delivery_notes: string | null
          delivery_zone: string | null
          dispatched_at: string | null
          id: string
          member_id: string
          payment_confirmed_at: string | null
          payment_notes: string | null
          payment_status: string
          requested_at: string
          status: string
          subtotal_cents: number
          total_cents: number
          updated_at: string
        }
        Insert: {
          club_id: string
          confirmed_at?: string | null
          courier_reference?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_notes?: string | null
          delivery_zone?: string | null
          dispatched_at?: string | null
          id?: string
          member_id: string
          payment_confirmed_at?: string | null
          payment_notes?: string | null
          payment_status?: string
          requested_at?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Update: {
          club_id?: string
          confirmed_at?: string | null
          courier_reference?: string | null
          created_at?: string
          delivered_at?: string | null
          delivery_fee_cents?: number
          delivery_notes?: string | null
          delivery_zone?: string | null
          dispatched_at?: string | null
          id?: string
          member_id?: string
          payment_confirmed_at?: string | null
          payment_notes?: string | null
          payment_status?: string
          requested_at?: string
          status?: string
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "b2c_transactions_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "b2c_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "members"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          club_id: string | null
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          club_id?: string | null
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          club_id?: string | null
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "brands_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      club_tiers: {
        Row: {
          club_id: string
          created_at: string
          id: string
          name: string
          rank: number
        }
        Insert: {
          club_id: string
          created_at?: string
          id?: string
          name: string
          rank: number
        }
        Update: {
          club_id?: string
          created_at?: string
          id?: string
          name?: string
          rank?: number
        }
        Relationships: [
          {
            foreignKeyName: "club_tiers_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          currency: string
          id: string
          min_order_cents: number
          name: string
          settings: Json
          slug: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          currency?: string
          id?: string
          min_order_cents?: number
          name: string
          settings?: Json
          slug: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          currency?: string
          id?: string
          min_order_cents?: number
          name?: string
          settings?: Json
          slug?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      effects: {
        Row: {
          id: string
          name: string
          slug: string
        }
        Insert: {
          id?: string
          name: string
          slug: string
        }
        Update: {
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      members: {
        Row: {
          alias: string
          club_id: string
          created_at: string
          delivery_notes: string | null
          delivery_zone: string | null
          id: string
          phone: string | null
          role: string
          status: string
          terms_accepted_at: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          alias: string
          club_id: string
          created_at?: string
          delivery_notes?: string | null
          delivery_zone?: string | null
          id?: string
          phone?: string | null
          role?: string
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          alias?: string
          club_id?: string
          created_at?: string
          delivery_notes?: string | null
          delivery_zone?: string | null
          id?: string
          phone?: string | null
          role?: string
          status?: string
          terms_accepted_at?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          id: string
          price_cents: number
          product_id: string
          product_price_id: string
          recorded_at: string
        }
        Insert: {
          id?: string
          price_cents: number
          product_id: string
          product_price_id: string
          recorded_at?: string
        }
        Update: {
          id?: string
          price_cents?: number
          product_id?: string
          product_price_id?: string
          recorded_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_price_id_fkey"
            columns: ["product_price_id"]
            isOneToOne: false
            referencedRelation: "product_prices"
            referencedColumns: ["id"]
          },
        ]
      }
      product_prices: {
        Row: {
          active: boolean
          created_at: string
          id: string
          price_cents: number
          product_id: string
          sell_quantity: number
          sell_unit: string
          stock_status: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          price_cents: number
          product_id: string
          sell_quantity: number
          sell_unit: string
          stock_status?: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          price_cents?: number
          product_id?: string
          sell_quantity?: number
          sell_unit?: string
          stock_status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_prices_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_type_attribute_schemas: {
        Row: {
          attribute_key: string
          id: string
          input_type: string
          label: string
          options: Json | null
          product_type_code: string
          sort_order: number
        }
        Insert: {
          attribute_key: string
          id?: string
          input_type: string
          label: string
          options?: Json | null
          product_type_code: string
          sort_order?: number
        }
        Update: {
          attribute_key?: string
          id?: string
          input_type?: string
          label?: string
          options?: Json | null
          product_type_code?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_type_attribute_schemas_product_type_code_fkey"
            columns: ["product_type_code"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["code"]
          },
        ]
      }
      product_types: {
        Row: {
          code: string
          description: string | null
          name: string
          sort_order: number
          substance_class: string
        }
        Insert: {
          code: string
          description?: string | null
          name: string
          sort_order?: number
          substance_class?: string
        }
        Update: {
          code?: string
          description?: string | null
          name?: string
          sort_order?: number
          substance_class?: string
        }
        Relationships: []
      }
      products: {
        Row: {
          active: boolean
          attributes: Json
          base_unit_price_cents: number | null
          brand_id: string | null
          club_id: string
          club_tier_id: string | null
          created_at: string
          cultivation: string | null
          description: string | null
          grade_declared: string | null
          id: string
          image_url: string | null
          is_new_drop: boolean
          is_staff_pick: boolean
          name: string
          potency_amount: number | null
          potency_basis: string | null
          potency_compound: string | null
          potency_unit: string | null
          product_type_code: string
          tier: string | null
          updated_at: string
          variety_id: string | null
        }
        Insert: {
          active?: boolean
          attributes?: Json
          base_unit_price_cents?: number | null
          brand_id?: string | null
          club_id: string
          club_tier_id?: string | null
          created_at?: string
          cultivation?: string | null
          description?: string | null
          grade_declared?: string | null
          id?: string
          image_url?: string | null
          is_new_drop?: boolean
          is_staff_pick?: boolean
          name: string
          potency_amount?: number | null
          potency_basis?: string | null
          potency_compound?: string | null
          potency_unit?: string | null
          product_type_code: string
          tier?: string | null
          updated_at?: string
          variety_id?: string | null
        }
        Update: {
          active?: boolean
          attributes?: Json
          base_unit_price_cents?: number | null
          brand_id?: string | null
          club_id?: string
          club_tier_id?: string | null
          created_at?: string
          cultivation?: string | null
          description?: string | null
          grade_declared?: string | null
          id?: string
          image_url?: string | null
          is_new_drop?: boolean
          is_staff_pick?: boolean
          name?: string
          potency_amount?: number | null
          potency_basis?: string | null
          potency_compound?: string | null
          potency_unit?: string | null
          product_type_code?: string
          tier?: string | null
          updated_at?: string
          variety_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_club_tier_id_fkey"
            columns: ["club_tier_id"]
            isOneToOne: false
            referencedRelation: "club_tiers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_product_type_code_fkey"
            columns: ["product_type_code"]
            isOneToOne: false
            referencedRelation: "product_types"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "products_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "varieties"
            referencedColumns: ["id"]
          },
        ]
      }
      varieties: {
        Row: {
          canonical_name: string | null
          created_at: string
          description: string | null
          id: string
          lineage: string | null
          name: string
          slug: string
          source: string
          strain_type: string | null
        }
        Insert: {
          canonical_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lineage?: string | null
          name: string
          slug: string
          source?: string
          strain_type?: string | null
        }
        Update: {
          canonical_name?: string | null
          created_at?: string
          description?: string | null
          id?: string
          lineage?: string | null
          name?: string
          slug?: string
          source?: string
          strain_type?: string | null
        }
        Relationships: []
      }
      variety_effects: {
        Row: {
          effect_id: string
          variety_id: string
        }
        Insert: {
          effect_id: string
          variety_id: string
        }
        Update: {
          effect_id?: string
          variety_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "variety_effects_effect_id_fkey"
            columns: ["effect_id"]
            isOneToOne: false
            referencedRelation: "effects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "variety_effects_variety_id_fkey"
            columns: ["variety_id"]
            isOneToOne: false
            referencedRelation: "varieties"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_price_intelligence: {
        Row: {
          base_unit_price_cents: number | null
          club_id: string | null
          discount_pct: number | null
          price_cents: number | null
          price_per_unit_cents: number | null
          product_name: string | null
          product_type: string | null
          sell_quantity: number | null
          sell_unit: string | null
          stock_status: string | null
          strain: string | null
          tier: string | null
        }
        Relationships: [
          {
            foreignKeyName: "products_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      app_current_club_id: { Args: never; Returns: string }
      app_is_staff: { Args: never; Returns: boolean }
      create_order: {
        Args: {
          p_club_id: string
          p_delivery_notes: string
          p_delivery_zone: string
          p_items: Json
          p_member_id: string
        }
        Returns: string
      }
      create_product_with_prices: {
        Args: {
          p_attributes: Json
          p_base_unit_price_cents: number
          p_club_id: string
          p_club_tier_id: string
          p_cultivation: string
          p_grade_declared: string
          p_name: string
          p_potency_amount: number
          p_potency_basis: string
          p_potency_compound: string
          p_potency_unit: string
          p_prices: Json
          p_product_type_code: string
          p_variety_id: string
        }
        Returns: string
      }
      get_category_split: {
        Args: { p_club_id: string; p_days?: number }
        Returns: {
          orders: number
          revenue_cents: number
          substance_class: string
        }[]
      }
      get_dashboard_summary: {
        Args: { p_club_id: string; p_period_days?: number }
        Returns: {
          current_avg_basket_cents: number
          current_orders: number
          current_repeat_share: number
          current_revenue_cents: number
          previous_avg_basket_cents: number
          previous_orders: number
          previous_repeat_share: number
          previous_revenue_cents: number
        }[]
      }
      get_order_timing_heatmap: {
        Args: { p_club_id: string; p_days?: number }
        Returns: {
          day_of_week: number
          hour_of_day: number
          orders: number
        }[]
      }
      get_orders_per_day: {
        Args: { p_club_id: string; p_days?: number }
        Returns: {
          day: string
          orders: number
          revenue_cents: number
        }[]
      }
      get_price_per_gram_by_tier: {
        Args: { p_club_id: string }
        Returns: {
          avg_price_per_gram_cents: number
          product_count: number
          tier: string
        }[]
      }
      get_top_products: {
        Args: { p_club_id: string; p_days?: number; p_limit?: number }
        Returns: {
          product_name: string
          revenue_cents: number
          units: number
        }[]
      }
      update_order_status: {
        Args: { p_new_status: string; p_transaction_id: string }
        Returns: undefined
      }
      update_payment_status: {
        Args: {
          p_payment_notes: string
          p_payment_status: string
          p_transaction_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
