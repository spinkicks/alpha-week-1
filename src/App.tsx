import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/AppShell'
import ComingSoon from './components/ComingSoon'
import Landing from './pages/Landing'
import Login from './pages/Login'
import SignUp from './pages/SignUp'
import Profile from './pages/Profile'
import ForYouFeed from './pages/ForYouFeed'

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<SignUp />} />

      {/* Authenticated app */}
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/feed" element={<ForYouFeed />} />
          <Route
            path="/following"
            element={<ComingSoon title="Following" milestone="Milestone 4" />}
          />
          <Route path="/upload" element={<ComingSoon title="Upload" milestone="Milestone 3" />} />
          <Route path="/search" element={<ComingSoon title="Search" milestone="Milestone 4" />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
