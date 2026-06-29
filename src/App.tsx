import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider, useAuth } from './lib/auth'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import Home from './pages/Home'
import Routine from './pages/Routine'
import Record from './pages/Record'
import Relation from './pages/Relation'
import Report from './pages/Report'
import './index.css'

function AppShell() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100dvh' }}>
        <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>로딩 중...</span>
      </div>
    )
  }

  if (!session) return <Login />

  return (
    <div className="app-shell">
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/routine" element={<Routine />} />
          <Route path="/record" element={<Record />} />
          <Route path="/relation" element={<Relation />} />
          <Route path="/report" element={<Report />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  )
}
