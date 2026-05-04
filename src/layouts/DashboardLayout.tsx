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
  Search,
  ChevronDown,
  User as UserIcon
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';

const NavItem = ({ item, isActive, onClick, variants }: any) => {
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const Icon = item.icon;

  useEffect(() => {
    if (item.badge && user) {
      const checkMessages = async () => {
        try {
          const messages = await api.messages.listConversations(user.id);
          const unread = messages.filter((m: any) => m.receiverId === user.id && !m.read).length;
          setUnreadCount(unread);
        } catch (e) {
          console.error(e);
        }
      };
      
      checkMessages();

      const channel = supabase
        .channel(`nav-messages-${item.name}`)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'messages' },
          (payload) => {
            const newest = payload.new as any;
            const oldest = payload.old as any;
            if (newest && (newest.sender_id === user.id || newest.receiver_id === user.id)) {
              checkMessages();
            } else if (oldest && (oldest.sender_id === user.id || oldest.receiver_id === user.id)) {
              checkMessages();
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [item.badge, user, item.name]);

  return (
    <Link to={item.path} onClick={onClick}>
      <motion.div
        variants={variants}
        whileHover="hover"
        whileTap="tap"
        className={cn(
          "flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 relative group",
          isActive 
            ? "bg-[#D4AF37] text-[#002B5B] font-bold shadow-lg shadow-[#D4AF37]/20" 
            : "text-slate-400 hover:bg-white/10 hover:text-white"
        )}
      >
        <Icon size={20} strokeWidth={isActive ? 2.5 : 2} />
        <span className="text-sm font-medium">{item.name}</span>
        {item.badge && unreadCount > 0 && (
          <span className="absolute right-3 w-5 h-5 bg-red-500 text-white text-[10px] flex items-center justify-center rounded-full border-2 border-[#002B5B] animate-pulse">
            {unreadCount}
          </span>
        )}
        {isActive && (
          <motion.div 
            layoutId="activeNav"
            className="absolute left-0 w-1 h-6 bg-[#002B5B] rounded-r-full"
          />
        )}
      </motion.div>
    </Link>
  );
};

export default function DashboardLayout() {
  const { user, logout } = useAuth();
  const { permission, requestPermission, sendNotification } = useNotifications();
  const location = useLocation();
  const navigate = useNavigate();
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const lastAnnouncementId = useRef<string | null>(null);

  const menuItems = [
    { name: 'Accueil', icon: Home, path: '/' },
    { name: 'Répétitions', icon: Calendar, path: '/rehearsals' },
    { name: 'Annonces', icon: Megaphone, path: '/announcements' },
    { name: 'Chants', icon: Music, path: '/songs' },
    { name: 'Instruments', icon: Guitar, path: '/instruments' },
    { name: 'Messagerie', icon: Send, path: '/messages', badge: true },
    { name: 'Membres', icon: Users, path: '/members' },
  ];

  useEffect(() => {
    if (!user) return;
    
    api.announcements.list()
      .then(list => {
        if (list && list.length > 0) {
          lastAnnouncementId.current = list[0].id;
        }
      })
      .catch(err => console.error(err));

    const channel = supabase
      .channel('public-announcements')
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

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const navItemVariants = {
    hover: { scale: 1.02, x: 4 },
    tap: { scale: 0.98 },
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex flex-col w-72 bg-[#002B5B] text-white shadow-2xl z-50">
        <div className="p-8 pb-10 flex items-center gap-3">
          <div className="h-12 w-12 flex items-center justify-center bg-white/10 rounded-2xl shadow-[0_0_15px_rgba(212,175,55,0.2)] border border-[#D4AF37]/30 p-2.5 overflow-hidden">
            <img 
              src="https://img.icons8.com/ios-filled/512/D4AF37/music.png" 
              alt="Logo" 
              className="w-full h-full object-contain filter drop-shadow-[0_0_2px_rgba(212,175,55,0.5)]"
              referrerPolicy="no-referrer"
            />
          </div>
          <div>
            <span className="text-2xl font-black tracking-tighter text-white block leading-none">EAFA Music</span>
            <span className="text-[10px] text-[#D4AF37] font-bold uppercase tracking-[0.3em] mt-1 block">Management</span>
          </div>
        </div>

        <nav className="flex-1 px-6 space-y-2 overflow-y-auto custom-scrollbar">
          <p className="text-[10px] font-black text-white/30 uppercase tracking-[0.2em] mb-4 px-4">Menu Principal</p>
          {menuItems.map((item) => (
            <NavItem 
              key={item.path} 
              item={item} 
              isActive={location.pathname === item.path} 
              variants={navItemVariants}
            />
          ))}
        </nav>

        <div className="p-6 border-t border-white/5 space-y-4">
          <button
            onClick={requestPermission}
            className={cn(
              "flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all text-xs font-black uppercase tracking-widest bg-white/5",
              permission === 'granted' ? "text-emerald-400" : "text-amber-400"
            )}
          >
            {permission === 'granted' ? <Bell size={18} /> : <BellOff size={18} />}
            <span>{permission === 'granted' ? 'Notifications Activez' : 'Activer Notifications'}</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-4 py-4 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all text-xs font-black uppercase tracking-widest group"
          >
            <LogOut size={18} className="group-hover:rotate-12 transition-transform" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Desktop Top Navbar */}
        <header className="hidden md:flex items-center justify-between h-20 bg-white border-b border-slate-100 px-8 z-40">
          <div className="relative w-96">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text" 
              placeholder="Rechercher..." 
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-12 pr-4 text-sm font-medium focus:ring-2 focus:ring-[#D4AF37]/20 outline-none transition-all"
            />
          </div>

          <div className="flex items-center gap-6">
            <button className="relative p-2.5 bg-slate-50 text-slate-600 rounded-xl hover:bg-slate-100 transition-all active:scale-95">
              <Bell size={20} strokeWidth={2.5} />
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-[#D4AF37] rounded-full border-2 border-white" />
            </button>

            <Link to="/profile" className="flex items-center gap-3 pl-4 border-l border-slate-100 group">
              <div className="text-right">
                <p className="text-sm font-black text-[#002B5B] leading-none group-hover:text-[#D4AF37] transition-colors">{user?.displayName || 'Profil'}</p>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                  {user?.role === 'admin' ? 'Admin' : 'Membre'}
                </p>
              </div>
              <div className="h-10 w-10 bg-[#002B5B] rounded-xl flex items-center justify-center text-[#D4AF37] font-black group-hover:scale-105 transition-all shadow-md shadow-[#002B5B]/10">
                {user?.displayName?.[0] || <UserIcon size={20} />}
              </div>
              <ChevronDown size={16} className="text-slate-400 group-hover:text-[#002B5B] transition-all" />
            </Link>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="md:hidden flex items-center justify-between p-4 bg-[#002B5B] text-white z-50 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 flex items-center justify-center bg-white/10 rounded-xl p-2 border border-[#D4AF37]/30">
              <img 
                src="https://img.icons8.com/ios-filled/512/D4AF37/music.png" 
                alt="Logo" 
                className="w-full h-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
            <span className="font-black text-xl tracking-tighter">EAFA Music</span>
          </div>
          
          <div className="flex items-center gap-2">
            <button className="p-2 relative bg-white/5 rounded-xl border border-white/10">
              <Bell size={24} />
              <span className="absolute top-1.5 right-1.5 w-3 h-3 bg-[#D4AF37] rounded-full border-2 border-[#002B5B]" />
            </button>
            <button 
              onClick={() => setSidebarOpen(true)}
              className="p-2 bg-white/10 rounded-xl hover:bg-white/20 active:scale-95 transition-all text-[#D4AF37]"
            >
              <Menu size={28} />
            </button>
          </div>
        </header>

        {/* Mobile Drawer Sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div className="fixed inset-0 z-[1000] md:hidden">
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 bg-[#002B5B]/80 backdrop-blur-md" 
                onClick={() => setSidebarOpen(false)} 
              />
              
              <motion.aside 
                initial={{ x: "100%" }}
                animate={{ x: 0 }}
                exit={{ x: "100%" }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="absolute right-0 w-[80%] bg-[#002B5B] text-white shadow-2xl flex flex-col h-full border-l border-white/10"
              >
                <div className="p-8 flex items-center justify-between border-b border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-white/10 rounded-xl p-2 border border-[#D4AF37]/30">
                      <Music2 className="w-full h-full text-[#D4AF37]" />
                    </div>
                    <span className="text-xl font-black tracking-tighter">EAFA Music</span>
                  </div>
                  <button 
                    onClick={() => setSidebarOpen(false)}
                    className="p-2 hover:bg-white/10 rounded-xl transition-all"
                  >
                    <X size={32} strokeWidth={2.5} />
                  </button>
                </div>

                <nav className="px-6 py-10 space-y-4 overflow-y-auto flex-1 custom-scrollbar">
                  {menuItems.map((item) => (
                    <Link 
                      key={item.path} 
                      to={item.path}
                      onClick={() => setSidebarOpen(false)}
                      className={cn(
                        "flex items-center gap-4 px-5 py-4 rounded-2xl transition-all",
                        location.pathname === item.path 
                          ? "bg-[#D4AF37] text-[#002B5B] font-black shadow-xl scale-105" 
                          : "text-slate-400 hover:bg-white/5 active:bg-white/10"
                      )}
                    >
                      <item.icon size={26} strokeWidth={location.pathname === item.path ? 3 : 2} />
                      <span className="text-lg font-bold">{item.name}</span>
                    </Link>
                  ))}
                </nav>

                <div className="p-8 border-t border-white/5">
                  <div className="bg-white/5 p-5 rounded-[2rem] flex items-center gap-4 mb-6">
                    <div className="h-12 w-12 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-[#002B5B] font-black text-xl">
                      {user?.displayName?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-black truncate uppercase text-sm">{user?.displayName || 'Utilisateur'}</p>
                      <p className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-[0.2em]">{user?.role === 'admin' ? 'Admin' : 'Membre'}</p>
                    </div>
                  </div>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-3 py-4 text-red-400 bg-red-400/5 rounded-2xl font-black text-xs uppercase tracking-widest border border-red-400/10"
                  >
                    <LogOut size={20} />
                    <span>Se Déconnecter</span>
                  </button>
                </div>
              </motion.aside>
            </div>
          )}
        </AnimatePresence>

        <main className="flex-1 overflow-y-auto p-4 md:p-10 pb-28 md:pb-10 bg-[#F8FAFC]">
          <Outlet />
        </main>

        {/* Bottom Navigation (Mobile) - Facebook/Modern style */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-100 flex items-center justify-around z-50 h-20 px-2 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
          <BottomNavItem to="/" icon={Home} label="Accueil" isActive={location.pathname === '/'} />
          <BottomNavItem to="/rehearsals" icon={Calendar} label="Répéts" isActive={location.pathname === '/rehearsals'} />
          
          <Link 
            to="/messages" 
            className="relative -mt-16 group"
          >
            <div className={cn(
              "w-20 h-20 rounded-full flex items-center justify-center transition-all active:scale-90 shadow-2xl ring-[8px] ring-[#F8FAFC]",
              location.pathname === '/messages' 
                ? "bg-[#002B5B] text-[#D4AF37] animate-bounce-subtle" 
                : "bg-[#D4AF37] text-[#002B5B] rotate-[-10deg] group-hover:rotate-0"
            )}>
              <Send size={32} strokeWidth={2.5} />
            </div>
            <p className={cn(
              "text-[10px] text-center font-black mt-2 tracking-widest",
              location.pathname === '/messages' ? "text-[#002B5B]" : "text-slate-400"
            )}>MESSAGES</p>
          </Link>

          <BottomNavItem to="/announcements" icon={Megaphone} label="Annonces" isActive={location.pathname === '/announcements'} />
          <BottomNavItem to="/members" icon={Users} label="Membres" isActive={location.pathname === '/members'} />
        </nav>
      </div>
    </div>
  );
}

function BottomNavItem({ to, icon: Icon, label, isActive }: any) {
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center gap-1.5 px-3 py-1 rounded-2xl transition-all active:scale-95",
        isActive ? "text-[#002B5B]" : "text-slate-400"
      )}
    >
      <div className={cn(
        "p-1.5 rounded-xl transition-all",
        isActive ? "bg-[#002B5B]/5 shadow-sm" : "bg-transparent"
      )}>
        <Icon size={24} strokeWidth={isActive ? 3 : 2} />
      </div>
      <span className={cn(
        "text-[9px] font-black uppercase tracking-widest",
        isActive ? "text-[#002B5B]" : "text-slate-400"
      )}>
        {label}
      </span>
    </Link>
  );
}
