import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useTorneo } from '../lib/torneo'
import { calcolaStatistiche } from '../lib/calc'
import { Avatar, Logo, Vuoto } from '../components/ui'
import type { StatGiocatore } from '../lib/types'

const SCHEDE = [
  { k: 'gol', titolo: 'Marcatori', unita: 'gol' },
  { k: 'assist', titolo: 'Assist', unita: 'assist' },
  { k: 'mvp', titolo: 'MVP', unita: 'MVP' },
  { k: 'cartellini', titolo: 'Cartellini', unita: '' },
] as const

type Chiave = (typeof SCHEDE)[number]['k']

function valore(s: StatGiocatore, k: Chiave) {
  return k === 'cartellini' ? s.gialli + s.rossi * 2 : s[k]
}

export default function Statistiche() {
  const { giocatori, eventi, partite, squadra } = useTorneo()
  const [scheda, setScheda] = useState<Chiave>('gol')
  const stat = useMemo(() => calcolaStatistiche(giocatori, eventi, partite), [giocatori, eventi, partite])
  const lista = stat
    .filter((s) => valore(s, scheda) > 0)
    .sort((a, b) => valore(b, scheda) - valore(a, scheda) || a.giocatore.nome.localeCompare(b.giocatore.nome))
  const info = SCHEDE.find((s) => s.k === scheda)!

  // posizione a pari merito: stesso valore = stessa posizione
  let posPrec = 0
  let valPrec = -1

  return (
    <div className="pagina">
      <h1 className="titolo-pagina">Statistiche</h1>
      <div className="segmenti">
        {SCHEDE.map((s) => (
          <button key={s.k} className={scheda === s.k ? 'attivo' : ''} onClick={() => setScheda(s.k)}>
            {s.titolo}
          </button>
        ))}
      </div>
      {lista.length === 0 && <Vuoto>Ancora nessun dato: si parte con la prima partita</Vuoto>}
      <ol className="classifica-giocatori">
        {lista.map((s, i) => {
          const v = valore(s, scheda)
          const pos = v === valPrec ? posPrec : i + 1
          posPrec = pos
          valPrec = v
          const sq = squadra(s.giocatore.squadra_id)
          return (
            <li key={s.giocatore.id} className={pos <= 3 ? 'top' : ''}>
              <span className="pos">{pos}</span>
              <Avatar giocatore={s.giocatore} size={40} />
              <Link to={`/giocatore/${s.giocatore.id}`} className="chi link-giocatore">
                <strong>{s.giocatore.nome}</strong>
                <span>
                  <Logo squadra={sq} size={16} /> {sq?.nome ?? 'Svincolato'}
                </span>
              </Link>
              {scheda === 'cartellini' ? (
                <span className="cartellini">
                  {s.gialli > 0 && (
                    <span className="cartellino giallo">
                      {s.gialli}
                    </span>
                  )}
                  {s.rossi > 0 && (
                    <span className="cartellino rosso">
                      {s.rossi}
                    </span>
                  )}
                </span>
              ) : (
                <span className="valore">
                  {v}
                  <small>{info.unita}</small>
                </span>
              )}
            </li>
          )
        })}
      </ol>
    </div>
  )
}
