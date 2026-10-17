import { Link, useParams } from 'react-router-dom'
import { useTorneo } from '../lib/torneo'
import { formatGiorno, formatOra, segnaposto, titoloPartita } from '../lib/calc'
import { Avatar, BadgeLive, Logo, Sezione, Vuoto } from '../components/ui'
import Cronaca from '../components/Cronaca'
import type { Partita, Squadra } from '../lib/types'

export default function PartitaDettaglio() {
  const { id } = useParams()
  const { partite, squadra, giocatore, organizzatore } = useTorneo()
  const p = partite.find((x) => x.id === id)
  if (!p) return <Vuoto>Partita non trovata</Vuoto>
  const casa = squadra(p.casa_id)
  const osp = squadra(p.ospite_id)
  const mvp = giocatore(p.mvp_id)

  return (
    <div className="pagina">
      <div className="barra-indietro">
        <Link to="/partite">← Calendario</Link>
        {organizzatore && (
          <Link to={`/admin/partita/${p.id}`} className="btn btn-piccolo">
            Gestisci
          </Link>
        )}
      </div>

      <div className="tabellone" style={{ ['--c1' as string]: casa?.colore ?? '#333', ['--c2' as string]: osp?.colore ?? '#333' }}>
        <p className="tabellone-fase">
          {titoloPartita(p)} · {formatGiorno(p.data_ora)} {p.data_ora ? formatOra(p.data_ora) : ''}
          {p.campo ? ` · ${p.campo}` : ''}
        </p>
        <div className="tabellone-corpo">
          <SquadraTabellone squadra={casa} p={p} lato="casa" />
          <div className="tabellone-risultato">
            {p.stato === 'programmata' ? (
              <span className="vs">VS</span>
            ) : (
              <span className="grande">
                {p.gol_casa} <i>-</i> {p.gol_ospite}
              </span>
            )}
            {p.rigori_casa != null && p.rigori_ospite != null && (
              <span className="rigori">
                Rigori {p.rigori_casa}-{p.rigori_ospite}
              </span>
            )}
            {p.stato === 'in_corso' && <BadgeLive />}
            {p.stato === 'finita' && <span className="stato-fine">Terminata</span>}
          </div>
          <SquadraTabellone squadra={osp} p={p} lato="ospite" />
        </div>
      </div>

      {mvp && (
        <Link to={`/giocatore/${mvp.id}`} className="mvp-card">
          <Avatar giocatore={mvp} size={48} />
          <div>
            <p className="sopratitolo">Migliore in campo</p>
            <strong>{mvp.nome}</strong>
          </div>
          <span className="mvp-stella">★</span>
        </Link>
      )}

      <Sezione titolo="Cronaca">
        <Cronaca partita={p} />
      </Sezione>

      {casa && osp && (
        <Sezione titolo="Rose">
          <div className="rose">
            <Rosa squadra={casa} />
            <Rosa squadra={osp} />
          </div>
        </Sezione>
      )}
    </div>
  )
}

function SquadraTabellone({ squadra, p, lato }: { squadra?: Squadra; p: Partita; lato: 'casa' | 'ospite' }) {
  const contenuto = (
    <>
      <Logo squadra={squadra} size={72} />
      <span>{squadra?.nome ?? segnaposto(p, lato)}</span>
    </>
  )
  return squadra ? (
    <Link to={`/squadre/${squadra.id}`} className="tabellone-squadra">
      {contenuto}
    </Link>
  ) : (
    <div className="tabellone-squadra">{contenuto}</div>
  )
}

function Rosa({ squadra }: { squadra: Squadra }) {
  const { giocatori } = useTorneo()
  return (
    <div className="rosa" style={{ ['--colore' as string]: squadra.colore }}>
      <h3>{squadra.nome}</h3>
      <ul>
        {giocatori
          .filter((g) => g.squadra_id === squadra.id)
          .map((g) => (
            <li key={g.id}>
              <Link to={`/giocatore/${g.id}`} className="link-giocatore" style={{ display: 'contents' }}>
                <Avatar giocatore={g} size={26} />
                <span>
                  {g.numero != null && <b>{g.numero}</b>} {g.nome}
                </span>
              </Link>
            </li>
          ))}
      </ul>
    </div>
  )
}
