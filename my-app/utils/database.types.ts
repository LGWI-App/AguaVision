export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5";
  };
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      COMMUNITY: {
        Row: {
          COMMUNITY_ID: number;
          LOCATION_NAME: string;
          MANAGER_ID: number | null;
          PRICE_RATE: number | null;
        };
        Insert: {
          COMMUNITY_ID?: number;
          LOCATION_NAME: string;
          MANAGER_ID?: number | null;
          PRICE_RATE?: number | null;
        };
        Update: {
          COMMUNITY_ID?: number;
          LOCATION_NAME?: string;
          MANAGER_ID?: number | null;
          PRICE_RATE?: number | null;
        };
        Relationships: [];
      };
      METER_READINGS: {
        Row: {
          created_at: string | null;
          CURRENT_READING: number | null;
          DATE_CURRENT: string | null;
          DATE_LAST_READ: string | null;
          deleted: boolean | null;
          entry_id: number;
          LAST_READING: number | null;
          METER_ID: number;
          PRICE: number | null;
          updated_at: string | null;
          WATER_USED: number | null;
        };
        Insert: {
          created_at?: string | null;
          CURRENT_READING?: number | null;
          DATE_CURRENT?: string | null;
          DATE_LAST_READ?: string | null;
          deleted?: boolean | null;
          entry_id?: number;
          LAST_READING?: number | null;
          METER_ID?: number;
          PRICE?: number | null;
          updated_at?: string | null;
          WATER_USED?: number | null;
        };
        Update: {
          created_at?: string | null;
          CURRENT_READING?: number | null;
          DATE_CURRENT?: string | null;
          DATE_LAST_READ?: string | null;
          deleted?: boolean | null;
          entry_id?: number;
          LAST_READING?: number | null;
          METER_ID?: number;
          PRICE?: number | null;
          updated_at?: string | null;
          WATER_USED?: number | null;
        };
        Relationships: [];
      };
      METERS: {
        Row: {
          ACTIVE: boolean | null;
          COMMUNITY_ID: number | null;
          HOUSEHOLD_NAME: string;
          LAST_READ_DATE: string | null;
          LATEST_READING: number | null;
          METER_ID: number;
        };
        Insert: {
          ACTIVE?: boolean | null;
          COMMUNITY_ID?: number | null;
          HOUSEHOLD_NAME: string;
          LAST_READ_DATE?: string | null;
          LATEST_READING?: number | null;
          METER_ID?: number;
        };
        Update: {
          ACTIVE?: boolean | null;
          COMMUNITY_ID?: number | null;
          HOUSEHOLD_NAME?: string;
          LAST_READ_DATE?: string | null;
          LATEST_READING?: number | null;
          METER_ID?: number;
        };
        Relationships: [];
      };
      WATER_MANAGERS: {
        Row: {
          LOCATION_ID: number | null;
          PASSWORD: string | null;
          USER_ID: number;
          USERNAME: string;
        };
        Insert: {
          LOCATION_ID?: number | null;
          PASSWORD?: string | null;
          USER_ID?: number;
          USERNAME: string;
        };
        Update: {
          LOCATION_ID?: number | null;
          PASSWORD?: string | null;
          USER_ID?: number;
          USERNAME?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
