import { createClient } from '@supabase/supabase-js'
import { SUPABASE_KEY, SUPABASE_URL } from './config'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true, storageKey: 'torneo-siervoplast' },
})

export function messaggioErrore(e: unknown): string {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return 'Errore imprevisto'
}
