
import { test, describe, before, after } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { DataProcessor } from './data-processor.ts';
import { GeminiClawError, ErrorCode } from './utils/errors.ts';
import { Logger, LogLevel } from './utils/logger.ts';

describe('DataProcessor', () => {
  const logger = new Logger('DataProcessorTest', LogLevel.DEBUG);
  const dp = new DataProcessor();
  const testDir = './test-data';
  const textFile = path.join(testDir, 'test.txt');
  const jsonFile = path.join(testDir, 'test.json');
  const largeFile = path.join(testDir, 'large.txt');

  before(() => {
    logger.info('Setting up test environment');
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir);
    }
    fs.writeFileSync(textFile, 'Line 1: Hello\nLine 2: World\nLine 3: Gemini\nLine 4: Claw');
    fs.writeFileSync(jsonFile, JSON.stringify([
      { id: 1, name: 'Alice', role: 'Dev' },
      { id: 2, name: 'Bob', role: 'Ops' },
      { id: 3, name: 'Charlie', role: 'Lead' },
      { id: 4, name: 'Dave', role: 'Consultant' }
    ]));

    let largeContent = '';
    for (let i = 1; i <= 10; i++) {
      largeContent += `Line ${i}\n`;
    }
    fs.writeFileSync(largeFile, largeContent.trim());
  });

  after(() => {
    logger.info('Cleaning up test environment');
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
    if (fs.existsSync('./chunks')) {
      fs.rmSync('./chunks', { recursive: true, force: true });
    }
  });

  describe('search()', () => {
    test('should find matching lines in a file', async () => {
      logger.debug('Testing search() matching lines');
      const results = await dp.search(textFile, 'Hello');
      assert.strictEqual(results.length, 1);
      assert.ok(results[0].includes('Line 1: Hello'));
    });

    test('should respect the limit parameter', async () => {
      logger.debug('Testing search() limit');
      const results = await dp.search(textFile, 'Line', 2);
      assert.strictEqual(results.length, 2);
    });

    test('should be case-insensitive', async () => {
      logger.debug('Testing search() case-insensitivity');
      const results = await dp.search(textFile, 'hello');
      assert.strictEqual(results.length, 1);
    });

    test('should throw error if file does not exist', async () => {
      logger.debug('Testing search() non-existent file');
      await assert.rejects(
        () => dp.search('non-existent.txt', 'pattern'),
        (err: GeminiClawError) => {
          assert.strictEqual(err.code, ErrorCode.NOT_FOUND);
          return true;
        }
      );
    });

    test('should handle large JSON files by providing estimated summary', async () => {
      logger.debug('Testing summarizeJSON() large file');
      const largeJsonFile = path.join(testDir, 'very_large.json');
      const largeData = Buffer.alloc(11 * 1024 * 1024, 'a'); // 11MB
      fs.writeFileSync(largeJsonFile, largeData);

      const summary = await dp.summarizeJSON(largeJsonFile);
      assert.strictEqual(summary.type, 'LargeJSON');
      assert.ok(parseFloat(summary.sizeMB) > 10);
    });
  });

  describe('summarizeJSON()', () => {
    test('should summarize a JSON array', async () => {
      logger.debug('Testing summarizeJSON() array');
      const summary = await dp.summarizeJSON(jsonFile, ['name']);
      assert.strictEqual(summary.type, 'Array');
      assert.strictEqual(summary.count, 4);
      assert.strictEqual(summary.sample.length, 3);
      assert.deepStrictEqual(summary.sample[0], { name: 'Alice' });
    });

    test('should summarize a JSON object', async () => {
      logger.debug('Testing summarizeJSON() object');
      const objFile = path.join(testDir, 'obj.json');
      fs.writeFileSync(objFile, JSON.stringify({ a: 1, b: 2 }));
      const summary = await dp.summarizeJSON(objFile);
      assert.strictEqual(summary.type, 'Object');
      assert.deepStrictEqual(summary.keys, ['a', 'b']);
    });

    test('should throw error on invalid JSON', async () => {
      logger.debug('Testing summarizeJSON() invalid JSON');
      const invalidJson = path.join(testDir, 'invalid.json');
      fs.writeFileSync(invalidJson, '{ invalid: json }');
      await assert.rejects(
        () => dp.summarizeJSON(invalidJson),
        (err: GeminiClawError) => {
          assert.strictEqual(err.code, ErrorCode.INTERNAL_ERROR);
          return true;
        }
      );
    });
  });

  describe('getStats()', () => {
    test('should return correct file stats', async () => {
      logger.debug('Testing getStats()');
      const stats = await dp.getStats(textFile);
      assert.strictEqual(stats.name, 'test.txt');
      assert.strictEqual(stats.lineCount, 4);
      assert.ok(parseFloat(stats.sizeMB) >= 0);
    });

    test('should handle empty files', async () => {
      logger.debug('Testing getStats() empty file');
      const emptyFile = path.join(testDir, 'empty.txt');
      fs.writeFileSync(emptyFile, '');
      const stats = await dp.getStats(emptyFile);
      assert.strictEqual(stats.lineCount, 0);
    });
  });

  describe('chunk()', () => {
    test('should split file into chunks', async () => {
      logger.debug('Testing chunk() logic');
      const chunkDir = './test-chunks';
      const chunks = await dp.chunk(largeFile, 3, chunkDir);

      // 10 lines, 3 lines per chunk = 4 chunks (3, 3, 3, 1)
      assert.strictEqual(chunks.length, 4);
      assert.ok(fs.existsSync(chunks[0]));

      const content = fs.readFileSync(chunks[0], 'utf-8');
      assert.strictEqual(content.split('\n').length, 3);

      fs.rmSync(chunkDir, { recursive: true, force: true });
    });

    test('should create default chunks directory if not specified', async () => {
      logger.debug('Testing chunk() default directory');
      const chunks = await dp.chunk(largeFile, 5);
      assert.strictEqual(chunks.length, 2);
      assert.ok(fs.existsSync('./chunks'));
    });
  });
});
