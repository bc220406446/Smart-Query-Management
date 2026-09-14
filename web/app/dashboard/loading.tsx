export default function DashboardLoading() {
  return (
    <main className="container-page" aria-busy="true" aria-label="Loading dashboard">
      <div className="page-header">
        <div className="page-header-left"><div className="skeleton" style={{ width: 210, height: 28 }} /><div className="skeleton" style={{ width: 280, height: 16, marginTop: 8 }} /></div>
        <div className="skeleton" style={{ width: 120, height: 42 }} />
      </div>
      <div className="stats-grid"><div className="skeleton" style={{ height: 112 }} /><div className="skeleton" style={{ height: 112 }} /><div className="skeleton" style={{ height: 112 }} /></div>
      <div className="grid-3" style={{ marginTop: 28 }}><div className="skeleton" style={{ height: 240 }} /><div className="skeleton" style={{ height: 240 }} /></div>
    </main>
  );
}
