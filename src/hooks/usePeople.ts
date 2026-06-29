import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Person, PersonEvent, EnergyTag } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function usePeople() {
  const { user } = useAuth()
  const [people, setPeople] = useState<Person[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('people')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at')
    setPeople(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (name: string, tag: string, energy: EnergyTag) => {
    if (!user || !name.trim()) return
    await supabase.from('people').insert({
      user_id: user.id, name: name.trim(),
      relationship_tag: tag.trim() || null, energy_tag: energy,
    })
    fetch()
  }

  const update = async (id: string, fields: Partial<Pick<Person, 'name' | 'relationship_tag' | 'energy_tag'>>) => {
    await supabase.from('people').update(fields).eq('id', id)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('people').delete().eq('id', id)
    fetch()
  }

  return { people, add, update, remove }
}

export function usePersonDetail(personId: string | null) {
  const { user } = useAuth()
  const [events, setEvents] = useState<PersonEvent[]>([])
  const [weeklyThoughts, setWeeklyThoughts] = useState<number[]>(Array(7).fill(0))

  const fetchEvents = useCallback(async () => {
    if (!user || !personId) return
    const { data } = await supabase
      .from('person_events')
      .select('*')
      .eq('person_id', personId)
      .order('date', { ascending: false })
    setEvents(data ?? [])
  }, [user, personId])

  const fetchThoughts = useCallback(async () => {
    if (!user || !personId) return
    // 최근 7일 날짜별 생각 횟수
    const days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(); d.setDate(d.getDate() - (6 - i))
      return d.toISOString().slice(0, 10)
    })
    const counts: number[] = []
    for (const day of days) {
      const { count } = await supabase
        .from('person_thought_logs')
        .select('*', { count: 'exact', head: true })
        .eq('person_id', personId)
        .gte('datetime', `${day}T00:00:00`)
        .lte('datetime', `${day}T23:59:59`)
      counts.push(count ?? 0)
    }
    setWeeklyThoughts(counts)
  }, [user, personId])

  useEffect(() => { fetchEvents(); fetchThoughts() }, [fetchEvents, fetchThoughts])

  const addThought = async (seasonId?: string) => {
    if (!user || !personId) return
    await supabase.from('person_thought_logs').insert({
      user_id: user.id, person_id: personId, datetime: new Date().toISOString(),
    })
    if (seasonId) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: -1, source_type: '잡생각', note: '관계 프로필 잡생각 기록',
      })
    }
    fetchThoughts()
  }

  const addEvent = async (fields: { event_text?: string; emotion_text?: string; learned_text?: string }) => {
    if (!user || !personId) return
    await supabase.from('person_events').insert({
      user_id: user.id, person_id: personId, date: today(), ...fields,
    })
    fetchEvents()
  }

  const removeEvent = async (id: string) => {
    await supabase.from('person_events').delete().eq('id', id)
    fetchEvents()
  }

  const thisWeekTotal = weeklyThoughts.reduce((a, b) => a + b, 0)

  return { events, weeklyThoughts, thisWeekTotal, addThought, addEvent, removeEvent }
}
