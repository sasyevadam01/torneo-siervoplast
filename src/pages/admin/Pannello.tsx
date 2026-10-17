import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTorneo } from '../../lib/torneo'
import TabPartite from './TabPartite'
import TabGiocatori from './TabGiocatori'
import TabTorneo from './TabTorneo'

type Scheda = 'partite' | 'giocatori' | 'torneo'

export default function Pannello() {
  const { organizzatore } = useTorneo()
  const [scheda, setScheda] = useState<Scheda>(() => {
    try {
      return (sessionStorage.getItem('scheda-admin') as Scheda) || 'partite'
    } catch {
      return 'partite'
    }
  })

  function cambia(s: Scheda) {
    setScheda(s)
    try {
      sessionStorage.setItem('scheda-admin', s)
    } catch {
      /* non importa */
    }
  }

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/">← Torneo</Link>
        <span className="testo-tenue">{organizzatore}</span>
      </div>
      <h1 className="titolo-pagina">Pannello organizzatori</h1>
      <div className="segmenti">
        <button className={scheda === 'partite' ? 'attivo' : ''} onClick={() => cambia('partite')}>
          Partite
        </button>
        <button className={scheda === 'giocatori' ? 'attivo' : ''} onClick={() => cambia('giocatori')}>
          Giocatori
        </button>
        <button className={scheda === 'torneo' ? 'attivo' : ''} onClick={() => cambia('torneo')}>
          Torneo
        </button>
      </div>
      {scheda === 'partite' && <TabPartite />}
      {scheda === 'giocatori' && <TabGiocatori />}
      {scheda === 'torneo' && <TabTorneo />}
    </div>
  )
}
