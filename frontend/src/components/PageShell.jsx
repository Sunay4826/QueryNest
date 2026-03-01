export default function PageShell({ title, subtitle, children }) {
  return (
    <div className="page-shell">
      <header className="page-shell__header">
        <h1 className="page-shell__title">{title}</h1>
        {subtitle ? <p className="page-shell__subtitle">{subtitle}</p> : null}
      </header>
      <main className="page-shell__content">{children}</main>
    </div>
  );
}
