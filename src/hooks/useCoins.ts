import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export function useCoins(seasonId: string | undefined) {
  const { user } = useAuth()
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user || !seasonId) return
    supabase
      .from('coin_transactions')
      .select('amount')
      .eq('user_id', user.id)
      .eq('season_id', seasonId)
      .then(({ data }) => {
        const sum = (data ?? []).reduce((acc, r) => acc + Number(r.amount), 0)
        setTotal(sum)
        setLoading(false)
      })
  }, [user, seasonId])

  return { total, loading }
}
