export default function DashboardLoading() {
  return (
    <main className="container-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header">
        <div className="page-header-left"><div className="skeleton" style={{ width: 210, height: 28 }} /><div className="skeleton" style={{ width: 280, height: 16, marginTop: 8 }} /></div>
      </div>
      <div className="stats-grid dashboard-stat-grid"><div className="stat-card"><div className="skeleton" style={{ width: 95, height: 14 }} /><div className="skeleton" style={{ width: 48, height: 34, marginTop: 12 }} /></div><div className="stat-card"><div className="skeleton" style={{ width: 110, height: 14 }} /><div className="skeleton" style={{ width: 48, height: 34, marginTop: 12 }} /></div><div className="stat-card"><div className="skeleton" style={{ width: 100, height: 14 }} /><div className="skeleton" style={{ width: 48, height: 34, marginTop: 12 }} /></div></div>
      <div className="dashboard-sections"><section><div className="skeleton" style={{ width: 140, height: 20, marginBottom: 16 }} /><div className="table-wrap"><div className="skeleton" style={{ height: 260 }} /></div></section></div>
    </main>
  );
}
