import type { IdeaStatus, UserRole } from "@/lib/domain";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Table<Row, Insert = Partial<Row>, Update = Partial<Row>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export interface Database {
  public: {
    Tables: {
      profiles: Table<
        {
          id: string;
          display_name: string;
          role: UserRole;
          is_active: boolean;
          created_at: string;
        },
        { id: string; display_name: string; role?: UserRole; is_active?: boolean; created_at?: string },
        { display_name?: string; role?: UserRole; is_active?: boolean }
      >;
      categories: Table<
        { id: string; name: string; color: string; is_active: boolean; created_at: string },
        { id?: string; name: string; color?: string; is_active?: boolean; created_at?: string },
        { name?: string; color?: string; is_active?: boolean }
      >;
      ideas: Table<
        {
          id: string;
          title: string;
          description: string;
          category_id: string;
          submitted_by: string;
          status: IdeaStatus;
          estimated_cost: number | null;
          cost_currency: string;
          budget_period: string | null;
          approved_amount: number | null;
          actual_spend: number | null;
          assigned_to: string | null;
          created_at: string;
          updated_at: string;
          resolved_at: string | null;
        },
        {
          id?: string;
          title: string;
          description: string;
          category_id: string;
          submitted_by: string;
          status?: IdeaStatus;
          estimated_cost?: number | null;
          cost_currency?: string;
          budget_period?: string | null;
          approved_amount?: number | null;
          actual_spend?: number | null;
          assigned_to?: string | null;
          created_at?: string;
          updated_at?: string;
          resolved_at?: string | null;
        },
        {
          title?: string;
          description?: string;
          category_id?: string;
          submitted_by?: string;
          status?: IdeaStatus;
          estimated_cost?: number | null;
          cost_currency?: string;
          budget_period?: string | null;
          approved_amount?: number | null;
          actual_spend?: number | null;
          assigned_to?: string | null;
          updated_at?: string;
          resolved_at?: string | null;
        }
      >;
      idea_comments: Table<
        { id: string; idea_id: string; author_id: string; body: string; created_at: string },
        { id?: string; idea_id: string; author_id: string; body: string; created_at?: string },
        never
      >;
      idea_events: Table<
        {
          id: string;
          idea_id: string;
          actor_id: string | null;
          event_type: "submitted" | "status_changed" | "assigned" | "budget_updated";
          from_status: IdeaStatus | null;
          to_status: IdeaStatus | null;
          note: string | null;
          created_at: string;
        },
        never,
        never
      >;
      idea_attachments: Table<
        {
          id: string;
          idea_id: string;
          uploaded_by: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at: string;
        },
        {
          id?: string;
          idea_id: string;
          uploaded_by: string;
          storage_path: string;
          file_name: string;
          mime_type: string;
          size_bytes: number;
          created_at?: string;
        },
        never
      >;
    };
    Views: Record<string, never>;
    Functions: {
      set_idea_status: {
        Args: { p_idea_id: string; p_status: IdeaStatus; p_note?: string | null };
        Returns: string | null;
      };
      set_idea_assignment: {
        Args: { p_idea_id: string; p_assigned_to: string | null; p_note?: string | null };
        Returns: string | null;
      };
      set_idea_budget: {
        Args: {
          p_idea_id: string;
          p_estimated_cost: number | null;
          p_cost_currency: string;
          p_budget_period: string | null;
          p_approved_amount: number | null;
          p_actual_spend: number | null;
          p_note?: string | null;
        };
        Returns: string | null;
      };
      set_user_role: {
        Args: { p_user_id: string; p_role: UserRole; p_is_active: boolean };
        Returns: null;
      };
      get_idea_notification_recipients: {
        Args: { p_idea_id: string; p_event_type: "new_idea" | "new_comment" | "status_change"; p_source_id: string };
        Returns: { delivery_id: string; email: string; display_name: string; idea_title: string; actor_name: string }[];
      };
      complete_email_notification: {
        Args: { p_delivery_id: string; p_sent: boolean; p_error?: string | null };
        Returns: null;
      };
    };
    Enums: {
      user_role: UserRole;
      idea_status: IdeaStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
