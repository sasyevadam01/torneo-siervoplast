import { useMemo, useState } from 'react'
import { useTorneo } from '../lib/torneo'
import { ordinaPartite, titoloPartita } from '../lib/calc'
import { RigaPartita, Vuoto } from '../components/ui'
import type { Partita } from '../lib/types'

export default function Partite() {
  const { partite } = useTorneo()
  const [filtro, setFiltro] = useState<'tutte' | 'girone' | 'finale'>('tutte')

  const gruppi = useMemo(() => {
    const ordinate = [...partite]
      .filter((p) => filtro === 'tutte' || (filtro === 'girone' ? p.fase === 'girone' : p.fase !== 'girone'))
      .sort(ordinaPartite)
    const g: { titolo: string; partite: Partita[] }[] = []
    for (const p of ordinate) {
      const t = p.fase === 'girone' ? titoloPartita(p) : 'Fase finale'
      const ultimo = g[g.length - 1]
      if (ultimo && ultimo.titolo === t) ultimo.partite.push(p)
      else g.push({ titolo: t, partite: [p] })
    }
    return g
  }, [partite, filtro])

  return (
    <div className="pagina">
      <h1 className="titolo-pagina">Calendario</h1>
      <div className="segmenti">
        {(['tutte', 'girone', 'finale'] as const).map((f) => (
          <button key={f} className={filtro === f ? 'attivo' : ''} onClick={() => setFiltro(f)}>
            {f === 'tutte' ? 'Tutte' : f === 'girone' ? 'Girone' : 'Fase finale'}
          </button>
        ))}
      </div>
      {gruppi.length === 0 && <Vuoto>Il calendario non è ancora stato pubblicato</Vuoto>}
      {gruppi.map((g) => (
        <section key={g.titolo} className="sezione">
          <div className="sezione-testa">
            <h2>{g.titolo}</h2>
          </div>
          <div className="lista">
            {g.partite.map((p) => (
              <RigaPartita key={p.id} p={p} mostraFase={p.fase !== 'girone'} />
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
