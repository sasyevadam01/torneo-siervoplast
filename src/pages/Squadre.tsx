import { Link } from 'react-router-dom'
import { useTorneo } from '../lib/torneo'
import { Logo } from '../components/ui'

export default function Squadre() {
  const { squadre, giocatori } = useTorneo()
  return (
    <div className="pagina">
      <h1 className="titolo-pagina">Squadre</h1>
      <Link to="/giocatori" className="card-sorteggio" style={{ marginBottom: 14 }}>
        <div>
          <p className="sopratitolo">Tutti i giocatori</p>
          <h2>Album figurine</h2>
          <p className="testo-tenue">Le carte dei {giocatori.length} giocatori con abilità e soprannomi</p>
        </div>
        <span className="freccia">→</span>
      </Link>
      <div className="griglia-squadre">
        {squadre.map((s) => {
          const n = giocatori.filter((g) => g.squadra_id === s.id).length
          return (
            <Link key={s.id} to={`/squadre/${s.id}`} className="card-squadra" style={{ ['--colore' as string]: s.colore }}>
              <Logo squadra={s} size={96} />
              <strong>{s.nome}</strong>
              <span className="testo-tenue">
                {n ? `${n} giocatori` : 'Rosa da sorteggiare'}
                {s.esterna ? ' · ospiti' : ''}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
