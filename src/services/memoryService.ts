import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
// Removed unused: import { type Message } from 'ai';

// Define the structure for a single long-term memory item
export interface MemoryItem {
  id: string; // Unique identifier for the memory item
  userId: string; // Identifier for the user this memory belongs to
  timestamp: string; // ISO string timestamp of when the memory was created
  content: string; // The actual summarized context or information
  metadata?: Record<string, any>; // Optional metadata (e.g., source message IDs)
}

// Interface defining the contract for any memory service implementation
export interface MemoryService {
  /**
   * Retrieves the short-term conversation history for a given session.
   * Note: Implementation might vary depending on how session history is managed.
   * @param sessionId - The identifier for the current chat session.
   * @returns A promise resolving to an array of chat messages (structure depends on implementation).
   */
  getShortTermMemory(sessionId: string): Promise<any[]>; // Use 'any[]' or a more specific type if defined elsewhere

  /**
   * Retrieves all long-term memory items for a specific user.
   * @param userId - The identifier for the user.
   * @returns A promise resolving to an array of MemoryItem objects.
   */
  getLongTermMemory(userId: string): Promise<MemoryItem[]>;

  /**
   * Saves a new piece of context as a long-term memory item for a user.
   * @param userId - The identifier for the user.
   * @param context - The string content to be saved as memory.
   * @param metadata - Optional metadata associated with the memory.
   * @returns A promise resolving to the newly created MemoryItem.
   */
  saveLongTermMemory(userId: string, context: string, metadata?: Record<string, any>): Promise<MemoryItem>;

  /**
   * Deletes a specific long-term memory item for a user.
   * @param userId - The identifier for the user.
   * @param memoryId - The unique identifier of the memory item to delete.
   * @returns A promise resolving when the deletion is complete.
   */
  deleteLongTermMemory(userId: string, memoryId: string): Promise<void>;

  /**
   * (Optional) Clears all long-term memory for a specific user.
   * @param userId - The identifier for the user.
   * @returns A promise resolving when all memory is cleared.
   */
  clearLongTermMemory?(userId: string): Promise<void>;
}

// --- JSON File Implementation ---

const MEMORY_FILE_PATH = path.resolve(process.cwd(), 'memory_store.json');

export class JsonMemoryService implements MemoryService {
  private async readMemoryStore(): Promise<MemoryItem[]> {
    try {
      const data = await fs.readFile(MEMORY_FILE_PATH, 'utf-8');
      return JSON.parse(data) as MemoryItem[];
    } catch (error: any) {
      // If the file doesn't exist or is invalid JSON, return an empty array
      if (error.code === 'ENOENT') {
        return [];
      }
      console.error('Error reading memory store:', error);
      // Consider more robust error handling or returning a specific error state
      return [];
    }
  }

  private async writeMemoryStore(memories: MemoryItem[]): Promise<void> {
    try {
      await fs.writeFile(MEMORY_FILE_PATH, JSON.stringify(memories, null, 2), 'utf-8');
    } catch (error) {
      console.error('Error writing memory store:', error);
      // Consider throwing the error to be handled by the caller
      throw new Error('Failed to write memory store');
    }
  }

  // Note: JsonMemoryService does not implement short-term memory handling.
  // This method is part of the interface but not implemented here.
  async getShortTermMemory(sessionId: string): Promise<any[]> {
     console.warn(`JsonMemoryService.getShortTermMemory is not implemented for session ${sessionId}. Returning empty array.`);
     return Promise.resolve([]);
  }

  async getLongTermMemory(userId: string): Promise<MemoryItem[]> {
    const allMemories = await this.readMemoryStore();
    return allMemories.filter(item => item.userId === userId);
  }

  async saveLongTermMemory(userId: string, context: string, metadata?: Record<string, any>): Promise<MemoryItem> {
    const allMemories = await this.readMemoryStore();
    const newMemoryItem: MemoryItem = {
      id: crypto.randomUUID(),
      userId,
      timestamp: new Date().toISOString(),
      content: context,
      metadata,
    };
    allMemories.push(newMemoryItem);
    await this.writeMemoryStore(allMemories);
    return newMemoryItem;
  }

  async deleteLongTermMemory(userId: string, memoryId: string): Promise<void> {
    let allMemories = await this.readMemoryStore();
    const initialLength = allMemories.length;
    allMemories = allMemories.filter(item => !(item.userId === userId && item.id === memoryId));

    if (allMemories.length < initialLength) {
      await this.writeMemoryStore(allMemories);
    } else {
      // Optional: Could throw an error if the item wasn't found
      console.warn(`Memory item with id ${memoryId} for user ${userId} not found for deletion.`);
    }
  }

  async clearLongTermMemory(userId: string): Promise<void> {
    let allMemories = await this.readMemoryStore();
    const initialLength = allMemories.length;
    allMemories = allMemories.filter(item => item.userId !== userId);

    if (allMemories.length < initialLength) {
        await this.writeMemoryStore(allMemories);
    }
  }
}

// Export an instance or allow instantiation where needed
// export const memoryService = new JsonMemoryService();
