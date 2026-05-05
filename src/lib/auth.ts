import axios from "axios";
import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { api, type ApiResponse } from "@/lib/api";

type BackendUser = {
  id: number;
  name: string;
  username: string;
  role: string;
  createdAt: string;
};

type LoginPayload = {
  username: string;
  password: string;
};

type LoginResult = {
  token: string;
};

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET ?? "wawancara-dev-secret",
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error("Username dan password wajib diisi");
        }

        try {
          const loginResponse = await api.post<ApiResponse<LoginResult>>(
            "/auth/login",
            {
              username: credentials.username,
              password: credentials.password,
            } satisfies LoginPayload,
          );

          const token = loginResponse.data.data?.token;
          if (!token) {
            throw new Error("Token tidak ditemukan dari server");
          }

          const meResponse = await api.get<ApiResponse<BackendUser>>("/auth/me", {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          const user = meResponse.data.data;
          if (!user) {
            throw new Error("Gagal mengambil data pengguna");
          }
          
          return {
            id: String(user.id),
            name: user.name,
            username: user.username,
            role: user.role,
            createdAt: user.createdAt,
            accessToken: token,
          };
        } catch (error) {
          if (axios.isAxiosError(error)) {
            const message =
              (error.response?.data as { message?: string } | undefined)?.message ??
              "Login gagal";
            throw new Error(message);
          }

          if (error instanceof Error) {
            throw error;
          }

          throw new Error("Login gagal");
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.accessToken = user.accessToken;
        token.user = {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt,
        };
      }

      return token;
    },
    async session({ session, token }) {
      if (token.user) {
        session.user = {
          ...session.user,
          ...token.user,
        };
      }

      session.accessToken = token.accessToken;

      return session;
    },
  },
};