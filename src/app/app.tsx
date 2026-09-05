import { Link, NavLink, Outlet, Route, Routes } from 'react-router'
import { HomePage } from '../pages/home-page'
import { NotFoundPage } from '../pages/not-found-page'

function AppShell() {
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main">Pular para o conteúdo</a>
      <header className="app-header">
        <Link className="brand" to="/" aria-label="B-Atlas — página inicial">
          <span className="brand-mark" aria-hidden="true">B.</span>
          <span><strong>B-Atlas</strong><small>Business Atlas</small></span>
        </Link>
        <nav aria-label="Navegação principal">
          <NavLink to="/" end>Início</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1}><Outlet /></main>
      <footer className="app-footer"><span>B-Atlas</span><span>Business Atlas</span></footer>
    </div>
  )
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
