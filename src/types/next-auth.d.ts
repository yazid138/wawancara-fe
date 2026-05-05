import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name: string;
      username: string;
      role: string;
      createdAt: string;
    } & DefaultSession["user"];
    accessToken?: string;
  }

  interface User {
    id: string;
    name: string;
    username: string;
    role: string;
    createdAt: string;
    accessToken?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    accessToken?: string;
    user?: {
      id: string;
      name: string;
      username: string;
      role: string;
      createdAt: string;
    };
  }
}