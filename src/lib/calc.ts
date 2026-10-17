import type { Evento, Giocatore, Partita, RigaClassifica, Squadra, StatGiocatore } from './types'

// Stessi criteri della funzione genera_semifinali nel database:
// punti, differenza reti, gol fatti, nome
export function calcolaClassifica(squadre: Squadra[], partite: Partita[]): RigaClassifica[] {
  const righe = new Map<string, RigaClassifica>()
  for (const s of squadre) {
    righe.set(s.id, { squadra: s, giocate: 0, vinte: 0, pareggiate: 0, perse: 0, golFatti: 0, golSubiti: 0, diffReti: 0, punti: 0 })
  }
  for (const p of partite) {
    if (p.fase !== 'girone' || p.stato !== 'finita' || !p.casa_id || !p.ospite_id) continue
    const c = righe.get(p.casa_id)
    const o = righe.get(p.ospite_id)
    if (!c || !o) continue
    registra(c, p.gol_casa, p.gol_ospite)
    registra(o, p.gol_ospite, p.gol_casa)
  }
  return [...righe.values()].sort(
    (a, b) =>
      b.punti - a.punti ||
      b.diffReti - a.diffReti ||
      b.golFatti - a.golFatti ||
      a.squadra.nome.localeCompare(b.squadra.nome),
  )
}

function registra(r: RigaClassifica, fatti: number, subiti: number) {
  r.giocate++
  r.golFatti += fatti
  r.golSubiti += subiti
  r.diffReti = r.golFatti - r.golSubiti
  if (fatti > subiti) r.vinte++
  else if (fatti === subiti) r.pareggiate++
  else r.perse++
  r.punti = r.vinte * 3 + r.pareggiate
}

export function calcolaStatistiche(giocatori: Giocatore[], eventi: Evento[], partite: Partita[]): StatGiocatore[] {
  const stat = new Map<string, StatGiocatore>()
  for (const g of giocatori) stat.set(g.id, { giocatore: g, gol: 0, assist: 0, gialli: 0, rossi: 0, mvp: 0 })
  for (const e of eventi) {
    const s = stat.get(e.giocatore_id)
    if (s) {
      if (e.tipo === 'gol') s.gol++
      else if (e.tipo === 'giallo') s.gialli++
      else if (e.tipo === 'rosso') s.rossi++
    }
    if (e.assist_id) {
      const a = stat.get(e.assist_id)
      if (a) a.assist++
    }
  }
  for (const p of partite) {
    if (p.mvp_id) {
      const s = stat.get(p.mvp_id)
      if (s) s.mvp++
    }
  }
  return [...stat.values()]
}

export function vincitore(p: Partita): string | null {
  if (p.stato !== 'finita') return null
  if (p.gol_casa > p.gol_ospite) return p.casa_id
  if (p.gol_ospite > p.gol_casa) return p.ospite_id
  if ((p.rigori_casa ?? 0) > (p.rigori_ospite ?? 0)) return p.casa_id
  if ((p.rigori_ospite ?? 0) > (p.rigori_casa ?? 0)) return p.ospite_id
  return null
}

export function ordinaPartite(a: Partita, b: Partita): number {
  const fasi = { girone: 0, semifinale: 1, finale: 2 }
  return fasi[a.fase] - fasi[b.fase] || a.giornata - b.giornata || (a.data_ora ?? '9').localeCompare(b.data_ora ?? '9')
}

export function titoloPartita(p: Partita): string {
  if (p.fase === 'girone') return `${p.giornata}ª giornata`
  if (p.fase === 'semifinale') return `Semifinale ${p.giornata}`
  return 'Finale'
}

// Segnaposto per la fase finale quando le squadre non sono ancora note
export function segnaposto(p: Partita, lato: 'casa' | 'ospite'): string {
  if (p.fase === 'semifinale') {
    const pos = p.giornata === 1 ? (lato === 'casa' ? 1 : 4) : lato === 'casa' ? 2 : 3
    return `${pos}ª classificata`
  }
  if (p.fase === 'finale') return lato === 'casa' ? 'Vincente SF 1' : 'Vincente SF 2'
  return 'Da definire'
}

const fmtGiorno = new Intl.DateTimeFormat('it-IT', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/Rome' })
const fmtOra = new Intl.DateTimeFormat('it-IT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Rome' })

export function formatGiorno(iso: string | null): string {
  return iso ? fmtGiorno.format(new Date(iso)) : 'Data da definire'
}
export function formatOra(iso: string | null): string {
  return iso ? fmtOra.format(new Date(iso)) : '--:--'
}

// "2026-10-30T18:30" (input datetime-local, ora locale) <-> ISO
export function isoToLocalInput(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}
export function localInputToIso(v: string): string | null {
  return v ? new Date(v).toISOString() : null
}

export function iniziali(nome: string): string {
  return nome
    .split(/\s+/)
    .filter((p) => p && p !== 'Jr')
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
}

// Le fasce sono riservate agli organizzatori: al pubblico si mostrano come "urne"
export const NOME_URNA: Record<string, string> = { A: 'Urna 1', B: 'Urna 2', C: 'Urna 3', D: 'Urna 4', EXT: 'Esterni' }

// ---------- Carta del giocatore ----------
export const RUOLI: Record<string, string> = { POR: 'Portiere', DIF: 'Difensore', CEN: 'Centrocampista', ATT: 'Attaccante' }

// Le 6 abilità sono salvate in ordine fisso; per il portiere cambiano solo le etichette
const ETICHETTE_MOVIMENTO = [
  ['VEL', 'Velocità'],
  ['TIR', 'Tiro'],
  ['PAS', 'Passaggio'],
  ['DRI', 'Dribbling'],
  ['DIF', 'Difesa'],
  ['FIS', 'Fisico'],
]
const ETICHETTE_PORTIERE = [
  ['TUF', 'Tuffo'],
  ['PRE', 'Presa'],
  ['RIN', 'Rinvio'],
  ['RIF', 'Riflessi'],
  ['VEL', 'Velocità'],
  ['POS', 'Posizionamento'],
]

export function etichetteAbilita(ruolo: string | null): string[][] {
  return ruolo === 'POR' ? ETICHETTE_PORTIERE : ETICHETTE_MOVIMENTO
}

export function valutazione(abilita: number[] | null): number | null {
  if (!abilita || abilita.length !== 6) return null
  return Math.round(abilita.reduce((a, b) => a + b, 0) / 6)
}

export type LivelloCarta = 'oro' | 'argento' | 'bronzo' | 'vuota'
export function livelloCarta(v: number | null): LivelloCarta {
  if (v == null) return 'vuota'
  if (v >= 75) return 'oro'
  if (v >= 65) return 'argento'
  return 'bronzo'
}
