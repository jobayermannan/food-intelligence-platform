import { Request } from "express";
export type Principal = { userId: string; sessionId: string };
export type AuthedRequest = Request & { principal: Principal };
