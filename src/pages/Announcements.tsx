import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Announcement } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Megaphone,
  Bell,
  Clock,
  Image as ImageIcon
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

export default function Announcements() {
  const { user } = useAuth();
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [viewingAnnouncement, setViewingAnnouncement] = useState<Announcement | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    imageUrl: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadAnnouncements();
  }, []);

  const loadAnnouncements = async () => {
    try {
      const data = await api.announcements.list();
      setAnnouncements(data);
    } catch (error: any) {
      console.error("Load announcements error:", error);
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
      return format(d, 'd MMMM yyyy', { locale: fr });
    } catch (e) {
      return 'Date invalide';
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingId) {
        await api.announcements.update(editingId, {
          ...formData
        });
        toast.success('Annonce mise à jour');
      } else {
        await api.announcements.create({
          ...formData,
          type: 'info'
        });
        toast.success('Nouvelle annonce publiée');
      }
      loadAnnouncements();
      closeModal();
    } catch (error: any) {
      console.error("Submit announcement error:", error);
      toast.error(`Erreur lors de l’opération: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const toastId = toast.loading('Suppression en cours...');
    try {
      await api.announcements.delete(id);
      toast.success('Annonce supprimée', { id: toastId });
      await loadAnnouncements();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression: ' + error.message, { id: toastId });
    }
  };

  const openModal = (ann?: Announcement) => {
    if (ann) {
      setEditingId(ann.id);
      setFormData({
        title: ann.title,
        content: ann.content,
        imageUrl: ann.imageUrl || ''
      });
      setIsModalOpen(true);
    } else {
      setEditingId(null);
      setFormData({ title: '', content: '', imageUrl: '' });
      setIsModalOpen(true);
    }
  };

  const openView = (ann: Announcement) => {
    setViewingAnnouncement(ann);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setViewingAnnouncement(null);
    setEditingId(null);
  };

  const filteredAnnouncements = announcements.filter(ann => 
    ann.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ann.content.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight flex items-center gap-3">
            <Megaphone className="text-[#D4AF37]" size={32} />
            Annonces
          </h1>
          <p className="text-slate-500 font-medium">Restez informé des dernières nouvelles du ministère.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => openModal()}
              className="bg-[#D4AF37] text-[#002B5B] font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#B8860B] transition-colors shadow-lg shadow-[#D4AF37]/10"
            >
              <Plus size={20} />
              Nouveau
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-3xl h-64 animate-pulse shadow-sm" />
          ))}
        </div>
      ) : filteredAnnouncements.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence>
            {filteredAnnouncements.map((ann) => (
              <motion.div
                key={ann.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300 cursor-pointer"
                onClick={() => openView(ann)}
              >
                {ann.imageUrl ? (
                  <div className="h-48 overflow-hidden relative">
                    <img 
                      src={ann.imageUrl} 
                      alt={ann.title} 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                    <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                      <Bell size={14} className="text-[#D4AF37]" />
                      <span className="text-[10px] font-bold uppercase tracking-widest">Nouveau</span>
                    </div>
                  </div>
                ) : (
                  <div className="h-48 bg-slate-50 flex items-center justify-center text-slate-200">
                    <Megaphone size={64} />
                  </div>
                )}

                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">
                    <Clock size={12} />
                    {formatDate(ann.createdAt)}
                  </div>
                  
                  <h3 className="text-xl font-bold text-[#002B5B] mb-3 line-clamp-1">{ann.title}</h3>
                  <p className="text-slate-600 text-sm line-clamp-3 leading-relaxed mb-6 flex-1">
                    {ann.content}
                  </p>

                  <div className="flex items-center justify-between pt-4 border-t border-slate-50">
                    <button 
                      onClick={(e) => { e.stopPropagation(); openView(ann); }}
                      className="text-[#D4AF37] text-sm font-bold hover:underline"
                    >
                      Lire la suite
                    </button>
                    {isAdmin && (
                        <div className="flex items-center gap-2">
                          {itemToDelete === ann.id ? (
                            <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
                              <button 
                                onClick={(e) => { e.stopPropagation(); setItemToDelete(null); }}
                                className="px-2 py-1 bg-white text-slate-500 rounded-lg text-[10px] font-bold shadow-sm"
                              >
                                Annuler
                              </button>
                              <button 
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  await handleDelete(ann.id); 
                                  setItemToDelete(null);
                                }}
                                className="px-2 py-1 bg-red-500 text-white rounded-lg text-[10px] font-bold shadow-sm"
                              >
                                Oui
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openModal(ann); }}
                                className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                              >
                                <Edit2 size={18} />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setItemToDelete(ann.id);
                                }}
                                className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              >
                                <Trash2 size={18} />
                              </button>
                            </>
                          )}
                        </div>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-12 text-center shadow-sm border border-slate-100">
          <Megaphone size={48} className="mx-auto text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium tracking-tight">Aucune annonce trouvée.</p>
        </div>
      )}

      {/* Modal */}
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
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-2xl overflow-y-auto max-h-[90vh] shadow-2xl"
            >
              <div className="bg-[#002B5B] p-6 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-[#D4AF37] rounded-lg">
                    <Plus className="text-[#002B5B]" size={20} />
                  </div>
                  <h2 className="text-xl font-bold">{editingId ? 'Modifier l’annonce' : 'Nouvelle annonce'}</h2>
                </div>
                <button onClick={closeModal} className="p-2 hover:bg-white/10 rounded-full">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Titre de l'annonce</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                    placeholder="Entrez le titre..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Contenu</label>
                  <textarea 
                    required
                    rows={5}
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                    placeholder="Détails de l'annonce..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">URL de l'image (optionnel)</label>
                  <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="url"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl pl-10 pr-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all"
                      placeholder="https://images.unsplash.com/..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button" 
                    onClick={closeModal}
                    className="flex-1 px-6 py-4 rounded-xl font-bold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-all"
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit"
                    className="flex-2 px-6 py-4 rounded-xl font-black bg-[#D4AF37] text-[#002B5B] shadow-lg shadow-[#D4AF37]/20 hover:bg-[#B8860B] transition-all"
                  >
                    {editingId ? 'Mettre à jour' : 'Publier l\'annonce'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* View Modal */}
      <AnimatePresence>
        {viewingAnnouncement && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-3xl overflow-y-auto max-h-[90vh] shadow-2xl overflow-hidden"
            >
              {viewingAnnouncement.imageUrl && (
                <div className="w-full h-64 md:h-80 relative">
                  <img 
                    src={viewingAnnouncement.imageUrl} 
                    alt={viewingAnnouncement.title}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                  <button 
                    onClick={closeModal}
                    className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 backdrop-blur-md text-white rounded-full transition-all"
                  >
                    <X size={24} />
                  </button>
                </div>
              )}
              
              <div className="p-8 md:p-12">
                {!viewingAnnouncement.imageUrl && (
                  <div className="flex justify-end mb-4">
                    <button onClick={closeModal} className="p-2 text-slate-400 hover:text-slate-600 transition-all">
                      <X size={28} />
                    </button>
                  </div>
                )}
                
                <div className="flex items-center gap-3 text-xs font-black text-[#D4AF37] uppercase tracking-widest mb-6">
                  <Clock size={14} />
                  Publié le {formatDate(viewingAnnouncement.createdAt)}
                </div>
                
                <h2 className="text-3xl md:text-4xl font-black text-[#002B5B] mb-8 leading-tight">
                  {viewingAnnouncement.title}
                </h2>
                
                <div className="prose prose-slate max-w-none">
                  <p className="text-slate-600 text-lg leading-relaxed whitespace-pre-wrap">
                    {viewingAnnouncement.content}
                  </p>
                </div>

                <div className="mt-12 pt-8 border-t border-slate-100 flex justify-center">
                  <button 
                    onClick={closeModal}
                    className="px-8 py-3 bg-[#002B5B] text-white font-bold rounded-xl hover:bg-[#003d82] transition-colors"
                  >
                    Fermer la lecture
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
