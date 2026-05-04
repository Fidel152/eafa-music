import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'sonner';
import { AuthProvider, useAuth } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Announcements from './pages/Announcements';
import Songs from './pages/Songs';
import Instruments from './pages/Instruments';
import Members from './pages/Members';
import Rehearsals from './pages/Rehearsals';
import Chat from './pages/Chat';
import Profile from './pages/Profile';
import DashboardLayout from './layouts/DashboardLayout';

const ProtectedRoute = ({ children, adminOnly = false }: { children: React.ReactNode, adminOnly?: boolean }) => {
  const { user, loading } = useAuth();

  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-[#002B5B]">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#D4AF37]"></div>
    </div>
  );

  if (!user) return <Navigate to="/login" />;
  
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" />;

  return <>{children}</>;
};

import { usePresence } from './hooks/usePresence';

function AppRoutes() {
  usePresence();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      
      <Route path="/" element={
        <ProtectedRoute>
          <DashboardLayout />
        </ProtectedRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="rehearsals" element={<Rehearsals />} />
        <Route path="announcements" element={<Announcements />} />
        <Route path="songs" element={<Songs />} />
        <Route path="instruments" element={<Instruments />} />
        <Route path="members" element={<Members />} />
        <Route path="messages" element={<Chat />} />
        <Route path="profile" element={<Profile />} />
      </Route>

      <Route path="*" element={<Navigate to="/" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <Router>
          <AppRoutes />
          <Toaster position="top-right" richColors />
        </Router>
      </AuthProvider>
    </NotificationProvider>
  );
}
