import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import { getServiceUrl } from '../utils/env.js';
import { zodToJsonSchema } from "../utils/schema.js";
import * as fs from 'fs';
import { execa } from 'execa';
import { logger } from '../utils/logger.js';

export function registerPlexTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    plex_get_watched_candidates: async (args: any) => {
      try {
        const plexDbPath = "/srv/app_data/home-server/plex/Library/Application Support/Plex Media Server/Plug-in Support/Databases/com.plexapp.plugins.library.db";
        const days = args.days || 30;
        
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - days);
        const cutoffTime = Math.floor(cutoffDate.getTime() / 1000);

        if (fs.existsSync(plexDbPath)) {
          logger.info({ plexDbPath, days }, "Plex: Querying host-mapped database for watched candidates");
          // metadata_type 1 is movie, 2 is show (for episodes we'd need more complex query, usually 3)
          // Simplified query to find recently watched items
          const query = `
            SELECT metadata_type, title, rating_key, last_viewed_at 
            FROM metadata_items 
            WHERE last_viewed_at > ${cutoffTime} 
            AND (metadata_type = 1 OR metadata_type = 2 OR metadata_type = 3);
          `;
          
          const { stdout } = await execa('sqlite3', [plexDbPath, "-header", "-csv", query]);
          const lines = stdout.split('\n').slice(1); // skip header
          
          return lines.filter(line => line.trim() !== "").map(line => {
            const [type, title, id, viewedAt] = line.split(',');
            const typeMap: Record<string, string> = { '1': 'movie', '2': 'show', '3': 'episode' };
            return {
              type: typeMap[type] || 'unknown',
              title,
              id,
              viewedAt: new Date(parseInt(viewedAt) * 1000).toISOString(),
              source: 'sqlite'
            };
          });
        }

        logger.warn("Plex DB not found on host, falling back to API");
        const url = getServiceUrl('PLEX', 'http://plex:32400');
        const apiKey = await getSecretLogic("op://Server/Key - Plex/credential");
        const headers = { 'X-Plex-Token': apiKey, 'Accept': 'application/json' };
        
        const candidates = [];
        const { data: sectionsData } = await request('GET', `${url}/library/sections`, undefined, undefined, { headers });
        const sections = sectionsData?.MediaContainer?.Directory || [];

        for (const section of sections) {
          if (section.type === 'movie' || section.type === 'show') {
            const { data: itemsData } = await request('GET', `${url}/library/sections/${section.key}/all`, undefined, { unwatched: 0 }, { headers });
            const items = itemsData?.MediaContainer?.Metadata || [];
            
            for (const item of items) {
              if (item.lastViewedAt && item.lastViewedAt > cutoffTime) {
                candidates.push({
                  type: section.type,
                  title: item.title,
                  id: item.ratingKey,
                  viewedAt: new Date(item.lastViewedAt * 1000).toISOString(),
                  source: 'api'
                });
              }
            }
          }
        }
        return candidates;
      } catch (e: any) {
        logger.error({ error: e.message }, "plex_get_watched_candidates failed");
        return { error: e.message };
      }
    }
  };

  toolList.push(
    {
      name: 'plex_get_watched_candidates',
      description: 'Find movies or episodes that have been fully watched in the last N days. Useful for library cleanup.',
      inputSchema: zodToJsonSchema(z.object({
        days: z.number().optional().default(30).describe("Number of days to look back")
      }))
    }
  );

  return handlers;
}
