import { useTorneo } from '../lib/torneo'
import { etichetteAbilita, livelloCarta, valutazione } from '../lib/calc'
import type { Giocatore } from '../lib/types'

// Carta del giocatore in stile figurina: valutazione, ruolo, squadra, ritratto e 6 abilità.
// Tutte le misure interne sono in "cqw" (percentuali della larghezza della carta),
// così la stessa carta funziona grande nel profilo e piccola nell'album.
export default function Carta({ g, larghezza = 280 }: { g: Giocatore; larghezza?: number }) {
  const { squadra, fotoUrl } = useTorneo()
  const s = squadra(g.squadra_id)
  const v = valutazione(g.abilita)
  const etichette = etichetteAbilita(g.ruolo)
  const url = fotoUrl(g)

  return (
    <div
      className={'carta livello-' + livelloCarta(v)}
      style={{ width: larghezza, ['--colore' as string]: s?.colore ?? '#3a4440' }}
      role="img"
      aria-label={`Carta di ${g.nome}${v != null ? `, valutazione ${v}` : ''}`}
    >
      <div className="carta-bordo">
        <div className="carta-interno">
          <div className="carta-valore">
            <b>{v ?? '–'}</b>
            <span>{g.ruolo ?? '—'}</span>
            {s?.logo && <img src={import.meta.env.BASE_URL + s.logo} alt="" className="carta-logo" />}
            {g.numero != null && <span className="carta-numero">#{g.numero}</span>}
          </div>
          <div className="carta-ritratto">{url ? <img src={url} alt="" /> : <Sagoma />}</div>
          <div className="carta-nome">{g.nome}</div>
          <div className="carta-soprannome">{g.soprannome ? `“${g.soprannome}”` : ' '}</div>
          <div className="carta-abilita">
            {etichette.map(([sigla, nome], i) => (
              <div key={sigla + i} title={nome}>
                <b>{g.abilita?.[i] ?? '–'}</b>
                <span>{sigla}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function Sagoma() {
  return (
    <svg viewBox="0 0 100 100" className="sagoma" aria-hidden="true">
      <circle cx="50" cy="34" r="19" />
      <path d="M12 100c2-24 18-38 38-38s36 14 38 38z" />
    </svg>
  )
}
