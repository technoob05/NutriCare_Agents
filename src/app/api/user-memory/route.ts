import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { verifyAuthToken } from '@/lib/firebase/adminUtils'; // Import auth helper
import { JsonMemoryService, MemoryService } from '@/services/memoryService'; // Import Memory Service
import logger from '@/lib/logger';

// Instantiate Memory Service (same instance logic as chat-mobi)
const memoryService: MemoryService = new JsonMemoryService();

/**
 * GET handler to fetch all long-term memory items for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const decodedToken = await verifyAuthToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing authentication token.' }, { status: 401 });
    }
    const userId = decodedToken.uid;
    logger.info(`[API /user-memory GET] Request received for user ${userId}`);

    // 2. Fetch Memories
    const memories = await memoryService.getLongTermMemory(userId);
    logger.info(`[API /user-memory GET] Fetched ${memories.length} memory items for user ${userId}`);

    // 3. Return Memories
    return NextResponse.json(memories, { status: 200 });

  } catch (error: any) {
    logger.error(`[API /user-memory GET] Error fetching memories:`, error);
    return NextResponse.json(
      { error: 'Internal server error fetching user memory.', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * DELETE handler to remove a specific long-term memory item.
 * Expects 'memoryId' as a query parameter.
 */
export async function DELETE(req: NextRequest) {
  try {
    // 1. Verify Authentication
    const decodedToken = await verifyAuthToken(req);
    if (!decodedToken) {
      return NextResponse.json({ error: 'Unauthorized: Invalid or missing authentication token.' }, { status: 401 });
    }
    const userId = decodedToken.uid;

    // 2. Get memoryId from query parameters
    const { searchParams } = new URL(req.url);
    const memoryId = searchParams.get('memoryId');

    if (!memoryId) {
      logger.warn(`[API /user-memory DELETE] Missing 'memoryId' query parameter for user ${userId}`);
      return NextResponse.json({ error: "Missing 'memoryId' query parameter." }, { status: 400 });
    }

    logger.info(`[API /user-memory DELETE] Request received for user ${userId} to delete memory item ${memoryId}`);

    // 3. Delete Memory Item
    await memoryService.deleteLongTermMemory(userId, memoryId);
    logger.info(`[API /user-memory DELETE] Successfully deleted memory item ${memoryId} for user ${userId}`);

    // 4. Return Success (No Content)
    return new NextResponse(null, { status: 204 }); // Standard for successful DELETE with no body

  } catch (error: any) {
    logger.error(`[API /user-memory DELETE] Error deleting memory item:`, error);
    // Check if the error is because the item wasn't found (optional, depends on service impl)
    // if (error.message === 'Item not found') {
    //   return NextResponse.json({ error: 'Memory item not found.' }, { status: 404 });
    // }
    return NextResponse.json(
      { error: 'Internal server error deleting user memory item.', details: error.message },
      { status: 500 }
    );
  }
}
