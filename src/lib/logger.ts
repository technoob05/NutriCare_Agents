import pino from 'pino';

let logger: pino.Logger;

// Check if running in a Node.js environment (server-side)
if (typeof window === 'undefined' && typeof process !== 'undefined' && process.cwd) {
  // Server-side configuration
  try {
    const path = require('path'); // Use require for conditional import
    const logFilePath = path.join(process.cwd(), 'app.log');
    console.log(`[Logger Setup - Server] Logging to: ${logFilePath}`);

    logger = pino(
      {
        level: process.env.LOG_LEVEL || 'info',
      },
      // Use pino.destination only on the server
      pino.destination({ dest: logFilePath, mkdir: true, sync: false })
    );
    logger.info('Server logger initialized successfully.');

  } catch (error) {
    // Fallback to console logger if server setup fails (e.g., permissions)
    console.error("[Logger Setup - Server Error] Failed to initialize file logger, falling back to console:", error);
    logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      // Basic browser-safe configuration for fallback
      browser: { asObject: true } // Example browser config, adjust if needed
    });
  }

} else {
  // Browser-side configuration
  console.log("[Logger Setup - Browser] Initializing console logger.");
  logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    // Pino automatically handles browser console logging reasonably well by default
    // You can add browser-specific options if needed, e.g., using pino-browser
    browser: { asObject: true } // Logs as objects to the console
  });
  logger.info('Browser logger initialized successfully.');
}

export default logger;
