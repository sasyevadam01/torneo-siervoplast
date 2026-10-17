import { Link } from 'react-router-dom'
import { useMemo } from 'react'
import { useTorneo } from '../lib/torneo'
import { calcolaClassifica, calcolaStatistiche, ordinaPartite } from '../lib/calc'
import { Avatar, Logo, RigaPartita, Sezione, Vuoto } from '../components/ui'

export default function Home() {
  const { impostazioni, squadre, giocatori, partite, eventi, squadra, organizzatore } = useTorneo()

  const live = partite.filter((p) => p.stato === 'in_corso').sort(ordinaPartite)
  const prossime = partite
    .filter((p) => p.stato === 'programmata')
    .sort((a, b) => (a.data_ora ?? '9').localeCompare(b.data_ora ?? '9') || ordinaPartite(a, b))
    .slice(0, 3)
  const ultime = partite
    .filter((p) => p.stato === 'finita')
    .sort((a, b) => (b.finita_at ?? '').localeCompare(a.finita_at ?? ''))
    .slice(0, 3)
  const classifica = useMemo(() => calcolaClassifica(squadre, partite), [squadre, partite])
  const bomber = useMemo(
    () =>
      calcolaStatistiche(giocatori, eventi, partite)
        .filter((s) => s.gol > 0)
        .sort((a, b) => b.gol - a.gol || a.giocatore.nome.localeCompare(b.giocatore.nome))
        .slice(0, 3),
    [giocatori, eventi, partite],
  )
  const daSorteggiare = giocatori.filter((g) => !g.fisso && !g.squadra_id).length
  const sorteggioInCorso = daSorteggiare > 0 && giocatori.some((g) => !g.fisso && g.squadra_id)

  return (
    <div className="pagina">
      <header className="testata-home">
        <img src={import.meta.env.BASE_URL + 'icon-192.png'} alt="" />
        <div>
          <p className="sopratitolo">Siervoplast</p>
          <h1>{impostazioni?.nome_torneo ?? 'Torneo'}</h1>
        </div>
        {organizzatore && (
          <Link to="/admin" className="btn btn-piccolo">
            Gestisci
          </Link>
        )}
      </header>

      {impostazioni?.avviso && <div className="avviso">📣 {impostazioni.avviso}</div>}

      {(daSorteggiare > 0 || partite.length === 0) && (
        <Link to="/sorteggio" className="card-sorteggio">
          <div>
            <p className="sopratitolo">{sorteggioInCorso ? 'In corso' : daSorteggiare > 0 ? 'Prossimamente' : 'Completato'}</p>
            <h2>Sorteggio delle squadre</h2>
            <p className="testo-tenue">
              {daSorteggiare > 0 ? `${daSorteggiare} giocatori ancora nell'urna` : 'Tutte le rose sono state formate'}
            </p>
          </div>
          <span className="freccia">→</span>
        </Link>
      )}

      {live.length > 0 && (
        <Sezione titolo="In diretta">
          <div className="lista">
            {live.map((p) => (
              <RigaPartita key={p.id} p={p} mostraFase />
            ))}
          </div>
        </Sezione>
      )}

      <Sezione titolo="Prossime partite" azione={<Link to="/partite">Calendario</Link>}>
        {prossime.length ? (
          <div className="lista">
            {prossime.map((p) => (
              <RigaPartita key={p.id} p={p} mostraFase />
            ))}
          </div>
        ) : (
          <Vuoto>{partite.length ? 'Nessuna partita in programma' : 'Il calendario verrà pubblicato dopo il sorteggio'}</Vuoto>
        )}
      </Sezione>

      {ultime.length > 0 && (
        <Sezione titolo="Ultimi risultati">
          <div className="lista">
            {ultime.map((p) => (
              <RigaPartita key={p.id} p={p} mostraFase />
            ))}
          </div>
        </Sezione>
      )}

      <Sezione titolo="Classifica" azione={<Link to="/classifica">Completa</Link>}>
        <div className="mini-classifica">
          {classifica.map((r, i) => (
            <Link to={`/squadre/${r.squadra.id}`} key={r.squadra.id} className={'mini-riga' + (i < 4 ? ' zona' : '')}>
              <span className="pos">{i + 1}</span>
              <Logo squadra={r.squadra} size={26} />
              <span className="nome">{r.squadra.nome}</span>
              <span className="g">{r.giocate} G</span>
              <span className="pt">{r.punti}</span>
            </Link>
          ))}
        </div>
      </Sezione>

      {bomber.length > 0 && (
        <Sezione titolo="Capocannonieri" azione={<Link to="/statistiche">Tutte le stats</Link>}>
          <div className="podio">
            {bomber.map((s, i) => (
              <div key={s.giocatore.id} className={'podio-voce p' + (i + 1)}>
                <Avatar giocatore={s.giocatore} size={i === 0 ? 64 : 52} />
                <strong>{s.giocatore.nome}</strong>
                <span className="testo-tenue">{squadra(s.giocatore.squadra_id)?.nome}</span>
                <span className="podio-valore">{s.gol}</span>
              </div>
            ))}
          </div>
        </Sezione>
      )}

      {!organizzatore && (
        <Link to="/admin" className="link-discreto">
          Area organizzatori
        </Link>
      )}
    </div>
  )
}
