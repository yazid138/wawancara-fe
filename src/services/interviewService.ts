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
  technicalScore?: {
    finalScore: number;
    feedback: string;
    reason: string;
  } | null;
  softSkillScore?: { finalScore: number; reason: string } | null;
};

export type InterviewHistory = {
  id: number;
  status: string;
  currentIndex: number;
  answers: Answer[];
  company?: any;
  position?: any;
  resume?: string;
  finalResume?: string;
  chatHistories?: any[]; 
};

export const interviewService = {
  getInterviewHistory: async (id: number, token: string) => {
    const response = await api.get<ApiResponse<InterviewHistory>>(
      `/interviews/${id}/history`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data.data;
  },

  getCurrentQuestion: async (id: number, token: string) => {
    const response = await api.get<ApiResponse<Question | null>>(
      `/interviews/${id}/current`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    return response.data.data;
  },

  submitAnswer: async (
    id: number,
    answer: string,
    questionId: number,
    token: string,
  ) => {
    const response = await api.post<
      ApiResponse<{
        answer: Answer;
        questionId: number;
        score: any;
        nextQuestion: Question | null;
      }>
    >(
      `/interviews/${id}/answers`,
      { answer, questionId },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data;
  },

  finishInterview: async (
    id: number,
    token: string,
    finalResume?: string,
  ) => {
    const response = await api.post<
      ApiResponse<InterviewHistory>
    >(
      `/interviews/${id}/finish`,
      finalResume ? { finalResume } : {},
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data.data;
  },

  updateFinalResume: async (
    id: number,
    token: string,
    finalResume: string,
  ) => {
    const response = await api.put<
      ApiResponse<InterviewHistory>
    >(
      `/interviews/${id}/final-resume`,
      { finalResume },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data.data;
  },
};
