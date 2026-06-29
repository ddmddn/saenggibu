import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { TimelineItem } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

function dayRange(date: string) {
  return {
    start: `${date}T00:00:00`,
    end: `${date}T23:59:59.999`,
  }
}

function timeSort(a: TimelineItem, b: TimelineItem) {
  return new Date(a.at).getTime() - new Date(b.at).getTime()
}

export function useTimeline(date = today()) {
  const { user } = useAuth()
  const [items, setItems] = useState<TimelineItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) {
      setItems([])
      setLoading(false)
      return
    }

    setLoading(true)
    const { start, end } = dayRange(date)

    const [
      routineLogs,
      diaries,
      focusSessions,
      impulses,
      worries,
      books,
      completedBooks,
      bookNotes,
      exercises,
      personEvents,
      personThoughts,
      money,
    ] = await Promise.all([
      supabase
        .from('routine_logs')
        .select('*, routines(title)')
        .eq('user_id', user.id)
        .eq('date', date),
      supabase
        .from('diary_entries')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date),
      supabase
        .from('focus_sessions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date),
      supabase
        .from('impulse_logs')
        .select('*')
        .eq('user_id', user.id)
        .gte('datetime', start)
        .lte('datetime', end),
      supabase
        .from('worry_counter')
        .select('*')
        .eq('user_id', user.id)
        .gte('datetime', start)
        .lte('datetime', end),
      supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('books')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', '완독')
        .eq('completed_date', date),
      supabase
        .from('book_notes')
        .select('*, books(title)')
        .eq('user_id', user.id)
        .gte('created_at', start)
        .lte('created_at', end),
      supabase
        .from('exercise_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date),
      supabase
        .from('person_events')
        .select('*, people(name)')
        .eq('user_id', user.id)
        .eq('date', date),
      supabase
        .from('person_thought_logs')
        .select('*, people(name)')
        .eq('user_id', user.id)
        .gte('datetime', start)
        .lte('datetime', end),
      supabase
        .from('money_transactions')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date),
    ])

    const next: TimelineItem[] = []

    ;(routineLogs.data ?? []).forEach((row: any) => {
      if (!row.completed) return
      next.push({
        id: `routine-${row.id}`,
        at: row.created_at,
        date,
        type: 'routine',
        icon: '✅',
        title: `루틴 완료: ${row.routines?.title ?? '루틴'}`,
        description: row.note ?? undefined,
        photos: row.photos ?? [],
        coin: 1,
      })
    })

    ;(diaries.data ?? []).forEach((row: any) => {
      next.push({
        id: `diary-${row.id}`,
        at: row.created_at,
        date,
        type: 'diary',
        icon: '📝',
        title: row.source_type === 'routine_note' ? '루틴 메모' : '다이어리',
        description: row.text,
        photos: row.photos ?? [],
      })
    })

    ;(focusSessions.data ?? []).forEach((row: any) => {
      next.push({
        id: `focus-${row.id}`,
        at: row.start_time,
        date,
        type: 'focus',
        icon: '⏱️',
        title: `${row.tag} 몰입 ${row.duration_minutes ?? 0}분`,
        description: row.content_text ?? undefined,
        coin: Number(row.coin_earned ?? 0),
      })
    })

    ;(impulses.data ?? []).forEach((row: any) => {
      next.push({
        id: `impulse-${row.id}`,
        at: row.datetime,
        date,
        type: 'impulse',
        icon: '⚠️',
        title: `충동: ${row.category}`,
        description: row.note ?? undefined,
        coin: -1,
      })
    })

    ;(worries.data ?? []).forEach((row: any) => {
      next.push({
        id: `worry-${row.id}`,
        at: row.datetime,
        date,
        type: 'worry',
        icon: '😟',
        title: '걱정 +1',
        coin: -0.2,
      })
    })

    ;(books.data ?? []).forEach((row: any) => {
      next.push({
        id: `book-${row.id}`,
        at: row.created_at,
        date,
        type: 'book',
        icon: '📚',
        title: `책 추가: ${row.title}`,
        description: row.author ?? undefined,
        photos: row.cover_photo_url ? [row.cover_photo_url] : [],
      })
    })

    ;(completedBooks.data ?? []).forEach((row: any) => {
      next.push({
        id: `book-complete-${row.id}`,
        at: row.completed_date ? `${row.completed_date}T21:00:00` : row.created_at,
        date,
        type: 'book',
        icon: '📘',
        title: `완독: ${row.title}`,
        photos: row.cover_photo_url ? [row.cover_photo_url] : [],
        coin: 20,
      })
    })

    ;(bookNotes.data ?? []).forEach((row: any) => {
      next.push({
        id: `book-note-${row.id}`,
        at: row.created_at,
        date,
        type: 'book_note',
        icon: '✍️',
        title: `독서 기록: ${row.books?.title ?? '책'}`,
        description: [row.quote_text, row.reflection_text].filter(Boolean).join('\n'),
        coin: 5,
      })
    })

    ;(exercises.data ?? []).forEach((row: any) => {
      next.push({
        id: `exercise-${row.id}`,
        at: row.created_at,
        date,
        type: 'exercise',
        icon: '🏃',
        title: `운동: ${row.type} ${row.duration_minutes}분`,
        photos: row.photo_url ? [row.photo_url] : [],
        coin: Number(row.coin_earned ?? 0),
      })
    })

    ;(personEvents.data ?? []).forEach((row: any) => {
      next.push({
        id: `relation-event-${row.id}`,
        at: row.created_at,
        date,
        type: 'relation',
        icon: '🤝',
        title: `관계 기록: ${row.people?.name ?? '사람'}`,
        description: [row.event_text, row.emotion_text, row.learned_text].filter(Boolean).join('\n'),
      })
    })

    ;(personThoughts.data ?? []).forEach((row: any) => {
      next.push({
        id: `relation-thought-${row.id}`,
        at: row.datetime,
        date,
        type: 'relation',
        icon: '💭',
        title: `${row.people?.name ?? '사람'} 생각났음`,
        coin: -1,
      })
    })

    ;(money.data ?? []).forEach((row: any) => {
      next.push({
        id: `money-${row.id}`,
        at: row.created_at,
        date,
        type: 'money',
        icon: '💰',
        title: `${row.type}: ${row.category}`,
        description: `${Number(row.amount).toLocaleString()}원${row.memo ? ` · ${row.memo}` : ''}`,
      })
    })

    setItems(next.sort(timeSort))
    setLoading(false)
  }, [user, date])

  useEffect(() => {
    fetch()
  }, [fetch])

  return { items, loading, refetch: fetch }
}
