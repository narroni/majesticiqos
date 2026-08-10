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
    PostgrestVersion: "14.15"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string
          email: string
          full_name: string | null
          id: string
          is_active: boolean
          last_login_at: string | null
          role: Database["public"]["Enums"]["admin_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_login_at?: string | null
          role?: Database["public"]["Enums"]["admin_role"]
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          is_active: boolean
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          is_active?: boolean
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      category_translations: {
        Row: {
          category_id: string
          created_at: string
          description: string | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          name: string
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          description?: string | null
          id?: string
          locale: Database["public"]["Enums"]["locale"]
          name: string
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          description?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "category_translations_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          image_url: string | null
          line_total_cents: number
          order_id: string
          original_price_cents: number | null
          product_id: string | null
          product_name_en: string
          product_name_sq: string
          product_slug: string
          quantity: number
          unit_price_cents: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total_cents: number
          order_id: string
          original_price_cents?: number | null
          product_id?: string | null
          product_name_en: string
          product_name_sq: string
          product_slug: string
          quantity: number
          unit_price_cents: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          image_url?: string | null
          line_total_cents?: number
          order_id?: string
          original_price_cents?: number | null
          product_id?: string | null
          product_name_en?: string
          product_name_sq?: string
          product_slug?: string
          quantity?: number
          unit_price_cents?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_line: string
          admin_note: string | null
          cancelled_at: string | null
          city: string
          completed_at: string | null
          confirmed_at: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          currency: string
          customer_note: string | null
          email: string | null
          first_name: string
          id: string
          ip_hash: string | null
          last_name: string
          locale: Database["public"]["Enums"]["locale"]
          order_number: string
          phone: string
          phone_country: string
          postal_code: string | null
          public_token: string
          shipped_at: string | null
          shipping_cents: number
          status: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          address_line: string
          admin_note?: string | null
          cancelled_at?: string | null
          city: string
          completed_at?: string | null
          confirmed_at?: string | null
          country: Database["public"]["Enums"]["country_code"]
          created_at?: string
          currency?: string
          customer_note?: string | null
          email?: string | null
          first_name: string
          id?: string
          ip_hash?: string | null
          last_name: string
          locale: Database["public"]["Enums"]["locale"]
          order_number: string
          phone: string
          phone_country: string
          postal_code?: string | null
          public_token?: string
          shipped_at?: string | null
          shipping_cents: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents: number
          total_cents: number
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          address_line?: string
          admin_note?: string | null
          cancelled_at?: string | null
          city?: string
          completed_at?: string | null
          confirmed_at?: string | null
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          currency?: string
          customer_note?: string | null
          email?: string | null
          first_name?: string
          id?: string
          ip_hash?: string | null
          last_name?: string
          locale?: Database["public"]["Enums"]["locale"]
          order_number?: string
          phone?: string
          phone_country?: string
          postal_code?: string | null
          public_token?: string
          shipped_at?: string | null
          shipping_cents?: number
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_cents?: number
          total_cents?: number
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: []
      }
      product_images: {
        Row: {
          alt_en: string | null
          alt_sq: string | null
          blur_data_url: string | null
          created_at: string
          height: number | null
          id: string
          product_id: string
          sort_order: number
          storage_path: string
          updated_at: string
          width: number | null
        }
        Insert: {
          alt_en?: string | null
          alt_sq?: string | null
          blur_data_url?: string | null
          created_at?: string
          height?: number | null
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          alt_en?: string | null
          alt_sq?: string | null
          blur_data_url?: string | null
          created_at?: string
          height?: number | null
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_translations: {
        Row: {
          created_at: string
          description: string | null
          id: string
          locale: Database["public"]["Enums"]["locale"]
          meta_description: string | null
          meta_title: string | null
          name: string
          name_unaccented: string | null
          product_id: string
          search_vector: unknown
          short_description: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          locale: Database["public"]["Enums"]["locale"]
          meta_description?: string | null
          meta_title?: string | null
          name: string
          name_unaccented?: string | null
          product_id: string
          search_vector?: unknown
          short_description?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          locale?: Database["public"]["Enums"]["locale"]
          meta_description?: string | null
          meta_title?: string | null
          name?: string
          name_unaccented?: string | null
          product_id?: string
          search_vector?: unknown
          short_description?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_translations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          deleted_at: string | null
          discount_price_cents: number | null
          effective_price_cents: number | null
          id: string
          is_active: boolean
          is_featured: boolean
          low_stock_threshold: number
          price_cents: number
          sales_count: number
          sku: string | null
          slug: string
          stock_quantity: number
          track_inventory: boolean
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_price_cents?: number | null
          effective_price_cents?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          price_cents: number
          sales_count?: number
          sku?: string | null
          slug: string
          stock_quantity?: number
          track_inventory?: boolean
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          deleted_at?: string | null
          discount_price_cents?: number | null
          effective_price_cents?: number | null
          id?: string
          is_active?: boolean
          is_featured?: boolean
          low_stock_threshold?: number
          price_cents?: number
          sales_count?: number
          sku?: string | null
          slug?: string
          stock_quantity?: number
          track_inventory?: boolean
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      shipping_rates: {
        Row: {
          country: Database["public"]["Enums"]["country_code"]
          created_at: string
          free_shipping_threshold_cents: number | null
          id: string
          is_active: boolean
          rate_cents: number
          updated_at: string
        }
        Insert: {
          country: Database["public"]["Enums"]["country_code"]
          created_at?: string
          free_shipping_threshold_cents?: number | null
          id?: string
          is_active?: boolean
          rate_cents: number
          updated_at?: string
        }
        Update: {
          country?: Database["public"]["Enums"]["country_code"]
          created_at?: string
          free_shipping_threshold_cents?: number | null
          id?: string
          is_active?: boolean
          rate_cents?: number
          updated_at?: string
        }
        Relationships: []
      }
      store_settings: {
        Row: {
          announcement_enabled: boolean
          announcement_text_en: string | null
          announcement_text_sq: string | null
          contact_email: string | null
          contact_phone: string | null
          contact_whatsapp: string | null
          facebook_url: string | null
          hero_cta_href_en: string | null
          hero_cta_href_sq: string | null
          hero_cta_text_en: string | null
          hero_cta_text_sq: string | null
          hero_heading_en: string | null
          hero_heading_sq: string | null
          hero_images: Json
          hero_subheading_en: string | null
          hero_subheading_sq: string | null
          hero_tagline_en: string | null
          hero_tagline_sq: string | null
          id: boolean
          instagram_url: string | null
          updated_at: string
        }
        Insert: {
          announcement_enabled?: boolean
          announcement_text_en?: string | null
          announcement_text_sq?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          facebook_url?: string | null
          hero_cta_href_en?: string | null
          hero_cta_href_sq?: string | null
          hero_cta_text_en?: string | null
          hero_cta_text_sq?: string | null
          hero_heading_en?: string | null
          hero_heading_sq?: string | null
          hero_images?: Json
          hero_subheading_en?: string | null
          hero_subheading_sq?: string | null
          hero_tagline_en?: string | null
          hero_tagline_sq?: string | null
          id?: boolean
          instagram_url?: string | null
          updated_at?: string
        }
        Update: {
          announcement_enabled?: boolean
          announcement_text_en?: string | null
          announcement_text_sq?: string | null
          contact_email?: string | null
          contact_phone?: string | null
          contact_whatsapp?: string | null
          facebook_url?: string | null
          hero_cta_href_en?: string | null
          hero_cta_href_sq?: string | null
          hero_cta_text_en?: string | null
          hero_cta_text_sq?: string | null
          hero_heading_en?: string | null
          hero_heading_sq?: string | null
          hero_images?: Json
          hero_subheading_en?: string | null
          hero_subheading_sq?: string | null
          hero_tagline_en?: string | null
          hero_tagline_sq?: string | null
          id?: boolean
          instagram_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      analytics_orders_by_country: {
        Args: { p_days: number }
        Returns: {
          country: Database["public"]["Enums"]["country_code"]
          order_count: number
        }[]
      }
      analytics_revenue_by_day: {
        Args: { p_days: number }
        Returns: {
          day: string
          revenue_cents: number
        }[]
      }
      analytics_top_products: {
        Args: { p_days: number; p_limit: number }
        Returns: {
          name_en: string
          product_id: string
          slug: string
          units_sold: number
        }[]
      }
      change_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_order_id: string
        }
        Returns: {
          out_id: string
          out_status: Database["public"]["Enums"]["order_status"]
        }[]
      }
      create_order: {
        Args: {
          p_address_line: string
          p_city: string
          p_country: Database["public"]["Enums"]["country_code"]
          p_customer_note: string
          p_email: string
          p_first_name: string
          p_ip_hash: string
          p_items: Json
          p_last_name: string
          p_locale: Database["public"]["Enums"]["locale"]
          p_phone: string
          p_phone_country: string
          p_postal_code: string
          p_shipping_cents: number
          p_subtotal_cents: number
          p_total_cents: number
          p_user_agent: string
        }
        Returns: {
          order_number: string
          public_token: string
        }[]
      }
      decrement_stock: { Args: { p_order_id: string }; Returns: undefined }
      immutable_unaccent: { Args: { "": string }; Returns: string }
      is_admin: { Args: never; Returns: boolean }
      save_category: {
        Args: {
          p_description_en: string
          p_description_sq: string
          p_id: string
          p_image_url: string
          p_is_active: boolean
          p_name_en: string
          p_name_sq: string
          p_slug: string
          p_sort_order: number
        }
        Returns: {
          out_id: string
          out_slug: string
        }[]
      }
      save_product: {
        Args: {
          p_category_id: string
          p_description_en: string
          p_description_sq: string
          p_discount_price_cents: number
          p_id: string
          p_images: Json
          p_is_active: boolean
          p_is_featured: boolean
          p_low_stock_threshold: number
          p_meta_description_en: string
          p_meta_description_sq: string
          p_meta_title_en: string
          p_meta_title_sq: string
          p_name_en: string
          p_name_sq: string
          p_price_cents: number
          p_short_description_en: string
          p_short_description_sq: string
          p_sku: string
          p_slug: string
          p_stock_quantity: number
          p_track_inventory: boolean
        }
        Returns: {
          out_id: string
          out_slug: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      unaccent: { Args: { "": string }; Returns: string }
    }
    Enums: {
      admin_role: "owner" | "staff"
      country_code: "XK" | "AL" | "MK" | "OTHER"
      locale: "sq" | "en"
      order_status:
        | "pending"
        | "confirmed"
        | "preparing"
        | "shipped"
        | "completed"
        | "cancelled"
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
      admin_role: ["owner", "staff"],
      country_code: ["XK", "AL", "MK", "OTHER"],
      locale: ["sq", "en"],
      order_status: [
        "pending",
        "confirmed",
        "preparing",
        "shipped",
        "completed",
        "cancelled",
      ],
    },
  },
} as const
