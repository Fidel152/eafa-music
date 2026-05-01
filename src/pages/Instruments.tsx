import React, { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Instrument } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { cn } from '../lib/utils';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Guitar,
  Activity
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function Instruments() {
  const { user } = useAuth();
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [itemToDelete, setItemToDelete] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    quantity: 1,
    condition: 'Bon état',
    imageUrl: ''
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    loadInstruments();
  }, []);

  const loadInstruments = async () => {
    try {
      const data = await api.instruments.list();
      setInstruments(data);
    } catch (error: any) {
      console.error("Load instruments error:", error);
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
        await api.instruments.update(editingId, {
          ...formData
        });
        toast.success('Instrument mis à jour');
      } else {
        await api.instruments.create({
          ...formData,
          category: 'musique',
          lastMaintenance: new Date()
        });
        toast.success('Nouvel instrument répertorié');
      }
      loadInstruments();
      closeModal();
    } catch (error: any) {
      console.error("Submit instrument error:", error);
      toast.error(`Erreur lors de l’opération: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) return;
    const toastId = toast.loading('Suppression en cours...');
    try {
      await api.instruments.delete(id);
      toast.success('Instrument supprimé', { id: toastId });
      await loadInstruments();
    } catch (error: any) {
      toast.error('Erreur lors de la suppression: ' + error.message, { id: toastId });
    }
  };

  const openModal = (inst?: Instrument) => {
    if (inst) {
      setEditingId(inst.id);
      setFormData({
        name: inst.name,
        quantity: inst.quantity,
        condition: inst.condition,
        imageUrl: inst.imageUrl || ''
      });
    } else {
      setEditingId(null);
      setFormData({ name: '', quantity: 1, condition: 'Bon état', imageUrl: '' });
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const filteredInstruments = instruments.filter(inst => 
    inst.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight flex items-center gap-3">
            <Guitar className="text-[#D4AF37]" size={32} />
            Instruments
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Inventaire du matériel de l'église.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 w-full md:w-64 outline-none focus:ring-2 focus:ring-[#D4AF37]/20 transition-all"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {loading ? (
          [1, 2, 3, 4].map(i => (
            <div key={i} className="bg-white rounded-3xl h-72 animate-pulse" />
          ))
        ) : filteredInstruments.length > 0 ? (
          filteredInstruments.map(inst => (
            <motion.div
              key={inst.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden flex flex-col group hover:shadow-xl transition-all duration-300"
            >
              <div className="h-40 bg-slate-50 relative overflow-hidden">
                {inst.imageUrl ? (
                  <img 
                    src={inst.imageUrl} 
                    alt={inst.name} 
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-200">
                    <Guitar size={48} />
                  </div>
                )}
                <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-black text-[#002B5B] shadow-sm">
                  QUANTITÉ: {inst.quantity}
                </div>
              </div>

              <div className="p-6 flex-1 flex flex-col">
                <h3 className="text-xl font-bold text-[#002B5B] mb-2">{inst.name}</h3>
                <div className="flex items-center gap-2 mb-6">
                  <Activity size={14} className="text-[#D4AF37]" />
                  <span className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-md",
                    inst.condition === 'Excellent' ? 'bg-green-100 text-green-700' :
                    inst.condition === 'Bon état' ? 'bg-blue-100 text-blue-700' :
                    'bg-orange-100 text-orange-700'
                  )}>
                    {inst.condition}
                  </span>
                </div>

                <div className="mt-auto flex items-center justify-end border-t border-slate-50 pt-4 gap-2">
                  {isAdmin && (
                    <>
                      {itemToDelete === inst.id ? (
                        <div className="flex items-center gap-1 bg-red-50 p-1 rounded-xl border border-red-100">
                          <button 
                            onClick={(e) => { e.stopPropagation(); setItemToDelete(null); }}
                            className="px-2 py-1 bg-white text-slate-500 rounded-lg text-[10px] font-bold shadow-sm"
                          >
                            Non
                          </button>
                          <button 
                            onClick={async (e) => { 
                              e.stopPropagation(); 
                              await handleDelete(inst.id); 
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
                            onClick={() => openModal(inst)}
                            className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button 
                            onClick={() => setItemToDelete(inst.id)}
                            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                          >
                            <Trash2 size={18} />
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          ))
        ) : (
          <div className="col-span-full bg-white rounded-3xl p-12 text-center text-slate-400">
            Aucun instrument répertorié.
          </div>
        )}
      </div>

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
              className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-[#002B5B] p-6 text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">{editingId ? 'Modifier l’instrument' : 'Nouvel instrument'}</h2>
                <button onClick={closeModal}><X size={24} /></button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nom de l'instrument</label>
                  <input 
                    type="text" required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    placeholder="Ex: Piano Yamaha P-45"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Quantité</label>
                    <input 
                      type="number" required min="1"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">État</label>
                    <select 
                      value={formData.condition}
                      onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    >
                      <option>Excellent</option>
                      <option>Bon état</option>
                      <option>Moyen</option>
                      <option>À réparer</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">URL de la photo (optionnel)</label>
                  <input 
                    type="url"
                    value={formData.imageUrl}
                    onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:ring-2 focus:ring-[#D4AF37]/20 outline-none"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={closeModal} className="flex-1 py-4 font-bold bg-slate-100 rounded-xl">Annuler</button>
                  <button type="submit" className="flex-2 py-4 font-black bg-[#D4AF37] text-[#002B5B] rounded-xl shadow-lg">Soumettre</button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
