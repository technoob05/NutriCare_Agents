import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import logger from '@/lib/logger'; // Assuming logger is accessible
import path from 'path'; // Import path module

// --- Firebase Admin SDK Initialization ---
export function initializeFirebaseAdmin() {
  // Declare credentialsPath outside the try block to make it accessible in catch
  const credentialsPath = path.resolve(process.cwd(), 'google-credentials.json'); // Assuming this is the correct file

  if (admin.apps.length === 0) {
    try {
      // --- Load credentials directly from file path ---
      logger.info(`Attempting to initialize Firebase Admin SDK using credentials file: ${credentialsPath}`);

      admin.initializeApp({
         credential: admin.credential.cert(credentialsPath)
      });
      // --- End direct loading ---

      logger.info('Firebase Admin SDK initialized successfully.');
    } catch (error: any) {
      logger.error(`Failed to initialize Firebase Admin SDK from path ${credentialsPath}:`, error);
      // Depending on requirements, you might want to throw this error
      // or handle it gracefully if admin features are optional.
      throw new Error(`Firebase Admin SDK initialization failed: ${error.message}`);
    }
  }
  return admin;
}

// --- Authentication Helper ---
export async function verifyAuthToken(req: NextRequest): Promise<DecodedIdToken | null> {
  const authorization = req.headers.get('Authorization');
  if (!authorization?.startsWith('Bearer ')) {
    logger.warn('Missing or invalid Authorization header.');
    return null;
  }
  const idToken = authorization.split('Bearer ')[1];
  if (!idToken) {
    logger.warn('Bearer token missing.');
    return null;
  }

  try {
    const adminInstance = initializeFirebaseAdmin(); // Ensure admin is initialized
    const decodedToken = await adminInstance.auth().verifyIdToken(idToken);
    // Optional: Log success with UID for audit purposes if needed, but be mindful of PII.
    // logger.info(`Successfully verified token for UID: ${decodedToken.uid}`);
    return decodedToken;
  } catch (error: any) {
    // Log specific Firebase auth errors if helpful
    if (error.code === 'auth/id-token-expired') {
        logger.warn('Firebase ID token expired.');
    } else if (error.code === 'auth/argument-error') {
         logger.warn('Firebase ID token malformed or invalid.');
    } else {
        logger.error('Error verifying Firebase ID token:', error.message);
    }
    return null;
  }
}
