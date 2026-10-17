import { Link, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import { useTorneo } from '../lib/torneo'
import { calcolaClassifica, calcolaStatistiche, ordinaPartite } from '../lib/calc'
import { Avatar, Logo, RigaPartita, Sezione, Vuoto } from '../components/ui'

export default function SquadraDettaglio() {
  const { id } = useParams()
  const { squadre, giocatori, partite, eventi, squadra } = useTorneo()
  const s = squadra(id ?? null)
  const classifica = useMemo(() => calcolaClassifica(squadre, partite), [squadre, partite])
  const stat = useMemo(() => calcolaStatistiche(giocatori, eventi, partite), [giocatori, eventi, partite])
  if (!s) return <Vuoto>Squadra non trovata</Vuoto>

  const pos = classifica.findIndex((r) => r.squadra.id === s.id)
  const riga = classifica[pos]
  const rosa = stat
    .filter((x) => x.giocatore.squadra_id === s.id)
    .sort((a, b) => b.gol - a.gol || a.giocatore.nome.localeCompare(b.giocatore.nome))
  const sue = partite.filter((p) => p.casa_id === s.id || p.ospite_id === s.id).sort(ordinaPartite)

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/squadre">← Squadre</Link>
      </div>
      <div className="eroe-squadra" style={{ ['--colore' as string]: s.colore }}>
        <Logo squadra={s} size={120} />
        <h1>{s.nome}</h1>
        {riga && riga.giocate > 0 && (
          <div className="numeri">
            <div>
              <b>{pos + 1}ª</b>
              <span>posizione</span>
            </div>
            <div>
              <b>{riga.punti}</b>
              <span>punti</span>
            </div>
            <div>
              <b>
                {riga.vinte}-{riga.pareggiate}-{riga.perse}
              </b>
              <span>V-N-P</span>
            </div>
            <div>
              <b>{riga.golFatti}</b>
              <span>gol fatti</span>
            </div>
          </div>
        )}
      </div>

      <Sezione titolo={`Rosa (${rosa.length})`}>
        {rosa.length === 0 ? (
          <Vuoto>La rosa verrà formata con il sorteggio</Vuoto>
        ) : (
          <ul className="lista-rosa">
            {rosa.map((x) => (
              <li key={x.giocatore.id}>
                <Link to={`/giocatore/${x.giocatore.id}`} className="link-giocatore" style={{ display: 'contents' }}>
                <Avatar giocatore={x.giocatore} size={44} />
                <div className="chi">
                  <strong>
                    {x.giocatore.numero != null && <span className="numero">{x.giocatore.numero}</span>}
                    {x.giocatore.nome}
                  </strong>
                  <span className="mini-stat">
                    ⚽ {x.gol} · 👟 {x.assist}
                    {x.mvp > 0 && ` · ★ ${x.mvp}`}
                    {x.gialli > 0 && <span className="cartellino giallo piccolo">{x.gialli}</span>}
                    {x.rossi > 0 && <span className="cartellino rosso piccolo">{x.rossi}</span>}
                  </span>
                </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Sezione>

      {sue.length > 0 && (
        <Sezione titolo="Partite">
          <div className="lista">
            {sue.map((p) => (
              <RigaPartita key={p.id} p={p} mostraFase />
            ))}
          </div>
        </Sezione>
      )}
    </div>
  )
}
