import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { useTorneo } from '../lib/torneo'
import { calcolaStatistiche, etichetteAbilita, ordinaPartite, RUOLI, valutazione } from '../lib/calc'
import { RigaPartita, Sezione, Vuoto } from '../components/ui'
import Carta from '../components/Carta'
import EditorCarta from '../components/EditorCarta'

export default function Giocatore() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { giocatore, giocatori, eventi, partite, squadra, organizzatore } = useTorneo()
  const [modifica, setModifica] = useState(false)
  const g = giocatore(id ?? null)
  const stat = useMemo(() => calcolaStatistiche(giocatori, eventi, partite).find((x) => x.giocatore.id === id), [giocatori, eventi, partite, id])
  if (!g) return <Vuoto>Giocatore non trovato</Vuoto>

  const s = squadra(g.squadra_id)
  const v = valutazione(g.abilita)
  const etichette = etichetteAbilita(g.ruolo)
  const partiteSquadra = partite
    .filter((p) => p.stato !== 'programmata' && (p.casa_id === g.squadra_id || p.ospite_id === g.squadra_id) && g.squadra_id)
    .sort(ordinaPartite)

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <button className="btn-icona" style={{ width: 'auto' }} onClick={() => navigate(-1)}>
          ← Indietro
        </button>
        {organizzatore && (
          <button className="btn btn-piccolo" onClick={() => setModifica(true)}>
            Modifica carta
          </button>
        )}
      </div>

      <div className="profilo-testa" style={{ ['--colore' as string]: s?.colore ?? '#333' }}>
        <Carta g={g} larghezza={260} />
        <div className="chi-sono">
          <h1>{g.nome}</h1>
          <p className="testo-tenue">
            {g.soprannome && <>“{g.soprannome}” · </>}
            {g.ruolo ? RUOLI[g.ruolo] : 'Ruolo da definire'}
            {s && (
              <>
                {' · '}
                <Link to={`/squadre/${s.id}`}>{s.nome}</Link>
              </>
            )}
          </p>
        </div>
      </div>

      <Sezione titolo="Nel torneo">
        <div className="griglia-numeri">
          <div>
            <b>{stat?.gol ?? 0}</b>
            <span>Gol</span>
          </div>
          <div>
            <b>{stat?.assist ?? 0}</b>
            <span>Assist</span>
          </div>
          <div>
            <b>{stat?.mvp ?? 0}</b>
            <span>MVP</span>
          </div>
          <div>
            <b>{stat?.gialli ?? 0}</b>
            <span>Gialli</span>
          </div>
          <div>
            <b>{stat?.rossi ?? 0}</b>
            <span>Rossi</span>
          </div>
        </div>
      </Sezione>

      <Sezione titolo={v != null ? `Abilità · ${v}` : 'Abilità'}>
        {g.abilita ? (
          <div className="barre-abilita">
            {etichette.map(([sigla, nome], i) => {
              const val = g.abilita![i]
              const colore = val >= 75 ? '#d4a838' : val >= 65 ? '#aeb6bf' : '#c98653'
              return (
                <div key={sigla + i} className="barra-abilita">
                  <span>{nome}</span>
                  <div className="traccia">
                    <div className="riempimento" style={{ width: `${val}%`, background: colore }} />
                  </div>
                  <b>{val}</b>
                </div>
              )
            })}
          </div>
        ) : (
          <Vuoto>Le abilità di questo giocatore non sono ancora state assegnate</Vuoto>
        )}
      </Sezione>

      {partiteSquadra.length > 0 && (
        <Sezione titolo="Partite">
          <div className="lista">
            {partiteSquadra.map((p) => {
              const suoi = eventi.filter((e) => e.partita_id === p.id && (e.giocatore_id === g.id || e.assist_id === g.id))
              const gol = suoi.filter((e) => e.tipo === 'gol' && e.giocatore_id === g.id).length
              const assist = suoi.filter((e) => e.assist_id === g.id).length
              const gialli = suoi.filter((e) => e.tipo === 'giallo').length
              const rossi = suoi.filter((e) => e.tipo === 'rosso').length
              return (
                <div key={p.id}>
                  <RigaPartita p={p} mostraFase />
                  {(gol > 0 || assist > 0 || gialli > 0 || rossi > 0 || p.mvp_id === g.id) && (
                    <div className="eventi-partita">
                      {gol > 0 && <span>⚽ {gol > 1 ? `×${gol}` : 'gol'}</span>}
                      {assist > 0 && <span>👟 {assist > 1 ? `×${assist} assist` : 'assist'}</span>}
                      {p.mvp_id === g.id && <span>★ MVP</span>}
                      {gialli > 0 && <span>🟨 ammonito</span>}
                      {rossi > 0 && <span>🟥 espulso</span>}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Sezione>
      )}

      {modifica && <EditorCarta g={g} onChiudi={() => setModifica(false)} />}
    </div>
  )
}
