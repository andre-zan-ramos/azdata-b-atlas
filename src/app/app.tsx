import { Link, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router'
import { useState } from 'react'
import { AreaModeHeaderContext } from '../components/area-mode-switcher'
import { HomePage } from '../pages/home-page'
import { NotFoundPage } from '../pages/not-found-page'
import { EstablishmentsPage } from '../pages/establishments-page'
import { EstablishmentDetailPage } from '../pages/establishment-detail-page'
import { CompanyDetailPage } from '../pages/company-detail-page'
import { PartnersPage } from '../pages/partners-page'
import { PartnerDetailPage } from '../pages/partner-detail-page'
import { CnoSearchPage } from '../pages/cno-search-page'
import { CnoDetailPage } from '../pages/cno-detail-page'

function AppShell() {
  const [modeHeader, setModeHeader] = useState<HTMLDivElement | null>(null)
  return (
    <AreaModeHeaderContext.Provider value={modeHeader}><div className="app-shell">
      <a className="skip-link" href="#main">Pular para o conteúdo</a>
      <header className="app-header">
        <Link className="brand" to="/" aria-label="B-Atlas — página inicial">
          <span className="brand-mark" aria-hidden="true">B.</span>
          <span><strong>B-Atlas</strong><small>Business Atlas</small></span>
        </Link>
        <div className="header-mode" ref={setModeHeader} />
        <nav aria-label="Navegação principal">
          <NavLink to="/" end>Início</NavLink>
          <NavLink to="/receita-federal/cnpj" end>Empresas</NavLink>
          <NavLink to="/receita-federal/cnpj/socios">Sócios</NavLink>
          <NavLink to="/receita-federal/cno">Obras</NavLink>
        </nav>
      </header>
      <main id="main" tabIndex={-1}><Outlet /><footer className="app-footer"><span>B-Atlas</span><span>Business Atlas</span></footer></main>
    </div></AreaModeHeaderContext.Provider>
  )
}

export function legacyCnoLinksTarget(search: string) {
  const current = new URLSearchParams(search)
  const next = new URLSearchParams()
  next.set('modo', 'mapa')
  for (const key of ['cno', 'ni_responsavel', 'return_to']) for (const value of current.getAll(key)) next.append(key, value)
  return `/receita-federal/cno?${next.toString()}`
}

function LegacyCnoLinksRedirect() {
  const location = useLocation()
  return <Navigate to={legacyCnoLinksTarget(location.search)} replace />
}

export function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="receita-federal/cnpj" element={<EstablishmentsPage />} />
        <Route path="receita-federal/cnpj/estabelecimentos" element={<Navigate to="/receita-federal/cnpj" replace />} />
        <Route path="receita-federal/cnpj/estabelecimentos/:cnpj" element={<EstablishmentDetailPage />} />
        <Route path="receita-federal/cnpj/empresas" element={<Navigate to="/receita-federal/cnpj" replace />} />
        <Route path="receita-federal/cnpj/empresas/:cnpjBasico" element={<CompanyDetailPage />} />
        <Route path="receita-federal/cnpj/socios" element={<PartnersPage />} />
        <Route path="receita-federal/cnpj/socios/detalhes" element={<PartnerDetailPage />} />
        <Route path="receita-federal/cno" element={<CnoSearchPage key="obras" />} />
        <Route path="receita-federal/cno/vinculos" element={<LegacyCnoLinksRedirect />} />
        <Route path="receita-federal/cno/obras/:id" element={<CnoDetailPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
