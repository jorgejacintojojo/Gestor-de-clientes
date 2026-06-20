import { adminAuth } from './firebase-admin.ts';
import { db } from '../src/db/index.ts';
import { users } from '../src/db/schema.ts';

export interface AuthenticatedUser {
  uid: string;
  email: string;
}

export async function verifyAuthToken(req: Request): Promise<AuthenticatedUser | null> {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }

    const token = authHeader.split('Bearer ')[1];
    const decodedToken = await adminAuth.verifyIdToken(token);
    
    if (!decodedToken.uid || !decodedToken.email) {
      return null;
    }

    // Synchronize to the database (upsert user link)
    await db.insert(users)
      .values({
        uid: decodedToken.uid,
        email: decodedToken.email,
        createdAt: new Date(),
      })
      .onConflictDoUpdate({
        target: users.uid,
        set: {
          email: decodedToken.email,
        },
      });

    return {
      uid: decodedToken.uid,
      email: decodedToken.email,
    };
  } catch (error) {
    console.error('Authentication or synchronization failed:', error);
    return null;
  }
}
