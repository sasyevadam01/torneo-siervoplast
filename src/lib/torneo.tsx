import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { supabase, messaggioErrore } from './supabase'
import { SUPABASE_URL } from './config'
import type { Estrazione, Evento, Giocatore, Impostazioni, Partita, Squadra } from './types'

// Tutto il torneo arriva in un'unica risposta, protetta dal codice
interface Istantanea {
  organizzatore: string | null
  impostazioni: Impostazioni | null
  squadre: Squadra[]
  giocatori: Giocatore[]
  partite: Partita[]
  eventi: Evento[]
  sorteggio: Estrazione[]
}

type Stato = 'caricamento' | 'fuori' | 'dentro'

interface TorneoCtx extends Istantanea {
  stato: Stato
  errore: string | null
  squadra: (id: string | null) => Squadra | undefined
  giocatore: (id: string | null) => Giocatore | undefined
  fotoUrl: (g?: Giocatore) => string | undefined
  entra: (codice: string) => Promise<string | null>
  esci: () => void
  ricarica: () => Promise<void>
  // chiama una funzione di gestione aggiungendo il codice organizzatore
  admin: <T = unknown>(funzione: string, argomenti?: Record<string, unknown>) => Promise<{ data: T | null; errore: string | null }>
  caricaFoto: (giocatoreId: string, immagine: string | null) => Promise<string | null>
}

const CHIAVE_CODICE = 'torneo-codice'
const CHIAVE_CACHE = 'torneo-cache'
const VUOTA: Istantanea = { organizzatore: null, impostazioni: null, squadre: [], giocatori: [], partite: [], eventi: [], sorteggio: [] }

function leggi(k: string): string | null {
  try {
    return localStorage.getItem(k)
  } catch {
    return null
  }
}
function scrivi(k: string, v: string | null) {
  try {
    if (v === null) localStorage.removeItem(k)
    else localStorage.setItem(k, v)
  } catch {
    /* modalità privata: pazienza, si rientra col codice */
  }
}

const Ctx = createContext<TorneoCtx | null>(null)

async function scarica(codice: string): Promise<{ dati?: Istantanea; errore?: string; rete?: boolean }> {
  const { data, error } = await supabase.rpc('torneo', { codice })
  if (error) return { errore: 'Connessione assente', rete: true }
  if (!data || data.errore) return { errore: data?.errore ?? 'Codice non valido' }
  return { dati: data as Istantanea }
}

