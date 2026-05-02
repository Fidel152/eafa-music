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
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function Members() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    role: 'member' as const
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadMembers();
  }, []);

  const loadMembers = async () => {
    try {
      const data = await api.members.list();
      setMembers(data);
    } catch (error: any) {
      console.error("Load members error:", error);
      let message = error instanceof Error ? error.message : String(error);
      try {
        const parsed = JSON.parse(message);
        if (parsed.error) message = parsed.error;
      } catch (e) {}
      toast.error("Erreur de chargement", { description: message });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '...';
    try {
      const d = date.toDate ? date.toDate() : new Date(date);
      return format(d, 'd MMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      // Check if already exists
      if (members.some(m => m.fullName.toLowerCase() === formData.fullName.toLowerCase())) {
        toast.error('Ce membre existe déjà');
        return;
      }

      await api.members.create({
        ...formData,
        active: true
      });
      toast.success('Membre ajouté à la base');
      loadMembers();
      closeModal();
    } catch (error: any) {
      console.error("Submit member error:", error);
      toast.error(`Erreur lors de l’ajout: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    
    // Protection: l'admin ne peut pas se supprimer lui-même par erreur
    if (id === user?.uid) {
      toast.error("Vous ne pouvez pas supprimer votre propre compte administrateur.");
      return;
    }

    try {
      await api.members.delete(id);
      toast.success('Membre retiré de la base');
      loadMembers();
    } catch (error) {
      console.error("Delete error:", error);
      toast.error('Erreur lors de la suppression');
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setFormData({ fullName: '', role: 'member' });
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
            Gestion des Membres
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Autorisez l'accès au portail EAFA Music.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un nom..."
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
              Ajouter un membre
            </button>
          )}
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden overflow-x-auto">
        <table className="w-full text-left min-w-[600px]">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-4 md:px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Nom Complet</th>
              <th className="px-4 md:px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Rôle</th>
              <th className="px-4 md:px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest">Date d'ajout</th>
              <th className="px-4 md:px-8 py-4 text-xs font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {loading ? (
              [1, 2, 3].map(i => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={4} className="px-4 md:px-8 py-6"><div className="h-4 bg-slate-100 rounded w-1/2" /></td>
                </tr>
              ))
            ) : filteredMembers.length > 0 ? (
              filteredMembers.map(m => (
                <tr key={m.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#002B5B] text-[#D4AF37] rounded-full flex items-center justify-center font-bold flex-shrink-0">
                        {m.fullName.charAt(0)}
                      </div>
                      <span className="font-bold text-[#002B5B] truncate max-w-[150px] md:max-w-none">{m.fullName}</span>
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5">
                    <div className="flex items-center gap-2">
                       {m.role === 'admin' ? (
                        <span className="px-3 py-1 bg-purple-100 text-purple-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1 whitespace-nowrap">
                          <Crown size={12} /> Admin
                        </span>
                      ) : (
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-[10px] font-black uppercase rounded-full flex items-center gap-1 whitespace-nowrap">
                          <User size={12} /> Membre
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 md:px-8 py-5 text-sm text-slate-500 font-medium whitespace-nowrap">
                    {formatDate(m.joinedAt)}
                  </td>
                  <td className="px-4 md:px-8 py-5 text-right">
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(m.id)}
                        className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={4} className="px-4 md:px-8 py-12 text-center text-slate-400">Aucun membre trouvé</td>
              </tr>
            )}
          </tbody>
        </table>
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
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom Complet (Exact)</label>
                  <input 
                    type="text" required
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    placeholder="Prénom Nom"
                  />
                  <p className="mt-2 text-[10px] text-slate-400 italic">
                    * Le membre devra saisir ce nom exactement pour se connecter.
                  </p>
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
                  <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold bg-slate-100 rounded-xl">Annuler</button>
                  <button type="submit" className="flex-2 py-4 font-black bg-[#002B5B] text-white rounded-xl shadow-lg">Ajouter</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
