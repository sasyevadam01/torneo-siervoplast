import { Link } from 'react-router-dom'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTorneo } from '../lib/torneo'
import { NOME_URNA } from '../lib/calc'
import { Avatar, Logo } from '../components/ui'
import type { Estrazione } from '../lib/types'

const DURATA_MESCOLA = 2600

export default function Sorteggio() {
  const { squadre, giocatori, sorteggio, giocatore, squadra, organizzatore, admin } = useTorneo()
  const org = !!organizzatore
  const [rivelazione, setRivelazione] = useState<{ e: Estrazione; fase: 'mescola' | 'svela' } | null>(null)
  const [attesa, setAttesa] = useState(false)
  const [errore, setErrore] = useState<string | null>(null)
  const ultimoVisto = useRef<number | null>(null)

  // Una nuova estrazione (arrivata in tempo reale) fa partire l'animazione su tutti i telefoni
  useEffect(() => {
    const ultima = sorteggio[sorteggio.length - 1]
    if (ultimoVisto.current === null) {
      ultimoVisto.current = ultima?.id ?? 0
      return
    }
    if (ultima && ultima.id > ultimoVisto.current) {
      ultimoVisto.current = ultima.id
      setRivelazione({ e: ultima, fase: 'mescola' })
    } else if (!ultima) {
      ultimoVisto.current = 0
    }
  }, [sorteggio])

  useEffect(() => {
    if (!rivelazione) return
    const t =
      rivelazione.fase === 'mescola'
        ? window.setTimeout(() => setRivelazione({ ...rivelazione, fase: 'svela' }), DURATA_MESCOLA)
        : window.setTimeout(() => setRivelazione(null), 7000)
    return () => window.clearTimeout(t)
  }, [rivelazione])

  const estrai = useCallback(async () => {
    if (attesa || rivelazione) return
    setAttesa(true)
    setErrore(null)
    const { errore } = await admin('estrai_giocatore')
    setErrore(errore)
    setAttesa(false)
  }, [attesa, rivelazione, admin])

  async function azzera() {
    if (!confirm('Rimettere tutti i giocatori nell’urna? Le rose sorteggiate verranno cancellate.')) return
    const { errore } = await admin('azzera_sorteggio')
    setErrore(errore)
  }

  // barra spaziatrice = estrai (comodo col proiettore)
  useEffect(() => {
    if (!org) return
    const tasto = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault()
        if (rivelazione?.fase === 'svela') setRivelazione(null)
        else estrai()
      }
    }
    window.addEventListener('keydown', tasto)
    return () => window.removeEventListener('keydown', tasto)
  }, [org, estrai, rivelazione])

  const interne = squadre.filter((s) => !s.esterna)
  const esterne = squadre.filter((s) => s.esterna)
  const nascosto = rivelazione?.fase === 'mescola' ? rivelazione.e.id : null
  const nellUrna = giocatori.filter((g) => !g.fisso && !g.squadra_id)
  const perUrna = ['A', 'B', 'C', 'D'].map((f) => ({ f, n: nellUrna.filter((g) => g.fascia === f).length }))
  const urnaCorrente = perUrna.find((u) => u.n > 0)?.f

  return (
    <div className="sorteggio">
      <header className="sorteggio-testa">
        <Link to="/">← Home</Link>
        <h1>Sorteggio squadre</h1>
        <span className="contatore">{nellUrna.length} nell’urna</span>
      </header>

      <div className="urne">
        {perUrna.map((u) => (
          <div key={u.f} className={'urna' + (u.f === urnaCorrente ? ' attiva' : '') + (u.n === 0 ? ' vuota' : '')}>
            <span>{NOME_URNA[u.f]}</span>
            <b>{u.n}</b>
          </div>
        ))}
      </div>

      {org && (
        <div className="regia">
          <button className="btn btn-primario btn-grande" onClick={estrai} disabled={attesa || !!rivelazione || nellUrna.length === 0}>
            {nellUrna.length === 0 ? 'Sorteggio completato' : attesa ? 'Estrazione…' : '🎲 Estrai il prossimo'}
          </button>
          <button className="btn btn-piccolo btn-pericolo" onClick={azzera}>
            Azzera
          </button>
          {errore && <p className="errore">{errore}</p>}
          <p className="nota">Suggerimento: col PC collegato al proiettore puoi premere la barra spaziatrice.</p>
        </div>
      )}

      <div className="tavolo">
        {interne.map((s) => {
          const estratti = sorteggio.filter((e) => e.squadra_id === s.id && e.id !== nascosto)
          const ultimoId = sorteggio[sorteggio.length - 1]?.id
          return (
            <div key={s.id} className="tavolo-squadra" style={{ ['--colore' as string]: s.colore }}>
              <div className="tavolo-testa">
                <Logo squadra={s} size={40} />
                <strong>{s.nome}</strong>
                <span>{estratti.length}</span>
              </div>
              <ul>
                {estratti.map((e) => {
                  const g = giocatore(e.giocatore_id)
                  return (
                    <li key={e.id} className={e.id === ultimoId && !nascosto ? 'nuovo' : ''}>
                      <Avatar giocatore={g} size={28} />
                      <span>{g?.nome}</span>
                    </li>
                  )
                })}
              </ul>
            </div>
          )
        })}
        {esterne.map((s) => (
          <div key={s.id} className="tavolo-squadra esterna" style={{ ['--colore' as string]: s.colore }}>
            <div className="tavolo-testa">
              <Logo squadra={s} size={40} />
              <strong>{s.nome}</strong>
              <span>ospiti</span>
            </div>
            <ul>
              {giocatori
                .filter((g) => g.squadra_id === s.id)
                .map((g) => (
                  <li key={g.id}>
                    <Avatar giocatore={g} size={28} />
                    <span>{g.nome}</span>
                  </li>
                ))}
            </ul>
          </div>
        ))}
      </div>

      {rivelazione && (
        <Rivelazione
          key={rivelazione.e.id}
          fase={rivelazione.fase}
          e={rivelazione.e}
          nomi={giocatori
            .filter(
              (g) =>
                g.fascia === giocatore(rivelazione.e.giocatore_id)?.fascia &&
                (!g.squadra_id || g.id === rivelazione.e.giocatore_id),
            )
            .map((g) => g.nome)}
          onChiudi={() => rivelazione.fase === 'svela' && setRivelazione(null)}
          squadraNome={squadra(rivelazione.e.squadra_id)?.nome ?? ''}
        />
      )}
    </div>
  )
}

