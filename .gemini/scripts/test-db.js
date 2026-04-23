const sqlite3 = require('sqlite3');
const db = new sqlite3.Database('.gemini/data/memory.db', sqlite3.OPEN_READONLY, (err) => {
  if (err) {
    console.error('Failed to open database:', err);
    process.exit(1);
  }
  db.all("SELECT name FROM sqlite_master WHERE type='table';", [], (err, rows) => {
    if (err) {
      console.error('Failed to query schema:', err);
      process.exit(1);
    }
    const tables = rows.map(r => r.name);
    console.log('Tables found:', tables.join(', '));
    const expected = ['projects', 'stakeholders', 'knowledge_index', 'knowledge_fts', 'roi_metrics', 'proactive_triggers', 'autonomy_config'];
    const missing = expected.filter(t => !tables.includes(t));
    if (missing.length > 0) {
      console.error('Missing expected tables:', missing.join(', '));
      process.exit(1);
    } else {
      console.log('Database accessible and schema is fully correct.');
      process.exit(0);
    }
  });
});