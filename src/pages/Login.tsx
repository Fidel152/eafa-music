import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'sonner';
import { motion } from 'motion/react';
import { Music2, User } from 'lucide-react';

export default function Login() {
  const { login } = useAuth();
  const { requestPermission } = useNotifications();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Veuillez entrer votre nom");
      return;
    }

    setLoading(true);
    try {
      const result = await login(name.trim());
      if (result.success) {
        // Request notification permission after successful login
        setTimeout(() => {
          requestPermission().catch(console.error);
        }, 1000);

        if (result.role === 'admin') {
          toast.success(`Bienvenue Administrateur ${name}!`);
        } else {
          toast.success(`Bienvenue ${name}!`);
        }
        navigate('/');
      } else {
        toast.error("Connexion impossible.");
      }
    } catch (error: any) {
      console.error("Login catch:", error);
      let message = "Erreur lors de la connexion";
      try {
        const parsed = JSON.parse(error.message);
        if (parsed.error) message = parsed.error;
      } catch (e) {
        if (error.message) message = error.message;
      }
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-[#002B5B]">
      {/* Decorative Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/20 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-[#D4AF37]/10 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 relative z-10"
      >
        <div className="text-center mb-8">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="inline-block p-4 bg-[#D4AF37] rounded-3xl shadow-2xl mb-4"
          >
            <Music2 size={48} className="text-[#002B5B]" />
          </motion.div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">EAFA Music</h1>
          <p className="text-[#D4AF37] font-medium uppercase tracking-widest text-sm">Portail Chorale</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl">
          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest ml-1">Clé d'Accès Personnel</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: CHORISTE-01"
                  className="w-full bg-white/10 border border-white/20 rounded-xl py-4 pl-12 pr-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 transition-all font-medium"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#D4AF37] hover:bg-[#C49F27] active:scale-95 text-[#002B5B] font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-3 text-lg"
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-[#002B5B]/30 border-t-[#002B5B] rounded-full animate-spin" />
              ) : (
                "Se connecter"
              )}
            </button>
            
            <div className="flex items-center gap-4 py-2">
              <div className="h-px bg-white/10 flex-1" />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Aide</span>
              <div className="h-px bg-white/10 flex-1" />
            </div>
            
            <p className="text-center text-[10px] text-slate-400 font-medium leading-relaxed uppercase">
              Veuillez saisir la clé fournie par le coordinateur pour vous identifier.
            </p>
          </form>
        </div>

        <footer className="mt-12 text-center text-slate-500 text-xs font-medium">
          <p>&copy; 2026 EAFA Music &bull; Service Communication</p>
        </footer>
      </motion.div>
    </div>
  );
}
