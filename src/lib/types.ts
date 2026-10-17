export type Fascia = 'A' | 'B' | 'C' | 'D' | 'EXT'
export type Fase = 'girone' | 'semifinale' | 'finale'
export type StatoPartita = 'programmata' | 'in_corso' | 'finita'
export type TipoEvento = 'gol' | 'autogol' | 'giallo' | 'rosso'

export interface Squadra {
  id: string
  nome: string
  colore: string
  logo: string | null
  esterna: boolean
  ordine: number
}

export interface Giocatore {
  id: string
  nome: string
  fascia: Fascia
  squadra_id: string | null
  fisso: boolean
  numero: number | null
  foto_path: string | null
  soprannome: string | null
  ruolo: Ruolo | null
  abilita: number[] | null
}

export type Ruolo = 'POR' | 'DIF' | 'CEN' | 'ATT'

export interface Partita {
  id: string
  fase: Fase
  giornata: number
  casa_id: string | null
  ospite_id: string | null
  data_ora: string | null
  campo: string | null
  stato: StatoPartita
  gol_casa: number
  gol_ospite: number
  rigori_casa: number | null
  rigori_ospite: number | null
  mvp_id: string | null
  iniziata_at: string | null
  finita_at: string | null
}

export interface Evento {
  id: string
  partita_id: string
  tipo: TipoEvento
  giocatore_id: string
  squadra_id: string
  assist_id: string | null
  minuto: number | null
  created_at: string
}

export interface Estrazione {
  id: number
  giocatore_id: string
  squadra_id: string
  created_at: string
}

export interface Impostazioni {
  id: number
  nome_torneo: string
  sorteggio_visibile: boolean
  avviso: string | null
}

export interface RigaClassifica {
  squadra: Squadra
  giocate: number
  vinte: number
  pareggiate: number
  perse: number
  golFatti: number
  golSubiti: number
  diffReti: number
  punti: number
}

export interface StatGiocatore {
  giocatore: Giocatore
  gol: number
  assist: number
  gialli: number
  rossi: number
  mvp: number
}
