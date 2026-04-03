import { execa, Options } from 'execa';
import { HOME_SERVER_ROOT } from './env.js';

/**
 * Runs a command with arguments safely.
 */
export async function runCommand(file: string, args: string[], options?: Options): Promise<{ stdout: string; stderr: string; exitCode: number }> {
  try {
    const result = await execa(file, args, {
      cwd: HOME_SERVER_ROOT,
      ...options
    });
    return {
      stdout: String(result.stdout || ''),
      stderr: String(result.stderr || ''),
      exitCode: result.exitCode || 0
    };
  } catch (error: any) {
    throw new Error(`Execution failed: ${error.shortMessage || error.message}\n${error.stderr || ''}`);
  }
}

/**
 * Legacy support for shell commands. Use with caution.
 */
export async function runShellCommand(command: string, cwd: string = HOME_SERVER_ROOT): Promise<string> {
  try {
    const result = await execa(command, { shell: true, cwd });
    return String(result.stdout || '') + (result.stderr ? '\n' + String(result.stderr) : '');
  } catch (error: any) {
    throw new Error(`Shell execution failed: ${error.shortMessage || error.message}\n${error.stderr || ''}`);
  }
}
