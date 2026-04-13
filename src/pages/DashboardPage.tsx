import { Button } from '../shared/ui/Button/Button'

export function DashboardPage() {
  return (
    <section className="page">
      <div className="pageHeader">
        <h1 className="pageTitle">Dashboard</h1>
        <div className="pageActions">
          <Button onClick={() => window.alert('Template only')}>New action</Button>
        </div>
      </div>

      <div className="grid">
        <div className="card">
          <div className="cardLabel">Total Items</div>
          <div className="cardValue">—</div>
        </div>
        <div className="card">
          <div className="cardLabel">Low Stock</div>
          <div className="cardValue">—</div>
        </div>
        <div className="card">
          <div className="cardLabel">Open Orders</div>
          <div className="cardValue">—</div>
        </div>
      </div>
    </section>
  )
}

