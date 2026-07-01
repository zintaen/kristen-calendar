import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-for-dev";

export interface InviteTokenPayload {
  ownerId: string;
  reminderId: string;
  exp: number;              // Unix timestamp
  jti: string;              // UUID, single-use
}

export function createInviteToken(ownerId: string, reminderId: string): string {
  const payload = {
    ownerId,
    reminderId,
    jti: uuidv4()
  };
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "48h" });
}

export function verifyInviteToken(token: string): InviteTokenPayload | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    if (decoded && decoded.ownerId && decoded.reminderId && decoded.exp && decoded.jti) {
      return decoded as InviteTokenPayload;
    }
    return null;
  } catch (error) {
    return null;
  }
}
