/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  History as HistoryIcon, 
  LayoutTemplate as Templates, 
  LineChart as Analytics, 
  HelpCircle, 
  Settings as SettingsIcon, 
  User, 
  Send, 
  Layout,
  Paperclip, 
  Mic, 
  Sparkles,
  CheckCircle2,
  Calendar,
  Users,
  Copy,
  Share2,
  FileText,
  Kanban,
  Search,
  Trash2,
  Clock,
  ArrowLeft,
  BookOpen,
  Lightbulb,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Activity,
  Target,
  Moon,
  Sun,
  Shield,
  Download,
  Mail,
  Lock as LockIcon,
  LogOut,
  Edit2,
  Camera,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { analyzeTranscript, chatWithIntelligence } from './lib/gemini';
import { Message, AnalysisResult, Session } from './types';
import ReactMarkdown from 'react-markdown';
import * as mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area,
  Cell
} from 'recharts';

const TEMPLATES = [
  {
    id: 'summary',
    title: 'Meeting Summary',
    description: 'Perfect for executive briefings and project check-ins. Distills core decisions and next steps.',
    icon: <FileText className="text-primary" size={24} />,
    prompt: "Please provide a professional summary of this meeting transcript, focusing on key decisions and strategic shifts."
  },
  {
    id: 'lecture',
    title: 'Lecture Notes',
    description: 'Optimized for academic contexts. Organizes complex topics into logical study paths.',
    icon: <BookOpen className="text-secondary" size={24} />,
    prompt: "Extract the core academic concepts from this lecture transcript and organize them into clear, pedagogical study points."
  },
  {
    id: 'interview',
    title: 'Interview Analysis',
    description: 'Analyzes qualitative data from user interviews or candidate screenings.',
    icon: <Users className="text-tertiary" size={24} />,
    prompt: "Analyze this interview transcript for key sentiment, recurring themes, and actionable feedback points."
  },
  {
    id: 'brainstorm',
    title: 'Brainstorming Sync',
    description: 'Captures the raw creative energy of an ideation session and extracts the winning concepts.',
    icon: <Lightbulb className="text-amber-500" size={24} />,
    prompt: "Review this brainstorming transcript and categorize the generated ideas by feasibility and potential impact."
  }
];

