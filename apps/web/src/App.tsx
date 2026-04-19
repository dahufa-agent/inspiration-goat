import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Header from './components/Header'
import Footer from './components/Footer'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import History from './pages/History'
import Membership from './pages/Membership'
import Credits from './pages/Credits'
import Poetry from './pages/Poetry'
import Figures from './pages/Figures'
import { AuthProvider } from './hooks/useAuth'

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen bg-gray-50 flex flex-col">
          <Header />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/history" element={<History />} />
              <Route path="/membership" element={<Membership />} />
              <Route path="/credits" element={<Credits />} />
              <Route path="/poetry" element={<Poetry />} />
              <Route path="/figures" element={<Figures />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  )
}

export default App
