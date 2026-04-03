
import { request } from './utils/api.js';
import { getSecretLogic } from './utils/vault.js';
import { getServiceUrl } from './utils/env.js';

// Mock getUrl for standalone testing
function getUrl(service: string) {
  const defaults: Record<string, string> = {
    SONARR: "http://sonarr:8989",
    RADARR: "http://radarr:7878",
    PROWLARR: "http://prowlarr:9696",
    OVERSEERR: "http://overseerr:5055",
    TDARR: "http://tdarr:8266",
    IMMICH: "http://immich_server:2283",
    PLEX: "http://172.21.0.1:32400"
  };
  return getServiceUrl(service, defaults[service]);
}

async function testTdarr() {
  console.log('Testing Tdarr...');
  try {
    const url = getUrl('TDARR');
    console.log(`URL: ${url}`);
    // Use env var or empty string if OP fails in this context
    const apiKey = process.env.TDARR_API_KEY || ""; 
    
    console.log(`Using API Key: ${apiKey ? 'YES' : 'NO'}`);

    const resp = await request('GET', `${url}/api/v2/get-nodes`, undefined, undefined, {
      headers: {
        'X-Api-Key': apiKey,
        'Accept': 'application/json'
      },
      timeout: 5000
    });

    console.log('Tdarr Response Status:', resp.status);
    console.log('Tdarr Data:', JSON.stringify(resp.data).substring(0, 100) + '...');
  } catch (e: any) {
    console.error('Tdarr Failed:', e.message);
    if(e.response) console.error('Response:', e.response.data);
  }
}

async function testImmich() {
  console.log('\nTesting Immich...');
  try {
    const url = getUrl('IMMICH');
    console.log(`URL: ${url}`);
    
    const resp = await request('GET', `${url}/api/server/version`);
    console.log('Immich Response Status:', resp.status);
    console.log('Immich Version:', resp.data);
  } catch (e: any) {
    console.error('Immich Failed:', e.message);
  }
}

async function testPlex() {
    console.log('\nTesting Plex...');
    try {
        const url = getUrl('PLEX');
        console.log(`URL: ${url}`);
        const resp = await request('GET', `${url}/identity`); // Simple ping
        console.log('Plex Response Status:', resp.status);
    } catch (e: any) {
        console.error('Plex Failed:', e.message);
    }
}


async function run() {
  await testTdarr();
  await testImmich();
  await testPlex();
}

run();
