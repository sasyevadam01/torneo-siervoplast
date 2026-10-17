import { Link } from 'react-router-dom'
import { useState } from 'react'
import { useTorneo } from '../../lib/torneo'
import { isoToLocalInput, localInputToIso, ordinaPartite, segnaposto, titoloPartita } from '../../lib/calc'
import { Logo, Vuoto } from '../../components/ui'
import type { Partita } from '../../lib/types'

export default function TabPartite() {
  const { partite, giocatori, admin } = useTorneo()
  const [msg, setMsg] = useState<string | null>(null)
  const ordinate = [...partite].sort(ordinaPartite)
  const daSorteggiare = giocatori.filter((g) => !g.fisso && !g.squadra_id).length
  const girone = partite.filter((p) => p.fase === 'girone')
  const gironeFinito = girone.length > 0 && girone.every((p) => p.stato === 'finita')
  const semiVuote = partite.some((p) => p.fase === 'semifinale' && !p.casa_id)

  async function generaCalendario() {
    const avviso = daSorteggiare > 0 ? `\n\nAttenzione: ${daSorteggiare} giocatori non sono ancora stati sorteggiati.` : ''
    if (!confirm('Generare il calendario? L’ordine delle squadre viene estratto a caso e il calendario attuale viene sostituito.' + avviso)) return
    const { errore } = await admin('genera_calendario')
    setMsg(errore ?? 'Calendario generato: ora imposta date, orari e campo.')
  }

  async function generaSemifinali() {
    const { errore } = await admin('genera_semifinali')
    setMsg(errore ?? 'Semifinali compilate in base alla classifica.')
  }

  return (
    <>
      <div className="azioni-admin">
        {partite.length === 0 ? (
          <button className="btn btn-primario" onClick={generaCalendario}>
            Genera calendario
          </button>
        ) : (
          <button className="btn btn-piccolo" onClick={generaCalendario}>
            Rigenera calendario
          </button>
        )}
        {gironeFinito && semiVuote && (
          <button className="btn btn-primario" onClick={generaSemifinali}>
            Compila semifinali
          </button>
        )}
      </div>
      {msg && <p className="messaggio">{msg}</p>}
      {ordinate.length === 0 && <Vuoto>Nessuna partita. Prima fai il sorteggio, poi genera il calendario.</Vuoto>}
      <div className="lista">
        {ordinate.map((p) => (
          <SchedaPartitaAdmin key={p.id} p={p} />
        ))}
      </div>
    </>
  )
}

function SchedaPartitaAdmin({ p }: { p: Partita }) {
  const { squadra, admin } = useTorneo()
  const [errore, setErrore] = useState<string | null>(null)
  const casa = squadra(p.casa_id)
  const osp = squadra(p.ospite_id)

  async function salva(campi: Partial<Partita>) {
    const { errore } = await admin('admin_aggiorna_partita', { partita_id: p.id, campi })
    setErrore(errore)
  }

  return (
    <div className={'scheda-admin stato-' + p.stato}>
      <div className="scheda-admin-testa">
        <span className="sopratitolo">{titoloPartita(p)}</span>
        <span className={'pill ' + p.stato}>{p.stato === 'in_corso' ? 'in corso' : p.stato}</span>
      </div>
      <div className="scheda-admin-squadre">
        <Logo squadra={casa} size={24} /> {casa?.nome ?? segnaposto(p, 'casa')}
        <b>{p.stato === 'programmata' ? 'vs' : `${p.gol_casa} - ${p.gol_ospite}`}</b>
        {osp?.nome ?? segnaposto(p, 'ospite')} <Logo squadra={osp} size={24} />
      </div>
      <div className="scheda-admin-campi">
        <input
          type="datetime-local"
          defaultValue={isoToLocalInput(p.data_ora)}
          onBlur={(e) => {
            const v = localInputToIso(e.target.value)
            if (v !== p.data_ora) salva({ data_ora: v })
          }}
          aria-label="Data e ora"
        />
        <input
          defaultValue={p.campo ?? ''}
          placeholder="Campo"
          onBlur={(e) => {
            const v = e.target.value.trim() || null
            if (v !== p.campo) salva({ campo: v })
          }}
          aria-label="Campo"
        />
      </div>
      {errore && <p className="errore">{errore}</p>}
      {casa && osp && (
        <Link to={`/admin/partita/${p.id}`} className="btn btn-primario btn-pieno">
          {p.stato === 'in_corso' ? 'Continua diretta' : p.stato === 'finita' ? 'Correggi' : 'Apri partita'}
        </Link>
      )}
    </div>
  )
}
