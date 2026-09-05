import { Link } from 'react-router'

export function NotFoundPage() {
  return (
    <section className="welcome">
      <p className="eyebrow">404</p>
      <h1>Página não encontrada.</h1>
      <p className="intro">Este endereço não está disponível no B-Atlas.</p>
      <Link className="button-link" to="/">Voltar ao início</Link>
    </section>
  )
}
