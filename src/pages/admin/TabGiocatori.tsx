import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTorneo } from '../../lib/torneo'
import { messaggioErrore } from '../../lib/supabase'
import { preparaFoto } from '../../lib/immagini'
import { Avatar, Foglio, Logo } from '../../components/ui'
import type { Fascia, Giocatore } from '../../lib/types'

const FASCE: Fascia[] = ['A', 'B', 'C', 'D', 'EXT']

export default function TabGiocatori() {
  const { giocatori, squadre, admin } = useTorneo()
  const [cerca, setCerca] = useState('')
  const [aperto, setAperto] = useState<Giocatore | null>(null)
  const [nuovo, setNuovo] = useState('')
  const [nuovaFascia, setNuovaFascia] = useState<Fascia>('C')
  const [errore, setErrore] = useState<string | null>(null)

  const filtrati = giocatori.filter((g) => g.nome.toLowerCase().includes(cerca.toLowerCase()))
  const gruppi = [
    ...squadre.map((s) => ({ id: s.id, titolo: s.nome, squadra: s, lista: filtrati.filter((g) => g.squadra_id === s.id) })),
    { id: 'urna', titolo: 'Nell’urna (da sorteggiare)', squadra: undefined, lista: filtrati.filter((g) => !g.squadra_id) },
  ].filter((g) => g.lista.length > 0)

  async function aggiungi(e: FormEvent) {
    e.preventDefault()
    if (!nuovo.trim()) return
    const { errore } = await admin('admin_aggiungi_giocatore', { nome: nuovo.trim(), fascia: nuovaFascia })
    setErrore(errore)
    if (!errore) setNuovo('')
  }

  return (
    <>
      <input className="campo-cerca" value={cerca} onChange={(e) => setCerca(e.target.value)} placeholder="Cerca giocatore…" />
      {gruppi.map((g) => (
        <section key={g.id} className="sezione">
          <div className="sezione-testa">
            <h2>
              {g.squadra && <Logo squadra={g.squadra} size={20} />} {g.titolo}
            </h2>
            <span className="testo-tenue">{g.lista.length}</span>
          </div>
          <ul className="lista-admin">
            {g.lista.map((x) => (
              <li key={x.id} onClick={() => setAperto(x)}>
                <Avatar giocatore={x} size={36} />
                <span className="nome">{x.nome}</span>
                {x.numero != null && <span className="numero">{x.numero}</span>}
                <span className={'fascia f-' + x.fascia}>{x.fascia}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}

      <form className="form-riga" onSubmit={aggiungi}>
        <input value={nuovo} onChange={(e) => setNuovo(e.target.value)} placeholder="Cognome Nome" aria-label="Nuovo giocatore" />
        <select value={nuovaFascia} onChange={(e) => setNuovaFascia(e.target.value as Fascia)} aria-label="Fascia">
          {FASCE.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <button className="btn btn-primario">Aggiungi</button>
      </form>
      {errore && <p className="errore">{errore}</p>}

      {aperto && <SchedaGiocatore g={giocatori.find((x) => x.id === aperto.id) ?? aperto} onChiudi={() => setAperto(null)} />}
    </>
  )
}

function SchedaGiocatore({ g, onChiudi }: { g: Giocatore; onChiudi: () => void }) {
  const { squadre, admin, caricaFoto: inviaFoto } = useTorneo()
  const [nome, setNome] = useState(g.nome)
  const [numero, setNumero] = useState(g.numero?.toString() ?? '')
  const [errore, setErrore] = useState<string | null>(null)
  const [carico, setCarico] = useState(false)

  async function salva(campi: Partial<Giocatore>) {
    const { errore } = await admin('admin_salva_giocatore', { giocatore_id: g.id, campi })
    setErrore(errore)
  }

  async function caricaFoto(file: File | undefined) {
    if (!file) return
    setCarico(true)
    try {
      setErrore(await inviaFoto(g.id, await preparaFoto(file)))
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setCarico(false)
  }

  async function togliFoto() {
    if (!g.foto_path || !confirm('Togliere la foto?')) return
    setErrore(await inviaFoto(g.id, null))
  }

  async function elimina() {
    if (!confirm(`Eliminare ${g.nome}?`)) return
    const { errore } = await admin('admin_elimina_giocatore', { giocatore_id: g.id })
    if (errore) setErrore(errore)
    else onChiudi()
  }

  return (
    <Foglio titolo={g.nome} onChiudi={onChiudi}>
      <div className="scheda-giocatore">
        <div className="foto-blocco">
          <Avatar giocatore={g} size={96} />
          <div className="colonna-bottoni">
            <label className="btn btn-piccolo">
              {carico ? 'Caricamento…' : g.foto_path ? 'Cambia foto' : 'Carica foto'}
              <input type="file" accept="image/*" hidden onChange={(e) => caricaFoto(e.target.files?.[0])} />
            </label>
            {g.foto_path && (
              <button className="btn btn-piccolo" onClick={togliFoto}>
                Togli foto
              </button>
            )}
          </div>
        </div>
        <p className="nota">Carica la foto solo se la persona ha firmato il consenso.</p>
        <Link to={`/giocatore/${g.id}`} className="btn btn-pieno">
          Apri profilo e modifica carta (abilità, soprannome)
        </Link>

        <label className="campo">
          <span>Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} onBlur={() => nome.trim() && nome !== g.nome && salva({ nome: nome.trim() })} />
        </label>
        <label className="campo">
          <span>Numero maglia</span>
          <input
            inputMode="numeric"
            value={numero}
            onChange={(e) => setNumero(e.target.value.replace(/\D/g, '').slice(0, 2))}
            onBlur={() => salva({ numero: numero ? Number(numero) : null })}
          />
        </label>
        <label className="campo">
          <span>Fascia (visibile solo agli organizzatori)</span>
          <select value={g.fascia} onChange={(e) => salva({ fascia: e.target.value as Fascia })}>
            {FASCE.map((f) => (
              <option key={f}>{f}</option>
            ))}
          </select>
        </label>
        <label className="campo">
          <span>Squadra</span>
          <select value={g.squadra_id ?? ''} onChange={(e) => salva({ squadra_id: e.target.value || null })}>
            <option value="">— Nell’urna —</option>
            {squadre.map((s) => (
              <option key={s.id} value={s.id}>
                {s.nome}
              </option>
            ))}
          </select>
        </label>
        {errore && <p className="errore">{errore}</p>}
        <button className="btn btn-pericolo btn-piccolo" onClick={elimina}>
          Elimina giocatore
        </button>
      </div>
    </Foglio>
  )
}
