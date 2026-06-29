import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Challenge, ChallengeType } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useChallenges(seasonId?: string) {
  const { user } = useAuth()
  const [challenges, setChallenges] = useState<Challenge[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('challenges')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setChallenges(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (params: {
    type: ChallengeType
    title: string
    durationDays: number
    targetPersonId?: string
  }) => {
    if (!user || !params.title.trim()) return
    await supabase.from('challenges').insert({
      user_id: user.id,
      type: params.type,
      title: params.title.trim(),
      duration_days: params.durationDays,
      target_person_id: params.targetPersonId ?? null,
      start_date: today(),
      status: 'active',
    })
    fetch()
  }

  // 하루 진행 체크 (+1)
  const checkDay = async (id: string) => {
    const ch = challenges.find(c => c.id === id)
    if (!ch || ch.status !== 'active') return
    const newCount = ch.progress_count + 1
    const done = newCount >= ch.duration_days

    await supabase.from('challenges').update({
      progress_count: newCount,
      status: done ? 'completed' : 'active',
    }).eq('id', id)

    if (done && seasonId) {
      await supabase.from('coin_transactions').insert({
        user_id: user!.id, season_id: seasonId, date: today(),
        amount: 30, source_type: '챌린지', source_id: id,
        note: `챌린지 완료 — ${ch.title}`,
      })
    }
    fetch()
  }

  const fail = async (id: string) => {
    await supabase.from('challenges').update({ status: 'failed' }).eq('id', id)
    fetch()
  }

  // 챌린지 → 루틴으로 승격
  const promoteToRoutine = async (id: string, routineSeasonId: string) => {
    const ch = challenges.find(c => c.id === id)
    if (!ch) return
    // 루틴 추가 (마지막 순서)
    const { data: existing } = await supabase
      .from('routines')
      .select('order_index')
      .eq('season_id', routineSeasonId)
      .order('order_index', { ascending: false })
      .limit(1)
    const nextIdx = existing && existing.length > 0 ? existing[0].order_index + 1 : 0
    await supabase.from('routines').insert({
      user_id: user!.id, season_id: routineSeasonId,
      title: ch.title, order_index: nextIdx,
    })
    await supabase.from('challenges').update({ promoted_to_routine: true }).eq('id', id)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('challenges').delete().eq('id', id)
    fetch()
  }

  const active = challenges.filter(c => c.status === 'active')
  const completed = challenges.filter(c => c.status === 'completed')
  const failed = challenges.filter(c => c.status === 'failed')

  return { challenges, active, completed, failed, add, checkDay, fail, promoteToRoutine, remove }
}
