import React, { useRef, useState } from 'react';
import { Upload, FileText, AlertTriangle } from 'lucide-react';
import { Button } from './Button';

interface UploadZoneProps {
  onFileSelect: (file: File) => void;
  isLoading: boolean;
}

export const UploadZone: React.FC<UploadZoneProps> = ({ onFileSelect, isLoading }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndPass(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) {
      validateAndPass(e.target.files[0]);
    }
  };

  const validateAndPass = (file: File) => {
    if (file.type !== 'application/pdf') {
      alert("Please upload a PDF file.");
      return;
    }
    onFileSelect(file);
  };

  return (
    <div className="w-full max-w-xl mx-auto px-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-travel-900 mb-2">Itinerary Chat</h1>
        <p className="text-slate-500">Upload your travel documents (PDF) and get instant answers using AI.</p>
      </div>

      <div 
        className={`
          relative border-2 border-dashed rounded-2xl p-10 transition-all duration-200 text-center
          ${dragActive ? 'border-travel-500 bg-travel-50 scale-[1.02]' : 'border-slate-300 bg-white'}
          ${isLoading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:border-travel-400'}
        `}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
      >
        <input 
          ref={fileInputRef}
          type="file" 
          className="hidden" 
          accept="application/pdf"
          onChange={handleChange}
          disabled={isLoading}
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <div className="w-16 h-16 bg-travel-100 text-travel-600 rounded-full flex items-center justify-center mb-2">
            {isLoading ? (
              <FileText className="animate-pulse" size={32} />
            ) : (
              <Upload size={32} />
            )}
          </div>
          
          <div className="space-y-1">
            <p className="font-semibold text-slate-700 text-lg">
              {isLoading ? "Analyzing Document..." : "Click to upload or drag and drop"}
            </p>
            <p className="text-sm text-slate-400">
              PDF files only (Max 10MB recommended)
            </p>
          </div>

          {isLoading && (
             <p className="text-xs text-travel-600 font-medium mt-2 animate-pulse">
               Extracting text and preparing AI knowledge base...
             </p>
          )}
        </div>
      </div>

      <div className="mt-8 bg-yellow-50 border border-yellow-100 rounded-lg p-4 flex gap-3 items-start">
        <AlertTriangle className="text-yellow-600 flex-shrink-0 mt-0.5" size={18} />
        <div className="text-sm text-yellow-800">
          <p className="font-semibold mb-1">Privacy Note</p>
          <p>
            This demo runs entirely in your browser. Your PDF is parsed locally. 
            The text is sent to Google Gemini API for processing, but no files are permanently stored on a custom server.
          </p>
        </div>
      </div>
    </div>
  );
};