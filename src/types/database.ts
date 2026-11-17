
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "feedback_messages": {
                  Row: {
                    "audience": Database["public"]['Enums']["audience"],"category": string | null,"id": string,"is_active": boolean,"text": string,"tone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: Database["public"]['Enums']["audience"],"category"?: string | null,"id"?: string,"is_active"?: boolean,"text": string,"tone": string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["audience"],"category"?: string | null,"id"?: string,"is_active"?: boolean,"text"?: string,"tone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"households": {
                  Row: {
                    "created_at": string,"feedback_tone": Database["public"]['Enums']["feedback_tone"],"housing_type": Database["public"]['Enums']["housing_type"],"id": string,"name": string,"timezone": string,"trial_ends_at": string,"type": Database["public"]['Enums']["household_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"feedback_tone"?: Database["public"]['Enums']["feedback_tone"],"housing_type": Database["public"]['Enums']["housing_type"],"id"?: string,"name": string,"timezone"?: string,"trial_ends_at": string,"type": Database["public"]['Enums']["household_type"]
                  }
                  Update: {
                    "created_at"?: string,"feedback_tone"?: Database["public"]['Enums']["feedback_tone"],"housing_type"?: Database["public"]['Enums']["housing_type"],"id"?: string,"name"?: string,"timezone"?: string,"trial_ends_at"?: string,"type"?: Database["public"]['Enums']["household_type"]
                  }
                  Relationships: [
                    
                  ]
                },"invite_attempts": {
                  Row: {
                    "attempted_at": string,"id": number,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "attempted_at"?: string,"id"?: never,"user_id": string
                  }
                  Update: {
                    "attempted_at"?: string,"id"?: never,"user_id"?: string
                  }
                  Relationships: [
                    
                  ]
                },"invites": {
                  Row: {
                    "code_hash": string,"created_at": string,"created_by": string,"expires_at": string,"household_id": string,"id": string,"used_at": string | null,"used_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"created_at"?: string,"created_by": string,"expires_at": string,"household_id": string,"id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"household_id"?: string,"id"?: string,"used_at"?: string | null,"used_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "auth_user_id": string | null,"avatar": string,"birth_year": number | null,"created_at": string,"display_name": string,"household_id": string,"id": string,"role": Database["public"]['Enums']["member_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"avatar": string,"birth_year"?: number | null,"created_at"?: string,"display_name": string,"household_id": string,"id"?: string,"role": Database["public"]['Enums']["member_role"]
                  }
                  Update: {
                    "auth_user_id"?: string | null,"avatar"?: string,"birth_year"?: number | null,"created_at"?: string,"display_name"?: string,"household_id"?: string,"id"?: string,"role"?: Database["public"]['Enums']["member_role"]
                  }
                  Relationships: [
                    {
      foreignKeyName: "members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"task_completions": {
                  Row: {
                    "completed_at": string,"completed_by_member_id": string,"completed_on": string,"due_on": string | null,"feedback_message_id": string | null,"household_id": string,"id": string,"recorded_by": string | null,"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"completed_by_member_id": string,"completed_on": string,"due_on"?: string | null,"feedback_message_id"?: string | null,"household_id": string,"id"?: string,"recorded_by"?: string | null,"task_id": string
                  }
                  Update: {
                    "completed_at"?: string,"completed_by_member_id"?: string,"completed_on"?: string,"due_on"?: string | null,"feedback_message_id"?: string | null,"household_id"?: string,"id"?: string,"recorded_by"?: string | null,"task_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_completions_feedback_message_id_fkey"
      columns: ["feedback_message_id"]
isOneToOne: false
      referencedRelation: "feedback_messages"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_member_fk"
      columns: ["household_id","completed_by_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "task_completions_task_fk"
      columns: ["household_id","task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "task_completions_task_fk"
      columns: ["household_id","task_id"]
isOneToOne: false
      referencedRelation: "today_tasks"
      referencedColumns: ["household_id","id"]
    }
                  ]
                },"task_templates": {
                  Row: {
                    "category": string,"description": string,"household_types": (Database["public"]['Enums']["household_type"])[] | null,"housing_types": (Database["public"]['Enums']["housing_type"])[] | null,"id": string,"is_active": boolean,"month": number | null,"month_day": number | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"slug": string,"sort_order": number,"source_url": string | null,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "category": string,"description": string,"household_types"?: (Database["public"]['Enums']["household_type"])[] | null,"housing_types"?: (Database["public"]['Enums']["housing_type"])[] | null,"id"?: string,"is_active"?: boolean,"month"?: number | null,"month_day"?: number | null,"recurrence_every"?: number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"slug": string,"sort_order"?: number,"source_url"?: string | null,"title": string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "category"?: string,"description"?: string,"household_types"?: (Database["public"]['Enums']["household_type"])[] | null,"housing_types"?: (Database["public"]['Enums']["housing_type"])[] | null,"id"?: string,"is_active"?: boolean,"month"?: number | null,"month_day"?: number | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"slug"?: string,"sort_order"?: number,"source_url"?: string | null,"title"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "anchor_on": string,"archived_at": string | null,"assigned_member_id": string | null,"category": string,"created_at": string,"created_by": string | null,"description": string | null,"household_id": string,"id": string,"month": number | null,"month_day": number | null,"next_due_on": string | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"template_id": string | null,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anchor_on": string,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id": string,"id"?: string,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"recurrence_every"?: number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"template_id"?: string | null,"title": string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "anchor_on"?: string,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id"?: string,"id"?: string,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"template_id"?: string | null,"title"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_templates"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            "today_tasks": {
                  Row: {
                    "anchor_on": string,"archived_at": string | null,"assigned_member_id": string | null,"category": string,"created_at": string,"created_by": string | null,"description": string | null,"due_by": string | null,"household_id": string,"id": string,"is_month_task": boolean | null,"is_overdue": boolean | null,"month": number | null,"month_day": number | null,"next_due_on": string | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"template_id": string | null,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "anchor_on"?: string | null,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"due_by"?: never,"household_id"?: string | null,"id"?: string | null,"is_month_task"?: never,"is_overdue"?: never,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"] | null,"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"template_id"?: string | null,"title"?: string | null,"weekdays"?: (number)[] | null
                         }
                        Update: {
                           "anchor_on"?: string | null,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"due_by"?: never,"household_id"?: string | null,"id"?: string | null,"is_month_task"?: never,"is_overdue"?: never,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"] | null,"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"template_id"?: string | null,"title"?: string | null,"weekdays"?: (number)[] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "tasks_template_id_fkey"
      columns: ["template_id"]
isOneToOne: false
      referencedRelation: "task_templates"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "p_avatar": string,"p_code": string,"p_display_name": string }; Returns: string
                           },
"activate_templates":
{ Args: { "p_household_id": string,"p_template_ids": (string)[] }; Returns: number
                           },
"complete_task":
{ Args: { "p_member_id": string,"p_task_id": string }; Returns: {
              "completion_id": string,"feedback_text": string,"next_due_on": string
            }[]
                           },
"create_household":
{ Args: { "p_avatar": string,"p_display_name": string,"p_housing_type": Database["public"]['Enums']["housing_type"],"p_name": string,"p_type": Database["public"]['Enums']["household_type"] }; Returns: string
                           },
"create_invite":
{ Args: { "p_household_id": string }; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"delete_my_account_data":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"get_upcoming_occurrences":
{ Args: { "p_from": string,"p_household_id": string,"p_to": string }; Returns: {
              "due_on": string,"task_id": string
            }[]
                           },
"undo_completion":
{ Args: { "p_completion_id": string }; Returns: undefined
                           }
          }
          Enums: {
            "audience": "adult"|"child"|"any","feedback_tone": "fact"|"humor"|"both","household_type": "single"|"couple"|"family","housing_type": "apartment"|"townhouse"|"house","member_role": "adult"|"child","recurrence_type": "once"|"calendar"|"interval","recurrence_unit": "day"|"week"|"month"|"year"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "audience": ["adult", "child", "any"],"feedback_tone": ["fact", "humor", "both"],"household_type": ["single", "couple", "family"],"housing_type": ["apartment", "townhouse", "house"],"member_role": ["adult", "child"],"recurrence_type": ["once", "calendar", "interval"],"recurrence_unit": ["day", "week", "month", "year"]
          }
        }
} as const
