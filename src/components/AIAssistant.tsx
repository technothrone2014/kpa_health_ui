import React, { useState, useEffect, useRef } from 'react';
import { 
  Bot, Send, X, Minimize2, Maximize2, ThumbsUp, ThumbsDown, 
  MessageSquare, Sparkles, Activity, Heart, Brain, Loader2,
  User, Calendar, TrendingUp, AlertTriangle, CheckCircle
} from 'lucide-react';
import aiService from '../api/aiService';
import { format } from 'date-fns';

// Oceanic Theme Colors
const oceanColors = {
  deep: '#0B2F9E',
  mid: '#1A4D8C',
  light: '#2B7BA8',
  surface: '#4AA3C2',
  wave: '#6EC8D9',
  foam: '#A8E6CF',
  gold: '#FFD700',
  navy: '#0A1C40',
  white: '#FFFFFF',
  success: '#10B981',
  warning: '#F59E0B',
  danger: '#EF4444',
  textDark: '#1F2937',
  textLight: '#6B7280',
};

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  feedback?: 'positive' | 'negative';
  sources?: Array<{ title: string; source: string }>;
}

interface AIAssistantProps {
  patientData?: any;
  onClose?: () => void;
}

export default function AIAssistant({ patientData, onClose }: AIAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: patientData 
        ? `Hello! I'm Unesi, your medical AI assistant. I can help you analyze ${patientData.FullName}'s health data. What would you like to know?`
        : "Jambo! I'm Unesi, your medical AI assistant. I can help analyze patient health data, identify concerning trends, and provide medical insights. How can I assist you today?",
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [suggestedQuestions, setSuggestedQuestions] = useState<string[]>([]);

  // Set suggested questions based on context
  useEffect(() => {
    if (patientData) {
      setSuggestedQuestions([
        `What are the main health concerns for ${patientData.FullName}?`,
        'Are there any alarming trends in this patient\'s data?',
        'What follow-up actions do you recommend?',
        'Compare this patient\'s metrics to normal ranges',
        'Identify any risk factors',
      ]);
    } else {
      setSuggestedQuestions([
        'How can I interpret blood pressure readings?',
        'What are the warning signs of hypertension?',
        'How to manage patient with high BMI?',
        'Explain the relationship between BMI and blood pressure',
        'What lifestyle changes help reduce hypertension risk?',
      ]);
    }
  }, [patientData]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      let response: string;
      
      // Build context from patient data if available
      let contextPrompt = '';
      if (patientData) {
        contextPrompt = `Patient: ${patientData.FullName}\n`;
        contextPrompt += `ID: ${patientData.IDNumber}\n`;
        contextPrompt += `Category: ${patientData.CategoryTitle}\n`;
        contextPrompt += `Station: ${patientData.StationTitle}\n`;
      }

      const systemPrompt = `You are Unesi, a medical AI assistant for Kenya Ports Authority's EAP Health Week.
You help doctors and nurses analyze health data and provide medical insights.
${patientData ? `You are currently analyzing data for patient: ${patientData.FullName}` : ''}

Guidelines:
1. Be professional but warm and approachable
2. Provide evidence-based medical insights
3. Always include appropriate disclaimers
4. If analyzing patient data, highlight concerning patterns
5. Suggest actionable follow-up steps when relevant
6. Use clear medical terminology but explain when needed

${contextPrompt}`;

      const aiResponse = await aiService.chat({
        messages: [
          { role: 'system', content: systemPrompt },
          ...messages.slice(-3).map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: messageText }
        ],
        temperature: 0.3,
        max_tokens: 1024,
      });

      response = aiResponse.content;

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('AI Error:', error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Samahani, I'm having trouble connecting to my services. Please try again in a moment.",
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendFeedback = async (messageId: string, feedback: 'positive' | 'negative') => {
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? { ...msg, feedback } : msg
    ));
    
    // Here you would send feedback to your backend for fine-tuning
    console.log(`Feedback for message ${messageId}: ${feedback}`);
  };

  const analyzePatientSummary = async () => {
    if (!patientData) return;
    
    setIsAnalyzing(true);
    const analysisMessage: Message = {
      id: (Date.now()).toString(),
      role: 'assistant',
      content: "🔍 Analyzing patient data... Please wait.",
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, analysisMessage]);

    try {
      const response = await aiService.analyzePatientHealth(
        patientData.FullName,
        patientData,
        "Provide a comprehensive health summary and identify any concerning patterns"
      );

      setMessages(prev => prev.map(msg =>
        msg.id === analysisMessage.id ? { ...msg, content: response } : msg
      ));
    } catch (error) {
      console.error('Analysis error:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '60px',
          height: '60px',
          borderRadius: '30px',
          background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
          border: `2px solid ${oceanColors.gold}`,
          color: 'white',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
          zIndex: 1000,
          transition: 'all 0.3s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.1)';
          e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(0,0,0,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
          e.currentTarget.style.boxShadow = '0 10px 25px -5px rgba(0,0,0,0.2)';
        }}
      >
        <Bot size={28} />
        <div style={{
          position: 'absolute',
          top: -5,
          right: -5,
          width: '16px',
          height: '16px',
          borderRadius: '8px',
          background: oceanColors.success,
          border: `2px solid ${oceanColors.white}`,
        }} />
      </button>
    );
  }

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      width: isMinimized ? '400px' : '500px',
      height: isMinimized ? '60px' : '600px',
      maxHeight: '80vh',
      background: oceanColors.white,
      borderRadius: '16px',
      boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 1000,
      transition: 'all 0.3s ease',
      overflow: 'hidden'
    }}>
      {/* Header */}
      <div style={{
        background: `linear-gradient(135deg, ${oceanColors.deep}, ${oceanColors.mid})`,
        padding: '16px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        cursor: isMinimized ? 'pointer' : 'default'
      }}
      onClick={() => isMinimized && setIsMinimized(false)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '36px',
            height: '36px',
            background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Bot size={20} style={{ color: oceanColors.navy }} />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontWeight: 'bold', color: 'white' }}>Unesi AI</span>
              <span style={{
                fontSize: '10px',
                background: 'rgba(255,255,255,0.2)',
                padding: '2px 6px',
                borderRadius: '12px',
                color: oceanColors.gold
              }}>
                Medical Assistant
              </span>
            </div>
            <p style={{ fontSize: '11px', color: oceanColors.foam, margin: 0 }}>
              {patientData ? `Analyzing: ${patientData.FullName}` : 'Ready to assist'}
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {patientData && !isMinimized && (
            <button
              onClick={analyzePatientSummary}
              disabled={isAnalyzing}
              style={{
                background: 'rgba(255,255,255,0.2)',
                border: 'none',
                borderRadius: '8px',
                padding: '6px 12px',
                color: 'white',
                fontSize: '11px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {isAnalyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
              Analyze
            </button>
          )}
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            {isMinimized ? <Maximize2 size={16} /> : <Minimize2 size={16} />}
          </button>
          <button
            onClick={() => {
              setIsOpen(false);
              if (onClose) onClose();
            }}
            style={{
              background: 'rgba(255,255,255,0.2)',
              border: 'none',
              borderRadius: '6px',
              width: '28px',
              height: '28px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'white'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {!isMinimized && (
        <>
          {/* Messages */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            {messages.map((message) => (
              <div
                key={message.id}
                style={{
                  display: 'flex',
                  justifyContent: message.role === 'user' ? 'flex-end' : 'flex-start',
                }}
              >
                <div style={{
                  maxWidth: '80%',
                  padding: '12px 16px',
                  borderRadius: message.role === 'user' ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                  background: message.role === 'user' ? oceanColors.deep : '#f1f5f9',
                  color: message.role === 'user' ? 'white' : oceanColors.textDark,
                }}>
                  <div style={{ fontSize: '14px', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>
                    {message.content}
                  </div>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px',
                    fontSize: '10px',
                    opacity: 0.6
                  }}>
                    <span>{format(message.timestamp, 'HH:mm')}</span>
                    {message.role === 'assistant' && !message.feedback && (
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <button
                          onClick={() => sendFeedback(message.id, 'positive')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => sendFeedback(message.id, 'negative')}
                          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '2px' }}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    )}
                    {message.feedback === 'positive' && <CheckCircle size={12} color={oceanColors.success} />}
                    {message.feedback === 'negative' && <AlertTriangle size={12} color={oceanColors.warning} />}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
                <div style={{
                  padding: '12px 16px',
                  borderRadius: '20px',
                  background: '#f1f5f9',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span style={{ fontSize: '14px' }}>Unesi is thinking...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Suggested Questions */}
          {suggestedQuestions.length > 0 && messages.length < 3 && (
            <div style={{
              padding: '12px 20px',
              borderTop: `1px solid ${oceanColors.mid}20`,
              background: '#f8fafc'
            }}>
              <p style={{ fontSize: '11px', color: oceanColors.textLight, marginBottom: '8px' }}>
                Suggested questions:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {suggestedQuestions.slice(0, 4).map((q, idx) => (
                  <button
                    key={idx}
                    onClick={() => sendMessage(q)}
                    style={{
                      padding: '6px 12px',
                      background: oceanColors.white,
                      border: `1px solid ${oceanColors.mid}30`,
                      borderRadius: '20px',
                      fontSize: '11px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = oceanColors.light;
                      e.currentTarget.style.borderColor = oceanColors.gold;
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = oceanColors.white;
                      e.currentTarget.style.borderColor = `${oceanColors.mid}30`;
                    }}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div style={{
            padding: '16px 20px',
            borderTop: `1px solid ${oceanColors.mid}20`,
            display: 'flex',
            gap: '12px',
            background: 'white'
          }}>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Ask Unesi about patient health, medical insights..."
              style={{
                flex: 1,
                padding: '12px 16px',
                border: `1px solid ${oceanColors.mid}30`,
                borderRadius: '24px',
                outline: 'none',
                fontSize: '14px'
              }}
              onFocus={(e) => e.currentTarget.style.borderColor = oceanColors.gold}
              onBlur={(e) => e.currentTarget.style.borderColor = `${oceanColors.mid}30`}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              style={{
                width: '44px',
                height: '44px',
                borderRadius: '22px',
                background: `linear-gradient(135deg, ${oceanColors.gold}, #FFA500)`,
                border: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: !input.trim() || isLoading ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || isLoading ? 0.6 : 1
              }}
            >
              <Send size={20} style={{ color: oceanColors.navy }} />
            </button>
          </div>
        </>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1s linear infinite;
        }
      `}</style>
    </div>
  );
}
