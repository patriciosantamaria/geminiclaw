import { Logger } from "./utils/logger.js";
import { google } from "googleapis";
import * as fs from "node:fs";
import * as path from "node:path";

const logger = new Logger("CreateGeminiclawFinalV13");

export async function createPresentationV13(auth: any, title: string) {
  const slides = google.slides({ version: "v1", auth });

  // Load layout maps
  const vopakLayoutMapPath = path.resolve(process.cwd(), "../.gemini/configs/VOPAK_LAYOUT_MAP.json");
  const dynamicLayoutMapPath = path.resolve(process.cwd(), "../.gemini/configs/DYNAMIC_LAYOUT_MAP.json");

  let layoutMaps: any = {};
  if (fs.existsSync(vopakLayoutMapPath)) {
    layoutMaps.vopak = JSON.parse(fs.readFileSync(vopakLayoutMapPath, "utf-8"));
  }
  if (fs.existsSync(dynamicLayoutMapPath)) {
    layoutMaps.dynamic = JSON.parse(fs.readFileSync(dynamicLayoutMapPath, "utf-8"));
  }

  try {
    const res = await slides.presentations.create({
      requestBody: {
        title: title,
      },
    });
    logger.info(`Successfully created presentation: ${title}`);
    return {
      presentation: res.data,
      layoutMaps
    };
  } catch (error) {
    logger.error(`Failed to create presentation: ${title}`, error);
    throw error;
  }
}
