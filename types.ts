export interface Message {
  id: string;
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: number;
  isError?: boolean;
}

export interface UploadedFile {
  name: string;
  content: string; // Extracted text content
  size: number;
  pageCount: number;
}

export interface TripEvent {
  date: string;
  time: string;
  activity: string;
  location: string;
  type: 'flight' | 'hotel' | 'activity' | 'food' | 'other';
}

export interface TripSummary {
  title: string;
  destination: string;
  dates: string;
  events: TripEvent[];
  suggestedQuestions: string[];
}

export interface ChatState {
  isLoading: boolean;
  messages: Message[];
  currentFile: UploadedFile | null;
  summary: TripSummary | null;
}

export enum ProcessingStatus {
  IDLE = 'IDLE',
  PARSING = 'PARSING',
  ANALYZING = 'ANALYZING', // New state for AI analysis
  READY = 'READY',
  ERROR = 'ERROR',
}