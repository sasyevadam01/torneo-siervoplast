import { Link } from 'react-router-dom'
import { useTorneo } from '../lib/torneo'
import type { Evento, Partita } from '../lib/types'

const ICONA: Record<Evento['tipo'], string> = { gol: '⚽', autogol: '⚽', giallo: '', rosso: '' }

export function eventiPartita(eventi: Evento[], partitaId: string) {
  return eventi
    .filter((e) => e.partita_id === partitaId)
    .sort((a, b) => (a.minuto ?? 999) - (b.minuto ?? 999) || a.created_at.localeCompare(b.created_at))
}

export default function Cronaca({
  partita,
  onElimina,
}: {
  partita: Partita
  onElimina?: (e: Evento) => void
}) {
  const { eventi, giocatore } = useTorneo()
  const lista = eventiPartita(eventi, partita.id)
  if (lista.length === 0) {
    return <div className="vuoto">{partita.stato === 'programmata' ? 'La partita non è ancora iniziata' : 'Nessun evento'}</div>
  }
  return (
    <ol className="cronaca">
      {lista.map((e) => {
        // l'autogol compare dal lato della squadra che ne beneficia
        const dallaCasa = e.tipo === 'autogol' ? e.squadra_id !== partita.casa_id : e.squadra_id === partita.casa_id
        const g = giocatore(e.giocatore_id)
        const a = giocatore(e.assist_id)
        return (
          <li key={e.id} className={dallaCasa ? 'casa' : 'ospite'}>
            <span className="minuto">{e.minuto != null ? `${e.minuto}'` : ''}</span>
            <span className={'evento-icona ' + e.tipo}>{ICONA[e.tipo]}</span>
            <span className="evento-testo">
              {g && !onElimina ? (
                <Link to={`/giocatore/${g.id}`} className="link-giocatore">
                  <strong>{g.nome}</strong>
                </Link>
              ) : (
                <strong>{g?.nome ?? '—'}</strong>
              )}
              {e.tipo === 'autogol' && <small>autogol</small>}
              {e.tipo === 'gol' && a && <small>assist {a.nome}</small>}
              {e.tipo === 'giallo' && <small>ammonito</small>}
              {e.tipo === 'rosso' && <small>espulso</small>}
            </span>
            {onElimina && (
              <button className="btn-icona elimina" onClick={() => onElimina(e)} aria-label="Elimina evento">
                ✕
              </button>
            )}
          </li>
        )
      })}
    </ol>
  )
}
