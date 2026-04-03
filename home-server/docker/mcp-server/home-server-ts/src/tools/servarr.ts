import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { z } from 'zod';
import { request } from '../utils/api.js';
import { getSecretLogic } from '../utils/vault.js';
import * as fs from 'fs';
import { zodToJsonSchema } from "../utils/schema.js";
import { execa } from 'execa';
import { logger } from '../utils/logger.js';

async function rrApi(name: string, method: string, path: string, params?: any, data?: any) {
  const envKey = `${name.toUpperCase()}_API_KEY`;
  let apiKey = process.env[envKey];
  
  if (!apiKey || apiKey.startsWith('op://')) {
    const reference = apiKey && apiKey.startsWith('op://') ? apiKey : `op://Server/Key - ${name.charAt(0).toUpperCase() + name.slice(1)}/credential`;
    apiKey = await getSecretLogic(reference).catch(() => 
      getSecretLogic(`op://Server/${name} API Key/credential`)
    );
  }
  
  const headers = { "X-Api-Key": apiKey };
  let port = 0;
  if (name.toLowerCase() === "radarr") port = 7878;
  else if (name.toLowerCase() === "sonarr") port = 8989;
  else if (name.toLowerCase() === "prowlarr") port = 9696;
  
  const host = name.toLowerCase() === "prowlarr" ? "gluetun" : name.toLowerCase();
  const apiPath = name.toLowerCase() === "prowlarr" ? "/v1" : "/v3";
  const url = `http://${host}:${port}/api${apiPath}${path}`;
  
  try {
    const resp = await request(method, url, data, params, { headers });
    return resp.data;
  } catch (e: any) {
    throw new Error(`Servarr API error: ${e.response?.data?.message || e.message}`);
  }
}

