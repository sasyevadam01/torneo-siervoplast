import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTorneo } from '../lib/torneo'
import { valutazione } from '../lib/calc'
import { Logo, Vuoto } from '../components/ui'
import Carta from '../components/Carta'

// Album delle figurine: tutte le carte, filtrabili per squadra
export default function Giocatori() {
  const { giocatori, squadre } = useTorneo()
  const [filtro, setFiltro] = useState<string>('tutti')
  const [ordine, setOrdine] = useState<'valutazione' | 'nome'>('valutazione')

  const lista = giocatori
    .filter((g) => filtro === 'tutti' || (filtro === 'urna' ? !g.squadra_id : g.squadra_id === filtro))
    .sort((a, b) =>
      ordine === 'nome'
        ? a.nome.localeCompare(b.nome)
        : (valutazione(b.abilita) ?? -1) - (valutazione(a.abilita) ?? -1) || a.nome.localeCompare(b.nome),
    )
  const senzaSquadra = giocatori.some((g) => !g.squadra_id)

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/squadre">← Squadre</Link>
        <button className="btn btn-piccolo" onClick={() => setOrdine(ordine === 'nome' ? 'valutazione' : 'nome')}>
          Ordina per {ordine === 'nome' ? 'valutazione' : 'nome'}
        </button>
      </div>
      <h1 className="titolo-pagina">Album figurine</h1>
      <div className="filtri">
        <button className={'solo-testo' + (filtro === 'tutti' ? ' attivo' : '')} onClick={() => setFiltro('tutti')}>
          Tutti ({giocatori.length})
        </button>
        {squadre.map((s) => (
          <button key={s.id} className={filtro === s.id ? 'attivo' : ''} onClick={() => setFiltro(s.id)}>
            <Logo squadra={s} size={22} />
            {s.nome}
          </button>
        ))}
        {senzaSquadra && (
          <button className={'solo-testo' + (filtro === 'urna' ? ' attivo' : '')} onClick={() => setFiltro('urna')}>
            Da sorteggiare
          </button>
        )}
      </div>
      {lista.length === 0 && <Vuoto>Nessun giocatore</Vuoto>}
      <div className="album">
        {lista.map((g) => (
          <Link key={g.id} to={`/giocatore/${g.id}`} aria-label={g.nome}>
            <Carta g={g} larghezza={155} />
          </Link>
        ))}
      </div>
    </div>
  )
}
