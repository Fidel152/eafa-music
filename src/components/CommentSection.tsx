import React, { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { Comment } from '../types';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';
import { Send, Trash2, User, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface CommentSectionProps {
  targetId: string;
  targetType: 'announcement' | 'song';
}

export default function CommentSection({ targetId, targetType }: CommentSectionProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadComments();
  }, [targetId]);

  const loadComments = async () => {
    try {
      const data = await api.comments.list(targetId);
      setComments(data);
    } catch (error) {
      console.error("Load comments error:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent, parentId?: string) => {
    e.preventDefault();
    if (!user || !newComment.trim()) return;

    setIsSubmitting(true);
    try {
      await api.comments.create({
        targetId,
        targetType,
        memberId: user.id,
        memberName: user.displayName || 'Anonyme',
        content: newComment.trim(),
        parentId: parentId
      });
      setNewComment('');
      setReplyingTo(null);
      await loadComments();
      toast.success('Commentaire ajouté');
    } catch (error: any) {
      console.error("Comment submit error:", error);
      const message = error.message || 'Erreur lors de l’envoi';
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await api.comments.delete(id);
      setComments(comments.filter(c => c.id !== id));
      toast.success('Commentaire supprimé');
    } catch (error: any) {
      toast.error('Erreur lors de la suppression');
    }
  };

  const formatDate = (date: any) => {
    if (!date) return '';
    try {
      const d = new Date(date);
      return formatDistanceToNow(d, { addSuffix: true, locale: fr });
    } catch (e) {
      return '';
    }
  };

  const rootComments = comments.filter(c => !c.parentId);
  const getReplies = (parentId: string) => comments.filter(c => c.parentId === parentId);

  return (
    <div className="mt-8 border-t border-slate-100 pt-8">
      <h3 className="text-xl font-bold text-[#002B5B] mb-6 flex items-center gap-2">
        Commentaires 
        <span className="bg-slate-100 text-slate-500 text-xs px-2 py-1 rounded-full">{comments.length}</span>
      </h3>

      {/* Form for new root comment */}
      {!replyingTo && (
        <form onSubmit={(e) => handleSubmit(e)} className="mb-8 group">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0 border-2 border-white shadow-sm">
              <User size={20} />
            </div>
            <div className="flex-1 relative">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Écrire un commentaire..."
                className="w-full bg-slate-50 border border-slate-100 rounded-2xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all min-h-[100px] resize-none"
              />
              <button
                type="submit"
                disabled={isSubmitting || !newComment.trim()}
                className="absolute bottom-3 right-3 p-2 bg-[#D4AF37] text-[#002B5B] rounded-xl hover:bg-[#B8860B] transition-colors disabled:opacity-50 disabled:grayscale"
              >
                <Send size={18} className={isSubmitting ? 'animate-pulse' : ''} />
              </button>
            </div>
          </div>
        </form>
      )}

      {/* List */}
      <div className="space-y-6">
        <AnimatePresence mode="popLayout">
          {rootComments.map((comment) => (
            <div key={comment.id} className="space-y-4">
              <CommentItem 
                comment={comment} 
                user={user} 
                onDelete={handleDelete}
                onReply={() => setReplyingTo(comment.id)}
                formatDate={formatDate}
                isReplying={replyingTo === comment.id}
              />
              
              {/* Reply Form */}
              {replyingTo === comment.id && (
                <div className="ml-14">
                  <form onSubmit={(e) => handleSubmit(e, comment.id)} className="group">
                    <div className="flex gap-2">
                      <div className="flex-1 relative">
                        <textarea
                          autoFocus
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder={`Répondre à ${comment.memberName}...`}
                          className="w-full bg-slate-50 border border-slate-100 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/20 focus:border-[#D4AF37] transition-all min-h-[80px] resize-none"
                        />
                        <div className="absolute bottom-2 right-2 flex gap-2">
                          <button
                            type="button"
                            onClick={() => { setReplyingTo(null); setNewComment(''); }}
                            className="px-3 py-1 text-xs font-bold text-slate-500 hover:text-slate-700"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || !newComment.trim()}
                            className="px-3 py-1 bg-[#D4AF37] text-[#002B5B] rounded-lg text-xs font-black shadow-sm disabled:opacity-50"
                          >
                            Répondre
                          </button>
                        </div>
                      </div>
                    </div>
                  </form>
                </div>
              )}

              {/* Replies */}
              <div className="ml-14 space-y-4 border-l-2 border-slate-50 pl-4">
                {getReplies(comment.id).map(reply => (
                  <CommentItem 
                    key={reply.id} 
                    comment={reply} 
                    user={user} 
                    onDelete={handleDelete}
                    formatDate={formatDate}
                    isReply
                  />
                ))}
              </div>
            </div>
          ))}
        </AnimatePresence>

        {!loading && rootComments.length === 0 && (
          <div className="text-center py-6">
            <p className="text-slate-400 text-sm italic">Aucun commentaire pour le moment. Soyez le premier !</p>
          </div>
        )}
      </div>
    </div>
  );
}

function CommentItem({ comment, user, onDelete, onReply, formatDate, isReply, isReplying }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className={cn("flex gap-4 group/comment", isReply && "scale-95 origin-left")}
    >
      <div className={cn(
        "rounded-full bg-slate-100 flex items-center justify-center text-slate-400 shrink-0 border-2 border-white shadow-sm",
        isReply ? "w-8 h-8" : "w-10 h-10"
      )}>
        <User size={isReply ? 16 : 20} />
      </div>
      <div className="flex-1 bg-slate-50 rounded-2xl p-4 relative group">
        <div className="flex items-center justify-between mb-1">
          <span className="font-bold text-[#002B5B] text-sm">{comment.memberName}</span>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
              <Clock size={10} />
              {formatDate(comment.createdAt)}
            </span>
            {(user?.role === 'admin' || user?.id === comment.memberId) && (
              <button 
                onClick={() => onDelete(comment.id)}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">
          {comment.content}
        </p>
        
        {!isReply && (
          <div className="mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={onReply}
              className={cn(
                "text-[10px] font-black uppercase tracking-wider transition-colors",
                isReplying ? "text-[#D4AF37]" : "text-slate-400 hover:text-[#D4AF37]"
              )}
            >
              Répondre
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const cn = (...classes: any[]) => classes.filter(Boolean).join(' ');
