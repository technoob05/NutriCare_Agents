import { NextRequest } from 'next/server';
import admin from 'firebase-admin';
import { DecodedIdToken } from 'firebase-admin/auth';
import logger from '@/lib/logger'; // Assuming logger is accessible

// --- Firebase Admin SDK Initialization ---
export function initializeFirebaseAdmin() {
  if (admin.apps.length === 0) {
    try {
      const credentialsJsonString = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;

      if (!credentialsJsonString) {
        throw new Error('GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable is not set.');
      }

      logger.info('Attempting to initialize Firebase Admin SDK using GOOGLE_APPLICATION_CREDENTIALS_JSON environment variable.');

      let serviceAccount;
      try {
        serviceAccount = JSON.parse(credentialsJsonString);
      } catch (parseError: any) {
        logger.error('Failed to parse GOOGLE_APPLICATION_CREDENTIALS_JSON:', parseError);
        throw new Error(`Failed to parse service account json from environment variable: ${parseError.message}`);
      }

      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });

      logger.info('Firebase Admin SDK initialized successfully using environment variable.');

    } catch (error: any) {
      logger.error('Firebase Admin SDK initialization failed:', error);
      // Rethrow the error to ensure the application doesn't proceed without proper initialization
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
