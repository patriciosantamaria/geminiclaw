import * as ivm from "isolated-vm";

async function testBreakout() {
  const isolate = new ivm.Isolate({ memoryLimit: 128 });
  const context = await isolate.createContext();
  const jail = context.global;

  await jail.set('global', jail.derefInto());

  console.log("--- Attempting Breakout Test ---");

  const scripts = [
    { name: "Access process", code: "return typeof process;" },
    { name: "Access require", code: "return typeof require;" },
    { name: "Access console", code: "return typeof console;" },
    { name: "Access global (host)", code: "return typeof global.process;" },
    { name: "Access __dirname", code: "return typeof __dirname;" }
  ];

  for (const s of scripts) {
    try {
      const result = await context.eval(`(() => { ${s.code} })()`, {
        timeout: 1000
      });
      console.log(`[${s.name}]: ${result}`);
    } catch (e: any) {
      console.log(`[${s.name}]: Failed (Expected) - ${e.message}`);
    }
  }
}

testBreakout().catch(console.error);
