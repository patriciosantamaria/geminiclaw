/**
 * ⚡ DataProcessor V1.0 - Professional Server-Side Analyzer
 * Designed for Patricio Santamaria (Vopak Senior Google Consultant)
 * Goal: Use the i7's power to process massive files and return high-signal summaries.
 */

import fs from 'node:fs';
import readline from 'node:readline';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import { Logger } from './utils/logger.ts';
import { GeminiClawError, ErrorCode, handleError } from './utils/errors.ts';

const logger = new Logger('DataProcessor');

export class DataProcessor {
  /**
   * 🔍 Stream-based Search (Regex)
   * Doesn't load the file into context, only returns matching lines.
   */
  async search(filePath: string, pattern: string, limit: number = 100): Promise<string[]> {
    const startTime = performance.now();
    logger.info(`Searching for pattern "${pattern}" in ${filePath}`);
    try {
      if (!fs.existsSync(filePath)) {
        throw new GeminiClawError(`File not found: ${filePath}`, ErrorCode.NOT_FOUND);
      }
      const results: string[] = [];
      const regex = new RegExp(pattern, 'i');
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let count = 0;
      let lineNum = 0;
      for await (const line of rl) {
        lineNum++;
        if (regex.test(line)) {
          results.push(`[Line ${lineNum}] ${line}`);
          count++;
        }
        if (count >= limit) break;
      }
      const duration = performance.now() - startTime;
      logger.info(`Search completed in ${duration.toFixed(2)}ms`);
      return results;
    } catch (e) {
      throw handleError(logger, e, 'Search failed');
    }
  }

  /**
   * 📊 JSON Metadata/Summary
   * For massive JSON arrays/objects, returns keys and object counts.
   * Enforces a 10MB limit on full parsing to prevent heap overflow.
   */
  async summarizeJSON(filePath: string, sampleKeys: string[] = []): Promise<any> {
    const startTime = performance.now();
    logger.info(`Summarizing JSON file: ${filePath}`);
    try {
      if (!fs.existsSync(filePath)) {
        throw new GeminiClawError(`File not found: ${filePath}`, ErrorCode.NOT_FOUND);
      }
      const stats = fs.statSync(filePath);
      const MAX_SIZE = 10 * 1024 * 1024; // 10MB

      if (stats.size > MAX_SIZE) {
        logger.warn(`File ${filePath} exceeds 10MB. Providing estimated summary.`);
        const duration = performance.now() - startTime;
        return {
          type: 'LargeJSON',
          sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
          message: 'File too large for full parsing. Estimated stats only.',
          durationMs: duration.toFixed(2)
        };
      }

      const content = fs.readFileSync(filePath, 'utf-8');
      const data = JSON.parse(content);

      const result: any = Array.isArray(data) ? {
        type: 'Array',
        count: data.length,
        sample: data.slice(0, 3).map(item => {
          const summary: any = {};
          sampleKeys.forEach(k => summary[k] = item[k]);
          return summary;
        })
      } : { type: 'Object', keys: Object.keys(data) };

      const duration = performance.now() - startTime;
      logger.info(`JSON summarization completed in ${duration.toFixed(2)}ms`);
      return result;
    } catch (e) {
      throw handleError(logger, e, 'JSON summarization failed');
    }
  }

  /**
   * 📉 Statistical Snapshot
   * Quick line count and size check.
   */
  async getStats(filePath: string): Promise<any> {
    logger.info(`Getting stats for file: ${filePath}`);
    try {
      if (!fs.existsSync(filePath)) {
        throw new GeminiClawError(`File not found: ${filePath}`, ErrorCode.NOT_FOUND);
      }
      const stats = fs.statSync(filePath);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let lines = 0;
      for await (const _line of rl) { lines++; }

      return {
        name: path.basename(filePath),
        sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
        lineCount: lines,
        lastModified: stats.mtime
      };
    } catch (e) {
      throw handleError(logger, e, 'Getting stats failed');
    }
  }

  /**
   * ✂️ Smart Chunker
   * Splits a massive file into chunks for safe AI consumption if needed.
   */
  async chunk(filePath: string, linesPerChunk: number = 500, targetDir: string = './chunks'): Promise<string[]> {
    const startTime = performance.now();
    logger.info(`Chunking file: ${filePath} (${linesPerChunk} lines per chunk)`);
    try {
      if (!fs.existsSync(filePath)) {
        throw new GeminiClawError(`File not found: ${filePath}`, ErrorCode.NOT_FOUND);
      }
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

      const baseName = path.basename(filePath);
      const fileStream = fs.createReadStream(filePath);
      const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

      let currentLines: string[] = [];
      let chunkNum = 1;
      const chunkPaths: string[] = [];

      for await (const line of rl) {
        currentLines.push(line);
        if (currentLines.length >= linesPerChunk) {
          const chunkPath = path.join(targetDir, `${baseName}.chunk.${chunkNum}.txt`);
          fs.writeFileSync(chunkPath, currentLines.join('\n'));
          chunkPaths.push(chunkPath);
          currentLines = [];
          chunkNum++;
        }
      }

      if (currentLines.length > 0) {
        const chunkPath = path.join(targetDir, `${baseName}.chunk.${chunkNum}.txt`);
        fs.writeFileSync(chunkPath, currentLines.join('\n'));
        chunkPaths.push(chunkPath);
      }

      const duration = performance.now() - startTime;
      logger.info(`Chunking completed in ${duration.toFixed(2)}ms`);
      return chunkPaths;
    } catch (e) {
      throw handleError(logger, e, 'Chunking failed');
    }
  }
}

// 🚀 Command-Line Interface (Simple)
const isMain = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) ||
  process.argv[1].endsWith('data-processor.ts') ||
  process.argv[1].endsWith('data-processor.ts')
);

if (isMain) {
  const [,, cmd, ...args] = process.argv;
  const dp = new DataProcessor();

  (async () => {
    try {
      if (cmd === 'search') {
        const results = await dp.search(args[0], args[1], parseInt(args[2]) || 100);
        process.stdout.write(JSON.stringify(results, null, 2) + '\n');
      } else if (cmd === 'stats') {
        const stats = await dp.getStats(args[0]);
        process.stdout.write(JSON.stringify(stats, null, 2) + '\n');
      } else if (cmd === 'summarize') {
        const summary = await dp.summarizeJSON(args[0], args[1]?.split(',') || []);
        process.stdout.write(JSON.stringify(summary, null, 2) + '\n');
      } else if (cmd === 'chunk') {
        const paths = await dp.chunk(args[0], parseInt(args[1]) || 500);
        process.stdout.write(JSON.stringify({ chunksCreated: paths.length, paths }, null, 2) + '\n');
      }
    } catch (e: any) {
      // If it reaches here it's likely already been logged by handleError, but we make sure.
      if (!(e instanceof GeminiClawError)) {
        logger.error(`CLI execution error: ${e.message}`);
      }
    }
  })();
}
