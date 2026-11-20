export type UserRole = 'elderly' | 'caregiver';

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  phone_number?: string;
  link_code?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  preferred_language: 'en' | 'hi' | 'te';
  text_size: 'normal' | 'large' | 'xlarge';
  high_contrast: number;
  voice_enabled: number;
  linkedCaregiver?: {
    id: number;
    full_name: string;
    email: string;
    phone_number?: string;
  } | null;
  linkedPatients?: Array<{
    id: number;
    full_name: string;
    email: string;
    phone_number?: string;
    emergency_contact_name?: string;
    emergency_contact_phone?: string;
    linked_at: string;
  }>;
}

export type PillShape =
  | 'round'
  | 'oval'
  | 'capsule'
  | 'two_tone_capsule'
  | 'square'
  | 'diamond'
  | 'half_moon'
  | 'heart'
  | 'syrup'
  | 'injection'
  | 'inhaler'
  | 'eye_drops'
  | 'ointment'
  | 'powder_sachet';

export type PillColor =
  | 'white'
  | 'yellow'
  | 'pink'
  | 'blue'
  | 'green'
  | 'orange'
  | 'red'
  | 'brown'
  | 'black'
  | 'purple';

export interface TimeSlot {
  time: string; // e.g. "08:00"
  label?: string; // e.g. "Morning"
}

export interface Medicine {
  id: number;
  user_id: number;
  name: string;
  generic_name?: string;
  pill_shape: PillShape;
  pill_color: PillColor;
  pill_color2?: PillColor;
  pill_image_url?: string;
  strength: string;
  quantity_per_dose: string;
  instructions: 'before_food' | 'with_food' | 'after_food' | 'empty_stomach';
  time_slots: TimeSlot[];
  frequency: 'every_day' | 'specific_days' | 'every_n_hours' | 'every_other_day' | 'prn';
  frequency_details?: string[];
  duration_type: 'ongoing' | 'days' | 'until_date';
  duration_value?: string;
  is_critical: number;
  current_stock: number;
  refill_threshold: number;
  notes?: string;
  is_paused: number;
  created_at: string;
  updated_at: string;
}

export interface DoseLog {
  id: number;
  medicine_id: number;
  user_id: number;
  scheduled_time: string;
  status: 'scheduled' | 'taken' | 'snoozed' | 'missed' | 'skipped';
  actual_time?: string;
  minutes_late: number;
  snooze_count: number;
  escalation_level: number;
  caregiver_alerted: number;
  notes?: string;
  name: string;
  generic_name?: string;
  pill_shape: PillShape;
  pill_color: PillColor;
  pill_color2?: PillColor;
  pill_image_url?: string;
  strength: string;
  quantity_per_dose: string;
  instructions: string;
  is_critical: number;
  current_stock: number;
  refill_threshold: number;
  time_slot_category?: 'Morning' | 'Afternoon' | 'Evening' | 'Night';
}

export interface Alert {
  id: number;
  user_id: number;
  patient_name?: string;
  caregiver_id?: number;
  medicine_id?: number;
  medicine_name?: string;
  pill_shape?: PillShape;
  pill_color?: PillColor;
  dose_log_id?: number;
  alert_type: 'missed_dose' | 'repeated_misses' | 'critical_unconfirmed' | 'sos' | 'low_stock' | 'adherence_drop';
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  is_acknowledged: number;
  acknowledged_at?: string;
  created_at: string;
}

export interface CaregiverSettings {
  grace_period_minutes: number;
  level2_minutes: number;
  level3_minutes: number;
  level4_minutes: number;
  critical_level4_minutes: number;
  max_snoozes: number;
  pre_remind_miss_prone: number;
  time_acceleration: number;
}

export interface AdaptiveInsight {
  id: number;
  user_id: number;
  medicine_id?: number;
  insight_type: string;
  title: string;
  description: string;
  action_suggested?: string;
  is_applied: number;
  created_at: string;
}