export default function App() {
  const [sessions, setSessions] = useState<Session[]>(() => {
    const saved = localStorage.getItem('mindscribe_sessions');
    return saved ? JSON.parse(saved) : [];
  });
  const [activeView, setActiveView] = useState<'chat' | 'history' | 'templates' | 'analytics' | 'settings' | 'profile'>('chat');
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [isRecording, setIsRecording] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profile, setProfile] = useState(() => {
    const saved = localStorage.getItem('mindscribe_profile');
    return saved ? JSON.parse(saved) : {
      name: 'Strategic Architect',
      email: 'architect@mindscribe.ai',
      bio: 'Deep intelligence synthesizer specializing in corporate strategic analysis and complex meeting data distillation.',
      avatar: `https://picsum.photos/seed/architect/200/200`
    };
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    localStorage.setItem('mindscribe_sessions', JSON.stringify(sessions));
  }, [sessions]);

  useEffect(() => {
    localStorage.setItem('mindscribe_profile', JSON.stringify(profile));
  }, [profile]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isAnalyzing]);

  const handleSend = async () => {
    if (isAnalyzing) return;
    
    if (!inputValue.trim()) {
      setCopyFeedback("Intelligence desk requires input data");
      return;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    const content = inputValue;
    setInputValue('');
    setIsAnalyzing(true);

    try {
      console.group("MindScribe AI: Neural Request");
      console.log("Input:", content);
      console.log("Context:", currentSession ? "Chat Mode" : "Analysis Mode");

      if (!currentSession) {
        // Initial Analysis Mode
        const result = isDemoMode 
          ? await (await import('./lib/mockAi')).mockAnalyzeTranscript(content)
          : await analyzeTranscript(content);
          
        console.log("Analysis Result:", result);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: "I've synthesized the transcript. Review the strategic briefing below.",
          analysis: result,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        const newSession: Session = {
          id: Date.now().toString(),
          title: result.title || "Strategic Briefing",
          timestamp: new Date().toLocaleString(),
          messages: finalMessages,
          analysis: result
        };
        setSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
      } else {
        // Follow-up Chat Mode
        let responseContent = "";
        if (isDemoMode) {
          responseContent = await (await import('./lib/mockAi')).mockChat(content, JSON.stringify(currentSession.analysis));
        } else {
          responseContent = await chatWithIntelligence(
            content, 
            JSON.stringify(currentSession.analysis),
            messages.map(m => ({ role: m.role, content: m.content }))
          );
        }

        console.log("Chat Response:", responseContent);

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: responseContent,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);
        
        // Sync to history
        setSessions(prev => prev.map(s => s.id === currentSession.id ? { ...s, messages: finalMessages } : s));
      }
      console.groupEnd();
    } catch (error) {
      console.error("MindScribe AI: Error during neural synthesis", error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: "Failed to generate response. I encountered a synchronization error. Please check your network or API configuration.",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const deleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessions(prev => prev.filter(s => s.id !== id));
  };

  const openSession = (session: Session) => {
    setCurrentSession(session);
    setMessages(session.messages);
    setActiveView('chat');
  };

  const startNewChat = () => {
    setCurrentSession(null);
    setMessages([]);
    setActiveView('chat');
  };

  const useTemplate = (templatePrompt: string) => {
    setInputValue(templatePrompt);
    setCurrentSession(null);
    setMessages([]);
    setActiveView('chat');
  };

  const showHelp = () => {
    const helpMessage: Message = {
      id: 'help-' + Date.now(),
      role: 'assistant',
      content: "### Welcome to MindScribe Intelligence v2.1\n\nI am your strategic synthesis partner. Here's how to maximize our collaboration:\n\n1. **Feed the Transcript**: Paste any raw meeting notes or lecture transcripts into the intelligence desk.\n2. **Generate Briefing**: Click 'Generate' to distill the raw data into tactical summaries and action items.\n3. **Discuss & Refine**: Use the follow-up engine to ask specific questions about the data.\n4. **Manage Archive**: Your sessions are stored locally and accessible via the 'History Archive'.\n\nHow can I assist your synthesis process today?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages([helpMessage]);
    setCurrentSession(null);
    setActiveView('chat');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedFileName(file.name);
    setIsUploading(true);

    try {
      if (file.type === 'application/pdf') {
        const arrayBuffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
        const pdf = await loadingTask.promise;
        let fullText = "";
        
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          const strings = content.items.map((item: any) => item.str);
          fullText += strings.join(" ") + "\n";
        }
        setInputValue(fullText);
      } else if (file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
        const arrayBuffer = await file.arrayBuffer();
        const result = await mammoth.extractRawText({ arrayBuffer });
        setInputValue(result.value);
      } else if (file.type.startsWith('text/') || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        const text = await file.text();
        setInputValue(text);
      } else {
        setCopyFeedback("Unsupported file type. Use PDF, DOCX, or Text.");
        setUploadedFileName(null);
      }
    } catch (error) {
      console.error("File processing error:", error);
      setCopyFeedback("Error processing intelligence source.");
      setUploadedFileName(null);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setCopyFeedback("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setProfile(prev => ({ ...prev, avatar: result }));
      setCopyFeedback("Avatar intelligence updated");
    };
    reader.readAsDataURL(file);
  };

  const toggleRecording = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setCopyFeedback("Voice input not supported in this browser");
      return;
    }

    if (isRecording) {
      recognitionRef.current?.stop();
    } else {
      try {
        if (!recognitionRef.current) {
          recognitionRef.current = new SpeechRecognition();
          recognitionRef.current.continuous = true;
          recognitionRef.current.interimResults = false;
          recognitionRef.current.lang = 'en-US';

          recognitionRef.current.onresult = (event: any) => {
            const transcript = event.results[event.results.length - 1][0].transcript;
            if (event.results[event.results.length - 1].isFinal) {
              setInputValue(prev => {
                const space = prev && !prev.endsWith(' ') ? ' ' : '';
                return prev + space + transcript.trim();
              });
            }
          };

          recognitionRef.current.onerror = (event: any) => {
            console.error("Speech recognition error", event.error);
            setIsRecording(false);
            if (event.error === 'not-allowed') {
              setCopyFeedback("Microphone access denied");
            } else {
              setCopyFeedback(`Transcription error: ${event.error}`);
            }
          };

          recognitionRef.current.onstart = () => {
            setIsRecording(true);
          };

          recognitionRef.current.onend = () => {
            setIsRecording(false);
          };
        }

        recognitionRef.current.start();
      } catch (error) {
        console.error("Error starting speech recognition:", error);
        setCopyFeedback("Could not start microphone");
      }
    }
  };

  const downloadHistory = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(sessions, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href",     dataStr);
    downloadAnchorNode.setAttribute("download", "mindscribe_export_" + new Date().toISOString().split('T')[0] + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopyFeedback(label);
      setTimeout(() => setCopyFeedback(null), 2000);
    });
  };

  const handleShare = (title: string) => {
    if (navigator.share) {
      navigator.share({
        title: title,
        text: 'Reviewing strategic insights from MindScribe AI.',
        url: window.location.href
      }).catch(() => {
        setCopyFeedback("Share canceled");
        setTimeout(() => setCopyFeedback(null), 2000);
      });
    } else {
      copyToClipboard(window.location.href, "Link copied to clipboard");
    }
  };

  const filteredHistory = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.analysis?.summary.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Analytics Calculations
  const analyticsData = sessions.filter(s => s.analysis).map(s => ({
    name: s.title.substring(0, 10) + '...',
    clarity: s.analysis?.meeting_score.clarity || 0,
    productivity: s.analysis?.meeting_score.productivity || 0,
    engagement: s.analysis?.meeting_score.engagement || 0,
    date: new Date(s.timestamp).toLocaleDateString()
  })).reverse();

  const totalAnalyzed = sessions.length;
  const avgScores = sessions.length > 0 ? {
    clarity: (sessions.reduce((acc, s) => acc + (s.analysis?.meeting_score.clarity || 0), 0) / sessions.length).toFixed(1),
    productivity: (sessions.reduce((acc, s) => acc + (s.analysis?.meeting_score.productivity || 0), 0) / sessions.length).toFixed(1),
    engagement: (sessions.reduce((acc, s) => acc + (s.analysis?.meeting_score.engagement || 0), 0) / sessions.length).toFixed(1),
  } : { clarity: 0, productivity: 0, engagement: 0 };

  useEffect(() => {
    (window as any).copyToClipboard = copyToClipboard;
    (window as any).handleShare = handleShare;
  }, []);

  return (
    <div className="flex h-screen w-full bg-surface text-on-surface overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 flex flex-col pt-10 pb-8 h-full bg-white border-r border-outline-variant">
        {/* Brand Logo Section */}
        <div className="px-6 mb-12">
          <motion.div 
            onClick={startNewChat}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-4 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lift transition-transform duration-500">
              <Sparkles size={20} fill="currentColor" />
            </div>
            <div className="flex flex-col">
              <h1 className="text-xl font-black font-headline tracking-tighter text-slate-900 leading-none">
                Mind<span className="text-primary italic">Scribe</span>
              </h1>
            </div>
          </motion.div>
        </div>

        <nav className="flex-1 space-y-1.5 px-3">
          <NavItem active={activeView === 'chat'} onClick={() => setActiveView('chat')} icon={<Layout size={18} />} label="Dashboard" />
          <NavItem active={activeView === 'history'} onClick={() => setActiveView('history')} icon={<HistoryIcon size={18} />} label="History" />
          <NavItem active={activeView === 'templates'} onClick={() => setActiveView('templates')} icon={<Templates size={18} />} label="Templates" />
          <NavItem active={activeView === 'analytics'} onClick={() => setActiveView('analytics')} icon={<Analytics size={18} />} label="Analytics" />
          <NavItem active={activeView === 'settings'} onClick={() => setActiveView('settings')} icon={<SettingsIcon size={18} />} label="Settings" />
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden bg-surface">
        {/* Header */}
        <header className="h-20 flex items-center justify-between px-10 glass-panel z-20">
          <div className="flex items-center gap-6">
            <span className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] font-headline">
              {activeView === 'chat' ? (currentSession?.title || 'MindScribe AI // Neural Entry') : `MindScribe AI // ${activeView}`}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {activeView === 'chat' && currentSession?.analysis && (
              <div className="bg-primary/10 text-primary px-4 py-1.5 rounded-full text-xs font-bold">
                Analysis Complete
              </div>
            )}
            
            <button 
              onClick={() => setActiveView('settings')}
              className="p-1 rounded-full hover:bg-slate-100 transition-colors cursor-pointer"
              title="Settings"
            >
              <SettingsIcon size={20} className="text-slate-400 hover:text-slate-600" />
            </button>

            <div className="relative" ref={profileRef}>
              <button 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="w-10 h-10 rounded-xl overflow-hidden ring-2 ring-primary/5 hover:ring-primary/20 transition-all cursor-pointer bg-slate-50 flex items-center justify-center group"
                title="Profile"
              >
                {profile.avatar ? (
                  <img 
                    src={profile.avatar} 
                    alt="Avatar" 
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <User size={20} className="text-slate-400" />
                )}
              </button>
              
              <AnimatePresence>
                {isProfileOpen && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                    className="absolute right-0 mt-3 w-56 bg-white border border-outline-variant rounded-2xl shadow-xl z-50 overflow-hidden"
                  >
                    <div className="px-5 py-4 border-b border-outline-variant bg-slate-50/50">
                      <p className="text-xs font-black text-slate-800 tracking-tight truncate">{profile.name}</p>
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider truncate mt-0.5">{profile.email}</p>
                    </div>
                    <div className="py-2">
                      <button 
                        onClick={() => {
                          setActiveView('profile');
                          setIsProfileEditing(false);
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-3"
                      >
                        <User size={14} className="opacity-50" />
                        View Profile
                      </button>
                      <button 
                         onClick={() => {
                          setActiveView('profile');
                          setIsProfileEditing(true);
                          setIsProfileOpen(false);
                        }}
                        className="w-full text-left px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 hover:text-primary transition-colors flex items-center gap-3"
                      >
                        <Edit2 size={14} className="opacity-50" />
                        Edit Profile
                      </button>
                    </div>
                    <div className="py-2 border-t border-outline-variant">
                      <button className="w-full text-left px-5 py-3 text-xs font-bold text-red-500 hover:bg-red-50 transition-colors flex items-center gap-3">
                        <LogOut size={14} className="opacity-50" />
                        System Sign-out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </header>

        <AnimatePresence mode="wait">
          {activeView === 'chat' ? (
            <motion.div 
              key="chat"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="flex-1 flex flex-col min-h-0"
            >
              {/* Chat Feed */}
              <div className="flex-1 overflow-y-auto px-4 md:px-8 py-8 scroll-smooth z-10 custom-scrollbar">
                <div className="max-w-5xl mx-auto space-y-12">
                  {messages.length === 0 && !isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-center py-12 md:py-24 space-y-12"
                    >
                      <div className="space-y-4">
                        <h1 className="text-5xl md:text-7xl font-headline font-extrabold text-on-surface tracking-tighter">
                          Mind<span className="text-gradient-primary">Scribe</span> AI
                        </h1>
                        <p className="text-on-surface-variant max-w-md mx-auto text-lg leading-relaxed font-body">
                          Strategic synthesis for transcript data. Distill raw audio notes into tactical briefings.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        <div className="bento-card text-left flex flex-col gap-4 border-primary/10">
                          <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <Mic size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Automated Feed</h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Paste meeting transcripts or classroom audio notes for instant processing.</p>
                          </div>
                        </div>
                        <div className="bento-card text-left flex flex-col gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-500">
                            <Target size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Strategic Briefs</h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Get summaries, action items, and health scores optimized for high-level decision makers.</p>
                          </div>
                        </div>
                        <div className="bento-card text-left flex flex-col gap-4">
                          <div className="w-10 h-10 rounded-2xl bg-violet-50 flex items-center justify-center text-violet-500">
                            <TrendingUp size={20} />
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800 text-sm">Follow-up Engine</h3>
                            <p className="text-[11px] text-slate-500 font-medium leading-relaxed">Query the analysis further to dive deeper into specific strategic points or technical details.</p>
                          </div>
                        </div>
                      </div>

                      <button 
                         onClick={() => setActiveView('templates')}
                         className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-slate-900 text-white text-xs font-bold hover:scale-105 transition-transform shadow-lg shadow-slate-900/10"
                      >
                         Explore Specialized Paths
                         <Plus size={14} />
                      </button>
                    </motion.div>
                  )}

                  {messages.map((msg) => (
                    <ChatMessage key={msg.id} message={msg} />
                  ))}

                  {isAnalyzing && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-4 mb-8"
                    >
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-white animate-pulse">
                        <Sparkles size={16} fill="currentColor" />
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] font-bold uppercase tracking-widest text-primary">MindScribe AI</div>
                        <div className="bg-white border border-outline-variant rounded-b-2xl rounded-tr-2xl px-6 py-4 shadow-sm flex flex-col gap-2">
                          <div className="flex gap-1">
                            <motion.span 
                              animate={{ opacity: [0.4, 1, 0.4] }} 
                              transition={{ repeat: Infinity, duration: 1.5, delay: 0 }}
                              className="w-1.5 h-1.5 rounded-full bg-primary" 
                            />
                            <motion.span 
                              animate={{ opacity: [0.4, 1, 0.4] }} 
                              transition={{ repeat: Infinity, duration: 1.5, delay: 0.2 }}
                              className="w-1.5 h-1.5 rounded-full bg-primary" 
                            />
                            <motion.span 
                              animate={{ opacity: [0.4, 1, 0.4] }} 
                              transition={{ repeat: Infinity, duration: 1.5, delay: 0.4 }}
                              className="w-1.5 h-1.5 rounded-full bg-primary" 
                            />
                          </div>
                          <p className="text-slate-500 text-xs font-medium">
                            {currentSession ? "Thinking about your query..." : "Synthesizing intelligence briefing..."}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  <div ref={messagesEndRef} />
                </div>
              </div>

              {/* Input Area */}
              <footer className="p-4 md:p-8 z-20">
                <div className="max-w-3xl mx-auto relative group">
                  {(isRecording || uploadedFileName) && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute -top-16 left-1/2 -translate-x-1/2 px-6 py-2 rounded-full flex items-center gap-3 shadow-xl z-30 ${isRecording ? 'bg-red-500 text-white' : 'bg-primary text-white'}`}
                    >
                      {isRecording ? (
                        <>
                          <div className="w-2 h-2 rounded-full bg-white animate-ping" />
                          <span className="text-xs font-bold uppercase tracking-widest">Listening...</span>
                        </>
                      ) : (
                        <>
                          <div className={`w-2 h-2 rounded-full bg-white ${isUploading ? 'animate-pulse' : ''}`} />
                          <span className="text-xs font-bold uppercase tracking-widest truncate max-w-[150px]">
                            {isUploading ? 'Processing...' : uploadedFileName}
                          </span>
                        </>
                      )}
                      <button 
                        onClick={() => {
                          if (isRecording) toggleRecording();
                          setUploadedFileName(null);
                        }} 
                        className="ml-2 hover:opacity-70 transition-opacity"
                      >
                        <Trash2 size={14} />
                      </button>
                    </motion.div>
                  )}

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileUpload} 
                    accept=".txt,.md,.json,.pdf,.docx" 
                    className="hidden" 
                  />

                  <div className="absolute -inset-2 bg-gradient-to-r from-primary/20 via-secondary/20 to-primary/20 rounded-[32px] blur-xl opacity-0 group-focus-within:opacity-100 transition-opacity duration-700" />
                  <div className="relative glass-card rounded-[28px] flex items-center px-5 py-3 shadow-lift">
                    <motion.button 
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 text-slate-400 hover:text-primary transition-colors"
                    >
                      <Paperclip size={22} />
                    </motion.button>
                    <textarea
                      rows={1}
                      className="flex-1 bg-transparent border-none focus:ring-0 text-slate-800 placeholder:text-slate-400 font-body py-4 px-4 resize-none max-h-48 overflow-y-auto text-sm"
                      placeholder={isRecording ? "Transcribing neural input..." : "Paste strategic intelligence or ask a query..."}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSend();
                        }
                      }}
                    />
                    <div className="flex items-center gap-3">
                      <motion.button 
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleRecording}
                        className={`p-3 transition-colors hidden md:block ${isRecording ? 'text-red-500 animate-pulse' : 'text-slate-400 hover:text-secondary'}`}
                      >
                        <Mic size={22} />
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={handleSend}
                        disabled={isAnalyzing}
                        className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-lift hover:bg-primary transition-all disabled:opacity-50"
                      >
                        {isAnalyzing ? (
                          <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Send size={24} fill="currentColor" />
                        )}
                      </motion.button>
                    </div>
                  </div>
                </div>
              </footer>
            </motion.div>
          ) : activeView === 'history' ? (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10"
            >
              <div className="max-w-5xl mx-auto space-y-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="space-y-1">
                    <h2 className="text-3xl font-black text-slate-800 font-headline tracking-tight">Intelligence Archive</h2>
                    <p className="text-sm text-slate-500 font-medium tracking-wide">Review and manage your past session analyses.</p>
                  </div>
                  
                  <div className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
                    <input 
                      type="text" 
                      placeholder="Search archive..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-11 pr-4 py-3 bg-white border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {filteredHistory.length > 0 ? (
                    filteredHistory.map((session) => (
                      <motion.div 
                        layout
                        key={session.id}
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        whileHover={{ y: -4, boxShadow: "var(--shadow-lift)" }}
                        onClick={() => openSession(session)}
                        className="bg-white border border-outline-variant p-8 rounded-2xl shadow-soft hover:border-primary/30 transition-all cursor-pointer group relative overflow-hidden"
                      >
                         <div className="absolute top-0 right-0 w-32 h-32 bg-primary/2 rounded-full -mr-16 -mt-16 blur-3xl group-hover:bg-primary/5 transition-colors" />
                        <div className="flex justify-between items-start mb-6">
                          <div className="space-y-1 pr-8">
                            <h3 className="font-headline font-black text-slate-900 group-hover:text-primary transition-colors line-clamp-1 text-lg">{session.title}</h3>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em]">
                              <Clock size={12} className="text-primary/40" />
                              <span>{session.timestamp}</span>
                            </div>
                          </div>
                          <button 
                            onClick={(e) => deleteSession(session.id, e)}
                            className="text-slate-200 hover:text-red-500 transition-colors p-2 -mr-2 relative z-10"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                        <p className="text-[13px] text-slate-500 line-clamp-2 leading-relaxed italic mb-6 opacity-80">
                          "{session.analysis?.summary}"
                        </p>
                        <div className="flex justify-between items-center pt-5 border-t border-slate-50">
                           <div className="flex gap-2">
                              <div className="w-2 h-2 rounded-full bg-primary/20" />
                              <div className="w-2 h-2 rounded-full bg-emerald-500/20" />
                              <div className="w-2 h-2 rounded-full bg-amber-500/20" />
                           </div>
                           <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] flex items-center gap-2">
                              Synchronize <ArrowLeft className="rotate-180" size={12} />
                           </span>
                        </div>
                      </motion.div>
                    ))
                  ) : (
                    <div className="col-span-full py-24 flex flex-col items-center justify-center space-y-4">
                       <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center text-slate-300">
                          <HistoryIcon size={32} />
                       </div>
                       <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">No matching archives found</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          ) : activeView === 'templates' ? (
            <motion.div 
              key="templates"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10"
            >
               <div className="max-w-5xl mx-auto space-y-8">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 font-headline tracking-tight">Strategy Templates</h2>
                  <p className="text-sm text-slate-500 font-medium tracking-wide">Select a specialized intelligence framework for your session.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                   {TEMPLATES.map((template) => (
                     <motion.div 
                       key={template.id}
                       whileHover={{ y: -5 }}
                       className="bento-card bg-white flex flex-col items-start gap-4 h-full relative overflow-hidden group border border-outline-variant hover:border-primary/50 transition-all duration-500"
                     >
                        <div className="p-3 rounded-2xl bg-slate-50 group-hover:bg-primary/5 transition-colors">
                           {template.icon}
                        </div>
                        <div className="space-y-2">
                           <h3 className="font-bold text-slate-800 text-lg">{template.title}</h3>
                           <p className="text-xs text-slate-500 leading-relaxed font-medium">{template.description}</p>
                        </div>
                        <button 
                          onClick={() => useTemplate(template.prompt)}
                          className="mt-auto w-full py-3 rounded-xl bg-slate-50 text-slate-400 text-xs font-black uppercase tracking-widest hover:bg-primary hover:text-white transition-all transition-duration-300 flex items-center justify-center gap-2"
                        >
                           <span>Use Template</span>
                           <ArrowLeft className="rotate-180" size={14} />
                        </button>
                     </motion.div>
                   ))}
                </div>

                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-10 relative overflow-hidden text-center space-y-6">
                   <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 blur-[100px] pointer-events-none" />
                   <div className="absolute bottom-0 left-0 w-64 h-64 bg-secondary/10 blur-[100px] pointer-events-none" />
                   
                   <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center mx-auto text-violet-400">
                      <Plus size={24} />
                   </div>
                   <div className="space-y-2">
                      <h3 className="text-white font-bold text-xl font-headline">Custom Intelligence Path</h3>
                      <p className="text-slate-400 text-sm max-w-sm mx-auto">Define your own analysis framework and save it as a reusable template for your team.</p>
                   </div>
                   <button className="px-8 py-3 rounded-full bg-white text-slate-900 font-bold text-sm hover:scale-105 transition-transform active:scale-95">
                      Create Template
                   </button>
                </div>
               </div>
            </motion.div>
          ) : activeView === 'analytics' ? (
            <motion.div 
              key="analytics"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10"
            >
              <div className="max-w-6xl mx-auto space-y-8">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 font-headline tracking-tight">Performance Intelligence</h2>
                  <p className="text-sm text-slate-500 font-medium tracking-wide">Visualizing high-level trends and meeting health metrics.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <StatCard label="Total Analyzed" value={totalAnalyzed.toString()} icon={<Activity className="text-primary" />} trend="+12% from last week" />
                  <StatCard label="Avg. Clarity" value={avgScores.clarity.toString()} icon={<Target className="text-emerald-500" />} />
                  <StatCard label="Avg. Productivity" value={avgScores.productivity.toString()} icon={<TrendingUp className="text-amber-500" />} trend="Stable" />
                  <StatCard label="Avg. Engagement" value={avgScores.engagement.toString()} icon={<Users className="text-violet-500" />} />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bento-card">
                    <div className="bento-title mb-6">
                      <div className="bento-title-dot" />
                      <span>Sync Dynamics (Last Sessions)</span>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={analyticsData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                          <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} domain={[0, 10]} />
                          <Tooltip 
                            cursor={{ fill: '#f8fafc' }}
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Bar dataKey="clarity" fill="#4F46E5" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="productivity" fill="#10B981" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="engagement" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bento-card">
                    <div className="bento-title mb-6">
                      <div className="bento-title-dot" />
                      <span>Clarity Trend Over Time</span>
                    </div>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={analyticsData}>
                          <defs>
                            <linearGradient id="colorClarity" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.1}/>
                              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" />
                          <YAxis fontSize={10} axisLine={false} tickLine={false} stroke="#94a3b8" domain={[0, 10]} />
                          <Tooltip 
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                          />
                          <Area type="monotone" dataKey="clarity" stroke="#4F46E5" fillOpacity={1} fill="url(#colorClarity)" strokeWidth={3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : activeView === 'profile' ? (
            <motion.div 
              key="profile"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10"
            >
               <input 
                 type="file" 
                 ref={avatarInputRef} 
                 onChange={handleAvatarUpload} 
                 accept="image/*" 
                 className="hidden" 
               />
               <div className="max-w-4xl mx-auto space-y-12 pb-24">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <h2 className="text-3xl font-black text-slate-800 font-headline tracking-tight">User Intelligence Profile</h2>
                      <p className="text-sm text-slate-500 font-medium tracking-wide">Manage your personal data and platform identity.</p>
                    </div>
                    {!isProfileEditing && (
                      <button 
                        onClick={() => setIsProfileEditing(true)}
                        className="px-6 py-2 rounded-full bg-primary text-white text-xs font-black uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg shadow-primary/20 flex items-center gap-2"
                      >
                        <Edit2 size={14} />
                        Edit Profile
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-1 bento-card flex flex-col items-center justify-center p-10 space-y-6 relative group">
                       <div className="relative">
                          <div className="w-40 h-40 rounded-full overflow-hidden bg-slate-100 ring-4 ring-primary/10 mb-2">
                             <img 
                               src={profile.avatar} 
                               alt="Profile Avatar"
                               className="w-full h-full object-cover"
                               referrerPolicy="no-referrer"
                             />
                          </div>
                          {isProfileEditing && (
                            <button 
                              onClick={() => avatarInputRef.current?.click()}
                              className="absolute bottom-2 right-2 w-10 h-10 rounded-full bg-slate-900 text-white flex items-center justify-center shadow-xl hover:bg-primary transition-colors border-2 border-white"
                            >
                              <Camera size={18} />
                            </button>
                          )}
                       </div>
                       <div className="text-center">
                          <h3 className="font-headline font-black text-slate-800 text-xl">{profile.name}</h3>
                          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">{isProfileEditing ? 'Mode: Editing' : 'Strategic Architect'}</p>
                       </div>
                       
                       <div className="w-full pt-4 border-t border-slate-50 space-y-4">
                          <div className="flex items-center gap-3 text-slate-400 hover:text-primary transition-colors cursor-pointer group">
                             <TrendingUp size={16} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">98% Clarity Goal</span>
                          </div>
                          <div className="flex items-center gap-3 text-slate-400">
                             <Clock size={16} />
                             <span className="text-[10px] font-bold uppercase tracking-widest">Joined April 2026</span>
                          </div>
                       </div>
                    </div>

                    <div className="lg:col-span-2 bento-card space-y-8">
                       <div className="bento-title">
                          <div className="bento-title-dot" />
                          <span>Identity Parameters</span>
                       </div>
                       
                       <div className="grid grid-cols-1 gap-6">
                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <User size={12} />
                              Full Name
                            </label>
                            {isProfileEditing ? (
                              <input 
                                type="text" 
                                value={profile.name}
                                onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="Enter your high-level identifier"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm text-slate-700 font-medium">
                                {profile.name}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <Mail size={12} />
                              Intelligence Frequency (Email)
                            </label>
                            {isProfileEditing ? (
                              <input 
                                type="email" 
                                value={profile.email}
                                onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                                className="w-full px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                                placeholder="architect@mindscribe.ai"
                              />
                            ) : (
                              <div className="px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm text-slate-700 font-medium">
                                {profile.email}
                              </div>
                            )}
                          </div>

                          <div className="space-y-2">
                            <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                              <MessageSquare size={12} />
                              Strategic Bio
                            </label>
                            {isProfileEditing ? (
                              <textarea 
                                value={profile.bio}
                                onChange={(e) => setProfile(prev => ({ ...prev, bio: e.target.value }))}
                                rows={4}
                                className="w-full px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                                placeholder="Describe your synthesis specializations..."
                              />
                            ) : (
                              <div className="px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm text-slate-500 leading-relaxed font-body">
                                {profile.bio}
                              </div>
                            )}
                          </div>
                       </div>

                       {isProfileEditing && (
                         <div className="flex justify-end gap-3 pt-4">
                            <button 
                              onClick={() => {
                                setIsProfileEditing(false);
                                // Refresh from storage to cancel changes
                                const saved = localStorage.getItem('mindscribe_profile');
                                if (saved) setProfile(JSON.parse(saved));
                              }}
                              className="px-6 py-2.5 rounded-xl border border-outline-variant text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
                            >
                               Cancel
                            </button>
                            <button 
                              onClick={() => {
                                setIsProfileEditing(false);
                                setCopyFeedback("Profile intelligence synchronized");
                              }}
                              className="px-6 py-2.5 rounded-xl bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 shadow-lg shadow-slate-900/10"
                            >
                               <CheckCircle2 size={12} className="text-emerald-400" />
                               Save Synchronization
                            </button>
                         </div>
                       )}
                    </div>
                  </div>
               </div>
            </motion.div>
          ) : (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.98 }}
              className="flex-1 overflow-y-auto p-8 custom-scrollbar relative z-10"
            >
              <div className="max-w-4xl mx-auto space-y-12 pb-24">
                <div className="space-y-1">
                  <h2 className="text-3xl font-black text-slate-800 font-headline tracking-tight">System Configuration</h2>
                  <p className="text-sm text-slate-500 font-medium tracking-wide">Manage your intelligence environment and regional preferences.</p>
                </div>

                <div className="grid grid-cols-1 gap-8">
                  {/* Profile Section */}
                  <div className="bento-card space-y-6">
                    <div className="bento-title">
                      <div className="bento-title-dot" />
                      <span>Intelligence Profile</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <User size={12} />
                          Display Name
                        </label>
                        <input 
                          type="text" 
                          value={profile.name}
                          onChange={(e) => setProfile(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold uppercase text-slate-400 tracking-widest flex items-center gap-2">
                          <Mail size={12} />
                          Email Address
                        </label>
                        <input 
                          type="email" 
                          value={profile.email}
                          onChange={(e) => setProfile(prev => ({ ...prev, email: e.target.value }))}
                          className="w-full px-4 py-3 bg-slate-50 border border-outline-variant rounded-xl text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Interface Preferences */}
                  <div className="bento-card space-y-6">
                    <div className="bento-title">
                      <div className="bento-title-dot" />
                      <span>Interface Preferences</span>
                    </div>
                    
                    <div className="space-y-4">
                      {/* Theme Toggle */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-outline-variant">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${theme === 'dark' ? 'bg-slate-800 text-amber-400' : 'bg-white text-slate-400 border border-outline-variant shadow-sm'}`}>
                            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">{theme === 'dark' ? 'Deep Space Mode' : 'Cinematic Light Mode'}</p>
                            <p className="text-[10px] text-slate-500 font-medium">Toggle the visual density of the interface.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                          className="px-6 py-2 rounded-full bg-white border border-outline-variant text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-primary hover:border-primary/30 transition-all transition-duration-300 shadow-sm"
                        >
                          Switch
                        </button>
                      </div>

                      {/* Demo Mode Toggle */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-outline-variant">
                        <div className="flex items-center gap-4">
                          <div className={`p-3 rounded-xl ${isDemoMode ? 'bg-primary/10 text-primary' : 'bg-white text-slate-400 border border-outline-variant shadow-sm'}`}>
                            <Sparkles size={20} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 text-sm">Demo Simulation Mode</p>
                            <p className="text-[10px] text-slate-500 font-medium">Use mock AI responses for demonstration purposes.</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => setIsDemoMode(!isDemoMode)}
                          className={`px-6 py-2 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all shadow-sm ${
                            isDemoMode 
                              ? 'bg-primary text-white border-primary hover:bg-primary-dim' 
                              : 'bg-white text-slate-400 border-outline-variant hover:text-primary hover:border-primary/30'
                          }`}
                        >
                          {isDemoMode ? 'Deactivate' : 'Activate'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Export Preferences */}
                  <div className="bento-card space-y-6">
                    <div className="bento-title">
                      <div className="bento-title-dot" />
                      <span>Export Framework</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <ExportOption icon={<FileText size={18} />} title="PDF Synthesis" description="High-fidelity tactical briefing document." active />
                      <ExportOption icon={<Kanban size={18} />} title="Project Export" description="Push action items to Notion or Jira." />
                      <div onClick={downloadHistory}>
                        <ExportOption icon={<Download size={18} />} title="Raw Intelligence" description="Download local JSON archive of sessions." />
                      </div>
                      <ExportOption icon={<Shield size={18} />} title="Encrypted Sync" description="End-to-end encrypted backup of history." />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Feedback Toast */}
      <AnimatePresence>
        {copyFeedback && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed bottom-32 left-1/2 -translate-x-1/2 px-6 py-2 bg-slate-900/90 text-white text-[10px] font-black uppercase tracking-[0.2em] rounded-full shadow-2xl backdrop-blur-md z-[100] flex items-center gap-2 border border-white/10"
          >
            <CheckCircle2 size={14} className="text-emerald-400" />
            {copyFeedback}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Action Tool */}
      <button 
        onClick={showHelp}
        className="fixed bottom-10 right-10 w-16 h-16 rounded-full bg-surface-bright border border-outline-variant/30 flex items-center justify-center text-primary shadow-2xl z-50 hover:scale-110 active:scale-90 transition-all hover:bg-surface-container-highest group"
      >
        <Sparkles size={28} className="group-hover:rotate-12 transition-transform" />
      </button>
    </div>
  );
}

function StatCard({ label, value, icon, trend }: { label: string, value: string, icon: React.ReactNode, trend?: string }) {
  return (
    <div className="bento-card flex flex-col gap-6">
      <div className="flex justify-between items-start">
        <div className="p-4 rounded-2xl bg-slate-50 text-primary shadow-sm group-hover:bg-primary group-hover:text-white transition-colors duration-500">
          {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { size: 24 }) : icon}
        </div>
        {trend && (
          <div className="px-2 py-1 rounded-full bg-emerald-50 text-[9px] font-black uppercase text-emerald-600 tracking-wider">
            {trend}
          </div>
        )}
      </div>
      <div>
        <p className="text-3xl font-black text-slate-900 font-headline tracking-tight">{value}</p>
        <p className="text-[10px] uppercase font-black text-slate-400 tracking-[0.2em] mt-1">{label}</p>
      </div>
    </div>
  );
}

