import { BrowserRouter, Routes, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import Login from './pages/Login'
import Home from './pages/Home'
import NewEstimate from './pages/NewEstimate'
import EstimateDetail from './pages/EstimateDetail'
import ClientReview from './pages/ClientReview'
import Clients from './pages/Clients'
import Settings from './pages/Settings'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/review/:token" element={<ClientReview />} />
        <Route path="/" element={<RequireAuth><Home /></RequireAuth>} />
        <Route path="/new-estimate" element={<RequireAuth><NewEstimate /></RequireAuth>} />
        <Route path="/estimate/:id" element={<RequireAuth><EstimateDetail /></RequireAuth>} />
        <Route path="/clients" element={<RequireAuth><Clients /></RequireAuth>} />
        <Route path="/settings" element={<RequireAuth><Settings /></RequireAuth>} />
      </Routes>
    </BrowserRouter>
  )
}
