import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, User, Bot, Loader2 } from 'lucide-react';

interface ChatbotTutorProps {
  moduleId: string;
  studentId: string;
}

export const ChatbotTutor: React.FC<ChatbotTutorProps> = ({ moduleId, studentId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{role: 'user' | 'model', text: string}[]>([
    { role: 'model', text: '¡Hola! Soy tu Tutor IA. ¿Tienes alguna duda sobre este módulo?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;
    
    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setLoading(true);

    try {
      // API call to our new backend route
      const res = await fetch('http://localhost:3001/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: userMessage,
          moduleId,
          studentId,
          history: messages.slice(1) // exclude initial greeting if desired, or send all
        })
      });

      const data = await res.json();
      
      if (data.reply) {
        setMessages(prev => [...prev, { role: 'model', text: data.reply }]);
      } else {
        setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, ha ocurrido un error de conexión.' }]);
      }
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { role: 'model', text: 'Lo siento, no pude procesar tu solicitud.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.9 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'fixed',
              bottom: '80px',
              right: '20px',
              width: '350px',
              height: '500px',
              backgroundColor: '#191528',
              borderRadius: '16px',
              boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
              display: 'flex',
              flexDirection: 'column',
              zIndex: 9999,
              border: '1px solid rgba(168, 85, 247, 0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Header */}
            <div style={{
              padding: '16px',
              background: 'linear-gradient(135deg, #a855f7, #6c5ce7)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: 'white'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Bot size={24} />
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 600 }}>Tutor IA</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                style={{ background: 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Chat Area */}
            <div style={{
              flex: 1,
              padding: '16px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}>
              {messages.map((msg, idx) => (
                <div key={idx} style={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  backgroundColor: msg.role === 'user' ? '#a855f7' : 'rgba(255,255,255,0.05)',
                  color: 'white',
                  padding: '10px 14px',
                  borderRadius: '12px',
                  maxWidth: '85%',
                  borderBottomRightRadius: msg.role === 'user' ? '4px' : '12px',
                  borderBottomLeftRadius: msg.role === 'model' ? '4px' : '12px',
                  fontSize: '0.9rem',
                  lineHeight: '1.4'
                }}>
                  {msg.text}
                </div>
              ))}
              {loading && (
                <div style={{ alignSelf: 'flex-start', color: '#a855f7' }}>
                  <Loader2 className="animate-spin" size={20} style={{ animation: 'spin 1s linear infinite' }} />
                  <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div style={{
              padding: '16px',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              display: 'flex',
              gap: '10px',
              background: 'rgba(0,0,0,0.2)'
            }}>
              <input 
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleSend()}
                placeholder="Escribe tu duda..."
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'white',
                  outline: 'none'
                }}
              />
              <button 
                onClick={handleSend}
                disabled={loading || !input.trim()}
                style={{
                  background: 'linear-gradient(135deg, #a855f7, #6c5ce7)',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '0 14px',
                  color: 'white',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: (loading || !input.trim()) ? 0.6 : 1
                }}
              >
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          position: 'fixed',
          bottom: '20px',
          right: '20px',
          width: '56px',
          height: '56px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #a855f7, #6c5ce7)',
          border: 'none',
          color: 'white',
          boxShadow: '0 4px 12px rgba(168, 85, 247, 0.4)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          transition: 'transform 0.2s ease',
          transform: isOpen ? 'scale(0.9)' : 'scale(1)'
        }}
      >
        {isOpen ? <X size={24} /> : <MessageCircle size={24} />}
      </button>
    </>
  );
};
