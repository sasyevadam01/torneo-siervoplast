import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { useTorneo } from '../lib/torneo'

const VOCI = [
  { a: '/', etichetta: 'Home', icona: <path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /> },
  { a: '/partite', etichetta: 'Partite', icona: <path d="M4 6h16M4 12h16M4 18h10" /> },
  {
    a: '/classifica',
    etichetta: 'Classifica',
    icona: <path d="M5 21V10m7 11V4m7 17v-7" />,
  },
  {
    a: '/statistiche',
    etichetta: 'Stats',
    icona: (
      <>
        <circle cx="12" cy="12" r="8" />
        <path d="m12 8 3 2.2-1.2 3.6h-3.6L9 10.2z" />
      </>
    ),
  },
  {
    a: '/squadre',
    etichetta: 'Squadre',
    icona: <path d="M12 3 4 6v6c0 4.5 3.4 7.8 8 9 4.6-1.2 8-4.5 8-9V6z" />,
  },
]

export default function Layout() {
  const { errore } = useTorneo()
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="app">
      {errore && <div className="banner-errore">{errore}</div>}
      <main className="contenuto">
        <Outlet />
      </main>
      <nav className="barra-nav">
        {VOCI.map((v) => (
          <NavLink key={v.a} to={v.a} end={v.a === '/'} className="voce-nav">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {v.icona}
            </svg>
            <span>{v.etichetta}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
