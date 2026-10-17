import { useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useTorneo } from '../lib/torneo'
import { formatGiorno, formatOra, iniziali, segnaposto, titoloPartita } from '../lib/calc'
import type { Giocatore, Partita, Squadra } from '../lib/types'

export function Logo({ squadra, size = 40 }: { squadra?: Squadra; size?: number }) {
  if (!squadra?.logo) {
    return (
      <span className="logo logo-vuoto" style={{ width: size, height: size }}>
        ?
      </span>
    )
  }
  return (
    <img
      className="logo"
      src={import.meta.env.BASE_URL + squadra.logo}
      alt={squadra.nome}
      width={size}
      height={size}
      style={{ width: size, height: size, ['--colore' as string]: squadra.colore }}
      loading="lazy"
    />
  )
}

export function Avatar({ giocatore, size = 40 }: { giocatore?: Giocatore; size?: number }) {
  const { fotoUrl, squadra } = useTorneo()
  const colore = squadra(giocatore?.squadra_id ?? null)?.colore ?? '#3a4440'
  const url = fotoUrl(giocatore)
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.38, ['--colore' as string]: colore }}
    >
      {url ? <img src={url} alt="" /> : giocatore ? iniziali(giocatore.nome) : '?'}
    </span>
  )
}

export function BadgeLive() {
  return (
    <span className="badge-live">
      <span className="pallino" /> LIVE
    </span>
  )
}

export function Punteggio({ p }: { p: Partita }) {
  if (p.stato === 'programmata') return <span className="ora">{formatOra(p.data_ora)}</span>
  return (
    <span className={'punteggio' + (p.stato === 'in_corso' ? ' live' : '')}>
      {p.gol_casa}
      <i>-</i>
      {p.gol_ospite}
      {p.rigori_casa != null && p.rigori_ospite != null && (
        <small>
          rig. {p.rigori_casa}-{p.rigori_ospite}
        </small>
      )}
    </span>
  )
}

// Riga compatta di una partita, usata in Home, Calendario e pagine squadra
export function RigaPartita({ p, mostraFase = false }: { p: Partita; mostraFase?: boolean }) {
  const { squadra } = useTorneo()
  const casa = squadra(p.casa_id)
  const osp = squadra(p.ospite_id)
  const vinceCasa = p.stato === 'finita' && p.gol_casa > p.gol_ospite
  const vinceOsp = p.stato === 'finita' && p.gol_ospite > p.gol_casa
  return (
    <Link to={`/partita/${p.id}`} className={'riga-partita' + (p.stato === 'in_corso' ? ' in-corso' : '')}>
      <div className="riga-partita-meta">
        {p.stato === 'in_corso' ? (
          <BadgeLive />
        ) : (
          <span>
            {mostraFase ? titoloPartita(p) + ' · ' : ''}
            {formatGiorno(p.data_ora)}
            {p.campo ? ' · ' + p.campo : ''}
          </span>
        )}
        {p.stato === 'finita' && <span className="fine">Finale</span>}
      </div>
      <div className="riga-partita-corpo">
        <div className={'lato casa' + (vinceOsp ? ' perde' : '')}>
          <span className="nome">{casa?.nome ?? segnaposto(p, 'casa')}</span>
          <Logo squadra={casa} size={34} />
        </div>
        <Punteggio p={p} />
        <div className={'lato ospite' + (vinceCasa ? ' perde' : '')}>
          <Logo squadra={osp} size={34} />
          <span className="nome">{osp?.nome ?? segnaposto(p, 'ospite')}</span>
        </div>
      </div>
    </Link>
  )
}

export function Sezione({ titolo, azione, children }: { titolo: string; azione?: ReactNode; children: ReactNode }) {
  return (
    <section className="sezione">
      <div className="sezione-testa">
        <h2>{titolo}</h2>
        {azione}
      </div>
      {children}
    </section>
  )
}

export function Vuoto({ children }: { children: ReactNode }) {
  return <div className="vuoto">{children}</div>
}

export function Foglio({ titolo, onChiudi, children }: { titolo: string; onChiudi: () => void; children: ReactNode }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && onChiudi()
    window.addEventListener('keydown', esc)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', esc)
      document.body.style.overflow = ''
    }
  }, [onChiudi])
  return (
    <div className="foglio-sfondo" onClick={onChiudi}>
      <div className="foglio" onClick={(e) => e.stopPropagation()} role="dialog" aria-label={titolo}>
        <div className="foglio-testa">
          <h3>{titolo}</h3>
          <button className="btn-icona" onClick={onChiudi} aria-label="Chiudi">
            ✕
          </button>
        </div>
        <div className="foglio-corpo">{children}</div>
      </div>
    </div>
  )
}

export function Caricamento() {
  return (
    <div className="caricamento">
      <div className="pallone" />
    </div>
  )
}
