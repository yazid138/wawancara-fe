import axios from "axios";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:5000";

export const api = axios.create({
  baseURL,
  headers: {
    "Content-Type": "application/json",
  },
});

export type ApiResponse<T> = {
  status: number;
  message: string;
  metadata?: {
    total: number;
    page: number;
    limit: number;
  };
  data?: T;
  error?: T;
};