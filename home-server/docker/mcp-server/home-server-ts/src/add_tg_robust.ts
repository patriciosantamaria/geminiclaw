async function main() {
  const url = 'http://gluetun:9696/api/v1';
  const apiKey = '823cc3707b9548c28a9107c7f1374fdb';
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

  try {
    // 1. Get or create FlareSolverr tag
    console.log('Fetching tags...');
    const tagsRes = await fetch(`${url}/tag`, { headers });
    const tags = await tagsRes.json();
    let fsTag = tags.find((t: any) => t.label === 'flaresolverr');
    
    if (!fsTag) {
      console.log('Creating flaresolverr tag...');
      const createTagRes = await fetch(`${url}/tag`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ label: 'flaresolverr' })
      });
      fsTag = await createTagRes.json();
    }
    const fsTagId = fsTag.id;

    // 2. Ensure FlareSolverr proxy exists and uses the tag
    console.log('Checking Indexer Proxies...');
    const proxiesRes = await fetch(`${url}/indexerProxy`, { headers });
    const proxies = await proxiesRes.json();
    let fsProxy = proxies.find((p: any) => p.implementation === 'FlareSolverr');

    if (!fsProxy) {
      console.log('FlareSolverr proxy not found. Adding it...');
      const proxySchemaRes = await fetch(`${url}/indexerProxy/schema`, { headers });
      const proxySchema = await proxySchemaRes.json();
      fsProxy = proxySchema.find((p: any) => p.implementation === 'FlareSolverr');
      
      fsProxy.name = 'FlareSolverr';
      fsProxy.tags = [fsTagId];
      const hostField = fsProxy.fields.find((f: any) => f.name === 'host');
      if (hostField) hostField.value = 'http://localhost:8191';

      const addProxyRes = await fetch(`${url}/indexerProxy`, {
        method: 'POST',
        headers,
        body: JSON.stringify(fsProxy)
      });
      fsProxy = await addProxyRes.json();
    } else {
      if (!fsProxy.tags.includes(fsTagId)) {
        console.log('FlareSolverr proxy exists but missing tag. Updating...');
        fsProxy.tags.push(fsTagId);
        await fetch(`${url}/indexerProxy/${fsProxy.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(fsProxy)
        });
      }
    }

    // 3. Add or update TorrentGalaxy indexer
    console.log('Checking Indexers...');
    const indexersRes = await fetch(`${url}/indexer`, { headers });
    const indexers = await indexersRes.json();
    let tgIndexer = indexers.find((i: any) => i.definitionName === 'torrentgalaxyclone');

    if (tgIndexer) {
      if (!tgIndexer.tags.includes(fsTagId)) {
        console.log('TorrentGalaxy exists but missing tag. Updating...');
        tgIndexer.tags.push(fsTagId);
        const updateRes = await fetch(`${url}/indexer/${tgIndexer.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify(tgIndexer)
        });
        if (updateRes.ok) console.log('TorrentGalaxy updated successfully.');
        else console.error('Failed to update TorrentGalaxy:', await updateRes.text());
      } else {
        console.log('TorrentGalaxy is already correctly configured.');
      }
    } else {
      console.log('TorrentGalaxy not found. Adding it...');
      const profileRes = await fetch(`${url}/indexerProfile`, { headers });
      const profiles = await profileRes.json();
      const profileId = profiles[0]?.id || 1;

      const schemaRes = await fetch(`${url}/indexer/schema`, { headers });
      const schema = await schemaRes.json();
      tgIndexer = schema.find((i: any) => i.definitionName === 'torrentgalaxyclone');

      tgIndexer.appProfileId = profileId;
      tgIndexer.tags = [fsTagId];

      const baseUrlField = tgIndexer.fields.find((f: any) => f.name === 'baseUrl');
      if (baseUrlField) baseUrlField.value = tgIndexer.indexerUrls[0];

      const addRes = await fetch(`${url}/indexer`, {
        method: 'POST',
        headers,
        body: JSON.stringify(tgIndexer)
      });
      if (addRes.ok) console.log('TorrentGalaxy added successfully.');
      else console.error('Failed to add TorrentGalaxy:', await addRes.text());
    }

  } catch (err: any) {
    console.error('Script Error:', err);
  }
}

main();