import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Song } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Music,
  ChevronRight
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Songs() {
  const { user } = useAuth();
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedSong, setSelectedSong] = useState<Song | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    lyrics: '',
    chords: '',
    key: '',
    author: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadSongs();
  }, []);

  const loadSongs = async () => {
    try {
      const data = await api.songs.list();
      setSongs(data);
    } catch (error: any) {
      console.error("Load songs error:", error);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;

    try {
      if (editingId) {
        await api.songs.update(editingId, formData);
        toast.success('Chant mis à jour');
      } else {
        await api.songs.create({
          ...formData,
          category: 'chorale'
        });
        toast.success('Chant ajouté au répertoire');
      }
      loadSongs();
      closeModal();
    } catch (error: any) {
      console.error("Submit song error:", error);
      toast.error(`Erreur: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const toastId = toast.loading('Suppression en cours...');
    try {
      await api.songs.delete(id);
      toast.success('Chant supprimé', { id: toastId });
      await loadSongs();
    } catch (error: any) {
      console.error("Delete error:", error);
      toast.error('Erreur lors de la suppression: ' + error.message, { id: toastId });
    }
  };

  const openModal = (s?: Song) => {
    if (s) {
      setEditingId(s.id);
      setFormData({
        title: s.title,
        lyrics: s.lyrics,
        chords: s.chords || '',
        key: s.key,
        author: s.author || ''
      });
    } else {
      setEditingId(null);
      setFormData({ title: '', lyrics: '', chords: '', key: '', author: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredSongs = songs.filter(s => 
    s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.lyrics && s.lyrics.toLowerCase().includes(searchTerm.toLowerCase())) ||
    s.author?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight flex items-center gap-3">
            <Music className="text-[#D4AF37]" size={32} />
            Répertoire Chants
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Accédez aux paroles et accords de la chorale.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher un chant..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
            />
          </div>
          {isAdmin && (
            <button 
              onClick={() => openModal()}
              className="bg-[#002B5B] text-white font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#003d82] transition-colors shadow-lg"
            >
              <Plus size={20} />
              Ajouter
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          [1, 2, 3].map(i => (
            <div key={i} className="bg-white rounded-2xl h-32 animate-pulse" />
          ))
        ) : filteredSongs.length > 0 ? (
          filteredSongs.map(s => (
            <motion.div
              layoutId={s.id}
              key={s.id}
              onClick={() => setSelectedSong(s)}
              className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:border-[#D4AF37] transition-all cursor-pointer flex items-center justify-between group"
            >
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-slate-50 rounded-xl flex items-center justify-center text-[#D4AF37] font-black">
                  {s.key}
                </div>
                <div>
                  <h3 className="font-bold text-[#002B5B] group-hover:text-[#D4AF37] transition-colors">{s.title}</h3>
                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">{s.author || 'Auteur inconnu'}</p>
                </div>
              </div>
              <ChevronRight className="text-slate-300 group-hover:text-[#D4AF37] transition-all" size={20} />
            </motion.div>
          ))
        ) : (
          <div className="col-span-full py-12 text-center text-slate-400">
            Aucun chant trouvé.
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedSong && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSong(null)}
              className="absolute inset-0 bg-[#002B5B]/90 backdrop-blur-md"
            />
            <motion.div 
              layoutId={selectedSong.id}
              className="relative bg-white rounded-3xl w-full max-w-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              <div className="p-8 bg-slate-50 flex items-center justify-between border-b border-slate-100">
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-[#D4AF37] rounded-2xl flex items-center justify-center text-[#002B5B] text-2xl font-black shadow-lg">
                    {selectedSong.key}
                  </div>
                  <div>
                    <h2 className="text-3xl font-black text-[#002B5B]">{selectedSong.title}</h2>
                    <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">{selectedSong.author}</p>
                  </div>
                </div>
                    <div className="flex items-center gap-3">
                      {isAdmin && (
                        <>
                          {itemToDelete === selectedSong.id ? (
                            <div className="flex items-center gap-2 bg-red-50 p-1.5 rounded-2xl border border-red-100">
                              <span className="text-[10px] font-black text-red-400 uppercase tracking-tighter px-2">Supprimer ?</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setItemToDelete(null); }}
                                className="px-3 py-1.5 bg-white text-slate-500 rounded-xl text-xs font-bold shadow-sm"
                              >
                                Non
                              </button>
                              <button 
                                onClick={async (e) => { 
                                  e.stopPropagation(); 
                                  await handleDelete(selectedSong.id); 
                                  setSelectedSong(null); 
                                  setItemToDelete(null);
                                }}
                                className="px-3 py-1.5 bg-red-500 text-white rounded-xl text-xs font-bold shadow-sm"
                              >
                                Oui
                              </button>
                            </div>
                          ) : (
                            <>
                              <button 
                                onClick={(e) => { e.stopPropagation(); openModal(selectedSong); }}
                                className="p-3 bg-white text-blue-500 rounded-xl shadow-sm border border-slate-100 hover:bg-blue-50 transition-all"
                              >
                                <Edit2 size={20} />
                              </button>
                              <button 
                                onClick={(e) => { 
                                  e.stopPropagation(); 
                                  setItemToDelete(selectedSong.id);
                                }}
                                className="p-3 bg-white text-red-500 rounded-xl shadow-sm border border-slate-100 hover:bg-red-50 transition-all"
                              >
                                <Trash2 size={20} />
                              </button>
                            </>
                          )}
                        </>
                      )}
                      <button onClick={() => { setSelectedSong(null); setItemToDelete(null); }} className="p-3 bg-white text-slate-500 rounded-xl shadow-sm border border-slate-100 hover:bg-slate-50 transition-all">
                        <X size={20} />
                      </button>
                    </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 md:p-8 grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                <div>
                  <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 md:6 border-b border-slate-100 pb-2">Paroles</h4>
                  <pre className="font-sans whitespace-pre-wrap text-base md:text-lg leading-relaxed text-slate-700">
                    {selectedSong.lyrics}
                  </pre>
                </div>
                <div className="bg-[#002B5B] text-white p-6 md:p-8 rounded-3xl">
                  <h4 className="text-xs font-black text-[#D4AF37] uppercase tracking-widest mb-4 md:6 border-b border-white/10 pb-2">Accords & Progression</h4>
                  <pre className="font-mono text-lg md:text-xl whitespace-pre-wrap leading-loose tracking-wider">
                    {selectedSong.chords || 'Non spécifiés'}
                  </pre>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Create/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={closeModal}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
               <div className="p-6 bg-[#002B5B] text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? 'Modifier le chant' : 'Ajouter un chant'}</h2>
                <button onClick={closeModal}><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6 overflow-y-auto">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Titre</label>
                    <input 
                      type="text" required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Tonalité</label>
                      <input 
                        type="text" required placeholder="ex: Sol / G"
                        value={formData.key}
                        onChange={(e) => setFormData({ ...formData, key: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Auteur</label>
                      <input 
                        type="text"
                        value={formData.author}
                        onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Paroles</label>
                    <textarea 
                      required rows={12}
                      value={formData.lyrics}
                      onChange={(e) => setFormData({ ...formData, lyrics: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none font-sans"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Accords</label>
                    <textarea 
                      rows={12}
                      value={formData.chords}
                      onChange={(e) => setFormData({ ...formData, chords: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none resize-none font-mono"
                      placeholder="Sol Do Sol Do..."
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold bg-slate-100 rounded-xl">Annuler</button>
                  <button type="submit" className="flex-2 py-4 font-black bg-[#D4AF37] text-[#002B5B] rounded-xl shadow-lg">Continuer</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
