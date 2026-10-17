// Carica (o toglie) la foto di un giocatore. Solo con codice organizzatore valido.
// Le foto finiscono nel bucket "foto" con un percorso non indovinabile.
import { createClient } from 'npm:@supabase/supabase-js@2.118.0'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function risposta(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { ...CORS, 'Content-Type': 'application/json' } })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })
  if (req.method !== 'POST') return risposta({ errore: 'Metodo non permesso' }, 405)

  try {
    const { pin, giocatore_id, immagine, rimuovi } = await req.json()
    if (!pin || !giocatore_id) return risposta({ errore: 'Dati mancanti' }, 400)

    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const verifica = await db.rpc('admin_verifica', { pin })
    if (verifica.error) return risposta({ errore: 'Codice organizzatore non valido' }, 403)

    const { data: g, error } = await db.from('giocatori').select('id, foto_path').eq('id', giocatore_id).single()
    if (error || !g) return risposta({ errore: 'Giocatore non trovato' }, 404)

    let nuovoPercorso: string | null = null
    if (!rimuovi) {
      if (typeof immagine !== 'string') return risposta({ errore: 'Immagine mancante' }, 400)
      // webp/png mantengono lo sfondo trasparente dei ritratti disegnati
      const tipo = immagine.match(/^data:image\/(jpeg|png|webp);base64,/)?.[1] ?? 'jpeg'
      const base64 = immagine.replace(/^data:image\/\w+;base64,/, '')
      const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0))
      if (bytes.length > 1_500_000) return risposta({ errore: 'Immagine troppo grande' }, 413)
      nuovoPercorso = `${g.id}/${crypto.randomUUID()}.${tipo === 'jpeg' ? 'jpg' : tipo}`
      const up = await db.storage.from('foto').upload(nuovoPercorso, bytes, { contentType: `image/${tipo}` })
      if (up.error) return risposta({ errore: up.error.message }, 500)
    }

    const agg = await db.from('giocatori').update({ foto_path: nuovoPercorso }).eq('id', g.id)
    if (agg.error) return risposta({ errore: agg.error.message }, 500)
    if (g.foto_path) await db.storage.from('foto').remove([g.foto_path])

    return risposta({ foto_path: nuovoPercorso })
  } catch (e) {
    return risposta({ errore: e instanceof Error ? e.message : 'Errore imprevisto' }, 500)
  }
})
