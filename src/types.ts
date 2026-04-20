export interface ActionItem {
  task: string;
  owner: string;
  priority: 'High' | 'Medium' | 'Low';
}

export interface Session {
  id: string;
  title: string;
  timestamp: string;
  messages: Message[];
  analysis?: AnalysisResult;
}

export interface AnalysisResult {
  title: string;
  summary: string;
  keyPoints: string[];
  actionItems: ActionItem[];
  meeting_score: {
    clarity: number;
    productivity: number;
    engagement: number;
  };
  suggestions: string[];
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  analysis?: AnalysisResult;
  timestamp: string;
}
