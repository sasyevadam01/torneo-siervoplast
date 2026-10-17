import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { useTorneo } from '../../lib/torneo'

// Uno spettatore già dentro può passare al codice personale da organizzatore
export default function LoginOrganizzatore() {
  const { entra } = useTorneo()
  const [codice, setCodice] = useState('')
  const [errore, setErrore] = useState<string | null>(null)
  const [attesa, setAttesa] = useState(false)

  async function invia(e: FormEvent) {
    e.preventDefault()
    setAttesa(true)
    setErrore(await entra(codice))
    setAttesa(false)
  }

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/">← Torneo</Link>
      </div>
      <div className="accesso-scheda" style={{ margin: '40px auto' }}>
        <p className="sopratitolo">Area riservata</p>
        <h1 className="titolo-pagina">Organizzatori</h1>
        <p className="testo-tenue">Inserisci il tuo codice personale per gestire partite, gol, cartellini e sorteggio.</p>
        <form onSubmit={invia} className="accesso-form colonna">
          <input
            value={codice}
            onChange={(e) => setCodice(e.target.value.toUpperCase())}
            placeholder="XXXX-XXXX-XXXX"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            aria-label="Codice organizzatore"
          />
          <button className="btn btn-primario" disabled={attesa}>
            {attesa ? 'Verifica…' : 'Accedi'}
          </button>
        </form>
        {errore && <p className="errore">{errore}</p>}
      </div>
    </div>
  )
}
