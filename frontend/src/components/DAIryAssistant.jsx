import React, { useState, useEffect, useRef } from 'react';
import { X, Send, Sparkles, Bot, User } from 'lucide-react';
import { GoogleGenAI } from '@google/genai';
import api from '../api/axios';

const DAIryAssistant = ({ onClose }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const overlayRef = useRef(null);

  // Initialize GenAI
  // Note: Vite uses import.meta.env for env vars
  const ai = new GoogleGenAI({ 
    apiKey: import.meta.env.VITE_GEMINI_API_KEY
  });

  // Scroll to bottom on new message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Fetch Chat History
  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await api.get('/ai/history');
        if (res.data.messages && res.data.messages.length > 0) {
          setMessages(res.data.messages);
        } else {
          setMessages([
            {
              role: 'assistant',
              content: 'Hello! I am dAIry, your AI assistant for dairy management. How can I help you today?'
            }
          ]);
        }
      } catch (err) {
        console.error("Failed to fetch AI chat history:", err);
      }
    };
    fetchHistory();
  }, []);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const handleOverlayClick = (e) => {
    if (e.target === overlayRef.current) {
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      const systemContext = "You are dAIry, an AI assistant built to help dairy owners manage their business and navigate this dairy management app. Answer concisely and helpfully.\\n\\n";
      const prompt = systemContext + "User question: " + userMessage;

      const interaction = await ai.interactions.create({
        model: 'gemini-3.6-flash',
        input: prompt,
      });

      const assistantMessage = interaction.output_text || "I'm not sure how to answer that.";
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: assistantMessage }
      ]);

      // Save messages to backend asynchronously
      api.post('/ai/history', {
        messages: [
          { role: 'user', content: userMessage },
          { role: 'assistant', content: assistantMessage }
        ]
      }).catch(err => console.error("Failed to save chat history:", err));

    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [
        ...prev, 
        { role: 'assistant', content: "Sorry, I'm having trouble connecting right now. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'center',
        padding: '16px',
        paddingBottom: 'calc(16px + env(safe-area-inset-bottom))'
      }}
    >
      <div 
        style={{
          backgroundColor: '#fff',
          borderRadius: '24px',
          width: '100%',
          maxWidth: '480px',
          height: '80vh',
          maxHeight: '600px',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          animation: 'slideUp 0.3s ease-out',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          backgroundColor: '#0F62FE',
          color: '#fff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderTopLeftRadius: '24px',
          borderTopRightRadius: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={20} />
            <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>dAIry Assistant</h3>
          </div>
          <button 
            onClick={onClose}
            style={{ 
              background: 'rgba(255,255,255,0.2)', 
              border: 'none', 
              color: '#fff', 
              borderRadius: '50%',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer'
            }}
          >
            <X size={18} />
          </button>
        </div>

        {/* Chat Area */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          backgroundColor: '#f8fafc'
        }}>
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              style={{ 
                display: 'flex', 
                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                alignItems: 'flex-start',
                gap: '8px'
              }}
            >
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                backgroundColor: msg.role === 'user' ? '#e2e8f0' : '#dbeafe',
                color: msg.role === 'user' ? '#475569' : '#1d4ed8',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
              </div>
              
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: '16px',
                borderTopRightRadius: msg.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: msg.role === 'assistant' ? '4px' : '16px',
                backgroundColor: msg.role === 'user' ? '#0F62FE' : '#fff',
                color: msg.role === 'user' ? '#fff' : '#1e293b',
                fontSize: '14px',
                lineHeight: 1.5,
                boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                whiteSpace: 'pre-wrap'
              }}>
                {msg.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', color: '#64748b' }}>
              <Bot size={16} />
              <span style={{ fontSize: '13px', fontStyle: 'italic' }}>dAIry is thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div style={{
          padding: '16px',
          backgroundColor: '#fff',
          borderTop: '1px solid #e2e8f0'
        }}>
          <form 
            onSubmit={handleSubmit}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: '#f1f5f9',
              borderRadius: '24px',
              padding: '6px 6px 6px 16px'
            }}
          >
            <input 
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask dAIry a question..."
              disabled={isLoading}
              style={{
                flex: 1,
                border: 'none',
                background: 'transparent',
                outline: 'none',
                fontSize: '15px',
                color: '#1e293b'
              }}
            />
            <button 
              type="submit"
              disabled={!input.trim() || isLoading}
              style={{
                backgroundColor: input.trim() && !isLoading ? '#0F62FE' : '#cbd5e1',
                color: '#fff',
                border: 'none',
                borderRadius: '50%',
                width: '36px',
                height: '36px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: input.trim() && !isLoading ? 'pointer' : 'not-allowed',
                transition: 'background-color 0.2s'
              }}
            >
              <Send size={16} style={{ transform: 'translateX(-1px)' }} />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DAIryAssistant;
