import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Season } from '../lib/types'

export function useSeason() {
  const { user } = useAuth()
  const [season, setSeason] = useState<Season | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    supabase
      .from('seasons')
      .select('*')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single()
      .then(async ({ data, error }) => {
        if (data) {
          setSeason(data)
        } else if (error?.code === 'PGRST116') {
          // 활성 시즌 없음 → 시즌 1 자동 생성
          const start = new Date()
          const end = new Date(start)
          end.setDate(end.getDate() + 179)
          const { data: newSeason } = await supabase
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
          setSeason(newSeason)
        }
        setLoading(false)
      })
  }, [user])

  return { season, loading }
}
