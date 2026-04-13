import { Link } from 'react-router-dom'

export function NotFoundPage() {
  return (
    <section className="page">
      <h1 className="pageTitle">Not found</h1>
      <p className="muted">The page you requested does not exist.</p>
      <div style={{ marginTop: 16 }}>
        <Link to="/dashboard" className="link">
          Go to dashboard
        </Link>
      </div>
    </section>
  )
}

