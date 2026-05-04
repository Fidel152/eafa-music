import React, { useState, useEffect, useRef } from 'react';
import { api } from '../lib/api';
import { Member, Message } from '../types';
import { useAuth } from '../context/AuthContext';
import { Search, Send, User, Clock, Phone, Mail, Image as ImageIcon, CheckCircle2, ChevronLeft } from 'lucide-react';
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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadMembers();
    loadConversations();
    const interval = setInterval(loadConversations, 10000);
    return () => clearInterval(interval);
  }, []);

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

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedMember || !newMessage.trim()) return;

    try {
      await api.messages.send({
        senderId: user.id,
        receiverId: selectedMember.id,
        content: newMessage.trim()
      });
      setNewMessage('');
      loadMessages();
    } catch (error: any) {
      console.error("Send message error:", error);
      let errorMsg = "Erreur d'envoi";
      if (error?.message) errorMsg += `: ${error.message}`;
      toast.error(errorMsg);
    }
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
    <div className="max-w-6xl mx-auto h-[calc(100vh-180px)] flex bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden">
      {/* Sidebar Members List */}
      <div className={`w-full md:w-80 border-r border-slate-50 flex flex-col ${selectedMember ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-6 border-b border-slate-50 bg-[#002B5B]">
          <h2 className="text-xl font-black text-white mb-4">Messagerie</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input 
              type="text"
              placeholder="Rechercher un membre..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#003d82] border-none text-white placeholder-slate-400 rounded-xl pl-10 pr-4 py-2 text-sm focus:ring-2 focus:ring-[#D4AF37]/50"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredMembers.map(m => {
            const hasUnread = getUnreadStatus(m.id);
            return (
              <button
                key={m.id}
                onClick={() => setSelectedMember(m)}
                className={`w-full p-4 flex items-center gap-3 transition-all border-b border-slate-50 relative ${
                  selectedMember?.id === m.id 
                    ? 'bg-[#D4AF37]/10' 
                    : hasUnread 
                      ? 'bg-amber-50 hover:bg-amber-100' 
                      : 'hover:bg-slate-50'
                }`}
              >
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center">
                    {m.avatarUrl ? (
                      <img src={m.avatarUrl} alt={m.fullName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    ) : (
                      <span className="text-[#002B5B] font-black">{m.fullName.charAt(0)}</span>
                    )}
                  </div>
                  {isOnline(m.lastSeen) && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white rounded-full shadow-sm animate-pulse" />
                  )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-sm font-black truncate ${selectedMember?.id === m.id ? 'text-[#002B5B]' : 'text-slate-700'}`}>
                      {m.fullName}
                    </p>
                    {hasUnread && (
                      <span className="bg-red-500 text-white text-[8px] font-black uppercase px-1.5 py-0.5 rounded shadow-sm">Nouveau</span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 font-medium truncate">
                    {m.voiceType || 'Membre'} • {m.role === 'admin' ? 'Coordinateur' : 'Choriste'}
                  </p>
                </div>
              </button>
            );
          })}
          {filteredMembers.length === 0 && !loading && (
            <div className="p-8 text-center">
              <p className="text-slate-400 text-sm italic">Aucun membre trouvé</p>
            </div>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className={`flex-1 flex flex-col bg-slate-50/30 ${!selectedMember ? 'hidden md:flex' : 'flex'}`}>
        {selectedMember ? (
          <>
            {/* Header */}
            <div className="p-4 md:p-6 bg-white border-b border-slate-100 flex items-center justify-between shadow-sm z-10">
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedMember(null)}
                  className="md:hidden p-2 -ml-2 text-slate-400"
                >
                  <ChevronLeft size={20} />
                </button>
                <div className="relative">
                  <div className="w-10 h-10 md:w-12 md:h-12 rounded-full overflow-hidden bg-[#002B5B] flex items-center justify-center text-[#D4AF37] font-black border-2 border-slate-50">
                    {selectedMember.avatarUrl ? (
                      <img src={selectedMember.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      selectedMember.fullName.charAt(0)
                    )}
                  </div>
                  {isOnline(selectedMember.lastSeen) && (
                    <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 border-2 border-white rounded-full shadow-sm" />
                  )}
                </div>
                <div>
                  <h3 className="font-black text-[#002B5B] text-sm md:text-base leading-tight">{selectedMember.fullName}</h3>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {isOnline(selectedMember.lastSeen) ? 'En ligne' : `Dernière visite il y a ${format(new Date(selectedMember.lastSeen || Date.now()), 'HH:mm')}`}
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {selectedMember.phoneNumber && (
                  <a href={`tel:${selectedMember.phoneNumber}`} className="p-2.5 text-[#002B5B] hover:bg-slate-100 rounded-xl transition-all">
                    <Phone size={20} />
                  </a>
                )}
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              <AnimatePresence initial={false}>
                {messages.map((msg, index) => {
                  const isMe = msg.senderId === user?.id;
                  const prevMsg = index > 0 ? messages[index - 1] : null;
                  const showAvatar = !isMe && (!prevMsg || prevMsg.senderId !== msg.senderId);

                  return (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, scale: 0.9, y: 10 }}
                      animate={{ opacity: 1, scale: 1, y: 0 }}
                      className={`flex ${isMe ? 'justify-end' : 'justify-start'} items-end gap-2`}
                    >
                      {!isMe && (
                        <div className="w-6 h-6 rounded-full bg-[#002B5B] overflow-hidden flex items-center justify-center text-[#D4AF37] text-[10px] font-black shrink-0">
                          {selectedMember.avatarUrl ? (
                            <img src={selectedMember.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            selectedMember.fullName.charAt(0)
                          )}
                        </div>
                      )}
                      <div className={`max-w-[80%] md:max-w-[70%] rounded-2xl p-3 shadow-sm relative ${
                        isMe 
                          ? 'bg-[#002B5B] text-white rounded-br-none' 
                          : 'bg-white text-slate-700 rounded-bl-none border border-slate-100'
                      }`}>
                        <p className="text-sm leading-relaxed">{msg.content}</p>
                        <div className={`flex items-center gap-1.5 mt-1.5 ${isMe ? 'justify-end' : 'justify-start'}`}>
                          <span className={`text-[9px] font-medium ${isMe ? 'text-slate-300' : 'text-slate-400'}`}>
                            {format(new Date(msg.createdAt), 'HH:mm')}
                          </span>
                          {isMe && (
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
            <div className="p-4 md:p-6 bg-white border-t border-slate-100">
              <form onSubmit={handleSendMessage} className="flex gap-2 md:gap-4 items-center">
                <input 
                  type="text"
                  placeholder="Écrire un message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 md:py-4 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37] transition-all text-sm md:text-base outline-none"
                />
                <button 
                  type="submit"
                  disabled={!newMessage.trim()}
                  className="p-3 md:p-4 bg-[#002B5B] text-[#D4AF37] rounded-2xl shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:grayscale"
                >
                  <Send size={24} />
                </button>
              </form>
            </div>
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
