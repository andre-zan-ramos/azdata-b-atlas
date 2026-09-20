import type { ReactNode } from 'react'
import { Link } from 'react-router'

function Icon({ children }: { children: ReactNode }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24">{children}</svg>
}

export function HomePage() {
  return (
    <div className="atlas-home">
      <section className="atlas-hero" aria-labelledby="welcome-title">
        <div className="atlas-hero-copy">
          <p className="eyebrow">DADOS EMPRESARIAIS CONECTADOS</p>
          <h1 id="welcome-title">Um novo olhar sobre<br />os dados empresariais.</h1>
          <p>Explore empresas e participações societárias a partir de dados públicos, preservando a origem e o contexto de cada informação.</p>
          <div className="source-pills" aria-label="Áreas disponíveis na plataforma">
            <span>Cadastro empresarial</span><span>Vínculos societários</span><span>Busca integrada</span>
          </div>
        </div>
        <div className="business-orbit" aria-hidden="true">
          <span className="orbit-core"><Icon><path d="M4 21V7l8-4 8 4v14M8 21v-5h8v5M8 9h1m6 0h1M8 12h1m6 0h1" /></Icon></span>
          <span className="orbit-item orbit-company"><Icon><path d="M4 20h16M6 20V8h8v12M14 12h4v8M9 11h2m-2 3h2" /></Icon></span>
          <span className="orbit-item orbit-people"><Icon><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" /></Icon></span>
          <span className="orbit-item orbit-document"><Icon><path d="M7 3h7l4 4v14H7zM14 3v5h4M10 12h5m-5 4h5" /></Icon></span>
          <i />
        </div>
      </section>

      <section className="access-section" aria-labelledby="access-title">
        <div className="home-section-heading">
          <div><p className="section-kicker">ACESSO DIRETO</p><h2 id="access-title">Explore o ambiente empresarial</h2><p>Consulte empresas, estabelecimentos e relações societárias em um só lugar.</p></div>
        </div>
        <div className="access-grid">
          <Link className="access-card companies" to="/receita-federal/cnpj">
            <span className="access-icon"><Icon><path d="M4 20h16M6 20V8h8v12M14 12h4v8M9 11h2m-2 3h2" /></Icon></span>
            <span className="access-copy"><small>EMPRESAS E ESTABELECIMENTOS</small><strong>Empresas</strong><span>Busque por CNPJ, razão social ou nome fantasia e explore matrizes e filiais.</span></span><b aria-hidden="true">→</b>
          </Link>
          <Link className="access-card partners" to="/receita-federal/cnpj/socios">
            <span className="access-icon"><Icon><circle cx="9" cy="8" r="3" /><path d="M3 20v-2a6 6 0 0 1 12 0v2M16 5a3 3 0 0 1 0 6m2 3a5 5 0 0 1 3 4v2" /></Icon></span>
            <span className="access-copy"><small>RELAÇÕES SOCIETÁRIAS</small><strong>Sócios</strong><span>Encontre participações pelo nome do sócio e avance até as empresas relacionadas.</span></span><b aria-hidden="true">→</b>
          </Link>
          <Link className="access-card" to="/receita-federal/cno">
            <span className="access-icon"><Icon><path d="M5 21V9l7-5 7 5v12M9 21v-6h6v6M4 21h16" /></Icon></span>
            <span className="access-copy"><small>CADASTRO NACIONAL DE OBRAS</small><strong>Obras</strong><span>Pesquise ocorrências de obras, áreas, CNAEs e vínculos pelos identificadores oficiais.</span></span><b aria-hidden="true">→</b>
          </Link>
        </div>
      </section>
      <aside className="principle-strip"><span aria-hidden="true">✓</span><div><strong>Informações conectadas</strong><p>Navegue entre empresas, estabelecimentos e pessoas sem perder o contexto de cada relação.</p></div></aside>
    </div>
  )
}