function ExportOption({ icon, title, description, active = false }: { icon: React.ReactNode, title: string, description: string, active?: boolean }) {
  return (
    <motion.div 
      whileHover={{ y: -4, boxShadow: "var(--shadow-lift)" }}
      whileTap={{ scale: 0.98 }}
      className={`p-6 rounded-3xl border transition-all cursor-pointer flex items-start gap-5 ${active ? 'bg-primary/5 border-primary/30 shadow-soft' : 'bg-slate-50/50 border-outline-variant hover:bg-white'}`}
    >
      <div className={`p-4 rounded-2xl ${active ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'bg-white text-slate-400 border border-outline-variant'}`}>
        {icon}
      </div>
      <div className="space-y-1">
        <p className={`font-headline font-black text-sm uppercase tracking-wider ${active ? 'text-primary' : 'text-slate-800'}`}>{title}</p>
        <p className="text-[11px] text-slate-500 font-medium leading-relaxed opacity-80">{description}</p>
      </div>
    </motion.div>
  );
}

function NavItem({ icon, label, active = false, onClick }: { icon: React.ReactNode, label: string, active?: boolean, onClick?: () => void }) {
  return (
    <motion.div 
      onClick={onClick}
      whileHover={{ x: 4 }}
      whileTap={{ scale: 0.98 }}
      className={`px-5 py-3 mx-1 rounded-xl flex items-center gap-4 cursor-pointer transition-all duration-300 ${active ? 'bg-primary text-white shadow-lg shadow-primary/20 font-bold' : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'}`}
    >
      <span className={`${active ? 'text-white' : 'text-slate-400 group-hover:text-primary'}`}>{icon}</span>
      <span className="text-xs uppercase font-black tracking-widest">{label}</span>
    </motion.div>
  );
}

