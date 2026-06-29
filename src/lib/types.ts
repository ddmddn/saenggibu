// ── Enums ────────────────────────────────────────────────────
export type SeasonStatus    = 'active' | 'ended'
export type RoutineStatus   = 'active' | 'graduated' | 'dropped'
export type ChallengeType   = '거리두기' | '연결' | '소비대기' | '기타'
export type ChallengeStatus = 'active' | 'completed' | 'failed'
export type FocusCategory   = '일' | '루틴' | '독서·운동' | '관계 회복' | '자기계발'
export type SessionTag      = '생산' | '비생산'
export type DiaryTimeSlot   = '아침' | '오후' | '저녁' | '자유'
export type DiarySource     = 'manual' | 'routine_note' | 'focus_session'
export type BookStatus      = 'reading' | '완독'
export type MoneyType       = '수입' | '지출'
export type EnergyTag       = '채워주는' | '소모시키는' | '중립'

// ── DB Row 타입 ──────────────────────────────────────────────
export interface Season {
  id: string
  user_id: string
  season_number: number
  start_date: string
  end_date: string
  status: SeasonStatus
  total_coins: number
  total_value_krw: number
  coin_rate: number
  retrospective_text: string | null
  created_at: string
}

export interface Routine {
  id: string
  user_id: string
  season_id: string
  title: string
  order_index: number
  status: RoutineStatus
  streak_current: number
  streak_best: number
  added_date: string
  created_at: string
}

export interface RoutineLog {
  id: string
  user_id: string
  routine_id: string
  date: string
  completed: boolean
  locked: boolean
  note: string | null
  photos?: string[]
  created_at: string
}

export interface TimelineItem {
  id: string
  at: string
  date: string
  type: 'routine' | 'diary' | 'focus' | 'impulse' | 'worry' | 'book' | 'book_note' | 'exercise' | 'relation' | 'money'
  icon: string
  title: string
  description?: string
  photos?: string[]
  coin?: number
}

export interface Challenge {
  id: string
  user_id: string
  type: ChallengeType
  title: string
  target_person_id: string | null
  start_date: string
  duration_days: number
  progress_count: number
  status: ChallengeStatus
  promoted_to_routine: boolean
  created_at: string
}

export interface FocusTarget {
  id: string
  user_id: string
  date: string
  category: FocusCategory
  description: string
  locked: boolean
  changed_count: number
  self_rating: number | null
  created_at: string
}

export interface FocusSession {
  id: string
  user_id: string
  date: string
  start_time: string
  end_time: string | null
  duration_minutes: number | null
  tag: SessionTag
  content_text: string | null
  related_to_focus_target: boolean
  coin_earned: number
  created_at: string
}

export interface ImpulseLog {
  id: string
  user_id: string
  datetime: string
  category: string
  note: string | null
  created_at: string
}

export interface WorryCount {
  id: string
  user_id: string
  datetime: string
  created_at: string
}

export interface DiaryEntry {
  id: string
  user_id: string
  date: string
  time_slot: DiaryTimeSlot | null
  text: string
  photos: string[]
  tags: string[]
  source_type: DiarySource
  source_id: string | null
  created_at: string
}

export interface Book {
  id: string
  user_id: string
  title: string
  author: string | null
  cover_photo_url: string | null
  status: BookStatus
  started_date: string | null
  completed_date: string | null
  coin_earned: number
  created_at: string
}

export interface BookNote {
  id: string
  user_id: string
  book_id: string
  quote_text: string | null
  reflection_text: string | null
  created_at: string
}

export interface ExerciseLog {
  id: string
  user_id: string
  date: string
  type: string
  duration_minutes: number
  photo_url: string | null
  coin_earned: number
  created_at: string
}

export interface Person {
  id: string
  user_id: string
  name: string
  relationship_tag: string | null
  energy_tag: EnergyTag
  avatar_url: string | null
  created_at: string
}

export interface PersonEvent {
  id: string
  user_id: string
  person_id: string
  date: string
  event_text: string | null
  emotion_text: string | null
  learned_text: string | null
  created_at: string
}

export interface PersonThoughtLog {
  id: string
  user_id: string
  person_id: string
  datetime: string
  created_at: string
}

export interface MoneyTransaction {
  id: string
  user_id: string
  date: string
  type: MoneyType
  amount: number
  category: string
  memo: string | null
  is_self_spending: boolean
  is_impulse: boolean
  is_self_development: boolean
  created_at: string
}

export interface CoinTransaction {
  id: string
  user_id: string
  season_id: string | null
  date: string
  amount: number
  source_type: string
  source_id: string | null
  note: string | null
  created_at: string
}

export interface WeeklyReport {
  id: string
  user_id: string
  week_start: string
  week_end: string
  score_routine: number | null
  score_reading: number | null
  score_exercise: number | null
  score_relation: number | null
  score_money: number | null
  total_comment: string | null
  total_coins_week: number
  created_at: string
}

export interface SeasonSummary {
  id: string
  user_id: string
  season_id: string
  summary_text: string | null
  graduated_routines: string[]
  total_coins: number
  highlight_moments: string[]
  spending_note: string | null
  created_at: string
}
