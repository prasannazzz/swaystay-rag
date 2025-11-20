import React from 'react';
import { Message } from '../types';
import { Bot, User, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

interface MessageBubbleProps {
  message: Message;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({ message }) => {
  const isUser = message.role === 'user';
  const isSystem = message.role === 'system';

  if (isSystem) return null;

  return (
    <div className={`flex w-full mb-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[85%] md:max-w-[75%] gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* Avatar */}
        <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${isUser ? 'bg-travel-600 text-white' : 'bg-white text-travel-600 border border-travel-100'}`}>
          {isUser ? <User size={16} /> : <Bot size={16} />}
        </div>

        {/* Bubble */}
        <div className={`
          p-4 rounded-2xl text-sm leading-relaxed shadow-sm
          ${isUser 
            ? 'bg-travel-600 text-white rounded-tr-none' 
            : message.isError 
              ? 'bg-red-50 text-red-800 border border-red-100 rounded-tl-none'
              : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none'}
        `}>
          {message.isError && (
            <div className="flex items-center gap-2 mb-2 font-bold text-red-600">
              <AlertCircle size={14} />
              <span>Error</span>
            </div>
          )}
          
          <div className={`prose prose-sm max-w-none ${isUser ? 'prose-invert' : 'prose-slate'}`}>
             {/* We treat the output as markdown */}
             <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
          
          <div className={`text-[10px] mt-2 opacity-70 ${isUser ? 'text-right text-travel-100' : 'text-slate-400'}`}>
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </div>
        </div>
      </div>
    </div>
  );
};