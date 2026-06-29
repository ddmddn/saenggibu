import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Routine, RoutineLog } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useRoutines(seasonId: string | undefined, date = today()) {
  const { user } = useAuth()
  const [routines, setRoutines] = useState<Routine[]>([])
  const [logs, setLogs] = useState<Record<string, RoutineLog>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    if (!user || !seasonId) {
      setRoutines([])
      setLogs({})
      setLoading(false)
      return
    }

    setLoading(true)
    const [{ data: rs, error: routineError }, { data: ls, error: logError }] = await Promise.all([
      supabase
        .from('routines')
        .select('*')
        .eq('user_id', user.id)
        .eq('season_id', seasonId)
        .neq('status', 'dropped')
        .order('order_index', { ascending: true }),
      supabase
        .from('routine_logs')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', date),
    ])

    if (routineError || logError) {
      setError(routineError?.message ?? logError?.message ?? '루틴을 불러오지 못했어요.')
    } else {
      setError(null)
    }

    setRoutines(rs ?? [])
    const logMap: Record<string, RoutineLog> = {}
    ;(ls ?? []).forEach((l) => {
      logMap[l.routine_id] = l as RoutineLog
    })
    setLogs(logMap)
    setLoading(false)
  }, [user, seasonId, date])

  useEffect(() => {
    fetchAll()
  }, [fetchAll])

  const addCoin = async (sourceId: string, note: string) => {
    if (!user || !seasonId) return
    await supabase.from('coin_transactions').insert({
      user_id: user.id,
      season_id: seasonId,
      date,
      amount: 1,
      source_type: '루틴',
      source_id: sourceId,
      note,
    })
  }

  const completeRoutine = async (
    routineId: string,
    options: { note?: string; photos?: string[] } = {},
  ) => {
    if (!user || !seasonId) throw new Error('로그인이 필요해요.')
    const existing = logs[routineId]
    if (existing?.locked) return

    if (existing) {
      const { error: updateError } = await supabase
        .from('routine_logs')
        .update({
          completed: true,
          note: options.note?.trim() || existing.note,
          photos: options.photos ?? existing.photos ?? [],
        })
        .eq('id', existing.id)

      if (updateError) throw updateError

      const { count } = await supabase
        .from('coin_transactions')
        .select('*', { count: 'exact', head: true })
        .eq('source_type', '루틴')
        .eq('source_id', existing.id)
      if (!count) await addCoin(existing.id, '루틴 완료')
    } else {
      const { data: log, error: insertError } = await supabase
        .from('routine_logs')
        .insert({
          user_id: user.id,
          routine_id: routineId,
          date,
          completed: true,
          note: options.note?.trim() || null,
          photos: options.photos ?? [],
        })
        .select()
        .single()

      if (insertError) throw insertError
      if (log) await addCoin(log.id, '루틴 완료')
    }

    await fetchAll()
  }

  const uncompleteRoutine = async (routineId: string) => {
    const existing = logs[routineId]
    if (!existing || existing.locked) return

    const { error: updateError } = await supabase
      .from('routine_logs')
      .update({ completed: false })
      .eq('id', existing.id)
    if (updateError) throw updateError

    await supabase
      .from('coin_transactions')
      .delete()
      .eq('source_id', existing.id)
      .eq('source_type', '루틴')

    await fetchAll()
  }

  const toggleComplete = async (routineId: string) => {
    const existing = logs[routineId]
    if (existing?.completed) {
      await uncompleteRoutine(routineId)
    } else {
      await completeRoutine(routineId)
    }
  }

  const lockLog = async (routineId: string) => {
    const existing = logs[routineId]
    if (!existing || !existing.completed) return
    const { error: updateError } = await supabase
      .from('routine_logs')
      .update({ locked: true })
      .eq('id', existing.id)
    if (updateError) throw updateError
    await fetchAll()
  }

  const addRoutine = async (title: string) => {
    if (!user || !seasonId) throw new Error('시즌 정보가 아직 준비되지 않았어요.')
    const cleanTitle = title.trim()
    if (!cleanTitle) return

    const nextIndex =
      routines.length === 0 ? 0 : Math.max(...routines.map((routine) => routine.order_index)) + 1

    const { data: created, error: insertError } = await supabase
      .from('routines')
      .insert({
        user_id: user.id,
        season_id: seasonId,
        title: cleanTitle,
        order_index: nextIndex,
        status: 'active',
      })
      .select()
      .single()

    if (insertError) throw insertError
    if (!created) throw new Error('루틴 저장 결과를 확인하지 못했어요.')
    await fetchAll()
  }

  const reorderRoutines = async (orderedIds: string[]) => {
    const updates = orderedIds.map((id, index) =>
      supabase.from('routines').update({ order_index: index }).eq('id', id),
    )
    const results = await Promise.all(updates)
    const failed = results.find((result) => result.error)
    if (failed?.error) throw failed.error
    await fetchAll()
  }

  const removeRoutine = async (id: string) => {
    const { error: deleteError } = await supabase.from('routines').delete().eq('id', id)
    if (deleteError) throw deleteError
    await fetchAll()
  }

  return {
    routines,
    logs,
    loading,
    error,
    toggleComplete,
    completeRoutine,
    uncompleteRoutine,
    lockLog,
    addRoutine,
    reorderRoutines,
    removeRoutine,
    refetch: fetchAll,
  }
}
