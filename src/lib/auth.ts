import jwt from 'jsonwebtoken';
import { cookies } from 'next/headers';

const JWT_SECRET = process.env.JWT_SECRET || 'al_haram_super_secure_jwt_secret_chattarpur_2026_9837264';

export interface AuthSession {
  userId: string;
  name: string;
  role: 'admin' | 'counter_staff' | 'delivery';
}

export function signToken(payload: AuthSession): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
}

export function verifyToken(token: string): AuthSession | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthSession;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<AuthSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get('alharam_token')?.value;
  if (!token) return null;
  return verifyToken(token);
}

