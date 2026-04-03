
/**
 * 🛠️ Unified Logger Utility
 * Provides consistent logging across all GeminiClaw services.
 * Automatically redirects logs to stderr to avoid interfering with MCP stdout communication.
 */

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export class Logger {
  private component: string;
  private minLevel: LogLevel;

  constructor(component: string, minLevel: LogLevel = LogLevel.INFO) {
    this.component = component;
    this.minLevel = minLevel;
  }

  private formatMessage(level: string, message: string): string {
    const timestamp = new Date().toISOString();
    return `[${timestamp}] [${level}] [${this.component}] ${message}`;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (level < this.minLevel) return;

    const levelStr = LogLevel[level];
    const formattedMessage = this.formatMessage(levelStr, message);

    // All logs go to stderr to ensure they don't break MCP stdio protocol
    if (args.length > 0) {
      process.stderr.write(`${formattedMessage} ${JSON.stringify(args)}\n`);
    } else {
      process.stderr.write(`${formattedMessage}\n`);
    }
  }

  debug(message: string, ...args: any[]) {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log(LogLevel.INFO, message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log(LogLevel.WARN, message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log(LogLevel.ERROR, message, ...args);
  }
}

export const defaultLogger = new Logger('System');
