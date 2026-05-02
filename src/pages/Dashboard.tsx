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
  Award
} from 'lucide-react';
import { motion } from 'motion/react';
import { api } from '../lib/api';
import { Announcement } from '../types';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Link } from 'react-router-dom';
import { cn } from '../lib/utils';

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    announcements: 0,
    songs: 0,
    instruments: 0
  });
  const [latestAnnouncement, setLatestAnnouncement] = useState<Announcement | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const results = await Promise.allSettled([
          api.announcements.list(),
          api.songs.list(),
          api.instruments.list()
        ]);

        const [annsRes, songsRes, instsRes] = results;

        if (annsRes.status === 'rejected') console.error("Annonces load error:", annsRes.reason);
        if (songsRes.status === 'rejected') console.error("Songs load error:", songsRes.reason);
        if (instsRes.status === 'rejected') console.error("Instruments load error:", instsRes.reason);

        const anns = annsRes.status === 'fulfilled' ? annsRes.value : [];
        const songs = songsRes.status === 'fulfilled' ? songsRes.value : [];
        const insts = instsRes.status === 'fulfilled' ? instsRes.value : [];

        setStats({
          announcements: anns.length,
          songs: songs.length,
          instruments: insts.length
        });

        if (anns.length > 0) {
          setLatestAnnouncement(anns[0]);
        }
      } catch (error: any) {
        let displayError = error instanceof Error ? error.message : String(error);
        try {
          // Check if it's a JSON error from our Firestore handler
          const parsed = JSON.parse(displayError);
          if (parsed.error) displayError = parsed.error;
        } catch (e) {
          // Not a JSON error, keep as is
        }
        console.error("Error fetching stats:", displayError);
        toast.error("Erreur de chargement des statistiques", { description: displayError });
      }
    };

    fetchData();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
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
      // Handle Firestore Timestamp
      const d = date.toDate ? date.toDate() : new Date(date);
      return format(d, 'd MMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight">
            Shalom, <span className="text-[#D4AF37]">{user?.displayName || 'Ami'}</span>
          </h1>
          <p className="text-slate-500 font-medium">Bienvenue sur le portail EAFA Music.</p>
        </div>
        <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-slate-100">
          <Calendar className="text-[#D4AF37]" size={20} />
          <span className="text-sm font-bold text-slate-700">
            {format(new Date(), 'EEEE d MMMM yyyy', { locale: fr })}
          </span>
        </div>
      </header>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <StatCard 
          title="Annonces" 
          value={stats.announcements} 
          icon={Megaphone} 
          color="bg-blue-500" 
          variants={itemVariants}
          to="/announcements"
        />
        <StatCard 
          title="Répertoire Chants" 
          value={stats.songs} 
          icon={Music} 
          color="bg-[#D4AF37]" 
          variants={itemVariants}
          to="/songs"
        />
        <StatCard 
          title="Instruments" 
          value={stats.instruments} 
          icon={Guitar} 
          color="bg-purple-500" 
          variants={itemVariants}
          to="/instruments"
        />
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="lg:col-span-2 bg-white rounded-3xl p-8 shadow-sm border border-slate-100"
        >
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-black text-[#002B5B] flex items-center gap-2">
              <TrendingUp className="text-[#D4AF37]" />
              Dernière Annonce
            </h2>
            <Link to="/announcements" className="text-sm font-bold text-[#D4AF37] hover:underline flex items-center gap-1">
              Tout voir <ChevronRight size={16} />
            </Link>
          </div>

          {latestAnnouncement ? (
            <div className="space-y-4">
              {latestAnnouncement.imageUrl && (
                <img 
                  src={latestAnnouncement.imageUrl} 
                  alt={latestAnnouncement.title}
                  className="w-full h-48 object-cover rounded-2xl mb-4"
                  referrerPolicy="no-referrer"
                />
              )}
              <h3 className="text-2xl font-bold text-[#002B5B]">{latestAnnouncement.title}</h3>
              <p className="text-slate-600 line-clamp-3 leading-relaxed">
                {latestAnnouncement.content}
              </p>
              <div className="pt-4 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                  Publié le {formatDate(latestAnnouncement.createdAt)}
                </span>
                <Link to="/announcements" className="px-6 py-2 bg-[#002B5B] text-white text-sm font-bold rounded-xl hover:bg-[#003d82] transition-colors">
                  Lire plus
                </Link>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-slate-400">
              Aucune annonce pour le moment.
            </div>
          )}
        </motion.div>

        <motion.div 
          variants={itemVariants}
          initial="hidden"
          animate="show"
          className="bg-[#002B5B] text-white rounded-3xl p-8 shadow-xl relative overflow-hidden"
        >
          <div className="relative z-10">
            <Award className="text-[#D4AF37] mb-4" size={40} />
            <h2 className="text-2xl font-black mb-4 tracking-tighter">Verset Musical</h2>
            <p className="italic text-slate-300 mb-8 leading-relaxed">
              "Que tout ce qui respire loue l'Éternel ! Louez l'Éternel !"
            </p>
            <p className="text-sm font-bold text-[#D4AF37]">Psaume 150:6</p>
          </div>
          
          <div className="absolute top-[-20%] right-[-20%] w-[150px] h-[150px] bg-white/5 rounded-full blur-2xl" />
          <div className="absolute bottom-[-10%] left-[-10%] w-[100px] h-[100px] bg-[#D4AF37]/10 rounded-full blur-2xl" />
        </motion.div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, color, variants, to }: any) {
  return (
    <Link to={to} className="block group decoration-none">
      <motion.div 
        variants={variants}
        className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group-hover:border-[#D4AF37]/30"
      >
        <div className={cn("p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110", color)}>
          <Icon size={24} />
        </div>
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-widest">{title}</p>
          <div className="flex items-center gap-2">
            <p className="text-3xl font-black text-[#002B5B]">{value}</p>
            <ChevronRight className="text-slate-300 group-hover:text-[#D4AF37] transition-colors" size={20} />
          </div>
        </div>
      </motion.div>
    </Link>
  );
}
