import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useTorneo } from '../lib/torneo'
import { calcolaClassifica, segnaposto, vincitore } from '../lib/calc'
import { Logo, Sezione } from '../components/ui'
import type { Partita } from '../lib/types'

export default function Classifica() {
  const { squadre, partite } = useTorneo()
  const righe = useMemo(() => calcolaClassifica(squadre, partite), [squadre, partite])
  const sf1 = partite.find((p) => p.fase === 'semifinale' && p.giornata === 1)
  const sf2 = partite.find((p) => p.fase === 'semifinale' && p.giornata === 2)
  const fin = partite.find((p) => p.fase === 'finale')
  const campione = fin ? vincitore(fin) : null

  return (
    <div className="pagina">
      <h1 className="titolo-pagina">Classifica</h1>
      <div className="tabella-scroll">
        <table className="classifica">
          <thead>
            <tr>
              <th className="sx" colSpan={2}>
                Squadra
              </th>
              <th>G</th>
              <th>V</th>
              <th>N</th>
              <th>P</th>
              <th>GF</th>
              <th>GS</th>
              <th>DR</th>
              <th>PT</th>
            </tr>
          </thead>
          <tbody>
            {righe.map((r, i) => (
              <tr key={r.squadra.id} className={i < 4 ? 'zona' : ''} style={{ ['--colore' as string]: r.squadra.colore }}>
                <td className="pos">{i + 1}</td>
                <td className="sx">
                  <Link to={`/squadre/${r.squadra.id}`} className="cella-squadra">
                    <Logo squadra={r.squadra} size={26} />
                    {r.squadra.nome}
                  </Link>
                </td>
                <td>{r.giocate}</td>
                <td>{r.vinte}</td>
                <td>{r.pareggiate}</td>
                <td>{r.perse}</td>
                <td>{r.golFatti}</td>
                <td>{r.golSubiti}</td>
                <td>{r.diffReti > 0 ? '+' + r.diffReti : r.diffReti}</td>
                <td className="pt">{r.punti}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="nota">
        Le prime 4 vanno in semifinale (1ª-4ª, 2ª-3ª). A parità di punti contano differenza reti, poi gol fatti.
      </p>

      <Sezione titolo="Fase finale">
        <div className="tabellone-finale">
          <div className="colonna">
            {sf1 && <Accoppiamento p={sf1} titolo="Semifinale 1" />}
            {sf2 && <Accoppiamento p={sf2} titolo="Semifinale 2" />}
          </div>
          <div className="colonna centro">{fin && <Accoppiamento p={fin} titolo="Finale" />}</div>
        </div>
        {campione && <Campione id={campione} />}
        {!sf1 && <div className="vuoto">Il tabellone comparirà con il calendario</div>}
      </Sezione>
    </div>
  )
}

function Accoppiamento({ p, titolo }: { p: Partita; titolo: string }) {
  const { squadra } = useTorneo()
  const v = vincitore(p)
  const lati = [
    { s: squadra(p.casa_id), gol: p.gol_casa, rig: p.rigori_casa, lato: 'casa' as const, id: p.casa_id },
    { s: squadra(p.ospite_id), gol: p.gol_ospite, rig: p.rigori_ospite, lato: 'ospite' as const, id: p.ospite_id },
  ]
  return (
    <Link to={`/partita/${p.id}`} className="accoppiamento">
      <span className="acc-titolo">{titolo}</span>
      {lati.map((l) => (
        <div key={l.lato} className={'acc-riga' + (v && v !== l.id ? ' perde' : '') + (v && v === l.id ? ' vince' : '')}>
          <Logo squadra={l.s} size={22} />
          <span className="nome">{l.s?.nome ?? segnaposto(p, l.lato)}</span>
          {p.stato !== 'programmata' && (
            <span className="gol">
              {l.gol}
              {l.rig != null && <small>({l.rig})</small>}
            </span>
          )}
        </div>
      ))}
    </Link>
  )
}

function Campione({ id }: { id: string }) {
  const { squadra } = useTorneo()
  const s = squadra(id)
  if (!s) return null
  return (
    <div className="campione" style={{ ['--colore' as string]: s.colore }}>
      <span className="coppa">🏆</span>
      <Logo squadra={s} size={64} />
      <div>
        <p className="sopratitolo">Campioni 2026</p>
        <h2>{s.nome}</h2>
      </div>
    </div>
  )
}
