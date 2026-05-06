import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Megaphone, 
  Music, 
  Guitar, 
  Calendar,
  ChevronRight,
  TrendingUp,
  Users,
  MessageSquare,
  Clock
} from 'lucide-react';
import { motion } from 'motion/react';
import { api, getCached } from '../lib/api';
import { Announcement, Message, Member, Rehearsal } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    announcements: 0,
    songs: 0,
    instruments: 0,
    rehearsals: 0
  });
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);
  const [recentMembers, setRecentMembers] = useState<Member[]>([]);
  const [recentMessages, setRecentMessages] = useState<Message[]>([]);
  const [upcomingRehearsals, setUpcomingRehearsals] = useState<Rehearsal[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      // Don't show loading spinner if we have cached data for at least one major resource
      const hasSomeCache = !!getCached('announcements_list') || !!getCached('members_list');
      
      if (hasSomeCache) {
        setIsLoading(false);
        // Pre-fill from cache
        const anns = getCached('announcements_list') || [];
        const rehs = getCached('rehearsals_list') || [];
        const members = getCached('members_list') || [];
        if (anns.length > 0) setLatestAnnouncement(anns[0]);
        setRecentMembers(members.slice(0, 5));
        setUpcomingRehearsals(rehs.slice(0, 2));
      } else {
        setIsLoading(true);
      }

      try {
        const results = await Promise.allSettled([
          api.announcements.list(),
          api.songs.list(),
          api.instruments.list(),
          api.rehearsals.list(),
          api.members.list(),
          user ? api.messages.listConversations(user.id) : Promise.resolve([])
        ]);

        const [annsRes, songsRes, instsRes, rehRes, membersRes, msgsRes] = results;

        const anns = annsRes.status === 'fulfilled' ? annsRes.value : [];
        const songs = songsRes.status === 'fulfilled' ? songsRes.value : [];
        const insts = instsRes.status === 'fulfilled' ? instsRes.value : [];
        const rehs = rehRes.status === 'fulfilled' ? rehRes.value : [];
        const members = membersRes.status === 'fulfilled' ? membersRes.value : [];
        const msgs = msgsRes.status === 'fulfilled' ? msgsRes.value : [];

        setStats({
          announcements: anns.length,
          songs: songs.length,
          instruments: insts.length,
          rehearsals: rehs.length
        });

        if (anns.length > 0) setLatestAnnouncement(anns[0]);
        setRecentMembers(members.slice(0, 5));
        setRecentMessages(msgs.slice(0, 3));
        setUpcomingRehearsals(rehs.slice(0, 2));
      } catch (error: any) {
        console.error("Error fetching stats:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    show: { y: 0, opacity: 1 }
  };

  const formatDate = (date: any) => {
    if (!date) return '...';
    try {
      const d = new Date(date);
      return format(d, 'd MMMM yyyy', { locale: fr });
    } catch (e) {
      return '';
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 md:space-y-14">
      {/* Welcome Header */}
      <header className="flex flex-col items-center justify-center text-center space-y-6 pt-4 relative overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 bg-[#D4AF37]/5 rounded-full blur-3xl -z-10" />
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="space-y-2"
        >
          <h1 className="text-4xl md:text-5xl font-black text-[#002B5B] tracking-tight">
            Shalom, <span className="text-[#D4AF37]">{user?.displayName || 'Christian Delfi'}</span>
          </h1>
          <p className="text-slate-500 font-medium text-lg md:text-xl tracking-tight opacity-70">
            Bienvenue sur le portail EAFA Music.
          </p>
        </motion.div>
        
        <motion.div 
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="flex items-center gap-3 bg-white px-6 py-3 rounded-2xl shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50"
        >
          <Calendar size={20} className="text-[#D4AF37]" strokeWidth={2.5} />
          <span className="text-sm font-black text-[#002B5B] lowercase first-letter:uppercase">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
        </motion.div>
      </header>

      {/* Stats Grid */}
      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-8"
      >
        <StatCard 
          title="ANNONCES" 
          value={stats.announcements} 
          icon={Megaphone} 
          color="bg-blue-500" 
          variants={itemVariants}
          to="/announcements"
        />
        <StatCard 
          title="RÉPÉTITIONS" 
          value={stats.rehearsals} 
          icon={Calendar} 
          color="bg-amber-500" 
          variants={itemVariants}
          to="/rehearsals"
        />
        <StatCard 
          title="CHANTS" 
          value={stats.songs} 
          icon={Music} 
          color="bg-[#D4AF37]" 
          variants={itemVariants}
          to="/songs"
        />
        <StatCard 
          title="INSTRUMENTS" 
          value={stats.instruments} 
          icon={Guitar} 
          color="bg-purple-500" 
          variants={itemVariants}
          to="/instruments"
        />
      </motion.div>

      {/* Main Content Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 md:gap-12">
        {/* Latest Announcement */}
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-2 bg-white rounded-[2.5rem] p-8 md:p-12 shadow-[0_10px_50px_rgba(0,0,0,0.02)] border border-slate-50 relative overflow-hidden group"
        >
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-[#D4AF37]/10 rounded-2xl">
                <TrendingUp className="text-[#D4AF37]" size={28} />
              </div>
              <h2 className="text-2xl font-black text-[#002B5B]">Dernière Annonce</h2>
            </div>
            <Link to="/announcements" className="text-sm font-black text-[#D4AF37] hover:underline flex items-center gap-1 group/link">
              Tout voir <ChevronRight size={18} className="group-hover/link:translate-x-1 transition-transform" />
            </Link>
          </div>

          {latestAnnouncement ? (
            <div className="space-y-8 relative z-10">
              <h3 className="text-3xl md:text-4xl font-black text-[#002B5B] leading-[1.1] tracking-tight">
                {latestAnnouncement.title}
              </h3>
              <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-2xl">
                {latestAnnouncement.content}
              </p>
              <div className="pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div className="flex items-center gap-2 text-slate-400">
                  <Clock size={16} />
                  <span className="text-xs font-black uppercase tracking-[0.2em]">
                    {formatDate(latestAnnouncement.createdAt)}
                  </span>
                </div>
                <Link 
                  to="/announcements" 
                  className="px-10 py-4 bg-[#002B5B] text-white text-sm font-black rounded-2xl hover:bg-[#001f41] transition-all active:scale-95 text-center shadow-xl shadow-[#002B5B]/20"
                >
                  Lire plus
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-300 font-bold uppercase tracking-widest text-sm">
              Aucune annonce
            </div>
          )}

          <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-[#D4AF37]/5 rounded-full blur-3xl" />
        </motion.div>

        {/* Messaging / Recent Members Side Panel */}
        <div className="space-y-8">
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="bg-[#002B5B] text-white rounded-[2.5rem] p-8 shadow-2xl relative overflow-hidden group"
          >
            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <MessageSquare className="text-[#D4AF37]" size={24} />
                <h3 className="text-xl font-black tracking-tight">Messages récents</h3>
              </div>
              
              <div className="space-y-4">
                {recentMessages.length > 0 ? recentMessages.map((msg: any) => (
                  <Link 
                    key={msg.id} 
                    to="/messages" 
                    className="flex items-center gap-3 p-3 rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5"
                  >
                    <div className="h-10 w-10 rounded-full bg-[#D4AF37] flex items-center justify-center font-black text-[#002B5B] text-xs">
                      {msg.otherUserName?.[0] || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold truncate">{msg.otherUserName}</p>
                      <p className="text-[10px] text-white/50 truncate tracking-tight">{msg.content}</p>
                    </div>
                  </Link>
                )) : (
                  <p className="text-xs text-white/40 italic p-4 text-center">Pas de nouveaux messages</p>
                )}
              </div>

              <Link to="/messages" className="mt-6 block text-center py-3 bg-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 transition-all border border-white/10">
                Ouvrir la messagerie
              </Link>
            </div>
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D4AF37]/10 rounded-full blur-2xl -mr-16 -mt-16" />
          </motion.div>

          {/* Recent Members */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50"
          >
            <div className="flex items-center gap-3">
              <Users className="text-[#D4AF37]" size={24} />
              <h3 className="text-xl font-black text-[#002B5B]">Membres récents</h3>
            </div>
            <div className="flex -space-x-3 mb-6">
              {recentMembers.map((member, i) => (
                <div 
                  key={member.id} 
                  className={cn(
                    "h-12 w-12 rounded-2xl border-4 border-white flex items-center justify-center text-xs font-black shadow-sm",
                    i % 2 === 0 ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"
                  )}
                  title={member.fullName}
                >
                  {member.fullName?.[0]}
                </div>
              ))}
              <div className="h-12 w-12 rounded-2xl border-4 border-white bg-slate-100 text-slate-400 flex items-center justify-center font-bold text-xs">
                +
              </div>
            </div>
            <Link to="/members" className="text-xs font-black text-blue-500 hover:underline inline-flex items-center gap-1 group">
              Voir l'annuaire <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>

          {/* Upcoming Rehearsals */}
          <motion.div 
            variants={itemVariants}
            initial="hidden"
            animate="show"
            className="bg-white rounded-[2.5rem] p-8 shadow-sm border border-slate-50"
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <Calendar className="text-[#D4AF37]" size={24} />
                <h3 className="text-xl font-black text-[#002B5B]">Prochaines Répétitions</h3>
              </div>
            </div>
            <div className="space-y-4">
              {upcomingRehearsals.length > 0 ? upcomingRehearsals.map((reh) => (
                <div key={reh.id} className="flex gap-4 items-start p-3 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                  <div className="bg-[#D4AF37]/10 p-3 rounded-xl text-[#002B5B] flex flex-col items-center">
                    <span className="text-[10px] font-black uppercase tracking-tighter">{format(new Date(reh.date), 'MMM', { locale: fr })}</span>
                    <span className="text-lg font-black leading-none">{format(new Date(reh.date), 'dd')}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-[#002B5B] truncate" title={reh.title}>{reh.title}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tight">{reh.location}</p>
                  </div>
                </div>
              )) : (
                <p className="text-xs text-slate-400 italic py-4 text-center">Aucune répétition</p>
              )}
            </div>
            <Link to="/rehearsals" className="mt-6 text-xs font-black text-blue-500 hover:underline inline-flex items-center gap-1 group">
              Calendrier complet <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, variants, to }: any) {
  return (
    <Link to={to} className="block group h-full">
      <motion.div 
        variants={variants}
        className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-[0_8px_30px_rgba(0,0,0,0.02)] border border-slate-50 flex flex-col items-center text-center gap-6 hover:shadow-xl hover:translate-y-[-6px] transition-all duration-300 h-full relative overflow-hidden"
      >
        <div className={cn("p-5 rounded-2xl shadow-lg shadow-black/5 transition-transform group-hover:scale-110 relative z-10", color, "text-white")}>
          <Icon size={28} strokeWidth={2.5} />
        </div>
        <div className="space-y-1 relative z-10 text-center flex flex-col items-center justify-center">
          <p className="text-[10px] md:text-xs font-black text-slate-400 uppercase tracking-[0.2em]">
            {title}
          </p>
          <p className="text-4xl md:text-5xl font-black text-[#002B5B] tabular-nums tracking-tighter">
            {value}
          </p>
        </div>
        <div className="mt-auto pt-4 relative z-10">
          <div className="flex items-center gap-1 text-[10px] font-black text-blue-500 group-hover:gap-2 transition-all uppercase tracking-widest">
            Voir tout <ChevronRight size={14} strokeWidth={3} />
          </div>
        </div>
        
        {/* Subtle background decoration */}
        <div className={cn("absolute -right-4 -bottom-4 w-20 h-20 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity", color, "rounded-full")} />
      </motion.div>
    </Link>
  );
}
