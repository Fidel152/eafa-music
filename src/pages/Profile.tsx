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
    try {
      const members = await api.members.list();
      const myData = members.find(m => m.id === user.id);
      if (myData) {
        setMemberData(myData);
        setFormData({
          fullName: myData.fullName || '',
          phoneNumber: myData.phoneNumber || '',
          avatarUrl: myData.avatarUrl || '',
          voiceType: myData.voiceType || '',
          instrument: myData.instrument || ''
        });
      }
    } catch (e) {
      console.error(e);
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
    } catch (error) {
      toast.error('Erreur lors de la mise à jour');
    } finally {
      setLoading(false);
    }
  };

  if (!memberData) return null;

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black text-[#002B5B] tracking-tight">Mon Espace Personnel</h1>
        <p className="text-slate-500 font-medium">Gérez vos informations et votre profil.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Card: Avatar & Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 flex flex-col items-center">
            <div className="relative group">
              <div className={`w-32 h-32 rounded-full flex items-center justify-center text-[#D4AF37] text-4xl font-black border-4 border-white shadow-xl overflow-hidden transition-all ${isEditing ? 'ring-4 ring-[#D4AF37]/30 scale-105' : ''}`}>
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
            
            <h2 className="mt-6 text-xl font-black text-[#002B5B] uppercase tracking-tight">{memberData.fullName}</h2>
            <div className="mt-2 flex items-center gap-2">
              <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                 {memberData.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                 {memberData.role}
              </span>
              <span className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-black uppercase rounded-full flex items-center gap-1">
                Actif
              </span>
            </div>

            {!isEditing && (
              <button 
                onClick={() => setIsEditing(true)}
                className="mt-6 w-full py-3 px-4 bg-[#D4AF37] text-[#002B5B] font-black rounded-xl flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-95 transition-all shadow-md"
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
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 md:p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <h3 className="text-lg font-black text-[#002B5B] flex items-center gap-2">
                Informations du compte
              </h3>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                disabled={loading}
                className={`px-5 py-2.5 rounded-xl text-sm font-black flex items-center gap-2 transition-all shadow-sm ${
                  isEditing 
                    ? 'bg-[#002B5B] text-white hover:bg-[#003d82]' 
                    : 'bg-white border border-slate-200 text-[#002B5B] hover:bg-slate-50'
                }`}
              >
                {isEditing ? (
                  <>{loading ? <span className="animate-spin">◌</span> : <Save size={18} />} Enregistrer</>
                ) : (
                  'Modifier'
                )}
              </button>
            </div>

            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <User size={14} className="text-[#D4AF37]" /> Nom complet
                  </label>
                  <input 
                    type="text"
                    disabled={!isEditing}
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#002B5B] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none disabled:opacity-70"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Phone size={14} className="text-[#D4AF37]" /> Numéro de téléphone
                  </label>
                  <input 
                    type="tel"
                    disabled={!isEditing}
                    value={formData.phoneNumber}
                    onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#002B5B] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none disabled:opacity-70"
                    placeholder="+261 ..."
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Shield size={14} className="text-[#D4AF37]" /> Pupitre / Voix
                  </label>
                  <select
                    disabled={!isEditing}
                    value={formData.voiceType}
                    onChange={(e) => setFormData({ ...formData, voiceType: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#002B5B] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none disabled:opacity-70 appearance-none"
                  >
                    <option value="">Sélectionner...</option>
                    <option value="Soprano">Soprano</option>
                    <option value="Alto">Alto</option>
                    <option value="Ténor">Ténor</option>
                    <option value="Basse">Basse</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                    <Save size={14} className="text-[#D4AF37]" /> Instrument (optionnel)
                  </label>
                  <input 
                    type="text"
                    disabled={!isEditing}
                    value={formData.instrument}
                    onChange={(e) => setFormData({ ...formData, instrument: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3.5 text-sm font-bold text-[#002B5B] focus:ring-2 focus:ring-[#D4AF37]/20 outline-none disabled:opacity-70"
                    placeholder="Piano, Guitare, etc."
                  />
                </div>
              </div>

              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100 flex items-start gap-4">
                <div className="p-3 rounded-xl bg-blue-100 text-blue-600">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <p className="text-sm font-black text-[#002B5B]">Statut du compte vérifié</p>
                  <p className="text-xs text-slate-500 leading-relaxed mt-1">
                    Votre identité a été confirmée par les administrateurs. Vous avez accès à toutes les fonctionnalités du portail EAFA Music.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