function Rivelazione({
  e,
  fase,
  nomi,
  onChiudi,
  squadraNome,
}: {
  e: Estrazione
  fase: 'mescola' | 'svela'
  nomi: string[]
  onChiudi: () => void
  squadraNome: string
}) {
  const { giocatore, squadra } = useTorneo()
  const g = giocatore(e.giocatore_id)
  const s = squadra(e.squadra_id)
  const [nomeMostrato, setNomeMostrato] = useState(nomi[0] ?? '')

  useEffect(() => {
    if (fase !== 'mescola' || nomi.length === 0) return
    const t = window.setInterval(() => setNomeMostrato(nomi[Math.floor(Math.random() * nomi.length)]), 85)
    return () => window.clearInterval(t)
  }, [fase, nomi])

  const coriandoli = useMemo(
    () =>
      Array.from({ length: 48 }, (_, i) => ({
        left: Math.random() * 100,
        delay: Math.random() * 0.4,
        dur: 1.6 + Math.random() * 1.4,
        rot: Math.random() * 360,
        bianco: i % 3 === 0,
      })),
    [],
  )

  return (
    <div className={'rivelazione fase-' + fase} style={{ ['--colore' as string]: s?.colore ?? '#fff' }} onClick={onChiudi}>
      {fase === 'mescola' ? (
        <div className="mescola">
          <p className="sopratitolo">Estrazione in corso…</p>
          <div className="rullo">{nomeMostrato}</div>
        </div>
      ) : (
        <>
          <div className="coriandoli">
            {coriandoli.map((c, i) => (
              <i
                key={i}
                style={{
                  left: c.left + '%',
                  animationDelay: c.delay + 's',
                  animationDuration: c.dur + 's',
                  transform: `rotate(${c.rot}deg)`,
                  background: c.bianco ? '#fff' : 'var(--colore)',
                }}
              />
            ))}
          </div>
          <div className="svela">
            <Logo squadra={s} size={150} />
            <Avatar giocatore={g} size={110} />
            <h2>{g?.nome}</h2>
            <p>
              va ai <b>{squadraNome}</b>
            </p>
            <span className="nota">tocca per continuare</span>
          </div>
        </>
      )}
    </div>
  )
}
