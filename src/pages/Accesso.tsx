import { useState, type FormEvent } from 'react'
import { useTorneo } from '../lib/torneo'

export default function Accesso() {
  const { entra } = useTorneo()
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    if (!codice.trim()) return
    setAttesa(true)
    setErrore(await entra(codice))
    setAttesa(false)
  }

  return (
    <div className="accesso">
      <div className="accesso-scheda">
        <img src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" className="accesso-icona" />
        <p className="sopratitolo">Siervoplast</p>
        <h1>Torneo aziendale 2026</h1>
        <p className="testo-tenue">Risultati in diretta, classifica e marcatori. Inserisci il codice che trovi in bacheca o nel gruppo.</p>
        <form onSubmit={invia} className="accesso-form">
          <input
            value={codice}
            onChange={(e) => setCodice(e.target.value.toUpperCase())}
            placeholder="CODICE TORNEO"
            autoCapitalize="characters"
            autoComplete="off"
            spellCheck={false}
            aria-label="Codice torneo"
          />
          <button className="btn btn-primario" disabled={attesa}>
            {attesa ? 'Verifica…' : 'Entra'}
          </button>
        </form>
        {errore && <p className="errore">{errore}</p>}
        <p className="nota">Organizzatori: inserite qui il vostro codice personale.</p>
      </div>
    </div>
  )
}
