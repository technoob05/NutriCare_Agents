import pino from 'pino';
import path from 'path';

// Determine the log file path (project root)
const logFilePath = path.join(process.cwd(), 'app.log');

// --- Simplified Logger Configuration ---
// Always try to write JSON logs directly to the file.
// The `mkdir: true` option ensures the directory is created if it doesn't exist (though '/' should exist).
console.log(`[Logger Setup] Attempting to log to: ${logFilePath}`); // Add console log for debugging setup

const logger = pino(
  {
    level: process.env.LOG_LEVEL || 'info',
  },
  pino.destination({ dest: logFilePath, mkdir: true, sync: false }) // Use sync: false for better performance
);

// Log a message right after initialization to test file writing
logger.info('Logger initialized successfully. Attempting to write to file.');

export default logger;
