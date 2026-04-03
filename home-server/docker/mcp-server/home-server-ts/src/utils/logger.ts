import pino from 'pino';

const isProduction = process.env.NODE_ENV === 'production';

// MCP servers MUST log to stderr because stdout is used for JSON-RPC
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: {
    service: 'home-server',
    mode: process.env.MCP_SERVER_MODE || 'all'
  },
  redact: {
    paths: [
      'password',
      'apiKey',
      'token',
      'credential',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
      '*.credential',
      '*.secret',
      'args.password',
      'args.apiKey',
      'args.token'
    ],
    censor: '[REDACTED]'
  },
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,
      destination: 2 // stderr
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
});
