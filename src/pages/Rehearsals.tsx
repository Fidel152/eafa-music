import React, { useEffect, useState } from 'react';
import { api, getCached } from '../lib/api';
import { Rehearsal, Attendance, Member } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { 
  Plus, 
  Calendar, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  Clock3, 
  Users,
  Search,
  Trash2,
  ChevronRight
} from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';

export default function Rehearsals() {
  const { user } = useAuth();
  const [rehearsals, setRehearsals] = useState<Rehearsal[]>([]);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<Record<string, Attendance[]>>({});
  const [selectedRehearsal, setSelectedRehearsal] = useState<Rehearsal | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: '',
    location: 'Salle habituelle'
  });

  const isAdmin = user?.role === 'admin';

  useEffect(() => {
    if (getCached('rehearsals_list')) {
      setLoading(false);
    }
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const rehearsalsData = await api.rehearsals.list();
      setRehearsals(rehearsalsData);
      
      if (isAdmin) {
        const membersData = await api.members.list();
        setMembers(membersData);
      }

      // Load attendance for each rehearsal
      const attendanceMap: Record<string, Attendance[]> = {};
      for (const r of rehearsalsData) {
        const att = await api.attendance.listForRehearsal(r.id);
        attendanceMap[r.id] = att;
      }
      setAttendance(attendanceMap);

    } catch (error: any) {
      toast.error("Erreur de chargement");
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAttendance = async (rehearsalId: string, status: Attendance['status']) => {
    if (!user) return;
    const toastId = toast.loading('Mise à jour...');
    try {
      await api.attendance.update(rehearsalId, user.id, status);
      toast.success('Présence mise à jour', { id: toastId });
      loadData(); // Reload to show update
    } catch (error: any) {
      console.error("Attendance update error details:", error);
      const message = error.message || 'Erreur lors de la mise à jour';
      toast.error("Échec: " + message, { id: toastId });
    }
  };

  const handleDeleteRehearsal = async (id: string) => {
    if (!isAdmin) return;
    try {
      await api.rehearsals.delete(id);
      toast.success('Répétition annulée');
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    try {
      await api.rehearsals.create(formData);
      toast.success('Répétition planifiée');
      setIsModalOpen(false);
      setFormData({ title: '', description: '', date: '', location: 'Salle habituelle' });
      loadData();
    } catch (error) {
      toast.error('Erreur lors de la création');
    }
  };

  const getUserAttendance = (rehearsalId: string) => {
    const list = attendance[rehearsalId] || [];
    return list.find(a => a.memberId === user?.id);
  };

  const getAttendanceStats = (rehearsalId: string) => {
    const list = attendance[rehearsalId] || [];
    return {
      present: list.filter(a => a.status === 'present').length,
      absent: list.filter(a => a.status === 'absent').length,
      late: list.filter(a => a.status === 'late').length,
      excused: list.filter(a => a.status === 'excused').length,
    };
  };

  return (
    <div className="max-w-6xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
        <div>
          <h1 className="text-3xl font-black text-[#002B5B] tracking-tight flex items-center gap-3">
            <Calendar className="text-[#D4AF37]" size={32} />
            Répétitions
          </h1>
          <p className="text-slate-500 font-medium tracking-tight">Planifiez vos séances et suivez les présences.</p>
        </div>

        {isAdmin && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-[#D4AF37] text-[#002B5B] font-black px-6 py-2.5 rounded-xl flex items-center gap-2 hover:bg-[#B8860B] transition-all shadow-lg shadow-[#D4AF37]/20"
          >
            <Plus size={20} />
            Planifier
          </button>
        )}
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-40 bg-white rounded-3xl animate-pulse shadow-sm" />
          ))}
        </div>
      ) : rehearsals.length > 0 ? (
        <div className="grid grid-cols-1 gap-6">
          <AnimatePresence>
            {rehearsals.map((rehearsal) => {
              const myAtt = getUserAttendance(rehearsal.id);
              const stats = getAttendanceStats(rehearsal.id);
              const isPast = new Date(rehearsal.date) < new Date();

              return (
                <motion.div
                  key={rehearsal.id}
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn(
                    "bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex flex-col md:flex-row gap-6 items-start md:items-center transition-all hover:shadow-xl",
                    isPast && "opacity-75 grayscale-[0.5]"
                  )}
                >
                  <div className="flex flex-col items-center justify-center bg-slate-50 rounded-2xl p-4 w-24 h-24 shrink-0 border border-slate-100">
                    <span className="text-[#D4AF37] text-xs font-black uppercase tracking-tighter">
                      {format(new Date(rehearsal.date), 'MMM', { locale: fr })}
                    </span>
                    <span className="text-3xl font-black text-[#002B5B]">
                      {format(new Date(rehearsal.date), 'd')}
                    </span>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="text-xl font-bold text-[#002B5B] truncate">{rehearsal.title}</h3>
                      {isPast && (
                        <span className="bg-slate-100 text-slate-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-widest">
                          Terminé
                        </span>
                      )}
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-4 text-slate-500 text-sm font-medium">
                      <div className="flex items-center gap-1.5">
                        <Clock size={14} className="text-[#D4AF37]" />
                        {format(new Date(rehearsal.date), 'HH:mm')}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin size={14} className="text-[#D4AF37]" />
                        {rehearsal.location}
                      </div>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5">
                          <Users size={14} className="text-[#D4AF37]" />
                          {stats.present} présents
                        </div>
                      )}
                    </div>

                    {rehearsal.description && (
                      <p className="mt-3 text-slate-500 text-sm line-clamp-2 italic">{rehearsal.description}</p>
                    )}
                  </div>

                  <div className="flex flex-col gap-3 w-full md:w-auto">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center md:text-left">
                      Votre présence
                    </p>
                    <div className="flex flex-wrap items-center gap-1 bg-slate-50 p-1 rounded-2xl border border-slate-100 justify-center">
                      <button
                        onClick={() => handleUpdateAttendance(rehearsal.id, 'present')}
                        className={cn(
                          "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2",
                          myAtt?.status === 'present' 
                            ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20" 
                            : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-500"
                        )}
                      >
                        <CheckCircle2 size={14} className="sm:w-4 sm:h-4" />
                        <span className="truncate">Présent</span>
                      </button>
                      <button
                        onClick={() => handleUpdateAttendance(rehearsal.id, 'absent')}
                        className={cn(
                          "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2",
                          myAtt?.status === 'absent' 
                            ? "bg-red-500 text-white shadow-lg shadow-red-500/20" 
                            : "text-slate-400 hover:bg-red-50 hover:text-red-500"
                        )}
                      >
                        <XCircle size={14} className="sm:w-4 sm:h-4" />
                        <span className="truncate">Absent</span>
                      </button>
                      <button
                        onClick={() => handleUpdateAttendance(rehearsal.id, 'excused')}
                        className={cn(
                          "px-3 sm:px-4 py-2 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2",
                          myAtt?.status === 'excused' 
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20" 
                            : "text-slate-400 hover:bg-blue-50 hover:text-blue-500"
                        )}
                      >
                        <Clock3 size={14} className="sm:w-4 sm:h-4" />
                        <span className="truncate">Excusé</span>
                      </button>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-2 mt-2">
                        <button 
                          onClick={() => setSelectedRehearsal(rehearsal)}
                          className="flex-1 py-2 text-xs font-bold text-[#002B5B] bg-slate-100 rounded-xl hover:bg-slate-200"
                        >
                          Détails présences
                        </button>
                        <button 
                          onClick={() => handleDeleteRehearsal(rehearsal.id)}
                          className="p-2 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        <div className="bg-white rounded-3xl p-20 text-center border border-slate-100">
          <Calendar size={64} className="mx-auto text-slate-100 mb-6" />
          <h3 className="text-2xl font-black text-[#002B5B] mb-2">Aucune répétition planifiée</h3>
          <p className="text-slate-500 font-medium">Tout est tranquille pour le moment.</p>
        </div>
      )}

      {/* Planify Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl"
            >
              <div className="bg-[#002B5B] p-6 text-white flex items-center justify-between">
                <h2 className="text-xl font-bold">Planifier une séance</h2>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Titre / Type</label>
                  <input 
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="ex: Répétition générale, Section Sopranos..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Date et Heure</label>
                    <input 
                      type="datetime-local"
                      required
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Lieu</label>
                    <input 
                      type="text"
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Description / Notes</label>
                  <textarea 
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20"
                    placeholder="Chants à travailler, matériel à apporter..."
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 rounded-xl bg-[#D4AF37] text-[#002B5B] font-black shadow-lg shadow-[#D4AF37]/20 hover:bg-[#B8860B] transition-all"
                >
                  Planifier maintenant
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Attendance Details Modal */}
      <AnimatePresence>
        {selectedRehearsal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedRehearsal(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative bg-white rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[80vh]"
            >
              <div className="bg-[#002B5B] p-6 text-white flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Présences : {selectedRehearsal.title}</h2>
                  <p className="text-slate-400 text-xs font-medium">
                    {format(new Date(selectedRehearsal.date), 'EEEE d MMMM yyyy', { locale: fr })}
                  </p>
                </div>
                <button onClick={() => setSelectedRehearsal(null)} className="p-2 hover:bg-white/10 rounded-full">
                  <Plus className="rotate-45" size={24} />
                </button>
              </div>

              <div className="p-0 overflow-y-auto flex-1">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Membre</th>
                      <th className="px-6 py-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">Statut</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {members.map(member => {
                      const att = attendance[selectedRehearsal.id]?.find(a => a.memberId === member.id);
                      return (
                        <tr key={member.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center text-[#D4AF37] font-bold text-xs">
                                {member.fullName.charAt(0)}
                              </div>
                              <span className="font-bold text-[#002B5B] text-sm">{member.fullName}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex justify-center">
                              {att ? (
                                <span className={cn(
                                  "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ring-1",
                                  att.status === 'present' && "bg-emerald-50 text-emerald-600 ring-emerald-500/20",
                                  att.status === 'absent' && "bg-red-50 text-red-600 ring-red-500/20",
                                  att.status === 'excused' && "bg-blue-50 text-blue-600 ring-blue-500/20",
                                  att.status === 'late' && "bg-amber-50 text-amber-600 ring-amber-500/20",
                                )}>
                                  {att.status === 'present' ? 'Présent' : 
                                   att.status === 'absent' ? 'Absent' : 
                                   att.status === 'excused' ? 'Excusé' : 'Retard'}
                                </span>
                              ) : (
                                <span className="text-slate-300 text-[10px] font-bold uppercase italic">Non renseigné</span>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
