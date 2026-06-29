import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'
import type { Book, BookNote } from '../lib/types'

const today = () => new Date().toISOString().slice(0, 10)

export function useBooks(seasonId?: string) {
  const { user } = useAuth()
  const [books, setBooks] = useState<Book[]>([])

  const fetch = useCallback(async () => {
    if (!user) return
    const { data } = await supabase
      .from('books')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setBooks(data ?? [])
  }, [user])

  useEffect(() => { fetch() }, [fetch])

  const add = async (title: string, author?: string, coverPhotoUrl?: string) => {
    if (!user || !title.trim()) return
    const { error } = await supabase.from('books').insert({
      user_id: user.id,
      title: title.trim(),
      author: author?.trim() ?? null,
      cover_photo_url: coverPhotoUrl ?? null,
      status: 'reading',
    })
    if (error) throw error
    fetch()
  }

  const complete = async (id: string) => {
    if (!user) return
    const { error } = await supabase.from('books').update({ status: '완독', completed_date: today() }).eq('id', id)
    if (error) throw error
    // 완독 코인 +20
    if (seasonId) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: seasonId, date: today(),
        amount: 20, source_type: '독서', source_id: id, note: '독서 완독',
      })
    }
    fetch()
  }

  const remove = async (id: string) => {
    await supabase.from('books').delete().eq('id', id)
    fetch()
  }

  const addNote = async (bookId: string, quote?: string, reflection?: string, seasonId2?: string) => {
    if (!user) return
    await supabase.from('book_notes').insert({
      user_id: user.id, book_id: bookId,
      quote_text: quote ?? null, reflection_text: reflection ?? null,
    })
    // 구절+느낀점 기록 시 +5 코인
    const sid = seasonId2 ?? seasonId
    if (sid && (quote || reflection)) {
      await supabase.from('coin_transactions').insert({
        user_id: user.id, season_id: sid, date: today(),
        amount: 5, source_type: '독서', source_id: bookId, note: '독서 구절/느낀점 기록',
      })
    }
  }

  const getNotes = async (bookId: string): Promise<BookNote[]> => {
    if (!user) return []
    const { data } = await supabase.from('book_notes').select('*').eq('book_id', bookId).order('created_at')
    return data ?? []
  }

  return { books, add, complete, remove, addNote, getNotes }
}
