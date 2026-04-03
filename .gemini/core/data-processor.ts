
/**
 * ⚡ DataProcessor V1.0 - Professional Server-Side Analyzer
 * Designed for Patricio Santamaria (Vopak Senior Google Consultant)
 * Goal: Use the i7's power to process massive files and return high-signal summaries.
 */

import fs from 'fs';
import readline from 'readline';
import path from 'path';

export class DataProcessor {
  /**
   * 🔍 Stream-based Search (Regex)
   * Doesn't load the file into context, only returns matching lines.
   */
  async search(filePath: string, pattern: string, limit: number = 100): Promise<string[]> {
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
    return results;
  }

  /**
   * 📊 JSON Metadata/Summary
   * For massive JSON arrays/objects, returns keys and object counts.
   */
  async summarizeJSON(filePath: string, sampleKeys: string[] = []): Promise<any> {
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    if (Array.isArray(data)) {
      return {
        type: 'Array',
        count: data.length,
        sample: data.slice(0, 3).map(item => {
          const summary: any = {};
          sampleKeys.forEach(k => summary[k] = item[k]);
          return summary;
        })
      };
    }
    return { type: 'Object', keys: Object.keys(data) };
  }

  /**
   * 📉 Statistical Snapshot
   * Quick line count and size check.
   */
  async getStats(filePath: string): Promise<any> {
    const stats = fs.statSync(filePath);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let lines = 0;
    for await (const line of rl) { lines++; }

    return {
      name: path.basename(filePath),
      sizeMB: (stats.size / (1024 * 1024)).toFixed(2),
      lineCount: lines,
      lastModified: stats.mtime
    };
  }

  /**
   * ✂️ Smart Chunker
   * Splits a massive file into chunks for safe AI consumption if needed.
   */
  async chunk(filePath: string, linesPerChunk: number = 500, targetDir: string = './chunks'): Promise<string[]> {
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

    return chunkPaths;
  }
}

// 🚀 Command-Line Interface (Simple)
const [,, cmd, ...args] = process.argv;
const dp = new DataProcessor();

(async () => {
  try {
    if (cmd === 'search') {
      const results = await dp.search(args[0], args[1], parseInt(args[2]) || 100);
      console.log(JSON.stringify(results, null, 2));
    } else if (cmd === 'stats') {
      const stats = await dp.getStats(args[0]);
      console.log(JSON.stringify(stats, null, 2));
    } else if (cmd === 'summarize') {
      const summary = await dp.summarizeJSON(args[0], args[1]?.split(',') || []);
      console.log(JSON.stringify(summary, null, 2));
    } else if (cmd === 'chunk') {
      const paths = await dp.chunk(args[0], parseInt(args[1]) || 500);
      console.log(JSON.stringify({ chunksCreated: paths.length, paths }, null, 2));
    }
  } catch (e: any) {
    console.error(`Error: ${e.message}`);
  }
})();
