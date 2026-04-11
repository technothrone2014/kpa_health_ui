// kpa_health_ui/src/api/aiService.ts
import axios from 'axios';

const FREE_FLOW_URL = import.meta.env.VITE_FREE_FLOW_URL || 'https://farmfuzion-freeflow.onrender.com';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface ChatRequest {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export interface ChatResponse {
  content: string;
  provider: string;
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}

export interface HealthAnalysisRequest {
  patientId?: number;
  dateRange?: { start: string; end: string };
  metrics?: string[];
  question: string;
}

class AIService {
  private baseUrl: string;

  constructor() {
    this.baseUrl = FREE_FLOW_URL;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    try {
      const response = await axios.post(`${this.baseUrl}/chat`, request, {
        timeout: 60000, // 60 seconds for AI response
        headers: {
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error('AI Service error:', error);
      throw error;
    }
  }

  async checkHealth(): Promise<{ status: string; providers: string[] }> {
    try {
      const response = await axios.get(`${this.baseUrl}/health`);
      return response.data;
    } catch (error) {
      console.error('Health check failed:', error);
      return { status: 'error', providers: [] };
    }
  }

  async getProviders(): Promise<{ providers: Array<{ name: string; key_count: number }> }> {
    try {
      const response = await axios.get(`${this.baseUrl}/providers`);
      return response.data;
    } catch (error) {
      console.error('Failed to get providers:', error);
      return { providers: [] };
    }
  }

  // Specialized medical analysis methods
  async analyzePatientHealth(
    patientName: string,
    patientData: any,
    question: string
  ): Promise<string> {
    const systemPrompt = `You are Unesi, a compassionate and knowledgeable medical AI assistant for Kenya Ports Authority's EAP Health Week. 
You help doctors and nurses analyze patient health data. You speak in a professional yet warm tone, providing clear medical insights.

Key principles:
1. Always prioritize patient safety and confidentiality
2. Provide evidence-based insights
3. Acknowledge limitations - you are an AI assistant, not a doctor
4. Suggest follow-up actions when appropriate
5. Use clear, understandable language for health professionals

Patient: ${patientName}
Health Data: ${JSON.stringify(patientData, null, 2)}

Provide a professional medical analysis based on this data.`;

    const response = await this.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    return response.content;
  }

  async analyzeHealthTrends(
    trends: any[],
    question: string
  ): Promise<string> {
    const systemPrompt = `You are Unesi, a medical data analyst specializing in health trends for KPA Health Week.
Analyze the provided health trends data and provide actionable insights.

Health Trends Data: ${JSON.stringify(trends, null, 2)}

Provide a concise analysis focusing on:
1. Notable patterns or changes
2. Potential risk factors
3. Recommendations for follow-up`;

    const response = await this.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.3,
      max_tokens: 1024,
    });

    return response.content;
  }

  async getGeneralMedicalAdvice(question: string, context?: string): Promise<string> {
    const systemPrompt = `You are Unesi, a medical AI assistant for Kenya Ports Authority's EAP Health Week.
Provide general health information and guidance. Always include a disclaimer that you are an AI assistant
and not a substitute for professional medical advice.

${context ? `Context: ${context}` : ''}`;

    const response = await this.chat({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: question }
      ],
      temperature: 0.5,
      max_tokens: 1024,
    });

    return response.content;
  }
}

export const aiService = new AIService();
export default aiService;