export function TorneoProvider({ children }: { children: ReactNode }) {
  const [codice, setCodice] = useState<string | null>(() => leggi(CHIAVE_CODICE))
  const [dati, setDati] = useState<Istantanea>(() => {
    try {
      const c = leggi(CHIAVE_CACHE)
      return c && leggi(CHIAVE_CODICE) ? (JSON.parse(c) as Istantanea) : VUOTA
    } catch {
      return VUOTA
    }
  })
  const [stato, setStato] = useState<Stato>(() => (leggi(CHIAVE_CODICE) ? (leggi(CHIAVE_CACHE) ? 'dentro' : 'caricamento') : 'fuori'))
  const [errore, setErrore] = useState<string | null>(null)
  const inVolo = useRef<Promise<void> | null>(null)
  const ancora = useRef(false)

  const ricarica = useCallback(async () => {
    if (!codice) return
    // se arriva un altro avviso mentre si scarica, si riscarica una volta alla fine
    if (inVolo.current) {
      ancora.current = true
      return inVolo.current
    }
    const giro = (async () => {
      do {
        ancora.current = false
        const r = await scarica(codice)
        if (r.dati) {
          setDati(r.dati)
          setStato('dentro')
          setErrore(null)
          scrivi(CHIAVE_CACHE, JSON.stringify(r.dati))
        } else if (r.rete) {
          setErrore('Connessione assente: i dati potrebbero non essere aggiornati')
          setStato((s) => (s === 'caricamento' ? 'fuori' : s))
        } else {
          // il codice è stato cambiato dagli organizzatori
          scrivi(CHIAVE_CODICE, null)
          scrivi(CHIAVE_CACHE, null)
          setCodice(null)
          setDati(VUOTA)
          setStato('fuori')
        }
      } while (ancora.current)
    })()
    inVolo.current = giro
    await giro
    inVolo.current = null
  }, [codice])

  // primo caricamento + tempo reale: ogni modifica fa scattare il "segnale"
  useEffect(() => {
    if (!codice) return
    ricarica()
    let timer = 0
    const canale = supabase
      .channel('segnale')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'segnale' }, () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(ricarica, 150)
      })
      .subscribe()
    const alRitorno = () => document.visibilityState === 'visible' && ricarica()
    document.addEventListener('visibilitychange', alRitorno)
    window.addEventListener('online', alRitorno)
    // rete di sicurezza se il tempo reale cade: un controllo ogni 60 secondi
    const intervallo = window.setInterval(() => document.visibilityState === 'visible' && ricarica(), 60_000)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(intervallo)
      supabase.removeChannel(canale)
      document.removeEventListener('visibilitychange', alRitorno)
      window.removeEventListener('online', alRitorno)
    }
  }, [codice, ricarica])

  const entra = useCallback(async (c: string) => {
    const pulito = c.trim().toUpperCase()
    if (!pulito) return 'Inserisci il codice'
    const r = await scarica(pulito)
    if (!r.dati) return r.errore ?? 'Codice non valido'
    scrivi(CHIAVE_CODICE, pulito)
    scrivi(CHIAVE_CACHE, JSON.stringify(r.dati))
    setDati(r.dati)
    setCodice(pulito)
    setStato('dentro')
    return null
  }, [])

  const esci = useCallback(() => {
    scrivi(CHIAVE_CODICE, null)
    scrivi(CHIAVE_CACHE, null)
    setCodice(null)
    setDati(VUOTA)
    setStato('fuori')
  }, [])

  const admin = useCallback(
    async <T,>(funzione: string, argomenti: Record<string, unknown> = {}) => {
      const { data, error } = await supabase.rpc(funzione, { pin: codice, ...argomenti })
      if (error) return { data: null, errore: messaggioErrore(error) }
      ricarica()
      return { data: data as T, errore: null }
    },
    [codice, ricarica],
  )

  const caricaFoto = useCallback(
    async (giocatoreId: string, immagine: string | null) => {
      const { data, error } = await supabase.functions.invoke('carica-foto', {
        body: { pin: codice, giocatore_id: giocatoreId, immagine, rimuovi: immagine === null },
      })
      if (error) {
        try {
          const corpo = await (error as { context?: Response }).context?.json()
          return corpo?.errore ?? 'Caricamento non riuscito'
        } catch {
          return 'Caricamento non riuscito'
        }
      }
      if (data?.errore) return data.errore as string
      await ricarica()
      return null
    },
    [codice, ricarica],
  )

  const mappaSquadre = useMemo(() => new Map(dati.squadre.map((s) => [s.id, s])), [dati.squadre])
  const mappaGiocatori = useMemo(() => new Map(dati.giocatori.map((g) => [g.id, g])), [dati.giocatori])
  const squadra = useCallback((id: string | null) => (id ? mappaSquadre.get(id) : undefined), [mappaSquadre])
  const giocatore = useCallback((id: string | null) => (id ? mappaGiocatori.get(id) : undefined), [mappaGiocatori])
  const fotoUrl = useCallback(
    (g?: Giocatore) => (g?.foto_path ? `${SUPABASE_URL}/storage/v1/object/public/foto/${g.foto_path}` : undefined),
    [],
  )

  return (
    <Ctx.Provider value={{ ...dati, stato, errore, squadra, giocatore, fotoUrl, entra, esci, ricarica, admin, caricaFoto }}>
      {children}
    </Ctx.Provider>
  )
}

export function useTorneo() {
  const c = useContext(Ctx)
  if (!c) throw new Error('useTorneo fuori da TorneoProvider')
  return c
}
