import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Sidebar from './components/Sidebar'
import TopBar from './components/TopBar'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Expenses from './pages/Expenses'
import Budgets from './pages/Budgets'
import Recurring from './pages/Recurring'
import Categories from './pages/Categories'
import Settings from './pages/Settings'
import Reports from './pages/Reports'
import './styles/global.css'

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)

  const toggleSidebar  = () => setSidebarOpen(o => !o)
  const closeSidebar   = () => setSidebarOpen(false)
  const toggleCollapse = () => setSidebarCollapsed(c => !c)

  return (
    <Router>
      <AuthProvider>
        <AppContent
          sidebarOpen={sidebarOpen}
          toggleSidebar={toggleSidebar}
          closeSidebar={closeSidebar}
          sidebarCollapsed={sidebarCollapsed}
          toggleCollapse={toggleCollapse}
        />
      </AuthProvider>
    </Router>
  )
}

function AppContent({ sidebarOpen, toggleSidebar, closeSidebar, sidebarCollapsed, toggleCollapse }) {
  const location = useLocation()
  const isLoginPage = location.pathname === '/login'

  return (
    <div className="app">
      {!isLoginPage && (
        <>
          <TopBar
            onMenuClick={toggleSidebar}
            onCollapseToggle={toggleCollapse}
            sidebarCollapsed={sidebarCollapsed}
          />
          <Sidebar
            isOpen={sidebarOpen}
            onClose={closeSidebar}
            isCollapsed={sidebarCollapsed}
          />
        </>
      )}

      <main className={`main-content ${isLoginPage ? 'no-sidebar' : ''} ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/expenses"    element={<ProtectedRoute><Expenses /></ProtectedRoute>} />
          <Route path="/budgets"     element={<ProtectedRoute><Budgets /></ProtectedRoute>} />
          <Route path="/recurring"   element={<ProtectedRoute><Recurring /></ProtectedRoute>} />
          <Route path="/categories"  element={<ProtectedRoute><Categories /></ProtectedRoute>} />
          <Route path="/settings"    element={<ProtectedRoute><Settings /></ProtectedRoute>} />
          <Route path="/reports"     element={<ProtectedRoute><Reports /></ProtectedRoute>} />
        </Routes>
      </main>
    </div>
  )
}

export default App
