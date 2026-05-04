import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Home, 
  Megaphone, 
  Music, 
  Guitar, 
  Users, 
  LogOut, 
  Menu, 
  X,
  Music2,
  Bell,
  BellOff,
  Calendar,
  Send,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { permission, requestPermission, sendNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const lastAnnouncementId = useRef<string | null>(null);

  const isAdmin = user?.role === 'admin';

  // Real-time announcements subscription
  useEffect(() => {
    if (!user) return;

    // Initial check for latest ID
    api.announcements.list()
      .then(list => {
        if (list && list.length > 0) {
          lastAnnouncementId.current = list[0].id;
        }
      })
      .catch(err => console.error("Could not fetch initial announcements:", err));

    const channel = supabase
      .channel('public:announcements')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        (payload) => {
          const newest = payload.new as any;
          if (newest.id !== lastAnnouncementId.current) {
            sendNotification(`Nouvelle annonce : ${newest.title}`, {
              body: newest.content,
              tag: 'new-announcement',
              requireInteraction: true
            });
            lastAnnouncementId.current = newest.id;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sendNotification, user]);

  const menuItems = [
    { name: 'Accueil', icon: Home, path: '/' },
    { name: 'Répétitions', icon: Calendar, path: '/rehearsals' },
    { name: 'Annonces', icon: Megaphone, path: '/announcements' },
    { name: 'Chants', icon: Music, path: '/songs' },
    { name: 'Instruments', icon: Guitar, path: '/instruments' },
    { name: 'Messagerie', icon: Send, path: '/messages', badge: true },
    { name: 'Membres', icon: Users, path: '/members' },
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemVariants = {
    hover: { scale: 1.02, x: 5 },
    tap: { scale: 0.98 },
  };

  return (
    <div className="flex h-screen bg-[#f8fafc]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-64 bg-[#002B5B] text-white shadow-xl">
        <div className="p-6 flex items-center gap-3">
          <div className="h-10 w-10 flex items-center justify-center bg-white/10 rounded-xl shadow-[0_0_15px_rgba(212,175,55,0.3)] border border-[#D4AF37]/30 p-2 overflow-hidden ring-1 ring-[#D4AF37]/20">
            <img 
              src="https://img.icons8.com/ios-filled/512/D4AF37/music.png" 
              alt="EAFA Music" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_2px_rgba(212,175,55,0.5)]"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">EAFA Music</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            const [unreadCount, setUnreadCount] = useState(0);

            useEffect(() => {
              if (item.badge && user) {
                const checkMessages = async () => {
                  try {
                    const messages = await api.messages.listConversations(user.id);
                    const unread = messages.filter(m => m.receiverId === user.id && !m.read).length;
                    setUnreadCount(unread);
                  } catch (e) {
                    console.error(e);
                  }
                };
                checkMessages();
                const interval = setInterval(checkMessages, 10000);
                return () => clearInterval(interval);
              }
            }, [item.badge, user]);

            return (
              <Link key={item.path} to={item.path}>
                <motion.div
                  variants={navItemVariants}
                  whileHover="hover"
                  whileTap="tap"
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 relative",
                    isActive 
                      ? "bg-[#D4AF37] text-[#002B5B] font-semibold shadow-lg" 
                      : "text-slate-300 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon size={20} />
                  <span>{item.name}</span>
                  {item.badge && unreadCount > 0 && (
                    <span className="absolute right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#002B5B] animate-pulse" />
                  )}
                </motion.div>
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-white/10 space-y-1 bg-[#001f41]">
          <button
            onClick={requestPermission}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest",
              permission === 'granted' 
                ? "text-emerald-400 hover:bg-emerald-500/10" 
                : "text-amber-400 hover:bg-amber-500/10"
            )}
          >
            {permission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            <span>Notification : {permission === 'granted' ? 'ON' : 'OFF'}</span>
          </button>

          <Link 
            to="/profile" 
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all",
              location.pathname === '/profile' 
                ? "bg-[#D4AF37] text-[#002B5B] font-black shadow-lg" 
                : "text-slate-300 hover:bg-white/10 hover:text-white"
            )}
          >
            <UserIcon size={20} />
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-black truncate leading-tight uppercase tracking-tight">Utilisateur : {user?.displayName?.split(' ')[0] || 'Moi'}</p>
              <p className="text-[10px] uppercase opacity-70 tracking-widest font-bold">
                {user?.role === 'admin' ? 'Coordinateur' : 'Membre'}
              </p>
            </div>
          </Link>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-3.5 text-slate-400 hover:bg-red-500/10 hover:text-red-400 rounded-xl transition-all text-xs font-black uppercase tracking-widest"
          >
            <LogOut size={18} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Mobile Header & Sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="md:hidden flex items-center justify-between p-4 bg-[#002B5B] text-white">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 bg-white/10 rounded-lg p-1.5 overflow-hidden border border-[#D4AF37]/30 shadow-[0_0_10px_rgba(212,175,55,0.2)]">
              <img 
                src="https://img.icons8.com/ios-filled/512/D4AF37/music.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-bold">EAFA Music</span>
          </div>
          <button onClick={() => setSidebarOpen(true)}>
            <Menu size={24} />
          </button>
        </header>

        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setSidebarOpen(false)}
                className="fixed inset-0 bg-black/50 z-40 md:hidden"
              />
              <motion.aside
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 w-72 bg-[#002B5B] text-white z-50 md:hidden shadow-2xl"
              >
                <div className="p-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl p-2 overflow-hidden border border-[#D4AF37]/30 shadow-[0_0_15px_rgba(212,175,55,0.3)]">
                      <img 
                        src="https://img.icons8.com/ios-filled/512/D4AF37/music.png" 
                        alt="Logo" 
                        className="w-full h-full object-contain"
                        referrerPolicy="no-referrer"
                      />
                    </div>
                    <span className="text-xl font-bold">EAFA Music</span>
                  </div>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X size={24} />
                  </button>
                </div>
                <nav className="px-4 py-6 space-y-2">
                  {menuItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    const [unreadCount, setUnreadCount] = useState(0);

                    useEffect(() => {
                      if (item.badge && user) {
                        const checkMessages = async () => {
                          try {
                            const messages = await api.messages.listConversations(user.id);
                            const unread = messages.filter(m => m.receiverId === user.id && !m.read).length;
                            setUnreadCount(unread);
                          } catch (e) {
                            console.error(e);
                          }
                        };
                        checkMessages();
                      }
                    }, [item.badge, user]);

                    return (
                      <Link key={item.path} to={item.path} onClick={() => setSidebarOpen(false)}>
                        <div className={cn(
                          "flex items-center gap-3 px-4 py-3 rounded-xl relative",
                          isActive 
                            ? "bg-[#D4AF37] text-[#002B5B] font-semibold" 
                            : "text-slate-300 hover:bg-white/10"
                        )}>
                          <Icon size={20} />
                          <span>{item.name}</span>
                          {item.badge && unreadCount > 0 && (
                            <span className="absolute right-3 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#002B5B]" />
                          )}
                        </div>
                      </Link>
                    );
                  })}
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 w-full px-4 py-3 text-slate-300 mt-8 border-t border-white/10"
                  >
                    <LogOut size={20} />
                    <span>Déconnexion</span>
                  </button>
                </nav>
              </motion.aside>
            </>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