export function registerServarrTools(server: Server, toolList: any[]) {
  const handlers: Record<string, Function> = {
    servarr_bulk_rename: async (args: any) => {
      try {
        const { service } = args;
        const endpoint = service.toLowerCase() === "radarr" ? "/movie" : "/series";
        const items = await rrApi(service, "GET", endpoint);
        const ids = items.map((i: any) => i.id);
        
        if (!ids.length) return `No items found in ${service}.`;
        
        const payload = {
          name: service.toLowerCase() === "radarr" ? "RenameMovie" : "RenameSeries",
          [service.toLowerCase() === "radarr" ? "movieIds" : "seriesIds"]: ids
        };
        const res = await rrApi(service, "POST", "/command", undefined, payload);
        return `Bulk rename triggered for ${ids.length} items in ${service}. Command ID: ${res.id}`;
      } catch (e: any) {
        return `Error: ${e.message}`;
      }
    },
    servarr_update_root_folder: async (args: any) => {
      try {
        const { service, old_path, new_path } = args;
        await rrApi(service, "POST", "/rootfolder", undefined, { path: new_path }).catch(e => {
            // Ignore error if it already exists
        });
        
        const endpoint = service.toLowerCase() === "radarr" ? "/movie" : "/series";
        const items = await rrApi(service, "GET", endpoint);
        
        const ids = items
          .filter((i: any) => i.rootFolderPath === old_path || (i.path && i.path.startsWith(old_path)))
          .map((i: any) => i.id);
          
        if (!ids.length) return `No items found matching the old path ${old_path} in ${service}.`;
        
        const updateEndpoint = service.toLowerCase() === "radarr" ? "/movie/editor" : "/series/editor";
        const updatePayload = {
          [service.toLowerCase() === "radarr" ? "movieIds" : "seriesIds"]: ids,
          rootFolderPath: new_path,
          moveFiles: false
        };
        
        await rrApi(service, "PUT", updateEndpoint, undefined, updatePayload);
        return `Root folder updated to ${new_path} for ${ids.length} items in ${service}.`;
      } catch (e: any) {
        return `Error: ${e.message}`;
      }
    },
    servarr_get_items: async (args: any) => {
      try {
        const { service, term } = args;
        const endpoint = service.toLowerCase() === "radarr" ? "/movie" : "/series";
        let items = await rrApi(service, "GET", endpoint);
        
        if (term) {
          const t = term.toLowerCase();
          items = items.filter((i: any) => 
            (i.title && i.title.toLowerCase().includes(t)) || 
            (i.path && i.path.toLowerCase().includes(t))
          );
        }
        
        return items.map((i: any) => ({
          id: i.id,
          title: i.title,
          path: i.path,
          hasFile: i.hasFile || (i.statistics && i.statistics.episodeFileCount > 0)
        }));
      } catch (e: any) {
        return { error: e.message };
      }
    },
    servarr_config_discovery: async () => {
      const basePath = "/srv/app_data/home-server";
      const apps = ["radarr", "sonarr", "prowlarr", "bazarr"];
      const results: Record<string, any> = {};
      
      for (const app of apps) {
        const configPath = `${basePath}/${app}/config.xml`;
        if (fs.existsSync(configPath)) {
          try {
            const content = fs.readFileSync(configPath, 'utf8');
            const apiKeyMatch = content.match(/<ApiKey>(.*?)<\/ApiKey>/);
            const portMatch = content.match(/<Port>(.*?)<\/Port>/);
            
            results[app] = {
              api_key: apiKeyMatch ? apiKeyMatch[1] : "Not Found",
              port: portMatch ? portMatch[1] : "Default",
              config_found: configPath
            };
          } catch (e: any) {
            results[app] = { error: e.message };
          }
        }
      }
      return results;
    },
    servarr_get_stats: async () => {
      try {
        const radarrDbPath = "/srv/app_data/home-server/radarr/radarr.db";
        const sonarrDbPath = "/srv/app_data/home-server/sonarr/sonarr.db";
        
        let radarrStats: any = {};
        let sonarrStats: any = {};

        if (fs.existsSync(radarrDbPath)) {
          const totalRes = await execa('sqlite3', [radarrDbPath, "SELECT count(*) FROM Movies;"]);
          const onDiskRes = await execa('sqlite3', [radarrDbPath, "SELECT count(*) FROM Movies WHERE HasFile = 1;"]);
          const missingRes = await execa('sqlite3', [radarrDbPath, "SELECT count(*) FROM Movies WHERE HasFile = 0 AND Monitored = 1;"]);
          
          radarrStats = {
            total: parseInt(totalRes.stdout),
            onDisk: parseInt(onDiskRes.stdout),
            missing: parseInt(missingRes.stdout),
            source: 'sqlite'
          };
        } else {
          const movies = await rrApi("radarr", "GET", "/movie");
          radarrStats = {
            total: movies.length,
            onDisk: movies.filter((m: any) => m.hasFile).length,
            missing: movies.filter((m: any) => !m.hasFile && m.monitored).length,
            source: 'api'
          };
        }

        if (fs.existsSync(sonarrDbPath)) {
          const totalRes = await execa('sqlite3', [sonarrDbPath, "SELECT count(*) FROM Series;"]);
          const onDiskRes = await execa('sqlite3', [sonarrDbPath, "SELECT count(*) FROM Series WHERE Monitored = 1;"]); // Simplified for sqlite
          
          sonarrStats = {
            total: parseInt(totalRes.stdout),
            onDisk: parseInt(onDiskRes.stdout),
            source: 'sqlite'
          };
        } else {
          const series = await rrApi("sonarr", "GET", "/series");
          sonarrStats = {
            total: series.length,
            onDisk: series.filter((s: any) => s.statistics && s.statistics.percentOfEpisodes === 100).length,
            missingEpisodes: series.reduce((acc: number, s: any) => acc + (s.statistics ? (s.statistics.episodeCount - s.statistics.episodeFileCount) : 0), 0),
            source: 'api'
          };
        }

        return { radarr: radarrStats, sonarr: sonarrStats };
      } catch (e: any) {
        logger.error({ error: e.message }, "servarr_get_stats failed");
        return { error: e.message };
      }
    },
    servarr_refresh_all: async (args: any) => {
      try {
        const { service } = args;
        const name = service.toLowerCase();
        const cmdName = name === "radarr" ? "RescanMovie" : "RescanSeries";
        await rrApi(service, "POST", "/command", undefined, { name: cmdName });
        return `✅ Refresh triggered for all items in ${service}.`;
      } catch (e: any) {
        return { error: e.message };
      }
    },
    servarr_find_orphans: async () => {
      try {
        const radarrMovies = await rrApi("radarr", "GET", "/movie");
        const missingMovies = radarrMovies.filter((m: any) => !m.hasFile);

        let overseerrApiKey = process.env.OVERSEERR_API_KEY;
        if (!overseerrApiKey) {
           const settingsPath = "/srv/app_data/home-server/overseerr/settings.json";
           if (fs.existsSync(settingsPath)) {
               const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
               overseerrApiKey = settings.main?.apiKey;
           }
        }
        
        if (!overseerrApiKey) {
           return { error: "Overseerr API key not found in env or settings.json." };
        }

        const overseerrUrl = "http://overseerr:5055/api/v1/request?take=1000";
        const headers = { "X-Api-Key": overseerrApiKey };
        const reqResult = await request("GET", overseerrUrl, undefined, undefined, { headers });
        const overseerrReqs = reqResult.data?.results || [];

        const requestedTmdbIds = new Set(
            overseerrReqs.filter((r: any) => r.type === "movie").map((r: any) => r.media?.tmdbId)
        );

        const orphans = missingMovies.filter((m: any) => !requestedTmdbIds.has(m.tmdbId)).map((m: any) => m.title);
        const requested = missingMovies.filter((m: any) => requestedTmdbIds.has(m.tmdbId)).map((m: any) => m.title);

        return { orphans, requested };
      } catch (e: any) {
        return { error: `servarr_find_orphans failed: ${e.message}` };
      }
    },
    servarr_sync_keys: async () => {
      try {
        const sonarrDb = "/srv/app_data/home-server/sonarr/sonarr.db";
        const radarrDb = "/srv/app_data/home-server/radarr/radarr.db";
        const sonarrCfg = "/srv/app_data/home-server/sonarr/config.xml";
        const radarrCfg = "/srv/app_data/home-server/radarr/config.xml";

        const getApiKey = (path: string) => {
          if (!fs.existsSync(path)) return null;
          const content = fs.readFileSync(path, 'utf8');
          const match = content.match(/<ApiKey>(.*?)<\/ApiKey>/);
          return match ? match[1] : null;
        };

        const sonarrKey = getApiKey(sonarrCfg);
        const radarrKey = getApiKey(radarrCfg);

        if (!sonarrKey || !radarrKey) {
          throw new Error("Failed to extract API keys from config files.");
        }

        logger.info("Updating Sonarr and Radarr databases with API keys...");
        await execa('sqlite3', [sonarrDb, `UPDATE Config SET Value='${sonarrKey}' WHERE Key='ApiKey';`]);
        await execa('sqlite3', [radarrDb, `UPDATE Config SET Value='${radarrKey}' WHERE Key='ApiKey';`]);

        logger.info("Restarting containers to apply changes...");
        await execa('docker', ['restart', 'sonarr', 'radarr']);

        return "✅ Sync complete. Sonarr and Radarr databases updated and containers restarted.";
      } catch (e: any) {
        logger.error({ error: e.message }, "servarr_sync_keys failed");
        return { error: e.message };
      }
    },
    servarr_delete_item: async (args: any) => {
      try {
        const { service, id, delete_files } = args;
        const endpoint = service.toLowerCase() === "radarr" ? `/movie/${id}` : `/series/${id}`;
        
        const params = {
          deleteFiles: delete_files || true,
          addImportListExclusion: true
        };

        await rrApi(service, "DELETE", endpoint, params);
        return `✅ Successfully deleted item ${id} from ${service}.`;
      } catch (e: any) {
        logger.error({ error: e.message, args }, "servarr_delete_item failed");
        return { error: e.message };
      }
    }
  };

  toolList.push(
    {
      name: 'servarr_bulk_rename',
      description: 'MediaAutomation: Trigger a bulk file rename for all items in Radarr or Sonarr.',
      inputSchema: zodToJsonSchema(z.object({ service: z.enum(['radarr', 'sonarr']) }))
    },
    {
      name: 'servarr_update_root_folder',
      description: 'MediaAutomation: Update the root folder path for items in Radarr or Sonarr.',
      inputSchema: zodToJsonSchema(z.object({
        service: z.enum(['radarr', 'sonarr']),
        old_path: z.string(),
        new_path: z.string()
      }))
    },
    {
      name: 'servarr_get_items',
      description: 'MediaAutomation: Retrieve all items (movies/series) with optional search.',
      inputSchema: zodToJsonSchema(z.object({ service: z.enum(['radarr', 'sonarr']), term: z.string().optional() }))
    },
    {
      name: 'servarr_config_discovery',
      description: 'Infrastructure: Automatically discover API keys and ports for all Arr apps.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'servarr_get_stats',
      description: 'MediaAutomation: Get library statistics from Sonarr and Radarr.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'servarr_refresh_all',
      description: 'MediaAutomation: Trigger a full library scan and metadata refresh.',
      inputSchema: zodToJsonSchema(z.object({ service: z.enum(['radarr', 'sonarr']) }))
    },
    {
      name: 'servarr_find_orphans',
      description: 'MediaAutomation: Find items in Radarr/Sonarr that are missing files but were NOT requested via Overseerr.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'servarr_sync_keys',
      description: 'Infrastructure: Sync API keys from config.xml into the SQLite databases for Radarr and Sonarr.',
      inputSchema: zodToJsonSchema(z.object({}))
    },
    {
      name: 'servarr_delete_item',
      description: 'MediaAutomation: Safely remove an item from Radarr or Sonarr via API.',
      inputSchema: zodToJsonSchema(z.object({
        service: z.enum(['radarr', 'sonarr']),
        id: z.number().describe("The ID of the item to delete"),
        delete_files: z.boolean().optional().default(true).describe("Whether to delete files on disk")
      }))
    }
  );

  return handlers;
}
