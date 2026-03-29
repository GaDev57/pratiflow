export type UserRole = "practitioner" | "patient";

export type AppointmentType = "in_person" | "teleconsultation";

export type AppointmentStatus =
  | "pending"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "no_show";

export type SubscriptionPlan = "free" | "pro" | "premium";

export type NotificationType =
  | "new_appointment"
  | "appointment_cancelled"
  | "appointment_reminder"
  | "new_message"
  | "payment_received"
  | "document_shared";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url: string | null;
          phone: string | null;
          gdpr_consent_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          role: UserRole;
          full_name: string;
          avatar_url?: string | null;
          phone?: string | null;
          gdpr_consent_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          role?: UserRole;
          full_name?: string;
          avatar_url?: string | null;
          phone?: string | null;
          gdpr_consent_at?: string | null;
          updated_at?: string;
        };
      };
      practitioners: {
        Row: {
          id: string;
          profile_id: string;
          slug: string;
          specialty: string;
          rpps_number: string | null;
          bio: string | null;
          consultation_price: number;
          session_durations: number[];
          stripe_account_id: string | null;
          subscription_plan: SubscriptionPlan;
          timezone: string;
          google_calendar_token: string | null;
          services: Record<string, unknown>[];
          address: string | null;
          hero_image_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          slug: string;
          specialty: string;
          rpps_number?: string | null;
          bio?: string | null;
          consultation_price?: number;
          session_durations?: number[];
          stripe_account_id?: string | null;
          subscription_plan?: SubscriptionPlan;
          timezone?: string;
          google_calendar_token?: string | null;
          services?: Record<string, unknown>[];
          address?: string | null;
          hero_image_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          slug?: string;
          specialty?: string;
          rpps_number?: string | null;
          bio?: string | null;
          consultation_price?: number;
          session_durations?: number[];
          stripe_account_id?: string | null;
          subscription_plan?: SubscriptionPlan;
          timezone?: string;
          google_calendar_token?: string | null;
          services?: Record<string, unknown>[];
          address?: string | null;
          hero_image_url?: string | null;
          updated_at?: string;
        };
      };
      patients: {
        Row: {
          id: string;
          profile_id: string;
          date_of_birth: string | null;
          practitioner_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          date_of_birth?: string | null;
          practitioner_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          date_of_birth?: string | null;
          practitioner_id?: string | null;
          updated_at?: string;
        };
      };
      availability_rules: {
        Row: {
          id: string;
          practitioner_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          day_of_week: number;
          start_time: string;
          end_time: string;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          day_of_week?: number;
          start_time?: string;
          end_time?: string;
          is_active?: boolean;
        };
      };
      availability_exceptions: {
        Row: {
          id: string;
          practitioner_id: string;
          date: string;
          start_time: string | null;
          end_time: string | null;
          reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          date: string;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
          created_at?: string;
        };
        Update: {
          date?: string;
          start_time?: string | null;
          end_time?: string | null;
          reason?: string | null;
        };
      };
      appointments: {
        Row: {
          id: string;
          practitioner_id: string;
          patient_id: string;
          start_at: string;
          end_at: string;
          type: AppointmentType;
          status: AppointmentStatus;
          jitsi_room_url: string | null;
          stripe_payment_intent_id: string | null;
          cancellation_reason: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          patient_id: string;
          start_at: string;
          end_at: string;
          type: AppointmentType;
          status?: AppointmentStatus;
          jitsi_room_url?: string | null;
          stripe_payment_intent_id?: string | null;
          cancellation_reason?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          start_at?: string;
          end_at?: string;
          type?: AppointmentType;
          status?: AppointmentStatus;
          jitsi_room_url?: string | null;
          stripe_payment_intent_id?: string | null;
          cancellation_reason?: string | null;
          updated_at?: string;
        };
      };
      private_notes: {
        Row: {
          id: string;
          appointment_id: string;
          practitioner_id: string;
          content_json: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          practitioner_id: string;
          content_json: Record<string, unknown>;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content_json?: Record<string, unknown>;
          updated_at?: string;
        };
      };
      shared_notes: {
        Row: {
          id: string;
          appointment_id: string;
          practitioner_id: string;
          patient_id: string;
          content_json: Record<string, unknown>;
          is_visible_to_patient: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          appointment_id: string;
          practitioner_id: string;
          patient_id: string;
          content_json: Record<string, unknown>;
          is_visible_to_patient?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          content_json?: Record<string, unknown>;
          is_visible_to_patient?: boolean;
          updated_at?: string;
        };
      };
      shared_media: {
        Row: {
          id: string;
          patient_id: string;
          practitioner_id: string;
          uploader_id: string;
          file_path: string;
          file_type: string;
          file_name: string;
          size_bytes: number;
          is_visible_to_patient: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          patient_id: string;
          practitioner_id: string;
          uploader_id: string;
          file_path: string;
          file_type: string;
          file_name: string;
          size_bytes: number;
          is_visible_to_patient?: boolean;
          created_at?: string;
        };
        Update: {
          is_visible_to_patient?: boolean;
        };
      };
      messages: {
        Row: {
          id: string;
          sender_id: string;
          recipient_id: string;
          patient_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          sender_id: string;
          recipient_id: string;
          patient_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          read_at?: string | null;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body: string | null;
          is_read: boolean;
          related_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: NotificationType;
          title: string;
          body?: string | null;
          is_read?: boolean;
          related_id?: string | null;
          created_at?: string;
        };
        Update: {
          is_read?: boolean;
        };
      };
      access_logs: {
        Row: {
          id: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          ip_address: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          action: string;
          resource_type: string;
          resource_id: string;
          ip_address?: string | null;
          created_at?: string;
        };
        Update: never;
      };
      document_categories: {
        Row: {
          id: string;
          practitioner_id: string;
          name: string;
          description: string | null;
          color: string;
          sort_order: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          name: string;
          description?: string | null;
          color?: string;
          sort_order?: number;
          created_at?: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          color?: string;
          sort_order?: number;
        };
      };
      document_templates: {
        Row: {
          id: string;
          practitioner_id: string;
          category_id: string | null;
          title: string;
          template_type: "rich_text" | "pdf" | "questionnaire";
          content_json: Record<string, unknown>;
          file_path: string | null;
          file_type: string | null;
          is_questionnaire: boolean;
          questionnaire_fields: Record<string, unknown>[] | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          practitioner_id: string;
          category_id?: string | null;
          title: string;
          template_type?: "rich_text" | "pdf" | "questionnaire";
          content_json?: Record<string, unknown>;
          file_path?: string | null;
          file_type?: string | null;
          is_questionnaire?: boolean;
          questionnaire_fields?: Record<string, unknown>[] | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          category_id?: string | null;
          title?: string;
          template_type?: "rich_text" | "pdf" | "questionnaire";
          content_json?: Record<string, unknown>;
          file_path?: string | null;
          file_type?: string | null;
          is_questionnaire?: boolean;
          questionnaire_fields?: Record<string, unknown>[] | null;
          updated_at?: string;
        };
      };
      questionnaire_responses: {
        Row: {
          id: string;
          template_id: string;
          patient_id: string;
          practitioner_id: string;
          responses: Record<string, unknown>;
          submitted_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          template_id: string;
          patient_id: string;
          practitioner_id: string;
          responses?: Record<string, unknown>;
          submitted_at?: string | null;
          created_at?: string;
        };
        Update: {
          responses?: Record<string, unknown>;
          submitted_at?: string | null;
        };
      };
    };
    Functions: {
      get_my_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_my_patient: {
        Args: { p_patient_id: string };
        Returns: boolean;
      };
    };
    Enums: {
      user_role: UserRole;
      appointment_type: AppointmentType;
      appointment_status: AppointmentStatus;
      subscription_plan: SubscriptionPlan;
      notification_type: NotificationType;
    };
  };
}
