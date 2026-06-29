import { supabase } from './supabase'

export async function uploadPhoto(file: File, userId: string, folder: string) {
  const safeName = file.name.replace(/[^\w.-]+/g, '-')
  const path = `${userId}/${folder}/${crypto.randomUUID()}-${safeName}`

  const { error } = await supabase.storage
    .from('photos')
    .upload(path, file, { cacheControl: '3600', upsert: false })

  if (error) throw error

  const { data } = supabase.storage.from('photos').getPublicUrl(path)
  return data.publicUrl
}
