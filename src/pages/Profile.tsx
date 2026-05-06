import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Member } from '../types';
import { toast } from 'sonner';
import { Camera, Phone, User, Shield, CheckCircle2, Save, Trash2, LogOut } from 'lucide-react';
import { motion } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export default function Profile() {
  const { user, logout, updateUser } = useAuth();
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  
  const [formData, setFormData] = useState({
    fullName: '',
    phoneNumber: '',
    avatarUrl: '',
    voiceType: '',
    instrument: ''
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const members = await api.members.list();
      // Try finding by ID first, then fallback to email for more resilience
      let myData = members.find(m => m.id === user.id);
      if (!myData && user.email) {
        myData = members.find(m => m.email?.toLowerCase() === user.email?.toLowerCase());
      }

      if (myData) {
        setMemberData(myData);
        setFormData({
          fullName: myData.fullName || '',
          phoneNumber: myData.phoneNumber || '',
          avatarUrl: myData.avatarUrl || '',
          voiceType: myData.voiceType || '',
          instrument: myData.instrument || ''
        });
      } else {
        console.warn("Member data not found for user:", user.id, user.email);
      }
    } catch (e) {
      console.error(e);
      toast.error("Erreur de chargement du profil");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!user) return;
    setLoading(true);
    try {
      await api.members.update(user.id, {
        fullName: formData.fullName,
        phoneNumber: formData.phoneNumber,
        avatarUrl: formData.avatarUrl,
        voiceType: formData.voiceType,
        instrument: formData.instrument
      });
      
      updateUser({ 
        displayName: formData.fullName,
        avatarUrl: formData.avatarUrl 
      });
      
      toast.success('Profil mis à jour');
      setIsEditing(false);
      loadProfile();
    } catch (error: any) {
      console.error("Update profile error:", error);
      toast.error(error.message || 'Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (loading && !memberData) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-[#D4AF37]/20 border-t-[#D4AF37] rounded-full animate-spin" />
        <p className="text-[#002B5B] font-bold animate-pulse">Chargement de votre profil...</p>
      </div>
    );
  }

  if (!memberData && !loading) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-400">Impossible de charger les données du profil.</p>
        <button 
          onClick={loadProfile}
          className="mt-4 text-[#D4AF37] font-bold hover:underline"
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#002B5B] tracking-tight">Mon Espace Personnel</h1>
        <p className="text-slate-500 font-medium">Gérez vos informations et votre profil.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Card: Avatar & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-br from-[#002B5B] to-[#004a9d] z-0" />
            
            <div className="relative z-10 mt-4">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-[#D4AF37] text-4xl font-black border-4 border-white shadow-xl overflow-hidden transition-all bg-white ${isEditing ? 'ring-4 ring-[#D4AF37]/30 scale-105' : ''}`}>
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  memberData.fullName.charAt(0)
                )}
                {isEditing && (
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                    <Camera size={32} className="text-white opacity-80" />
                  </div>
                )}
              </div>
              {isEditing && (
                <label className="absolute bottom-0 right-0 p-3 bg-[#D4AF37] text-[#002B5B] rounded-full shadow-lg hover:scale-125 transition-transform cursor-pointer z-10">
                  <Camera size={20} />
                  <input 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onloadend = () => {
                          setFormData({ ...formData, avatarUrl: reader.result as string });
                          toast.success("Image chargée localement");
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                </label>
              )}
            </div>
            
            <div className="relative z-10 text-center mt-6">
              <h2 className="text-xl font-black text-[#002B5B] uppercase tracking-tight">{memberData.fullName}</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                   {memberData.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                   {memberData.role}
                </span>
                <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                  Active
                </span>
              </div>
            </div>

            {/* Access Key Section */}
            <div className="w-full mt-8 p-6 bg-amber-50 rounded-2xl border border-amber-100/50 relative group/key">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-1">Clé d'Accès Personnelle</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-black text-[#002B5B] tracking-widest bg-white px-4 py-1.5 rounded-xl border border-amber-100 shadow-sm">
                    {memberData.accessName || memberData.id}
                  </span>
                </div>
                <p className="mt-3 text-[9px] text-amber-600/70 text-center font-bold italic leading-tight">
                  Identifiant unique pour toutes vos connexions au portail.
                </p>
              </div>
              <div className="absolute top-2 right-2 opacity-10">
                <Shield size={24} className="text-amber-500" />
              </div>
            </div>

            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="mt-6 w-full py-4 px-4 bg-[#D4AF37] text-[#002B5B] font-black rounded-2xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-lg shadow-[#D4AF37]/20"
              >
                <Camera size={18} />
                Modifier le profil
              </button>
            )}

            <div className="w-full border-t border-slate-100 my-6" />

            <div className="w-full space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Membre depuis</span>
                <span className="text-[#002B5B] font-bold">
                  {format(new Date(memberData.joinedAt || Date.now()), 'd MMM yyyy', { locale: fr })}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-400 font-medium">Dernière visite</span>
                <span className="text-[#002B5B] font-bold">Aujourd'hui</span>
              </div>
            </div>
            
            <button 
              onClick={logout}
              className="mt-8 w-full py-4 px-6 border-2 border-red-50 text-red-500 font-black rounded-2xl flex items-center justify-center gap-2 hover:bg-red-50 transition-all"
            >
              <LogOut size={18} />
              Se déconnecter
            </button>
          </div>
        </div>

        {/* Right Card: Form */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-[2.5rem] shadow-[0_10px_50px_rgba(0,0,0,0.03)] border border-slate-50 overflow-hidden">
            <div className="p-8 md:p-10 border-b border-slate-50 flex items-center justify-between bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-blue-50 rounded-xl">
                  <Shield className="text-[#002B5B]" size={20} />
                </div>
                <h3 className="text-xl font-black text-[#002B5B]">
                  Informations du compte
                </h3>
              </div>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={loading}
                className={`px-6 py-3 rounded-2xl text-sm font-black flex items-center gap-2 transition-all shadow-xl active:scale-95 ${
                  isEditing 
                    ? 'bg-[#002B5B] text-white hover:bg-[#003d82] shadow-[#002B5B]/20' 
                    : 'bg-white border border-slate-100 text-[#002B5B] hover:bg-slate-50'
                }`}
              >
                {isEditing ? (
                  <>{loading ? <span className="animate-spin">◌</span> : <Save size={18} />} Enregistrer</>
                ) : (
                  'Modifier'
                )}
              </button>
            </div>

            <div className="p-8 md:p-12 space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    Nom complet d'affichage
                  </label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                    <input 
                      type="text"
                      disabled={!isEditing}
                      value={formData.fullName}
                      onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-[#002B5B] focus:ring-4 focus:ring-[#D4AF37]/10 focus:bg-white focus:border-[#D4AF37]/30 outline-none transition-all disabled:opacity-50"
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    Numéro de Téléphone
                  </label>
                  <div className="relative group">
                    <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#D4AF37] transition-colors" size={18} />
                    <input 
                      type="tel"
                      disabled={!isEditing}
                      value={formData.phoneNumber}
                      onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                      className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 pl-12 pr-4 text-base font-bold text-[#002B5B] focus:ring-4 focus:ring-[#D4AF37]/10 focus:bg-white focus:border-[#D4AF37]/30 outline-none transition-all disabled:opacity-50"
                      placeholder="+261 ..."
                    />
                  </div>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    Pupitre / Registre Vocal
                  </label>
                  <select
                    disabled={!isEditing}
                    value={formData.voiceType}
                    onChange={(e) => setFormData({ ...formData, voiceType: e.target.value })}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-base font-bold text-[#002B5B] focus:ring-4 focus:ring-[#D4AF37]/10 focus:bg-white focus:border-[#D4AF37]/30 outline-none transition-all disabled:opacity-50 appearance-none cursor-pointer"
                  >
                    <option value="">Sélectionner votre voix...</option>
                    <option value="Soprano">Soprano</option>
                    <option value="Alto">Alto</option>
                    <option value="Ténor">Ténor</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    Instrument de prédilection
                  </label>
                  <input 
                    type="text"
                    disabled={!isEditing}
                    value={formData.instrument}
                    onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                    className="w-full bg-slate-50/50 border border-slate-100 rounded-2xl py-4 px-6 text-base font-bold text-[#002B5B] focus:ring-4 focus:ring-[#D4AF37]/10 focus:bg-white focus:border-[#D4AF37]/30 outline-none transition-all disabled:opacity-50"
                    placeholder="Ex: Piano"
                  />
                </div>
              </div>

              <div className="pt-6">
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-3xl p-8 border border-blue-100/50 flex items-start gap-6">
                  <div className="p-4 rounded-2xl bg-white shadow-sm text-blue-600">
                    <CheckCircle2 size={28} />
                  </div>
                  <div>
                    <p className="text-lg font-black text-[#002B5B]">Statut du compte vérifié</p>
                    <p className="text-sm text-slate-500 leading-relaxed mt-2 max-w-lg">
                      Votre identité a été confirmée par les administrateurs du portail. Vous bénéficiez de l'accès total aux ressources musicales.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
