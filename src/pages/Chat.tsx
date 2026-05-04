import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { supabase } from '../lib/supabase';
import { Member, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, Send, User, Clock, Phone, Mail, Image as ImageIcon, CheckCircle2, ChevronLeft, Trash2, Info, Paperclip, Mic, Video, Camera, MoreVertical, X, Play, Volume2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

export default function Chat() {
  const { user } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedMessage, setSelectedMessage] = useState<Message | null>(null);
  const [showMediaOptions, setShowMediaOptions] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isRecording) {
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(timerRef.current);
  }, [isRecording]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async (e) => {
          const base64 = e.target?.result as string;
          await handleSendMessage(undefined, 'audio', base64);
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Recording error:", err);
      toast.error("Veuillez autoriser le micro");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    loadMembers();
    loadConversations();
    
    // Real-time subscription for messages
    const channel = supabase
      .channel('public:messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          const newest = payload.new as any;
          if (user && (newest.sender_id === user.id || newest.receiver_id === user.id)) {
            loadConversations();
            if (selectedMember && (newest.sender_id === selectedMember.id || newest.receiver_id === selectedMember.id)) {
              loadMessages();
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, selectedMember]); // Re-subscribe if selection changes or user changes

  const loadConversations = async () => {
    if (!user) return;
    try {
      const data = await api.messages.listConversations(user.id);
      setConversations(data);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (selectedMember) {
      loadMessages();
      const interval = setInterval(loadMessages, 5000); // Poll for new messages every 5s
      return () => clearInterval(interval);
    }
  }, [selectedMember]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const loadMembers = async () => {
    try {
      const data = await api.members.list();
      setMembers(data.filter(m => m.id !== user?.id));
    } catch (error) {
      console.error("Load members chat error:", error);
    } finally {
      setLoading(false);
    }
  };

  const getUnreadStatus = (memberId: string) => {
    const conv = conversations.find(c => 
      (c.senderId === memberId && c.receiverId === user?.id)
    );
    return conv && !conv.read;
  };

  const loadMessages = async () => {
    if (!user || !selectedMember) return;
    try {
      const data = await api.messages.listThread(user.id, selectedMember.id);
      setMessages(data);
      // Mark as read
      api.messages.markAsRead(user.id, selectedMember.id).catch(console.error);
    } catch (error) {
      console.error("Load messages error:", error);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, type: any = 'text', fileUrl?: string) => {
    if (e) e.preventDefault();
    if (!user || !selectedMember) return;
    if (type === 'text' && !newMessage.trim()) return;

    const toastId = toast.loading("Envoi en cours...");

    try {
      await api.messages.send({
        senderId: user.id,
        receiverId: selectedMember.id,
        content: type === 'text' ? newMessage.trim() : (type === 'image' ? 'Image' : type === 'audio' ? 'Audio' : (type === 'video' ? 'Video' : 'Fichier')),
        type,
        fileUrl
      });
      setNewMessage('');
      setShowMediaOptions(false);
      loadMessages();
      toast.success("Envoyé", { id: toastId });
    } catch (error: any) {
      console.error("Send message error details:", error);
      let errorMsg = "Erreur d'envoi";
      if (error?.message?.includes('payload too large')) {
        errorMsg = "Fichier trop volumineux (Max ~1MB)";
      } else if (error?.message?.includes('column "type" does not exist')) {
        errorMsg = "Table messages obsolète (colonnes manquantes)";
      }
      toast.error(errorMsg, { id: toastId });
    }
  };

  const handleDeleteMessage = async (id: string) => {
    if (!confirm("Supprimer ce message ?")) return;
    try {
      await api.messages.delete(id);
      loadMessages();
      setSelectedMessage(null);
      toast.success("Message supprimé");
    } catch (e) {
      toast.error("Erreur lors de la suppression");
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, type: any) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Le fichier est trop lourd (Max 2Mo)");
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      let url = event.target?.result as string;
      
      if (type === 'image' || type === 'photo') {
        const img = new Image();
        img.src = url;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 1200;
          let width = img.width;
          let height = img.height;

          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          const compressed = canvas.toDataURL('image/jpeg', 0.7);
          handleSendMessage(undefined, type, compressed);
        };
      } else {
        await handleSendMessage(undefined, type, url);
      }
    };
    reader.readAsDataURL(file);
    // Reset input
    if (e.target) e.target.value = '';
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const isOnline = (lastSeen: any) => {
    if (!lastSeen) return false;
    const now = new Date();
    const seen = new Date(lastSeen);
    // Consider online if seen in last 2 minutes
    return now.getTime() - seen.getTime() < 120000;
  };

  const filteredMembers = members.filter(m => 
    m.fullName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="w-full max-w-7xl mx-auto h-[calc(100vh-100px)] md:h-[calc(100vh-140px)] flex bg-white rounded-2xl md:rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Sidebar Members List */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 flex flex-col shrink-0 ${selectedMember ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 md:p-6 border-b border-slate-100 bg-[#002B5B]">
          <h2 className="text-lg md:text-xl font-black text-white mb-4">Messagerie</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#003d82] border-none text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37]/50 transition-all outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-white">
          {filteredMembers.map(m => {
            const hasUnread = getUnreadStatus(m.id);
            const isSelected = selectedMember?.id === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`w-full p-4 flex items-center gap-3 transition-all border-b border-slate-50 relative group ${
                  isSelected 
                    ? 'bg-[#D4AF37]/10' 
                    : hasUnread 
                      ? 'bg-amber-50 hover:bg-amber-100' 
                      : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative shrink-0">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-slate-100 border-2 ${isSelected ? 'border-[#D4AF37]' : 'border-white'} shadow-sm flex items-center justify-center`}>
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[#002B5B] font-black text-sm md:text-base">{m.fullName.charAt(0)}</span>
                    )}
                  </div>
                  {isOnline(m.lastSeen) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-xs md:text-sm font-black truncate ${isSelected ? 'text-[#002B5B]' : 'text-slate-700'}`}>
                      {m.fullName}
                    </p>
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-[7px] font-black uppercase px-1 py-0.5 rounded shrink-0">New</span>
                    )}
                  </div>
                  <p className="text-[9px] md:text-[10px] text-slate-400 font-bold uppercase truncate tracking-tight">
                    {m.voiceType || 'Membre'} • {m.role === 'admin' ? 'Coordinateur' : 'Choriste'}
                  </p>
                </div>
              </button>
            );
          })}
          {filteredMembers.length === 0 && !loading && (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-xs italic">Aucun membre trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col min-w-0 bg-slate-50/50 ${!selectedMember ? 'hidden md:flex' : 'flex'}`}>
        {selectedMember ? (
          <>
            {/* Header */}
            <div className="p-3 md:p-5 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-2 md:gap-3 min-w-0">
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="md:hidden p-2 -ml-1 text-slate-400 hover:text-[#002B5B]"
                >
                  <ChevronLeft size={24} />
                </button>
                <div className="relative shrink-0">
                  <div className="w-9 h-9 md:w-11 md:h-11 rounded-full overflow-hidden bg-[#002B5B] flex items-center justify-center text-[#D4AF37] font-black border-2 border-slate-100 shadow-sm">
                    {selectedMember.avatarUrl ? (
                      <img src={selectedMember.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedMember.fullName.charAt(0)
                    )}
                  </div>
                  {isOnline(selectedMember.lastSeen) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full" />
                  )}
                </div>
                <div className="min-w-0">
                  <h3 className="font-black text-[#002B5B] text-sm md:text-base leading-tight truncate">{selectedMember.fullName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isOnline(selectedMember.lastSeen) ? 'En ligne' : `Dernier passage à ${format(new Date(selectedMember.lastSeen || Date.now()), 'HH:mm')}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 md:gap-2 shrink-0 ml-2">
                {selectedMember.phoneNumber && (
                  <a href={`tel:${selectedMember.phoneNumber}`} className="p-2 text-[#002B5B] hover:bg-slate-100 rounded-lg transition-all hidden sm:flex">
                    <Phone size={18} />
                  </a>
                )}
                <button className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg">
                  <MoreVertical size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 bg-slate-50/30">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

                  return (
                    <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                      >
                        {!isMe && showAvatar && (
                          <div className="w-8 h-8 rounded-full bg-[#002B5B] overflow-hidden flex items-center justify-center text-[#D4AF37] text-[10px] font-black shrink-0 shadow-sm">
                            {selectedMember.avatarUrl ? (
                              <img src={selectedMember.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              selectedMember.fullName.charAt(0)
                            )}
                          </div>
                        )}
                        {!isMe && !showAvatar && <div className="w-8 shrink-0" />}
                        <div 
                          onClick={() => setSelectedMessage(msg)}
                          className={`max-w-[85%] md:max-w-[70%] rounded-2xl p-2.5 md:p-3.5 shadow-sm relative cursor-pointer active:scale-[0.98] transition-transform ${
                          isMe 
                            ? 'bg-[#002B5B] text-white rounded-br-none' 
                            : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                        } ${msg.deleted ? 'opacity-50 italic' : ''}`}>
                          
                          {!msg.deleted ? (
                            <>
                              {msg.type === 'text' && <p className="text-sm leading-relaxed">{msg.content}</p>}
                              
                              {(msg.type === 'image' || msg.type === 'photo') && (
                                <div className="rounded-xl overflow-hidden mb-1">
                                  <img src={msg.fileUrl} alt="Attachement" className="max-w-full h-auto max-h-80 object-contain rounded-lg" />
                                </div>
                              )}

                              {msg.type === 'audio' && (
                                <div className="flex flex-col gap-2 min-w-[200px]">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-[#D4AF37] flex items-center justify-center text-[#002B5B] shadow-md hover:scale-105 transition-transform" onClick={(e) => {
                                      e.stopPropagation();
                                      const audio = new Audio(msg.fileUrl);
                                      audio.play();
                                    }}>
                                      <Play fill="#002B5B" size={18} />
                                    </div>
                                    <div className="flex-1">
                                      <div className="h-1.5 w-full bg-slate-200 rounded-full overflow-hidden">
                                        <div className="h-full bg-[#D4AF37] w-1/3" />
                                      </div>
                                      <p className="text-[10px] mt-1 opacity-60">Audio Vocal</p>
                                    </div>
                                  </div>
                                  <audio src={msg.fileUrl} controls className="hidden" />
                                </div>
                              )}

                              {msg.type === 'video' && (
                                <div className="rounded-xl overflow-hidden relative group bg-black/20 aspect-video flex items-center justify-center">
                                  <video src={msg.fileUrl} className="w-full h-full object-cover" />
                                  <Play fill="#D4AF37" className="absolute text-[#D4AF37] group-hover:scale-110 transition-transform" size={40} />
                                </div>
                              )}
                            </>
                          ) : (
                            <p className="text-xs opacity-60 flex items-center gap-1.5">
                              <Trash2 size={12} /> Message supprimé
                            </p>
                          )}

                          <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                            <span className={`text-[8px] md:text-[9px] font-bold opacity-60`}>
                              {format(new Date(msg.createdAt), 'HH:mm')}
                            </span>
                            {isMe && !msg.deleted && (
                              <CheckCircle2 size={10} className={msg.read ? 'text-[#D4AF37]' : 'text-slate-400'} />
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                })}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* New Message Input */}
            <div className="p-4 md:p-6 bg-white border-t border-slate-100 relative">
              <AnimatePresence>
                {showMediaOptions && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: -10, scale: 1 }}
                    exit={{ opacity: 0, y: 20, scale: 0.9 }}
                    className="absolute bottom-full left-4 bg-white rounded-2xl shadow-2xl border border-slate-100 p-4 grid grid-cols-4 gap-4 z-50 mb-2"
                  >
                    {[
                      { icon: ImageIcon, color: 'bg-blue-500', type: 'image', label: 'Image' },
                      { icon: Camera, color: 'bg-green-500', type: 'photo', label: 'Appareil', capture: true },
                      { icon: Video, color: 'bg-red-500', type: 'video', label: 'Video' },
                      { icon: Mic, color: 'bg-purple-500', type: 'audio', label: 'Fichier' }
                    ].map((btn) => (
                      <label key={btn.type} className="flex flex-col items-center gap-1 cursor-pointer group">
                        <div className={`${btn.color} p-3 rounded-xl text-white group-hover:scale-110 transition-transform shadow-md`}>
                          <btn.icon size={20} />
                        </div>
                        <span className="text-[10px] font-bold text-slate-500 uppercase">{btn.label}</span>
                        <input 
                          type="file" 
                          className="hidden" 
                          capture={btn.capture ? 'environment' : undefined}
                          accept={btn.type === 'image' || btn.type === 'photo' ? 'image/*' : btn.type === 'video' ? 'video/*' : btn.type === 'audio' ? 'audio/*' : '*/*'}
                          onChange={(e) => handleFileUpload(e, btn.type)}
                        />
                      </label>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>

              <form onSubmit={(e) => handleSendMessage(e)} className="flex gap-2 md:gap-4 items-center">
                <button 
                  type="button"
                  onClick={() => setShowMediaOptions(!showMediaOptions)}
                  className={`p-3 md:p-4 rounded-2xl transition-all ${showMediaOptions ? 'bg-[#D4AF37] text-[#002B5B]' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                >
                  <Paperclip size={24} />
                </button>

                {isRecording ? (
                  <div className="flex-1 flex items-center gap-4 bg-red-50 p-2 md:p-3 rounded-2xl border border-red-100">
                    <div className="w-4 h-4 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]" />
                    <span className="text-red-600 font-bold text-sm tabular-nums flex-1">{formatTime(recordingTime)}</span>
                    <button 
                      type="button"
                      onClick={stopRecording}
                      className="p-3 bg-red-500 text-white rounded-xl shadow-lg hover:bg-red-600 transition-all font-black uppercase text-[10px] tracking-widest px-6"
                    >
                      Terminer
                    </button>
                  </div>
                ) : (
                  <>
                    <input 
                      type="text"
                      placeholder="Écrire un message..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all text-sm md:text-base outline-none font-medium text-[#002B5B]"
                    />
                    
                    <button 
                      type="button"
                      onClick={startRecording}
                      className="p-3 md:p-4 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 hover:text-red-500 transition-all shadow-sm"
                      title="Micro"
                    >
                      <Mic size={24} />
                    </button>

                    <button 
                      type="submit"
                      className={`p-3 md:p-4 rounded-2xl shadow-lg transition-all active:scale-95 flex items-center justify-center ${
                        newMessage.trim() 
                          ? 'bg-[#002B5B] text-[#D4AF37] scale-105' 
                          : 'bg-slate-200 text-slate-400'
                      }`}
                    >
                      <Send size={24} strokeWidth={2.5} />
                    </button>
                  </>
                )}
              </form>
            </div>

            {/* Message Details Modal */}
            <AnimatePresence>
              {selectedMessage && (
                <div className="fixed inset-0 bg-[#002B5B]/80 backdrop-blur-sm z-[100] flex items-center justify-center p-6">
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl"
                  >
                    <div className="p-6 bg-[#002B5B] text-white flex items-center justify-between">
                      <h4 className="text-lg font-black uppercase tracking-tight">Détails du message</h4>
                      <button onClick={() => setSelectedMessage(null)} className="p-1 hover:bg-white/10 rounded-lg">
                        <X size={20} />
                      </button>
                    </div>
                    <div className="p-6 space-y-6">
                      <div className="flex items-center gap-4 py-3 border-b border-slate-50">
                        <Clock className="text-[#D4AF37]" size={20} />
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase">Date & Heure</p>
                          <p className="text-sm font-bold text-[#002B5B]">
                            {format(new Date(selectedMessage.createdAt), "eeee d MMMM 'à' HH:mm", { locale: fr })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 py-3 border-b border-slate-50">
                        <CheckCircle2 className={selectedMessage.read ? 'text-[#D4AF37]' : 'text-slate-300'} size={20} />
                        <div>
                          <p className="text-[10px] text-slate-400 font-black uppercase">Statut</p>
                          <p className="text-sm font-bold text-[#002B5B]">
                            {selectedMessage.read ? 'Lu' : 'Non lu'}
                          </p>
                        </div>
                      </div>

                      {selectedMessage.senderId === user?.id && !selectedMessage.deleted && (
                        <button 
                          onClick={() => handleDeleteMessage(selectedMessage.id)}
                          className="w-full flex items-center justify-center gap-2 py-4 bg-red-50 text-red-500 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-red-100 transition-all"
                        >
                          <Trash2 size={16} /> Supprimer pour moi
                        </button>
                      )}
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
            <div className="w-24 h-24 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] mb-6 animate-bounce">
              <Send size={48} />
            </div>
            <h3 className="text-2xl font-black text-[#002B5B] mb-2">Lancez une conversation</h3>
            <p className="text-slate-500 max-w-sm">
              Sélectionnez un membre dans la liste pour commencer à discuter en privé et en temps réel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
