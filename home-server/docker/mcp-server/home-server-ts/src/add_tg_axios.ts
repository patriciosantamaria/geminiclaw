import axios from 'axios';

async function main() {
  const url = 'http://gluetun:9696/api/v1';
  const headers = { 'X-Api-Key': '823cc3707b9548c28a9107c7f1374fdb', 'Content-Type': 'application/json' };

  try {
    // 1. Get or create FlareSolverr tag
    console.log('Fetching tags...');
    const tagsRes = await axios.get(`${url}/tag`, { headers });
    const tags = tagsRes.data;
    let fsTag = tags.find((t: any) => t.label === 'flaresolverr');
    
    if (!fsTag) {
      console.log('Creating flaresolverr tag...');
      const createTagRes = await axios.post(`${url}/tag`, { label: 'flaresolverr' }, { headers });
      fsTag = createTagRes.data;
    }
    const fsTagId = fsTag.id;

    // 2. Ensure FlareSolverr proxy exists and uses the tag
    console.log('Checking Indexer Proxies...');
    const proxiesRes = await axios.get(`${url}/indexerProxy`, { headers });
    const proxies = proxiesRes.data;
    let fsProxy = proxies.find((p: any) => p.implementation === 'FlareSolverr');

    if (!fsProxy) {
      console.log('FlareSolverr proxy not found. Adding it...');
      const proxySchemaRes = await axios.get(`${url}/indexerProxy/schema`, { headers });
      const proxySchema = proxySchemaRes.data;
      fsProxy = proxySchema.find((p: any) => p.implementation === 'FlareSolverr');
      
      fsProxy.name = 'FlareSolverr';
      fsProxy.tags = [fsTagId];
      const hostField = fsProxy.fields.find((f: any) => f.name === 'host');
      if (hostField) hostField.value = 'http://localhost:8191';

      const addProxyRes = await axios.post(`${url}/indexerProxy`, fsProxy, { headers });
      fsProxy = addProxyRes.data;
      console.log('FlareSolverr proxy added.');
    } else {
      if (!fsProxy.tags.includes(fsTagId)) {
        console.log('FlareSolverr proxy exists but missing tag. Updating...');
        fsProxy.tags.push(fsTagId);
        await axios.put(`${url}/indexerProxy/${fsProxy.id}`, fsProxy, { headers });
      } else {
        console.log('FlareSolverr proxy correctly configured.');
      }
    }

    // 3. Add or update TorrentGalaxy indexer
    console.log('Checking Indexers...');
    const indexersRes = await axios.get(`${url}/indexer`, { headers });
    const indexers = indexersRes.data;
    let tgIndexer = indexers.find((i: any) => i.definitionName === 'torrentgalaxyclone');

    if (tgIndexer) {
      if (!tgIndexer.tags.includes(fsTagId)) {
        console.log('TorrentGalaxy exists but missing tag. Updating...');
        tgIndexer.tags.push(fsTagId);
        const updateRes = await axios.put(`${url}/indexer/${tgIndexer.id}`, tgIndexer, { headers });
        console.log('TorrentGalaxy updated successfully.');
      } else {
        console.log('TorrentGalaxy is already correctly configured.');
      }
    } else {
      console.log('TorrentGalaxy not found. Adding it...');
      const profileId = 1;

      const schemaRes = await axios.get(`${url}/indexer/schema`, { headers });
      const schema = schemaRes.data;
      tgIndexer = schema.find((i: any) => i.definitionName === 'torrentgalaxyclone');

      tgIndexer.appProfileId = profileId;
      tgIndexer.tags = [fsTagId];

      const baseUrlField = tgIndexer.fields.find((f: any) => f.name === 'baseUrl');
      if (baseUrlField) baseUrlField.value = tgIndexer.indexerUrls[0];

      delete tgIndexer.id;
      await axios.post(`${url}/indexer?forceSave=true`, tgIndexer, { headers, maxRedirects: 0 });
      console.log('TorrentGalaxy added successfully.');
    }

  } catch (err: any) {
    if (err.response) {
      console.error(`API Error ${err.response.status} ${err.response.statusText}:`, err.response.data);
    } else {
      console.error('Script Error:', err.message);
    }
  }
}

main();