export function HomePage() {
  return (
    <section className="welcome" aria-labelledby="welcome-title">
      <p className="eyebrow">BUSINESS ATLAS</p>
      <h1 id="welcome-title">Um novo olhar sobre<br />os dados empresariais.</h1>
      <p className="intro">Um espaço para explorar informações, compreender conexões e conhecer o ambiente empresarial.</p>
      <div className="welcome-note">
        <span className="note-marker" aria-hidden="true" />
        <div>
          <h2>Estamos começando.</h2>
          <p>As primeiras ferramentas de exploração estão em preparação.</p>
        </div>
      </div>
    </section>
  )
}
