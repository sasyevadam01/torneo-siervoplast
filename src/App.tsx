import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import { TorneoProvider, useTorneo } from './lib/torneo'
import Layout from './components/Layout'
import { Caricamento } from './components/ui'
import Accesso from './pages/Accesso'
import Home from './pages/Home'
import Partite from './pages/Partite'
import PartitaDettaglio from './pages/PartitaDettaglio'
import Classifica from './pages/Classifica'
import Statistiche from './pages/Statistiche'
import Squadre from './pages/Squadre'
import SquadraDettaglio from './pages/SquadraDettaglio'
import Sorteggio from './pages/Sorteggio'
import LoginOrganizzatore from './pages/admin/Login'
import Pannello from './pages/admin/Pannello'
import GestionePartita from './pages/admin/GestionePartita'

function Rotte() {
  const { stato, organizzatore } = useTorneo()
  if (stato === 'caricamento') return <Caricamento />
  if (stato === 'fuori') return <Accesso />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="partite" element={<Partite />} />
        <Route path="partita/:id" element={<PartitaDettaglio />} />
        <Route path="classifica" element={<Classifica />} />
        <Route path="statistiche" element={<Statistiche />} />
        <Route path="squadre" element={<Squadre />} />
        <Route path="squadre/:id" element={<SquadraDettaglio />} />
        <Route path="admin" element={organizzatore ? <Pannello /> : <LoginOrganizzatore />} />
        <Route path="admin/partita/:id" element={organizzatore ? <GestionePartita /> : <Navigate to="/admin" replace />} />
      </Route>
      <Route path="sorteggio" element={<Sorteggio />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <TorneoProvider>
      <HashRouter>
        <Rotte />
      </HashRouter>
    </TorneoProvider>
  )
}
