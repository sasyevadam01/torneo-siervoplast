import { useState } from 'react'
import { useTorneo } from '../lib/torneo'
import { etichetteAbilita, RUOLI } from '../lib/calc'
import { preparaFoto } from '../lib/immagini'
import { messaggioErrore } from '../lib/supabase'
import { Foglio } from './ui'
import Carta from './Carta'
import type { Giocatore, Ruolo } from '../lib/types'

const BASE = [60, 60, 60, 60, 60, 60]

export default function EditorCarta({ g, onChiudi }: { g: Giocatore; onChiudi: () => void }) {
  const { admin, caricaFoto } = useTorneo()
  const [soprannome, setSoprannome] = useState(g.soprannome ?? '')
  const [ruolo, setRuolo] = useState<Ruolo | ''>(g.ruolo ?? '')
  const [abilita, setAbilita] = useState<number[]>(g.abilita ?? BASE)
  const [conAbilita, setConAbilita] = useState(!!g.abilita)
  const [errore, setErrore] = useState<string | null>(null)
  const [occupato, setOccupato] = useState(false)

  const bozza: Giocatore = {
    ...g,
    soprannome: soprannome.trim() || null,
    ruolo: ruolo || null,
    abilita: conAbilita ? abilita : null,
  }
  const etichette = etichetteAbilita(bozza.ruolo)

  function imposta(i: number, valore: number) {
    const v = Math.max(1, Math.min(99, Math.round(valore || 1)))
    setAbilita((a) => a.map((x, k) => (k === i ? v : x)))
    setConAbilita(true)
  }

  async function salva() {
    setOccupato(true)
    const { errore: e } = await admin('admin_salva_giocatore', {
      giocatore_id: g.id,
      campi: { soprannome: bozza.soprannome, ruolo: bozza.ruolo, abilita: bozza.abilita },
    })
    setOccupato(false)
    if (e) setErrore(e)
    else onChiudi()
  }

  async function nuovaImmagine(file: File | undefined) {
    if (!file) return
    setOccupato(true)
    try {
      setErrore(await caricaFoto(g.id, await preparaFoto(file)))
    } catch (e) {
      setErrore(messaggioErrore(e))
    }
    setOccupato(false)
  }

  return (
    <Foglio titolo="Modifica carta" onChiudi={onChiudi}>
      <div className="editor-carta">
        <div className="anteprima">
          <Carta g={bozza} larghezza={190} />
        </div>

        <label className="btn btn-pieno" style={{ marginTop: 0 }}>
          {occupato ? 'Attendi…' : g.foto_path ? 'Cambia immagine' : 'Carica immagine (meglio con sfondo trasparente)'}
          <input type="file" accept="image/png,image/webp,image/jpeg" hidden onChange={(e) => nuovaImmagine(e.target.files?.[0])} />
        </label>

        <div className="riga-due">
          <label className="campo">
            <span>Soprannome</span>
            <input value={soprannome} maxLength={30} onChange={(e) => setSoprannome(e.target.value)} placeholder="es. El Mago" />
          </label>
          <label className="campo">
            <span>Ruolo</span>
            <select value={ruolo} onChange={(e) => setRuolo(e.target.value as Ruolo | '')}>
              <option value="">—</option>
              {Object.entries(RUOLI).map(([k, nome]) => (
                <option key={k} value={k}>
                  {nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="nota">Abilità da 1 a 99. La valutazione sulla carta è la media; da 75 la carta è oro, da 65 argento, sotto bronzo.</p>
        {etichette.map(([sigla, nome], i) => (
          <div key={sigla + i} className="cursore">
            <span>{nome}</span>
            <input type="range" min={1} max={99} value={abilita[i]} onChange={(e) => imposta(i, Number(e.target.value))} aria-label={nome} />
            <input type="number" min={1} max={99} inputMode="numeric" value={abilita[i]} onChange={(e) => imposta(i, Number(e.target.value))} aria-label={nome} />
          </div>
        ))}
        {conAbilita && (
          <button className="btn btn-piccolo" onClick={() => setConAbilita(false)}>
            Togli le abilità (carta senza valutazione)
          </button>
        )}

        {errore && <p className="errore">{errore}</p>}
        <button className="btn btn-primario btn-pieno" onClick={salva} disabled={occupato}>
          Salva carta
        </button>
      </div>
    </Foglio>
  )
}
