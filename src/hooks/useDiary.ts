import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { DiaryEntry, DiaryTimeSlot } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useDiary(date?: string) {
  const { user } = useAuth()
  const [entries, setEntries] = useState<DiaryEntry[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('diary_entries')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', date ?? today())
      .order('created_at', { ascending: false })
    setEntries(data ?? [])
  }, [user, date])

  useEffect(() => { fetch() }, [fetch])

  const add = async (text: string, timeSlot?: DiaryTimeSlot, tags: string[] = []) => {
    if (!user || !text.trim()) return
    await supabase.from('diary_entries').insert({
      user_id: user.id, date: date ?? today(),
      text: text.trim(), time_slot: timeSlot ?? null,
      tags, source_type: 'manual',
    })
    fetch()
  }

  const update = async (id: string, text: string) => {
    await supabase.from('diary_entries').update({ text }).eq('id', id)
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('diary_entries').delete().eq('id', id)
    fetch()
  }

  return { entries, add, update, remove }
}
