import { Link } from 'react-router'
export function HomePage() {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <p className="eyebrow">BUSINESS ATLAS</p>
      <h1 id="welcome-title">Um novo olhar sobre<br />os dados empresariais.</h1>
      <p className="intro">Um espaço para explorar informações, compreender conexões e conhecer o ambiente empresarial.</p>
      <div className="welcome-note">
        <span className="note-marker" aria-hidden="true" />
        <div>
          <h2>Receita Federal · CNPJ</h2>
          <p>Explore empresas, matrizes e filiais. Os dados são consultados pela API AzData.</p>
          <div className="home-actions"><Link className="button-link" to="/receita-federal/cnpj">Explorar empresas</Link></div>
        </div>
      </div>
    </section>
  )
}
