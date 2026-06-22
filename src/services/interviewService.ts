import { api, type ApiResponse } from "@/lib/api";

export type Question = {
  id: number;
  content: string;
  type: string;
  /** true ketika pertanyaan ini adalah follow-up yang digenerate AI */
  isFollowUp?: boolean;
  followUpReason?: string;
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

/** Payload yang diterima dari socket event follow-up-generated */
export type FollowUpQuestion = {
  id: number;
  content: string;
  reason: string;
  expectedSignal?: string;
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

  /** Submit jawaban untuk follow-up question via REST (fallback jika socket tidak tersambung) */
  submitFollowUpAnswer: async (
    followUpQuestionId: number,
    answer: string,
    token: string,
  ) => {
    const response = await api.post<ApiResponse<{ updatedScore: any; breakdown: any }>>(
      `/follow-up/${followUpQuestionId}/answer`,
      { answer },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data.data;
  },

  updateFinalResume: async (
    id: number,
    finalResume: string,
    token: string,
  ) => {
    const response = await api.patch<ApiResponse<any>>(
      `/interviews/${id}/final-resume`,
      { finalResume },
      { headers: { Authorization: `Bearer ${token}` } },
    );
    return response.data.data;
  },
};
