-- ============================================================
-- 생기부 — 초기 스키마
-- Supabase SQL Editor 또는 supabase db push 로 실행
-- ============================================================

-- ── 확장 ────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── ENUM 타입 ────────────────────────────────────────────────
create type season_status      as enum ('active', 'ended');
create type routine_status     as enum ('active', 'graduated', 'dropped');
create type challenge_type     as enum ('거리두기', '연결', '소비대기', '기타');
create type challenge_status   as enum ('active', 'completed', 'failed');
create type focus_category     as enum ('일', '루틴', '독서·운동', '관계 회복', '자기계발');
create type session_tag        as enum ('생산', '비생산');
create type diary_time_slot    as enum ('아침', '오후', '저녁', '자유');
create type diary_source       as enum ('manual', 'routine_note', 'focus_session');
create type book_status        as enum ('reading', '완독');
create type money_type         as enum ('수입', '지출');
create type energy_tag         as enum ('채워주는', '소모시키는', '중립');

-- ── seasons ──────────────────────────────────────────────────
create table seasons (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  season_number     int  not null,
  start_date        date not null,
  end_date          date not null,
  status            season_status not null default 'active',
  total_coins       numeric(10,2) not null default 0,
  total_value_krw   numeric(10,2) not null default 0,
  coin_rate         numeric(10,2) not null default 100, -- 1코인 = N원
  retrospective_text text,
  created_at        timestamptz not null default now()
);

-- ── routines ─────────────────────────────────────────────────
create table routines (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  season_id       uuid not null references seasons(id) on delete cascade,
  title           text not null,
  order_index     int  not null default 0,
  status          routine_status not null default 'active',
  streak_current  int  not null default 0,
  streak_best     int  not null default 0,
  added_date      date not null default current_date,
  created_at      timestamptz not null default now()
);

-- ── routine_logs ─────────────────────────────────────────────
create table routine_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  routine_id  uuid not null references routines(id) on delete cascade,
  date        date not null,
  completed   boolean not null default false,
  locked      boolean not null default false,
  note        text,
  created_at  timestamptz not null default now(),
  unique (routine_id, date)
);

