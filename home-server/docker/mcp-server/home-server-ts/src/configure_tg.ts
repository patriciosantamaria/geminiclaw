async function configure() {
  const prowlarrUrl = 'http://gluetun:9696/api/v1';
  const apiKey = '823cc3707b9548c28a9107c7f1374fdb';
  const headers = { 'X-Api-Key': apiKey, 'Content-Type': 'application/json' };

  try {
    console.log('Adding FlareSolverr Proxy...');
    const proxySchemaRes = await fetch(`${prowlarrUrl}/indexerProxy/schema`, { headers });
    const proxySchema = await proxySchemaRes.json();
    const fsProxy = proxySchema.find((p: any) => p.implementation === 'FlareSolverr');
    
    if (!fsProxy) throw new Error('FlareSolverr schema not found');
    fsProxy.name = 'FlareSolverr';
    
    const hostField = fsProxy.fields.find((f: any) => f.name === 'host');
    if (hostField) hostField.value = 'http://localhost:8191';
    
    const addProxyRes = await fetch(`${prowlarrUrl}/indexerProxy`, {
      method: 'POST',
      headers,
      body: JSON.stringify(fsProxy)
    });
    
    if (addProxyRes.ok) {
      console.log('FlareSolverr added successfully.');
    } else {
      const errText = await addProxyRes.text();
      if (errText.includes('same name already exists')) {
          console.log('FlareSolverr proxy already exists.');
      } else {
          console.log('Failed to add FlareSolverr:', errText);
      }
    }
  } catch (e: any) {
    console.log('Error adding FlareSolverr:', e.message);
  }

  try {
    console.log('Adding TorrentGalaxy Indexer...');
    const profilesRes = await fetch(`${prowlarrUrl}/indexerProfile`, { headers });
    const profiles = await profilesRes.json();
    const profileId = profiles[0]?.id || 1;

    const schemaRes = await fetch(`${prowlarrUrl}/indexer/schema`, { headers });
    const schema = await schemaRes.json();
    const indexer = schema.find((p: any) => p.definitionName === 'torrentgalaxyclone');
    
    if (!indexer) throw new Error('TorrentGalaxy schema not found');
    
    indexer.appProfileId = profileId;
    const baseUrlField = indexer.fields.find((f: any) => f.name === 'baseUrl');
    if (baseUrlField) baseUrlField.value = indexer.indexerUrls[0];
    
    const addRes = await fetch(`${prowlarrUrl}/indexer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(indexer)
    });
    
    if (addRes.ok) {
      console.log('TorrentGalaxy added successfully.');
    } else {
      console.log('Failed to add TorrentGalaxy:', await addRes.text());
    }
  } catch (e: any) {
    console.log('Error adding TorrentGalaxy:', e.message);
  }
}

configure();
