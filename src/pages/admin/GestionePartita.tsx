import { Link, useParams } from 'react-router-dom'
import { useState } from 'react'
import { useTorneo } from '../../lib/torneo'
import { titoloPartita } from '../../lib/calc'
import { Avatar, Foglio, Logo, Sezione, Vuoto } from '../../components/ui'
import Cronaca, { eventiPartita } from '../../components/Cronaca'
import type { Evento, Giocatore, Partita, Squadra, TipoEvento } from '../../lib/types'

type Azione = { tipo: TipoEvento; squadra: Squadra; passo: 'giocatore' | 'assist'; marcatore?: Giocatore }

const ETICHETTA: Record<TipoEvento, string> = { gol: 'Gol', autogol: 'Autogol', giallo: 'Giallo', rosso: 'Rosso' }

export default function GestionePartita() {
  const { id } = useParams()
  const { partite, giocatori, eventi, squadra, admin } = useTorneo()
  const [azione, setAzione] = useState<Azione | null>(null)
  const [minuto, setMinuto] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)

  const p = partite.find((x) => x.id === id)
  if (!p) return <Vuoto>Partita non trovata</Vuoto>
  const casa = squadra(p.casa_id)
  const osp = squadra(p.ospite_id)
  if (!casa || !osp) return <Vuoto>Le squadre di questa partita non sono ancora definite</Vuoto>

  const evPartita = eventiPartita(eventi, p.id)
  const espulsi = new Set(evPartita.filter((e) => e.tipo === 'rosso').map((e) => e.giocatore_id))
  const rosa = (s: Squadra) => giocatori.filter((g) => g.squadra_id === s.id)

  async function aggiornaPartita(campi: Partial<Partita>) {
    setOccupato(true)
    const { errore } = await admin('admin_aggiorna_partita', { partita_id: p!.id, campi })
    setErrore(errore)
    setOccupato(false)
  }

  async function registra(tipo: TipoEvento, g: Giocatore, assist: Giocatore | null) {
    setAzione(null)
    setOccupato(true)
    const { errore } = await admin('admin_aggiungi_evento', {
      partita_id: p!.id,
      tipo,
      giocatore_id: g.id,
      assist_id: assist?.id ?? null,
      minuto: minuto ? Number(minuto) : null,
    })
    setErrore(errore)
    if (!errore) setMinuto('')
    setOccupato(false)
  }

  async function elimina(e: Evento) {
    const g = giocatori.find((x) => x.id === e.giocatore_id)
    if (!confirm(`Eliminare “${ETICHETTA[e.tipo]} – ${g?.nome ?? ''}”?`)) return
    const { errore } = await admin('admin_elimina_evento', { evento_id: e.id })
    setErrore(errore)
  }

  function scegliGiocatore(g: Giocatore) {
    if (!azione) return
    if (azione.tipo === 'gol') setAzione({ ...azione, passo: 'assist', marcatore: g })
    else registra(azione.tipo, g, null)
  }

  const eliminazione = p.fase !== 'girone'
  const pari = p.gol_casa === p.gol_ospite

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/admin">← Pannello</Link>
        <Link to={`/partita/${p.id}`}>Vista pubblica</Link>
      </div>

      <div className="regia-partita">
        <p className="sopratitolo">{titoloPartita(p)}</p>
        <div className="regia-punteggio">
          <div>
            <Logo squadra={casa} size={52} />
            <span>{casa.nome}</span>
          </div>
          <b>
            {p.gol_casa} - {p.gol_ospite}
          </b>
          <div>
            <Logo squadra={osp} size={52} />
            <span>{osp.nome}</span>
          </div>
        </div>
        <div className="regia-stato">
          {p.stato === 'programmata' && (
            <button
              className="btn btn-primario btn-grande"
              disabled={occupato}
              onClick={() => aggiornaPartita({ stato: 'in_corso' })}
            >
              ▶ Inizia partita
            </button>
          )}
          {p.stato === 'in_corso' && (
            <button
              className="btn btn-pericolo"
              disabled={occupato}
              onClick={() => {
                if (eliminazione && pari && (p.rigori_casa == null || p.rigori_ospite == null)) {
                  alert('Partita a eliminazione in parità: inserisci prima il risultato dei rigori qui sotto.')
                  return
                }
                if (confirm('Terminare la partita? La classifica verrà aggiornata.'))
                  aggiornaPartita({ stato: 'finita' })
              }}
            >
              ■ Termina partita
            </button>
          )}
          {p.stato === 'finita' && (
            <button
              className="btn btn-piccolo"
              disabled={occupato}
              onClick={() => confirm('Riaprire la partita per correggerla?') && aggiornaPartita({ stato: 'in_corso' })}
            >
              Riapri per correggere
            </button>
          )}
        </div>
      </div>

      {errore && <p className="errore">{errore}</p>}

      {p.stato !== 'programmata' && (
        <>
          <label className="campo campo-minuto">
            <span>Minuto (facoltativo)</span>
            <input inputMode="numeric" value={minuto} onChange={(e) => setMinuto(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="es. 12" />
          </label>
          <div className="pulsantiera">
            {[casa, osp].map((s) => (
              <div key={s.id} className="pulsantiera-squadra" style={{ ['--colore' as string]: s.colore }}>
                <h3>{s.nome}</h3>
                <button className="btn-evento gol" disabled={occupato} onClick={() => setAzione({ tipo: 'gol', squadra: s, passo: 'giocatore' })}>
                  ⚽ Gol
                </button>
                <div className="riga-cartellini">
                  <button className="btn-evento giallo" disabled={occupato} onClick={() => setAzione({ tipo: 'giallo', squadra: s, passo: 'giocatore' })}>
                    Giallo
                  </button>
                  <button className="btn-evento rosso" disabled={occupato} onClick={() => setAzione({ tipo: 'rosso', squadra: s, passo: 'giocatore' })}>
                    Rosso
                  </button>
                </div>
                <button className="btn-evento autogol" disabled={occupato} onClick={() => setAzione({ tipo: 'autogol', squadra: s, passo: 'giocatore' })}>
                  Autogol di un {s.nome}
                </button>
              </div>
            ))}
          </div>

          {eliminazione && pari && (
            <Sezione titolo="Rigori">
              <div className="rigori-form">
                <label>
                  {casa.nome}
                  <input
                    inputMode="numeric"
                    defaultValue={p.rigori_casa ?? ''}
                    onBlur={(e) => aggiornaPartita({ rigori_casa: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </label>
                <label>
                  {osp.nome}
                  <input
                    inputMode="numeric"
                    defaultValue={p.rigori_ospite ?? ''}
                    onBlur={(e) => aggiornaPartita({ rigori_ospite: e.target.value === '' ? null : Number(e.target.value) })}
                  />
                </label>
              </div>
            </Sezione>
          )}

          <Sezione titolo="Migliore in campo (MVP)">
            <select className="select-mvp" value={p.mvp_id ?? ''} onChange={(e) => aggiornaPartita({ mvp_id: e.target.value || null })}>
              <option value="">— Non ancora scelto —</option>
              {[casa, osp].map((s) => (
                <optgroup key={s.id} label={s.nome}>
                  {rosa(s).map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.nome}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </Sezione>
        </>
      )}

      <Sezione titolo="Cronaca">
        <Cronaca partita={p} onElimina={elimina} />
      </Sezione>

      {azione && (
        <Foglio
          titolo={
            azione.passo === 'assist'
              ? `Assist per ${azione.marcatore?.nome}?`
              : azione.tipo === 'autogol'
                ? `Chi ha fatto autogol (${azione.squadra.nome})?`
                : `${ETICHETTA[azione.tipo]} – ${azione.squadra.nome}`
          }
          onChiudi={() => setAzione(null)}
        >
          <ul className="scelta-giocatori">
            {azione.passo === 'assist' && (
              <li>
                <button className="senza" onClick={() => registra('gol', azione.marcatore!, null)}>
                  Nessun assist
                </button>
              </li>
            )}
            {rosa(azione.squadra)
              .filter((g) => g.id !== azione.marcatore?.id)
              .map((g) => {
                const fuori = espulsi.has(g.id) && azione.tipo !== 'autogol'
                return (
                  <li key={g.id}>
                    <button
                      disabled={fuori}
                      onClick={() =>
                        azione.passo === 'assist' ? registra('gol', azione.marcatore!, g) : scegliGiocatore(g)
                      }
                    >
                      <Avatar giocatore={g} size={36} />
                      <span>
                        {g.numero != null && <b>{g.numero} </b>}
                        {g.nome}
                      </span>
                      {fuori && <small>espulso</small>}
                    </button>
                  </li>
                )
              })}
          </ul>
        </Foglio>
      )}
    </div>
  )
}
