import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Member } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { 
  Plus, 
  Search, 
  Trash2, 
  X, 
  Users,
  Shield,
  User,
  Crown,
  MessageCircle,
  Phone
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export default function Members() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    accessName: '',
    role: 'member' as const
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadMembers();
    const interval = setInterval(loadMembers, 15000); // Refresh list every 15s for online status
    return () => clearInterval(interval);
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.members.list();
      setMembers(data);
    } catch (error: any) {
      console.error("Load members error:", error);
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const isOnline = (lastSeen: any) => {
    if (!lastSeen) return false;
    const now = new Date();
    const seen = new Date(lastSeen);
    return now.getTime() - seen.getTime() < 120000;
  };

  const formatDate = (date: any) => {
    if (!date) return '...';
    try {
      const d = new Date(date);
      return format(d, 'd MMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || submitting) return;

    setSubmitting(true);
    try {
      if (members.length > 0 && members.some(m => m.accessName && m.accessName.toLowerCase() === formData.accessName.toLowerCase())) {
        toast.error('Cette clé d’accès est déjà utilisée par un autre membre');
        setSubmitting(false);
        return;
      }

      const response = await api.members.create({
        ...formData,
        active: true
      });
      console.log("Create response:", response);
      toast.success('Membre ajouté avec succès !');
      loadMembers();
      closeModal();
    } catch (error: any) {
      console.error("Create member error:", error);
      let message = "Erreur technique lors de l’ajout";
      if (error.message) message = error.message;
      toast.error(message, { 
        description: "Vérifiez que le serveur est bien démarré ou contactez l'assistance." 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    if (id === user?.id) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte.");
      return;
    }

    try {
      await api.members.delete(id);
      toast.success('Membre retiré');
      loadMembers();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ fullName: '', accessName: '', role: 'member' });
  };

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight flex items-center gap-3">
            <Users className="text-[#D4AF37]" size={32} />
            Espace Membres
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Découvrez les membres de la chorale et discutez avec eux.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-64 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-[#002B5B] text-white font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#003d82] transition-colors shadow-lg"
            >
              <Plus size={20} />
              Ajouter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence mode="popLayout">
          {filteredMembers.map(m => (
            <motion.div
              key={m.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 hover:shadow-md transition-all relative group"
            >
              {isOnline(m.lastSeen) && (
                <div className="absolute top-6 right-6 flex items-center gap-1.5 px-2 py-1 bg-green-50 rounded-full border border-green-100">
                  <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-black text-green-600 uppercase">En ligne</span>
                </div>
              )}
              
              <div className="flex items-center gap-5">
                <div className="relative">
                  <div className="w-20 h-20 bg-[#002B5B] text-[#D4AF37] rounded-[1.5rem] flex items-center justify-center text-3xl font-black border-4 border-slate-50 shadow-md overflow-hidden transform group-hover:rotate-3 transition-transform">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" />
                    ) : (
                      m.fullName.charAt(0).toUpperCase()
                    )}
                  </div>
                  {isOnline(m.lastSeen) && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-4 border-white shadow-sm" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-[#002B5B] text-xl leading-tight truncate" title={m.fullName}>
                    {m.fullName}
                  </h3>
                  <div className="flex flex-col gap-2 mt-2">
                    <div className="flex items-center gap-2">
                      {(isAdmin || m.id === user?.id) && (
                        <span className="text-[10px] font-black bg-amber-50 text-amber-700 px-2 py-1 rounded-lg uppercase tracking-wider border border-amber-100/50" title="Votre identifiant de connexion">
                          ID: {m.accessName || m.id}
                        </span>
                      )}
                      {m.role === 'admin' ? (
                        <span className="px-2 py-1 bg-purple-50 text-purple-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 border border-purple-100/50">
                          <Shield size={10} strokeWidth={3} /> Admin
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 text-[9px] font-black uppercase rounded-lg flex items-center gap-1 border border-blue-100/50">
                          <User size={10} strokeWidth={3} /> Membre
                        </span>
                      )}
                    </div>
                    {m.voiceType && (
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{m.voiceType}</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-slate-50 grid grid-cols-2 gap-4">
                {m.id !== user?.id ? (
                  <button 
                    onClick={() => navigate('/messages')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-[#002B5B] rounded-xl text-xs font-black hover:bg-[#D4AF37]/10 hover:text-[#D4AF37] transition-all"
                  >
                    <MessageCircle size={16} /> Discuter
                  </button>
                ) : (
                  <button 
                    onClick={() => navigate('/profile')}
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-50 text-slate-400 rounded-xl text-xs font-black transition-all"
                  >
                    Mon Profil
                  </button>
                )}
                
                {m.phoneNumber ? (
                  <a 
                    href={`tel:${m.phoneNumber}`}
                    className="flex items-center justify-center gap-2 py-2.5 bg-[#002B5B] text-white rounded-xl text-xs font-black hover:bg-[#003d82] transition-all"
                  >
                    <Phone size={16} /> Appeler
                  </a>
                ) : (
                  <div className="flex items-center justify-center py-2.5 bg-slate-50 text-slate-300 rounded-xl text-[10px] font-bold italic">
                    Pas de numéro
                  </div>
                )}
              </div>

              {isAdmin && m.id !== user?.id && (
                <button 
                  onClick={() => handleDelete(m.id)}
                  className="absolute bottom-24 right-6 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  title="Supprimer ce membre"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Add Member Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white rounded-3xl w-full max-w-md overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              <div className="p-6 bg-[#002B5B] text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">Autoriser un membre</h2>
                <button onClick={closeModal}><X size={24} /></button>
              </div>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Clé d'accès (Identifiant de connexion)</label>
                  <input 
                    type="text" required
                    value={formData.accessName}
                    onChange={(e) => setFormData({ ...formData, accessName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none font-bold text-[#002B5B]"
                    placeholder="Ex: CHORISTE-01"
                  />
                  <p className="mt-1 text-[9px] text-slate-400">
                    Cette clé servira au membre pour se connecter à son espace.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom Complet (Affichage)</label>
                  <input 
                    type="text" required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    placeholder="Prénom Nom"
                  />
                </div>
                <div>
                   <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Rôle</label>
                   <div className="flex gap-4">
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'member' })}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all",
                          formData.role === 'member' ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#002B5B]" : "border-slate-100 text-slate-400"
                        )}
                      >
                        <User size={16} /> Membre
                      </button>
                      <button 
                        type="button"
                        onClick={() => setFormData({ ...formData, role: 'admin' })}
                        className={cn(
                          "flex-1 py-3 px-4 rounded-xl border text-sm font-bold flex items-center justify-center gap-2 transition-all",
                          formData.role === 'admin' ? "border-[#D4AF37] bg-[#D4AF37]/5 text-[#002B5B]" : "border-slate-100 text-slate-400"
                        )}
                      >
                        <Crown size={16} /> Admin
                      </button>
                   </div>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold bg-slate-100 rounded-xl" disabled={submitting}>Annuler</button>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="flex-2 py-4 font-black bg-[#002B5B] text-white rounded-xl shadow-lg flex items-center justify-center gap-2"
                  >
                    {submitting ? (
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : 'Ajouter'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
