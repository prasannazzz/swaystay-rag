import React, { useState, useRef, useEffect } from 'react';
import { Message, ProcessingStatus, UploadedFile, TripSummary } from './types';
import { extractTextFromPdf } from './services/pdfService';
import { createItineraryChat, sendChatMessage, generateTripSummary } from './services/geminiService';
import { UploadZone } from './components/UploadZone';
import { MessageBubble } from './components/MessageBubble';
import { Button } from './components/Button';
import { Timeline } from './components/Timeline';
import { Plane, Map, Send, X, FileText, LayoutList, Sparkles, Mic, MicOff } from 'lucide-react';
import { Chat } from '@google/genai';

const App: React.FC = () => {
  const [status, setStatus] = useState<ProcessingStatus>(ProcessingStatus.IDLE);
  const [currentFile, setCurrentFile] = useState<UploadedFile | null>(null);
  const [summary, setSummary] = useState<TripSummary | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false);
  const [isListening, setIsListening] = useState(false);
  
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Cleanup speech recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleFileSelect = async (file: File) => {
    setStatus(ProcessingStatus.PARSING);
    try {
      // 1. Extract text from PDF
      const extractedData = await extractTextFromPdf(file);
      setCurrentFile(extractedData);
      
      // 2. Initialize Gemini Chat
      chatSessionRef.current = createItineraryChat(extractedData.content);
      
      setStatus(ProcessingStatus.ANALYZING);

      // 3. Generate structured summary (Analysis phase)
      const tripSummary = await generateTripSummary(extractedData.content);
      setSummary(tripSummary);
      
      setStatus(ProcessingStatus.READY);
      setShowTimeline(true); // Auto-open timeline on success
      
      // Add initial greeting
      setMessages([{
        id: 'init-1',
        role: 'model',
        content: `Hi! I've analyzed **${tripSummary.title || extractedData.name}**. \n\nI found details for a trip to **${tripSummary.destination}**. You can see the timeline in the sidebar, or ask me specific questions!`,
        timestamp: Date.now()
      }]);

    } catch (error) {
      console.error(error);
      setStatus(ProcessingStatus.ERROR);
      alert("Failed to process the file. Please try again.");
      setStatus(ProcessingStatus.IDLE);
    }
  };

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    e?.preventDefault();
    
    const textToSend = overrideText || inputValue.trim();

    if (!textToSend || !chatSessionRef.current || isSending) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
      timestamp: Date.now()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputValue('');
    setIsSending(true);
    
    // Close sidebar on mobile when chatting
    if (window.innerWidth < 768) setShowTimeline(false);

    try {
      const responseText = await sendChatMessage(chatSessionRef.current, userMsg.content);
      
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: responseText,
        timestamp: Date.now()
      };
      
      setMessages(prev => [...prev, botMsg]);
    } catch (error) {
      const errorMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: 'model',
        content: "I'm sorry, I encountered an error connecting to the AI. Please check your API key or internet connection.",
        timestamp: Date.now(),
        isError: true
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const handleVoiceInput = () => {
    // Support both standard and WebKit-prefixed SpeechRecognition
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice input is not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    // If already listening, stop it
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => setIsListening(true);
      
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInputValue(prev => {
          const trimmed = prev.trim();
          // Append to existing text nicely
          const cleanTranscript = trimmed ? transcript : transcript.charAt(0).toUpperCase() + transcript.slice(1);
          return trimmed ? `${trimmed} ${cleanTranscript}` : cleanTranscript;
        });
        inputRef.current?.focus();
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        console.error("Speech recognition error", event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        recognitionRef.current = null;
      };

      recognition.start();
    } catch (err) {
      console.error("Failed to initialize speech recognition", err);
      setIsListening(false);
    }
  };

  const resetSession = () => {
    if (confirm("This will clear the current chat and file. Are you sure?")) {
      setCurrentFile(null);
      setSummary(null);
      setMessages([]);
      chatSessionRef.current = null;
      setStatus(ProcessingStatus.IDLE);
      setShowTimeline(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white relative overflow-hidden">
      {/* Timeline Sidebar overlay */}
      {status === ProcessingStatus.READY && summary && (
         <Timeline 
           summary={summary} 
           isOpen={showTimeline} 
           onClose={() => setShowTimeline(false)} 
         />
      )}

      {/* Header */}
      <header className="h-16 border-b border-slate-100 bg-white flex items-center justify-between px-4 md:px-6 shadow-sm z-20 relative">
        <div className="flex items-center gap-2 text-travel-600">
          <Plane className="transform -rotate-45" />
          <span className="font-bold text-xl tracking-tight hidden md:inline">WanderLust AI</span>
          <span className="font-bold text-xl tracking-tight md:hidden">WanderLust</span>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {status === ProcessingStatus.READY && currentFile && (
            <>
              <div className="hidden md:flex items-center gap-4 text-sm text-slate-500 bg-slate-50 px-4 py-1.5 rounded-full border border-slate-100">
                <div className="flex items-center gap-2">
                  <FileText size={14} />
                  <span className="font-medium text-slate-700 truncate max-w-[150px]">{summary?.title || currentFile.name}</span>
                </div>
              </div>

              <Button 
                variant="secondary" 
                onClick={() => setShowTimeline(!showTimeline)}
                className="!px-3"
                title="Toggle Timeline"
              >
                <LayoutList size={18} className={showTimeline ? "text-travel-600" : "text-slate-600"} />
                <span className="hidden sm:inline">Timeline</span>
              </Button>

              <Button variant="ghost" onClick={resetSession} className="!px-2 text-slate-400 hover:text-red-500">
                <X size={20} />
              </Button>
            </>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className={`flex-1 overflow-hidden relative flex flex-col transition-all duration-300 ${showTimeline ? 'md:mr-96' : ''}`}>
        {status === ProcessingStatus.IDLE || status === ProcessingStatus.PARSING || status === ProcessingStatus.ANALYZING ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-travel-50 relative">
             <UploadZone 
              onFileSelect={handleFileSelect} 
              isLoading={status !== ProcessingStatus.IDLE} 
            />
            {status === ProcessingStatus.ANALYZING && (
              <div className="absolute bottom-20 text-travel-600 font-medium animate-pulse flex items-center gap-2">
                <Sparkles size={18} />
                <span>AI is analyzing your trip details...</span>
              </div>
            )}
          </div>
        ) : (
          <div className="flex-1 flex flex-col w-full h-full bg-slate-50/30">
            
            {/* Chat Area */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 scrollbar-hide space-y-2">
              
              {/* Suggested Questions Chips */}
              {messages.length < 3 && summary?.suggestedQuestions && (
                <div className="flex flex-wrap gap-2 justify-center mb-6 animate-fade-in-up">
                  {summary.suggestedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(undefined, q)}
                      className="text-xs bg-white border border-travel-200 text-travel-700 px-3 py-1.5 rounded-full shadow-sm hover:bg-travel-50 hover:border-travel-300 transition-all active:scale-95"
                    >
                      ✨ {q}
                    </button>
                  ))}
                </div>
              )}

              {messages.map((msg) => (
                <MessageBubble key={msg.id} message={msg} />
              ))}
              
              {isSending && (
                <div className="flex justify-start mb-6">
                   <div className="flex items-center gap-2 bg-white border border-slate-100 px-4 py-3 rounded-2xl rounded-tl-none shadow-sm">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-travel-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-2 h-2 bg-travel-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-2 h-2 bg-travel-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                      <span className="text-xs text-slate-400 font-medium">Checking itinerary...</span>
                   </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-slate-100 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
              <div className="max-w-3xl mx-auto w-full">
                <form onSubmit={(e) => handleSendMessage(e)} className="relative flex items-center gap-2">
                  
                  <button
                    type="button"
                    onClick={handleVoiceInput}
                    className={`p-3 rounded-full transition-colors flex-shrink-0 ${
                      isListening 
                        ? 'bg-red-100 text-red-600 animate-pulse ring-2 ring-red-200' 
                        : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                    }`}
                    title={isListening ? "Stop Listening" : "Use Voice Input"}
                  >
                    {isListening ? <MicOff size={20} /> : <Mic size={20} />}
                  </button>

                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder={isListening ? "Listening..." : "Ask about your trip..."}
                    className="flex-1 py-3 px-5 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-travel-500 focus:bg-white transition-all text-slate-700 placeholder:text-slate-400"
                    disabled={isSending}
                  />
                  <Button 
                    type="submit" 
                    disabled={!inputValue.trim() || isSending}
                    className="aspect-square px-0 w-12 flex items-center justify-center rounded-xl shadow-none"
                  >
                    <Send size={20} />
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;