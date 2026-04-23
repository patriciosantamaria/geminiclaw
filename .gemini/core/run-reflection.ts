import fs from 'node:fs';
import path from 'node:path';
import { Logger } from './utils/logger.ts';
import { spawnSync } from 'child_process';

const logger = new Logger('SelfReflection');

/**
 * 🧠 V3.0 Self-Reflection Engine (Gemini CLI Native)
 * Replaces the Pub/Sub listener. Runs the GEPA (Generative Experience-driven Prompt Alignment) loop
 * on the latest local Gemini CLI conversation session.
 */
export class SelfReflectionEngine {
  
  public async reflectOnLatestSession() {
    logger.info('Starting Autonomous Self-Reflection on the latest Gemini CLI session...');
    
    // 1. Find the latest session file
    const chatsDir = '.gemini_docker/tmp/app/chats';
    if (!fs.existsSync(chatsDir)) {
      logger.info('No local chat sessions found to reflect on.');
      return;
    }

    const files = fs.readdirSync(chatsDir).filter(f => f.startsWith('session-'));
    if (files.length === 0) {
      logger.info('No recent sessions found.');
      return;
    }
    
    // Sort by modified time
    files.sort((a, b) => {
      return fs.statSync(path.join(chatsDir, b)).mtimeMs - fs.statSync(path.join(chatsDir, a)).mtimeMs;
    });

    const latestSessionFile = path.join(chatsDir, files[0]);
    logger.info(`Analyzing session: ${latestSessionFile}`);

    // 2. Read the tail of the session file to avoid massive context
    let sessionContent = '';
    try {
       const content = fs.readFileSync(latestSessionFile, 'utf-8');
       const lines = content.split('\n');
       // Get the last 100 interaction lines
       sessionContent = lines.slice(Math.max(lines.length - 100, 0)).join('\n');
    } catch(e) {
       logger.error('Failed to read session file.', e);
       return;
    }

    // 3. Build the GEPA Prompt
    const reflectionPrompt = `
[INTERNAL SYSTEM NUDGE - DO NOT REPLY TO THE USER]

Analyze the following recent segment of a Gemini CLI session using your 'GEPA' (Generative Experience-driven Prompt Alignment) loop. 
You must act as the 'Self-Evolving Critic' and perform the following if applicable:

1. **Procedural Memory (Skills):** Did we just solve a complex problem or execute a novel tool sequence successfully? 
   - If YES, output instructions to use the 'write_file' tool to create a new markdown file in '.gemini/skills/new-skill-name/SKILL.md' codifying the exact steps and logic.

2. **Persona Modeling (USER.md):** Did the user express a new preference, communication style, or strategic pain point? 
   - If YES, output instructions to use the 'replace' tool to append this fact to '.gemini/configs/USER.md' under the appropriate section.

3. **Prompt Backpropagation (CRITIC.md):** Did we encounter a tool error, crash, or dead-end that required a correction?
   - If YES, output instructions to extract the lesson and append a strict warning rule to '.gemini/configs/CRITIC.md'. Format: '[Date] WARNING: When X, do not Y. Instead, do Z.'

Recent Session Context:
\`\`\`jsonl
${sessionContent}
\`\`\`
`;

    // 4. We execute the prompt using a detached call or log it so the CLI can be invoked
    // Here we use the local ollama/gemini endpoint, or for simplicity, we tell the user what to do:
    logger.info('Self-Reflection prompt generated. To execute autonomously, pipe this into the LLM or invoke the vopak-self-reflection skill.');
    fs.writeFileSync('.gemini/data/latest_reflection_prompt.txt', reflectionPrompt);
    logger.info('Prompt saved to .gemini/data/latest_reflection_prompt.txt');
  }
}

// Run standalone if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const engine = new SelfReflectionEngine();
  engine.reflectOnLatestSession().catch(e => {
    logger.error('Reflection failed', e);
    process.exit(1);
  });
}
