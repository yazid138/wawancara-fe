import { api, type ApiResponse } from "@/lib/api";

export type Question = {
  id: number;
  content: string;
  type: string;
};

export type Answer = {
  id: number;
  content: string;
  createdAt: string;
  question: Question;
};

export type InterviewHistory = {
  id: number;
  status: string;
  currentIndex: number;
  answers: Answer[];
  company?: any;
  position?: any;
};

export const interviewService = {
  getInterviewHistory: async (id: number, token: string) => {
    const response = await api.get<ApiResponse<InterviewHistory>>(`/interviews/${id}/history`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },
  
  getCurrentQuestion: async (id: number, token: string) => {
    const response = await api.get<ApiResponse<Question | null>>(`/interviews/${id}/current`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    return response.data.data;
  },

  submitAnswer: async (id: number, answer: string, token: string) => {
    const response = await api.post<ApiResponse<{ answer: Answer; score: any; nextQuestion: Question | null }>>(
      `/interviews/${id}/answers`,
      { answer },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    return response.data;
  },
};
