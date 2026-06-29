import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Routine, RoutineLog } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useRoutines(seasonId: string | undefined) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [logs, setLogs] = useState<Record<string, RoutineLog>>({})
  const [loading, setLoading] = useState(true)

  const fetchAll = useCallback(async () => {
    if (!user || !seasonId) return
    const [{ data: rs }, { data: ls }] = await Promise.all([
      supabase.from('routines').select('*').eq('user_id', user.id).eq('season_id', seasonId).eq('status', 'active').order('order_index'),
      supabase.from('routine_logs').select('*').eq('user_id', user.id).eq('date', today()),
    ])
    setRoutines(rs ?? [])
    const logMap: Record<string, RoutineLog> = {}
    ;(ls ?? []).forEach(l => { logMap[l.routine_id] = l })
    setLogs(logMap)
    setLoading(false)
  }, [user, seasonId])

  useEffect(() => { fetchAll() }, [fetchAll])

   const toggleComplete = async (routineId: string) => {
    const existing = logs[routineId]
    if (existing?.locked) return

    if (existing) {
      const newVal = !existing.completed
      await supabase.from('routine_logs').update({ completed: newVal }).eq('id', existing.id)
      // 코인 처리
      if (newVal) {
        await supabase.from('coin_transactions').insert({
          user_id: user!.id, season_id: seasonId, date: today(),
          amount: 1, source_type: '루틴', source_id: existing.id, note: '루틴 완료',
        })
      } else {
        await supabase.from('coin_transactions').delete().eq('source_id', existing.id).eq('source_type', '루틴')
      }
    } else {
      const { data: log } = await supabase.from('routine_logs').insert({
        user_id: user!.id, routine_id: routineId, date: today(), completed: true,
      }).select().single()
      if (log) {
        await supabase.from('coin_transactions').insert({
          user_id: user!.id, season_id: seasonId, date: today(),
          amount: 1, source_type: '루틴', source_id: log.id, note: '루틴 완료',
        })
      }
    }
    fetchAll()
  }

  const lockLog = async (routineId: string) => {
    const existing = logs[routineId]
    if (!existing || !existing.completed) return
    await supabase.from('routine_logs').update({ locked: true }).eq('id', existing.id)
    fetchAll()
  }

  const addRoutine = async (title: string, position: 'before' | 'after', refIndex: number) => {
    const newIndex = position === 'after' ? refIndex + 1 : refIndex
    // 기존 루틴 index 밀기
    for (const r of routines.filter(r => r.order_index >= newIndex)) {
      await supabase.from('routines').update({ order_index: r.order_index + 1 }).eq('id', r.id)
    }
    await supabase.from('routines').insert({
      user_id: user!.id, season_id: seasonId, title, order_index: newIndex,
    })
    fetchAll()
  }

  return { routines, logs, loading, toggleComplete, lockLog, addRoutine, refetch: fetchAll }
}