-- ── challenges ───────────────────────────────────────────────
create table challenges (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  type                 challenge_type not null,
  title                text not null,
  target_person_id     uuid, -- FK 추가는 people 테이블 생성 후
  start_date           date not null default current_date,
  duration_days        int  not null,
  progress_count       int  not null default 0,
  status               challenge_status not null default 'active',
  promoted_to_routine  boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ── focus_targets (오늘의 집중대상) ───────────────────────────
create table focus_targets (
  id            uuid primary key default uuid_generate_v4(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  category      focus_category not null,
  description   text not null,
  locked        boolean not null default false,
  changed_count int  not null default 0,
  self_rating   int  check (self_rating between 1 and 5),
  created_at    timestamptz not null default now(),
  unique (user_id, date)
);

-- ── focus_sessions (몰입타이머) ───────────────────────────────
create table focus_sessions (
  id                        uuid primary key default uuid_generate_v4(),
  user_id                   uuid not null references auth.users(id) on delete cascade,
  date                      date not null,
  start_time                timestamptz not null,
  end_time                  timestamptz,
  duration_minutes          int,
  tag                       session_tag not null,
  content_text              text,
  related_to_focus_target   boolean not null default false,
  coin_earned               numeric(6,2) not null default 0,
  created_at                timestamptz not null default now()
);

-- ── impulse_logs (충동 로그) ──────────────────────────────────
create table impulse_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  datetime    timestamptz not null default now(),
  category    text not null, -- '연락하고싶음', '사고싶음' 등 자유 입력
  note        text,
  created_at  timestamptz not null default now()
);

-- ── worry_counter (걱정 탭) ───────────────────────────────────
create table worry_counter (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  datetime    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── diary_entries ─────────────────────────────────────────────
create table diary_entries (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  date         date not null,
  time_slot    diary_time_slot,
  text         text not null,
  photos       text[] not null default '{}',
  tags         text[] not null default '{}',
  source_type  diary_source not null default 'manual',
  source_id    uuid, -- routine_log.id 또는 focus_session.id
  created_at   timestamptz not null default now()
);

-- ── books ────────────────────────────────────────────────────
create table books (
  id              uuid primary key default uuid_generate_v4(),
  user_id         uuid not null references auth.users(id) on delete cascade,
  title           text not null,
  author          text,
  cover_photo_url text,
  status          book_status not null default 'reading',
  started_date    date,
  completed_date  date,
  coin_earned     numeric(6,2) not null default 0,
  created_at      timestamptz not null default now()
);

-- ── book_notes ────────────────────────────────────────────────
create table book_notes (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  book_id          uuid not null references books(id) on delete cascade,
  quote_text       text,
  reflection_text  text,
  created_at       timestamptz not null default now()
);

-- ── exercise_logs ─────────────────────────────────────────────
create table exercise_logs (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  date              date not null,
  type              text not null, -- '달리기', '헬스', '요가' 등 자유 태그
  duration_minutes  int  not null,
  photo_url         text,
  coin_earned       numeric(6,2) not null default 0,
  created_at        timestamptz not null default now()
);

-- ── people ───────────────────────────────────────────────────
create table people (
  id               uuid primary key default uuid_generate_v4(),
  user_id          uuid not null references auth.users(id) on delete cascade,
  name             text not null,
  relationship_tag text, -- '친구', '직장', '가족' 등
  energy_tag       energy_tag not null default '중립',
  avatar_url       text,
  created_at       timestamptz not null default now()
);

-- challenges.target_person_id FK (people 생성 후)
alter table challenges
  add constraint challenges_target_person_id_fkey
  foreign key (target_person_id) references people(id) on delete set null;

-- ── person_events ─────────────────────────────────────────────
create table person_events (
  id             uuid primary key default uuid_generate_v4(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  person_id      uuid not null references people(id) on delete cascade,
  date           date not null,
  event_text     text,
  emotion_text   text,
  learned_text   text,
  created_at     timestamptz not null default now()
);

-- ── person_thought_logs ("생각났음" 탭) ───────────────────────
create table person_thought_logs (
  id          uuid primary key default uuid_generate_v4(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  person_id   uuid not null references people(id) on delete cascade,
  datetime    timestamptz not null default now(),
  created_at  timestamptz not null default now()
);

-- ── money_transactions (가계부) ───────────────────────────────
create table money_transactions (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  date                 date not null,
  type                 money_type not null,
  amount               numeric(12,2) not null,
  category             text not null,
  memo                 text,
  is_self_spending     boolean not null default false,
  is_impulse           boolean not null default false,
  is_self_development  boolean not null default false,
  created_at           timestamptz not null default now()
);

-- ── coin_transactions ─────────────────────────────────────────
create table coin_transactions (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  season_id    uuid references seasons(id) on delete set null,
  date         date not null,
  amount       numeric(8,2) not null, -- 양수=적립, 음수=차감
  source_type  text not null, -- '루틴', '독서', '운동', '챌린지', '걱정', '충동', '가계부' 등
  source_id    uuid,          -- 해당 레코드 id
  note         text,
  created_at   timestamptz not null default now()
);

-- ── weekly_reports ────────────────────────────────────────────
create table weekly_reports (
  id                uuid primary key default uuid_generate_v4(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  week_start        date not null,
  week_end          date not null,
  score_routine     int,
  score_reading     int,
  score_exercise    int,
  score_relation    int,
  score_money       int,
  total_comment     text,
  total_coins_week  numeric(8,2) not null default 0,
  created_at        timestamptz not null default now(),
  unique (user_id, week_start)
);

-- ── season_summary ────────────────────────────────────────────
create table season_summary (
  id                   uuid primary key default uuid_generate_v4(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  season_id            uuid not null references seasons(id) on delete cascade unique,
  summary_text         text,
  graduated_routines   text[] not null default '{}',
  total_coins          numeric(10,2) not null default 0,
  highlight_moments    text[] not null default '{}',
  spending_note        text,
  created_at           timestamptz not null default now()
);

-- ============================================================
-- 인덱스
-- ============================================================
create index on routine_logs (routine_id, date);
create index on routine_logs (user_id, date);
create index on focus_sessions (user_id, date);
create index on diary_entries (user_id, date);
create index on coin_transactions (user_id, date);
create index on coin_transactions (user_id, season_id);
create index on money_transactions (user_id, date);
create index on person_thought_logs (user_id, person_id);
create index on worry_counter (user_id, datetime);

-- ============================================================
-- RLS (Row Level Security) — 본인 데이터만 접근
-- ============================================================
alter table seasons             enable row level security;
alter table routines            enable row level security;
alter table routine_logs        enable row level security;
alter table challenges          enable row level security;
alter table focus_targets       enable row level security;
alter table focus_sessions      enable row level security;
alter table impulse_logs        enable row level security;
alter table worry_counter       enable row level security;
alter table diary_entries       enable row level security;
alter table books               enable row level security;
alter table book_notes          enable row level security;
alter table exercise_logs       enable row level security;
alter table people              enable row level security;
alter table person_events       enable row level security;
alter table person_thought_logs enable row level security;
alter table money_transactions  enable row level security;
alter table coin_transactions   enable row level security;
alter table weekly_reports      enable row level security;
alter table season_summary      enable row level security;

-- 각 테이블에 동일한 패턴의 정책 적용
do $$
declare
  t text;
begin
  foreach t in array array[
    'seasons','routines','routine_logs','challenges','focus_targets',
    'focus_sessions','impulse_logs','worry_counter','diary_entries',
    'books','book_notes','exercise_logs','people','person_events',
    'person_thought_logs','money_transactions','coin_transactions',
    'weekly_reports','season_summary'
  ]
  loop
    execute format(
      'create policy "own_data_%s" on %I
       for all using (auth.uid() = user_id)
       with check (auth.uid() = user_id);',
      t, t
    );
  end loop;
end;
$$;