function ChatMessage({ message }: { message: Message }) {
  const isAssistant = message.role === 'assistant';

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isAssistant ? 'justify-start items-start gap-4 mb-8' : 'justify-end mb-8'} group`}
    >
      <div className={`flex flex-col gap-2 ${isAssistant ? 'w-full' : 'max-w-[85%] md:max-w-[70%]'}`}>
        <div className={`relative ${
          isAssistant 
            ? 'w-full' 
            : 'bg-slate-900 text-white rounded-[24px] rounded-tr-[4px] px-8 py-5 shadow-lift'
        }`}>
          {message.analysis ? (
            <AnalysisView 
              analysis={message.analysis} 
              onCopy={(text, label) => (window as any).copyToClipboard?.(text, label)}
              onShare={(title) => (window as any).handleShare?.(title)}
            />
          ) : (
            <div className={`prose max-w-none ${isAssistant ? 'text-slate-700 bg-white border border-outline-variant rounded-[24px] rounded-tl-[4px] px-8 py-5 shadow-soft' : 'text-white prose-invert'}`}>
               <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
          )}
          
          {!message.analysis && (
            <button 
              onClick={() => (window as any).copyToClipboard?.(message.content, "Message copied")}
              className={`absolute top-2 right-2 p-1.5 rounded-lg transition-all opacity-0 group-hover:opacity-100 ${
                isAssistant ? 'text-slate-300 hover:text-primary hover:bg-slate-50' : 'text-primary-foreground/50 hover:text-white hover:bg-white/10'
              }`}
            >
              <Copy size={12} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

function ToolButton({ icon, label, color }: { icon: React.ReactNode, label: string, color: string }) {
  return (
    <motion.button 
      whileHover={{ y: -2, boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)" }}
      whileTap={{ scale: 0.98 }}
      className="bg-white hover:bg-slate-50 transition-all px-5 py-4 rounded-2xl flex flex-col gap-3 items-start text-left border border-outline-variant shadow-sm group"
    >
      <span className={`${color} group-hover:scale-110 transition-transform duration-300`}>{icon}</span>
      <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-primary transition-colors">{label}</span>
    </motion.button>
  );
}

function AnalysisView({ analysis, onCopy, onShare }: { analysis: AnalysisResult, onCopy?: (t: string, l: string) => void, onShare?: (t: string) => void }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-5 h-full">
      {/* Left Column: Summary, Actions, Suggestions */}
      <div className="space-y-5">
        {/* Summary Card */}
        <div className="bento-card relative group/card">
          <div className="bento-title">
            <div className="bento-title-dot" />
            <span>Concise Summary</span>
            <button 
              onClick={() => onCopy?.(analysis.summary, "Summary copied")}
              className="ml-auto opacity-0 group-hover/card:opacity-100 transition-opacity p-1.5 text-slate-300 hover:text-primary rounded-lg"
            >
              <Copy size={12} />
            </button>
          </div>
          <p className="text-slate-700 text-base leading-relaxed">
            {analysis.summary}
          </p>
        </div>

        {/* Action Items Card */}
        <div className="bento-card">
          <div className="bento-title">
            <div className="bento-title-dot" />
            <span>Tactical Action Items</span>
          </div>
          <div className="space-y-4">
            {analysis.actionItems.map((item, idx) => (
              <div key={idx} className="bg-slate-50/50 p-6 rounded-2xl border border-slate-100 flex justify-between items-center hover:bg-white hover:shadow-soft transition-all duration-300 group">
                <div className="flex flex-col gap-2">
                  <p className="text-sm font-bold text-slate-800 leading-snug">{item.task}</p>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest bg-white border border-slate-100 px-3 py-1 rounded-full self-start shadow-sm">
                      <User size={10} className="text-primary/40" />
                      {item.owner}
                    </div>
                  </div>
                </div>
                <div className={`text-[10px] px-3 py-1.5 rounded-full uppercase tracking-widest font-black shadow-sm ${
                  item.priority === 'High' ? 'bg-red-500 text-white' : 
                  item.priority === 'Medium' ? 'bg-amber-500 text-white' : 
                  'bg-slate-200 text-slate-600'
                }`}>
                  {item.priority}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Suggestions Card */}
        <div className="bento-card">
          <div className="bento-title">
            <div className="bento-title-dot" />
            <span>Neural Improvement Roadmap</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {analysis.suggestions.map((suggestion, idx) => (
              <div key={idx} className="p-5 rounded-2xl bg-indigo-50/30 border border-indigo-100/50 flex flex-col gap-3 hover:bg-white hover:shadow-soft transition-all duration-500">
                <div className="w-8 h-8 rounded-xl bg-white border border-indigo-100 flex items-center justify-center shrink-0 shadow-sm">
                  <span className="text-primary text-xs font-black">{idx + 1}</span>
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed font-medium italic">"{suggestion}"</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Column: Scores, Key Points */}
      <div className="space-y-5">
        {/* Meeting Score Card */}
        <div className="bento-card bg-gradient-to-br from-white to-slate-50/50">
          <div className="bento-title">
            <div className="bento-title-dot" />
            <span>Meeting Health</span>
          </div>
          <div className="grid grid-cols-3 gap-2 py-2">
            {[
              { label: 'Clarity', score: analysis.meeting_score.clarity, color: 'text-primary' },
              { label: 'Prod.', score: analysis.meeting_score.productivity, color: 'text-emerald-600' },
              { label: 'Engage.', score: analysis.meeting_score.engagement, color: 'text-amber-600' }
            ].map((s, i) => (
              <div key={i} className="flex flex-col items-center gap-1">
                <div className={`text-2xl font-black ${s.color}`}>{s.score}</div>
                <span className="text-[9px] uppercase font-black text-slate-400 tracking-tighter">{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Key Insights Card */}
        <div className="bento-card h-full flex flex-col">
          <div className="bento-title">
            <div className="bento-title-dot" />
            <span>Key Points</span>
          </div>
          <ul className="space-y-4 flex-grow">
            {analysis.keyPoints.map((point, idx) => (
              <li key={idx} className="flex items-start gap-3 text-sm text-slate-600 leading-relaxed font-medium">
                <span className="mt-1.5 text-primary font-bold">●</span>
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="mt-auto pt-6 text-[13px] text-slate-400 font-medium border-t border-slate-50 flex justify-between items-center">
            <span>Sync Intelligence v2.1</span>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => onCopy?.(JSON.stringify(analysis, null, 2), "Full data copied")}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-primary"
              >
                <Copy size={16} />
              </button>
              <button 
                onClick={() => onShare?.(analysis.title)}
                className="p-2 hover:bg-slate-50 rounded-lg transition-colors text-slate-400 hover:text-primary"
              >
                 <Share2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
