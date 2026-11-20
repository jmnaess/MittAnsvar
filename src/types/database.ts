
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
                    "audience": Database["public"]['Enums']["audience"],"category": string | null,"id": string,"is_active": boolean,"kind": string,"text": string,"tone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: Database["public"]['Enums']["audience"],"category"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"text": string,"tone": string
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["audience"],"category"?: string | null,"id"?: string,"is_active"?: boolean,"kind"?: string,"text"?: string,"tone"?: string
                  }
                  Relationships: [
                    
                  ]
                },"household_displays": {
                  Row: {
                    "auth_user_id": string,"created_at": string,"created_by": string | null,"household_id": string,"id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id": string,"created_at"?: string,"created_by"?: string | null,"household_id": string,"id"?: string
                  }
                  Update: {
                    "auth_user_id"?: string,"created_at"?: string,"created_by"?: string | null,"household_id"?: string,"id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "household_displays_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "household_displays_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "household_displays_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"households": {
                  Row: {
                    "child_proposals_enabled": boolean,"created_at": string,"feedback_tone": Database["public"]['Enums']["feedback_tone"],"has_air_heat_pump": boolean | null,"has_balanced_ventilation": boolean | null,"has_cabin": boolean | null,"has_car": boolean | null,"has_fireplace": boolean | null,"has_garden": boolean | null,"has_hydronic_heating": boolean | null,"has_private_well": boolean | null,"housing_type": Database["public"]['Enums']["housing_type"],"id": string,"name": string,"sewage_type": Database["public"]['Enums']["sewage_type"] | null,"timezone": string,"trial_ends_at": string,"type": Database["public"]['Enums']["household_type"]
                  }
                  ComputedFields: never
                  Insert: {
                    "child_proposals_enabled"?: boolean,"created_at"?: string,"feedback_tone"?: Database["public"]['Enums']["feedback_tone"],"has_air_heat_pump"?: boolean | null,"has_balanced_ventilation"?: boolean | null,"has_cabin"?: boolean | null,"has_car"?: boolean | null,"has_fireplace"?: boolean | null,"has_garden"?: boolean | null,"has_hydronic_heating"?: boolean | null,"has_private_well"?: boolean | null,"housing_type": Database["public"]['Enums']["housing_type"],"id"?: string,"name": string,"sewage_type"?: Database["public"]['Enums']["sewage_type"] | null,"timezone"?: string,"trial_ends_at": string,"type": Database["public"]['Enums']["household_type"]
                  }
                  Update: {
                    "child_proposals_enabled"?: boolean,"created_at"?: string,"feedback_tone"?: Database["public"]['Enums']["feedback_tone"],"has_air_heat_pump"?: boolean | null,"has_balanced_ventilation"?: boolean | null,"has_cabin"?: boolean | null,"has_car"?: boolean | null,"has_fireplace"?: boolean | null,"has_garden"?: boolean | null,"has_hydronic_heating"?: boolean | null,"has_private_well"?: boolean | null,"housing_type"?: Database["public"]['Enums']["housing_type"],"id"?: string,"name"?: string,"sewage_type"?: Database["public"]['Enums']["sewage_type"] | null,"timezone"?: string,"trial_ends_at"?: string,"type"?: Database["public"]['Enums']["household_type"]
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
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
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
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "invites_used_by_fkey"
      columns: ["used_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"link_attempts": {
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
                },"link_tokens": {
                  Row: {
                    "code_hash": string,"created_at": string,"created_by": string,"expires_at": string,"household_id": string,"id": string,"member_id": string | null,"used_at": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "code_hash": string,"created_at"?: string,"created_by": string,"expires_at": string,"household_id": string,"id"?: string,"member_id"?: string | null,"used_at"?: string | null
                  }
                  Update: {
                    "code_hash"?: string,"created_at"?: string,"created_by"?: string,"expires_at"?: string,"household_id"?: string,"id"?: string,"member_id"?: string | null,"used_at"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "link_tokens_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "link_tokens_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_tokens_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "link_tokens_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "link_tokens_member_id_fkey"
      columns: ["member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"members": {
                  Row: {
                    "auth_user_id": string | null,"avatar": string,"avatar_mode": Database["public"]['Enums']["avatar_mode"],"birth_year": number | null,"created_at": string,"display_name": string,"household_id": string,"id": string,"photo_path": string | null,"role": Database["public"]['Enums']["member_role"]
                  }
                  ComputedFields: never
                  Insert: {
                    "auth_user_id"?: string | null,"avatar": string,"avatar_mode"?: Database["public"]['Enums']["avatar_mode"],"birth_year"?: number | null,"created_at"?: string,"display_name": string,"household_id": string,"id"?: string,"photo_path"?: string | null,"role": Database["public"]['Enums']["member_role"]
                  }
                  Update: {
                    "auth_user_id"?: string | null,"avatar"?: string,"avatar_mode"?: Database["public"]['Enums']["avatar_mode"],"birth_year"?: number | null,"created_at"?: string,"display_name"?: string,"household_id"?: string,"id"?: string,"photo_path"?: string | null,"role"?: Database["public"]['Enums']["member_role"]
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
                },"payouts": {
                  Row: {
                    "amount_nok": number,"household_id": string,"id": string,"member_id": string,"paid_at": string,"recorded_by_member_id": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "amount_nok": number,"household_id": string,"id"?: string,"member_id": string,"paid_at"?: string,"recorded_by_member_id"?: string | null
                  }
                  Update: {
                    "amount_nok"?: number,"household_id"?: string,"id"?: string,"member_id"?: string,"paid_at"?: string,"recorded_by_member_id"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "payouts_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payouts_member_fk"
      columns: ["household_id","member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
    },{
      foreignKeyName: "payouts_member_fk"
      columns: ["household_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "payouts_recorded_by_member_id_fkey"
      columns: ["recorded_by_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "payouts_recorded_by_member_id_fkey"
      columns: ["recorded_by_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    }
                  ]
                },"preparedness_items": {
                  Row: {
                    "expires_on": string | null,"household_id": string,"item_key": string,"status": Database["public"]['Enums']["preparedness_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "expires_on"?: string | null,"household_id": string,"item_key": string,"status"?: Database["public"]['Enums']["preparedness_status"] | null
                  }
                  Update: {
                    "expires_on"?: string | null,"household_id"?: string,"item_key"?: string,"status"?: Database["public"]['Enums']["preparedness_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "preparedness_items_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"task_completions": {
                  Row: {
                    "completed_at": string,"completed_by_member_id": string,"completed_on": string,"due_on": string | null,"feedback_message_id": string | null,"household_id": string,"id": string,"recorded_by": string | null,"reward_nok": number | null,"status": Database["public"]['Enums']["completion_status"],"task_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "completed_at"?: string,"completed_by_member_id": string,"completed_on": string,"due_on"?: string | null,"feedback_message_id"?: string | null,"household_id": string,"id"?: string,"recorded_by"?: string | null,"reward_nok"?: number | null,"status"?: Database["public"]['Enums']["completion_status"],"task_id": string
                  }
                  Update: {
                    "completed_at"?: string,"completed_by_member_id"?: string,"completed_on"?: string,"due_on"?: string | null,"feedback_message_id"?: string | null,"household_id"?: string,"id"?: string,"recorded_by"?: string | null,"reward_nok"?: number | null,"status"?: Database["public"]['Enums']["completion_status"],"task_id"?: string
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
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
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
                },"task_proposals": {
                  Row: {
                    "approved_nok": number | null,"created_at": string,"decided_at": string | null,"decided_by_member_id": string | null,"household_id": string,"id": string,"is_done": boolean,"member_id": string,"proposed_nok": number | null,"status": Database["public"]['Enums']["proposal_status"],"task_id": string | null,"title": string,"wants_reward": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_nok"?: number | null,"created_at"?: string,"decided_at"?: string | null,"decided_by_member_id"?: string | null,"household_id": string,"id"?: string,"is_done": boolean,"member_id": string,"proposed_nok"?: number | null,"status"?: Database["public"]['Enums']["proposal_status"],"task_id"?: string | null,"title": string,"wants_reward": boolean
                  }
                  Update: {
                    "approved_nok"?: number | null,"created_at"?: string,"decided_at"?: string | null,"decided_by_member_id"?: string | null,"household_id"?: string,"id"?: string,"is_done"?: boolean,"member_id"?: string,"proposed_nok"?: number | null,"status"?: Database["public"]['Enums']["proposal_status"],"task_id"?: string | null,"title"?: string,"wants_reward"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "task_proposals_decided_by_member_id_fkey"
      columns: ["decided_by_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
    },{
      foreignKeyName: "task_proposals_decided_by_member_id_fkey"
      columns: ["decided_by_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_proposals_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_proposals_member_fkey"
      columns: ["household_id","member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
    },{
      foreignKeyName: "task_proposals_member_fkey"
      columns: ["household_id","member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "task_proposals_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "tasks"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_proposals_task_id_fkey"
      columns: ["task_id"]
isOneToOne: false
      referencedRelation: "today_tasks"
      referencedColumns: ["id"]
    }
                  ]
                },"task_templates": {
                  Row: {
                    "audience": Database["public"]['Enums']["audience"],"category": string,"description": string,"household_types": (Database["public"]['Enums']["household_type"])[] | null,"housing_types": (Database["public"]['Enums']["housing_type"])[] | null,"id": string,"is_active": boolean,"max_age": number | null,"min_age": number | null,"month": number | null,"month_day": number | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"requires": Json | null,"reward_nok": number | null,"season_end_month": number | null,"season_start_month": number | null,"slug": string,"sort_order": number,"source_name": string | null,"source_url": string | null,"suggested_by_default": boolean,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "audience"?: Database["public"]['Enums']["audience"],"category": string,"description": string,"household_types"?: (Database["public"]['Enums']["household_type"])[] | null,"housing_types"?: (Database["public"]['Enums']["housing_type"])[] | null,"id"?: string,"is_active"?: boolean,"max_age"?: number | null,"min_age"?: number | null,"month"?: number | null,"month_day"?: number | null,"recurrence_every"?: number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"requires"?: Json | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"slug": string,"sort_order"?: number,"source_name"?: string | null,"source_url"?: string | null,"suggested_by_default"?: boolean,"title": string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "audience"?: Database["public"]['Enums']["audience"],"category"?: string,"description"?: string,"household_types"?: (Database["public"]['Enums']["household_type"])[] | null,"housing_types"?: (Database["public"]['Enums']["housing_type"])[] | null,"id"?: string,"is_active"?: boolean,"max_age"?: number | null,"min_age"?: number | null,"month"?: number | null,"month_day"?: number | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"requires"?: Json | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"slug"?: string,"sort_order"?: number,"source_name"?: string | null,"source_url"?: string | null,"suggested_by_default"?: boolean,"title"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    
                  ]
                },"tasks": {
                  Row: {
                    "anchor_on": string,"archived_at": string | null,"assigned_member_id": string | null,"category": string,"created_at": string,"created_by": string | null,"description": string | null,"household_id": string,"id": string,"job_member_ids": (string)[],"job_repeats": boolean,"month": number | null,"month_day": number | null,"next_due_on": string | null,"once_on": string | null,"postponed_from": string | null,"postponed_to": string | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok": number | null,"season_end_month": number | null,"season_start_month": number | null,"template_id": string | null,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "anchor_on": string,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id": string,"id"?: string,"job_member_ids"?: (string)[],"job_repeats"?: boolean,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"once_on"?: string | null,"postponed_from"?: string | null,"postponed_to"?: string | null,"recurrence_every"?: number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"template_id"?: string | null,"title": string,"weekdays"?: (number)[] | null
                  }
                  Update: {
                    "anchor_on"?: string,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string,"created_at"?: string,"created_by"?: string | null,"description"?: string | null,"household_id"?: string,"id"?: string,"job_member_ids"?: (string)[],"job_repeats"?: boolean,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"once_on"?: string | null,"postponed_from"?: string | null,"postponed_to"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"],"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"template_id"?: string | null,"title"?: string,"weekdays"?: (number)[] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
    },{
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
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
            "member_balances": {
                  Row: {
                    "balance_nok": number | null,"earned_nok": number | null,"household_id": string,"member_id": string,"paid_nok": number | null,"pending_nok": number | null
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "members_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    }
                  ]
                },"recent_completions": {
                  Row: {
                    "completed_at": string,"completed_by_member_id": string,"completed_on": string,"household_id": string,"id": string,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"reward_nok": number | null,"status": Database["public"]['Enums']["completion_status"],"task_id": string,"title": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "task_completions_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_member_fk"
      columns: ["household_id","completed_by_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
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
                },"today_completions": {
                  Row: {
                    "assigned_member_id": string | null,"completed_at": string,"completed_by_member_id": string,"household_id": string,"id": string,"is_latest": boolean | null,"job_member_ids": (string)[],"recorded_by": string | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"reward_nok": number | null,"status": Database["public"]['Enums']["completion_status"],"task_id": string,"title": string
                  }
                  ComputedFields: never
                  Relationships: [
                    {
      foreignKeyName: "task_completions_household_id_fkey"
      columns: ["household_id"]
isOneToOne: false
      referencedRelation: "households"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "task_completions_member_fk"
      columns: ["household_id","completed_by_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
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
                },"today_tasks": {
                  Row: {
                    "anchor_on": string,"archived_at": string | null,"assigned_member_id": string | null,"category": string,"created_at": string,"created_by": string | null,"description": string | null,"due_by": string | null,"household_id": string,"id": string,"is_month_task": boolean | null,"is_overdue": boolean | null,"job_member_ids": (string)[],"job_repeats": boolean,"month": number | null,"month_day": number | null,"next_due_on": string | null,"once_on": string | null,"postponed_from": string | null,"postponed_to": string | null,"recurrence_every": number | null,"recurrence_type": Database["public"]['Enums']["recurrence_type"],"recurrence_unit": Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok": number | null,"season_end_month": number | null,"season_start_month": number | null,"template_id": string | null,"title": string,"weekdays": (number)[] | null
                  }
                  ComputedFields: never
                  Insert: {
                           "anchor_on"?: string | null,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"due_by"?: never,"household_id"?: string | null,"id"?: string | null,"is_month_task"?: never,"is_overdue"?: never,"job_member_ids"?: (string)[] | null,"job_repeats"?: boolean | null,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"once_on"?: string | null,"postponed_from"?: string | null,"postponed_to"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"] | null,"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"template_id"?: string | null,"title"?: string | null,"weekdays"?: (number)[] | null
                         }
                        Update: {
                           "anchor_on"?: string | null,"archived_at"?: string | null,"assigned_member_id"?: string | null,"category"?: string | null,"created_at"?: string | null,"created_by"?: string | null,"description"?: string | null,"due_by"?: never,"household_id"?: string | null,"id"?: string | null,"is_month_task"?: never,"is_overdue"?: never,"job_member_ids"?: (string)[] | null,"job_repeats"?: boolean | null,"month"?: number | null,"month_day"?: number | null,"next_due_on"?: string | null,"once_on"?: string | null,"postponed_from"?: string | null,"postponed_to"?: string | null,"recurrence_every"?: number | null,"recurrence_type"?: Database["public"]['Enums']["recurrence_type"] | null,"recurrence_unit"?: Database["public"]['Enums']["recurrence_unit"] | null,"reward_nok"?: number | null,"season_end_month"?: number | null,"season_start_month"?: number | null,"template_id"?: string | null,"title"?: string | null,"weekdays"?: (number)[] | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["household_id","member_id"]
    },{
      foreignKeyName: "tasks_assigned_member_fk"
      columns: ["household_id","assigned_member_id"]
isOneToOne: false
      referencedRelation: "members"
      referencedColumns: ["household_id","id"]
    },{
      foreignKeyName: "tasks_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "member_balances"
      referencedColumns: ["member_id"]
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
{ Args: { "p_household_id": string,"p_member_ids"?: (string)[],"p_template_ids": (string)[] }; Returns: number
                           },
"approve_completions":
{ Args: { "p_completion_ids": (string)[] }; Returns: number
                           },
"complete_task":
{ Args: { "p_last_today"?: boolean,"p_member_id": string,"p_task_id": string }; Returns: {
              "completion_id": string,"feedback_kind": string,"feedback_text": string,"next_due_on": string,"reward_nok": number,"status": Database["public"]['Enums']["completion_status"]
            }[]
                           },
"create_display_link_token":
{ Args: { "p_household_id": string }; Returns: {
              "code": string,"expires_at": string
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
"create_link_token":
{ Args: { "p_member_id": string }; Returns: {
              "code": string,"expires_at": string
            }[]
                           },
"decide_task_proposal":
{ Args: { "p_amount_nok"?: number,"p_approve": boolean,"p_proposal_id": string }; Returns: string
                           },
"delete_my_account_data":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"get_family_board":
{ Args: Record<PropertyKey, never>; Returns: Json
                           },
"get_upcoming_occurrences":
{ Args: { "p_from": string,"p_household_id": string,"p_to": string }; Returns: {
              "due_on": string,"task_id": string
            }[]
                           },
"list_my_task_proposals":
{ Args: Record<PropertyKey, never>; Returns: {
              "approved_nok": number,"created_at": string,"decided_at": string,"id": string,"is_done": boolean,"proposed_nok": number,"status": Database["public"]['Enums']["proposal_status"],"title": string,"wants_reward": boolean
            }[]
                           },
"my_photo_folders_to_delete":
{ Args: Record<PropertyKey, never>; Returns: (string)[]
                           },
"postpone_task":
{ Args: { "p_task_id": string,"p_to": string }; Returns: string
                           },
"reassign_completion":
{ Args: { "p_completion_id": string,"p_member_id": string }; Returns: undefined
                           },
"record_payout":
{ Args: { "p_amount_nok": number,"p_member_id": string }; Returns: string
                           },
"redeem_link_token":
{ Args: { "p_code": string }; Returns: string
                           },
"reject_completion":
{ Args: { "p_completion_id": string }; Returns: undefined
                           },
"remove_completion":
{ Args: { "p_completion_id": string }; Returns: undefined
                           },
"set_completion_status":
{ Args: { "p_completion_id": string,"p_status": Database["public"]['Enums']["completion_status"] }; Returns: undefined
                           },
"set_my_avatar":
{ Args: { "p_avatar": string }; Returns: undefined
                           },
"set_my_avatar_mode":
{ Args: { "p_mode": Database["public"]['Enums']["avatar_mode"] }; Returns: undefined
                           },
"submit_task_proposal":
{ Args: { "p_is_done": boolean,"p_proposed_nok"?: number,"p_title": string,"p_wants_reward": boolean }; Returns: string
                           },
"undo_completion":
{ Args: { "p_completion_id": string }; Returns: undefined
                           },
"undo_postpone":
{ Args: { "p_task_id": string }; Returns: undefined
                           },
"unlink_display":
{ Args: { "p_display_id": string }; Returns: undefined
                           },
"unlink_member_device":
{ Args: { "p_member_id": string }; Returns: undefined
                           },
"unlink_my_device":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           },
"unlink_this_display":
{ Args: Record<PropertyKey, never>; Returns: undefined
                           }
          }
          Enums: {
            "audience": "adult"|"child"|"any","avatar_mode": "figure"|"photo","completion_status": "pending"|"approved"|"rejected","feedback_tone": "fact"|"humor"|"both","household_type": "single"|"couple"|"family","housing_type": "apartment"|"townhouse"|"house","member_role": "adult"|"child","preparedness_status": "have"|"not_needed","proposal_status": "pending"|"approved"|"rejected","recurrence_type": "once"|"calendar"|"interval"|"job","recurrence_unit": "day"|"week"|"month"|"year","sewage_type": "municipal"|"septic_tank"|"mini_treatment_plant"
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
            "audience": ["adult", "child", "any"],"avatar_mode": ["figure", "photo"],"completion_status": ["pending", "approved", "rejected"],"feedback_tone": ["fact", "humor", "both"],"household_type": ["single", "couple", "family"],"housing_type": ["apartment", "townhouse", "house"],"member_role": ["adult", "child"],"preparedness_status": ["have", "not_needed"],"proposal_status": ["pending", "approved", "rejected"],"recurrence_type": ["once", "calendar", "interval", "job"],"recurrence_unit": ["day", "week", "month", "year"],"sewage_type": ["municipal", "septic_tank", "mini_treatment_plant"]
          }
        }
} as const
