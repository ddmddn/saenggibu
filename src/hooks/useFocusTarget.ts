import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { FocusTarget, FocusCategory } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useFocusTarget() {
  const { user } = useAuth()
  const [target, setTarget] = useState<FocusTarget | null>(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('focus_targets')
      .select('*')
      .eq('user_id', user.id)
      .eq('date', today())
      .single()
    setTarget(data ?? null)
    setLoading(false)
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const set = async (category: FocusCategory, description: string) => {
    if (!user) return
    if (target) {
      await supabase.from('focus_targets').update({
        category, description, changed_count: target.changed_count + 1,
      }).eq('id', target.id)
    } else {
      await supabase.from('focus_targets').insert({
        user_id: user.id, date: today(), category, description,
      })
    }
    fetch()
  }

  const lock = async () => {
    if (!target) return
    await supabase.from('focus_targets').update({ locked: true }).eq('id', target.id)
    fetch()
  }

  const rate = async (score: number) => {
    if (!target) return
    await supabase.from('focus_targets').update({ self_rating: score }).eq('id', target.id)
    fetch()
  }

  return { target, loading, set, lock, rate }
}
