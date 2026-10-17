import { Link } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import { useTorneo } from '../../lib/torneo'

interface Org {
  id: string
  nome: string
}

export default function TabTorneo() {
  const { impostazioni, admin, esci, organizzatore } = useTorneo()
  const [nome, setNome] = useState(impostazioni?.nome_torneo ?? '')
  const [avviso, setAvviso] = useState(impostazioni?.avviso ?? '')
  const [codice, setCodice] = useState('')
  const [nuovoCodice, setNuovoCodice] = useState('')
  const [org, setOrg] = useState<Org[]>([])
  const [nuovoOrg, setNuovoOrg] = useState('')
  const [codiceNuovoOrg, setCodiceNuovoOrg] = useState<{ nome: string; codice: string } | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const caricaRiservati = useCallback(async () => {
    const c = await admin<string>('admin_codice_accesso')
    if (c.data) setCodice(c.data)
    const o = await admin<Org[]>('admin_organizzatori')
    if (o.data) setOrg(o.data)
  }, [admin])

  useEffect(() => {
    caricaRiservati()
  }, [caricaRiservati])

  async function salvaImpostazioni() {
    const { errore } = await admin('admin_salva_impostazioni', { nome_torneo: nome, avviso })
    setMsg(errore ?? 'Salvato')
  }

  async function cambiaCodice() {
    const c = nuovoCodice.trim().toUpperCase()
    if (c.length < 6) {
      setMsg('Il codice deve avere almeno 6 caratteri')
      return
    }
    if (!confirm(`Nuovo codice: ${c}\nChi usa il vecchio codice dovrà inserire quello nuovo.`)) return
    const { errore } = await admin('admin_cambia_codice', { nuovo: c })
    if (errore) setMsg(errore)
    else {
      setCodice(c)
      setNuovoCodice('')
      setMsg('Codice aggiornato')
    }
  }

  async function aggiungiOrganizzatore() {
    if (!nuovoOrg.trim()) return
    const { data, errore } = await admin<string>('admin_aggiungi_organizzatore', { nome: nuovoOrg.trim() })
    if (errore || !data) {
      setMsg(errore)
      return
    }
    setCodiceNuovoOrg({ nome: nuovoOrg.trim(), codice: data })
    setNuovoOrg('')
    caricaRiservati()
  }

  async function rimuoviOrganizzatore(o: Org) {
    if (!confirm(`Togliere ${o.nome} dagli organizzatori? Il suo codice smetterà di funzionare.`)) return
    const { errore } = await admin('admin_rimuovi_organizzatore', { organizzatore_id: o.id })
    setMsg(errore ?? `${o.nome} rimosso`)
    caricaRiservati()
  }

  return (
    <>
      <section className="sezione">
        <div className="sezione-testa">
          <h2>Codice per il pubblico</h2>
        </div>
        <div className="codice-box">
          <span className="codice">{codice || '…'}</span>
          <span className="testo-tenue">Da mettere in bacheca o nel gruppo, insieme al link dell’app</span>
        </div>
        <div className="form-riga">
          <input value={nuovoCodice} onChange={(e) => setNuovoCodice(e.target.value)} placeholder="Nuovo codice" />
          <button className="btn" onClick={cambiaCodice}>
            Cambia
          </button>
        </div>
      </section>

      <section className="sezione">
        <div className="sezione-testa">
          <h2>Organizzatori</h2>
        </div>
        <ul className="lista-admin">
          {org.map((o) => (
            <li key={o.id} style={{ cursor: 'default' }}>
              <span className="nome">
                {o.nome}
                {o.nome === organizzatore ? ' (tu)' : ''}
              </span>
              {o.nome !== organizzatore && (
                <button className="btn btn-piccolo btn-pericolo" onClick={() => rimuoviOrganizzatore(o)}>
                  Togli
                </button>
              )}
            </li>
          ))}
        </ul>
        <div className="form-riga">
          <input value={nuovoOrg} onChange={(e) => setNuovoOrg(e.target.value)} placeholder="Nome nuovo organizzatore" />
          <button className="btn" onClick={aggiungiOrganizzatore}>
            Aggiungi
          </button>
        </div>
        {codiceNuovoOrg && (
          <div className="codice-box" style={{ marginTop: 10 }}>
            <span className="testo-tenue">Codice personale di {codiceNuovoOrg.nome} — mandaglielo in privato, non verrà più mostrato:</span>
            <span className="codice">{codiceNuovoOrg.codice}</span>
          </div>
        )}
      </section>

      <section className="sezione">
        <div className="sezione-testa">
          <h2>Torneo</h2>
        </div>
        <label className="campo">
          <span>Nome del torneo</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} />
        </label>
        <label className="campo">
          <span>Avviso in home (es. “Sabato si gioca alle 18:30”)</span>
          <textarea value={avviso} onChange={(e) => setAvviso(e.target.value)} rows={2} />
        </label>
        <button className="btn btn-primario" onClick={salvaImpostazioni}>
          Salva
        </button>
      </section>

      {msg && <p className="messaggio">{msg}</p>}

      <section className="sezione">
        <div className="sezione-testa">
          <h2>Sorteggio</h2>
        </div>
        <Link to="/sorteggio" className="btn btn-pieno">
          Apri la sala del sorteggio
        </Link>
      </section>

      <button className="btn btn-piccolo" style={{ marginTop: 20 }} onClick={() => confirm('Uscire? Per rientrare servirà di nuovo il codice.') && esci()}>
        Esci
      </button>
    </>
  )
}
