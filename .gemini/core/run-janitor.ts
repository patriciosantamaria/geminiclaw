import { Janitor } from './janitor.ts';
import { MemoryClient } from './memory-client.ts';

const janitor = new Janitor(new MemoryClient());

janitor.runAll().then(() => {
  console.log('Janitor execution completed successfully.');
}).catch((err) => {
  console.error('Janitor execution failed:', err);
});
