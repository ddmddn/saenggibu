import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { FocusSession, SessionTag } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useFocusSessions(seasonId?: string) {
  const { user } = useAuth()
  const [sessions, setSessions] = useState<FocusSession[]>([])
  const [running, setRunning] = useState(false)
  const [elapsed, setElapsed] = useState(0) // seconds
  const [activeTag, setActiveTag] = useState<SessionTag>('생산')
  const startRef = useRef<Date | null>(null)
  const intervalRef = useRef<number | null>(null)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('focus_sessions')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today())
      .order('start_time', { ascending: false })
    setSessions(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  // 타이머 tick
  useEffect(() => {
    if (running) {
      intervalRef.current = window.setInterval(() => {
        setElapsed(s => s + 1)
      }, 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [running])

  const start = (tag: SessionTag) => {
    setActiveTag(tag)
    setElapsed(0)
    startRef.current = new Date()
    setRunning(true)
  }

  const stop = async (relatedToFocus: boolean, contentText?: string) => {
    if (!user || !startRef.current) return
    setRunning(false)
    const endTime = new Date()
    const durationMin = Math.round((endTime.getTime() - startRef.current.getTime()) / 60000)
    if (durationMin < 1) { setElapsed(0); return } // 1분 미만 무시

    const coinEarned = activeTag === '생산'
      ? Math.floor(durationMin / 30) * 3 * (relatedToFocus ? 1.5 : 1)
      : 0

    const { data: session } = await supabase.from('focus_sessions').insert({
      user_id: user.id, date: today(),
      start_time: startRef.current.toISOString(),
      end_time: endTime.toISOString(),
      duration_minutes: durationMin,
      tag: activeTag,
      content_text: contentText ?? null,
      related_to_focus_target: relatedToFocus,
      coin_earned: coinEarned,
    }).select().single()

    if (coinEarned > 0 && seasonId && session) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: coinEarned, source_type: '몰입타이머', source_id: session.id,
        note: `${activeTag} ${durationMin}분${relatedToFocus ? ' (집중대상 ×1.5)' : ''}`,
      })
    }
    setElapsed(0)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('focus_sessions').delete().eq('id', id)
    fetch()
  }

  const todayTotal = sessions.reduce((a, s) => a + (s.duration_minutes ?? 0), 0)
  const todayProd = sessions.filter(s => s.tag === '생산').reduce((a, s) => a + (s.duration_minutes ?? 0), 0)

  return { sessions, running, elapsed, activeTag, start, stop, remove, todayTotal, todayProd }
}
