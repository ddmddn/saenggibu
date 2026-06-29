import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Season } from '../lib/types'

export function useSeason() {
  const { user } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchSeason = useCallback(async () => {
    if (!user) {
      setSeason(null)
      setLoading(false)
      return
    }

    setLoading(true)
    const { data } = await supabase
      .from('seasons')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('season_number', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    if (data) {
      setSeason(data)
      setLoading(false)
      return
    }

    const start = new Date()
    const end = new Date(start)
    end.setDate(end.getDate() + 179)
    const { data: newSeason, error } = await supabase
      .from('seasons')
      .insert({
        user_id: user.id,
        season_number: 1,
        start_date: start.toISOString().slice(0, 10),
        end_date: end.toISOString().slice(0, 10),
        status: 'active',
        coin_rate: 100,
      })
      .select()
      .single()

    if (!error) setSeason(newSeason)
    setLoading(false)
  }, [user])

  useEffect(() => {
    fetchSeason()
  }, [fetchSeason])

  return { season, loading, refetch: fetchSeason }
}
