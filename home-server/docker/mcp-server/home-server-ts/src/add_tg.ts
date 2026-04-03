async function addTG() {
  const url = 'http://gluetun:9696/api/v1';
  const headers = { 'X-Api-Key': '823cc3707b9548c28a9107c7f1374fdb', 'Content-Type': 'application/json' };

  try {
    const profileRes = await fetch(`${url}/indexerProfile`, { headers });
    const profiles = await profileRes.json();
    const profileId = profiles[0]?.id || 1;

    const schemaRes = await fetch(`${url}/indexer/schema`, { headers });
    const schema = await schemaRes.json();
    const tgSchema = schema.find((i: any) => i.definitionName === 'torrentgalaxyclone');

    tgSchema.appProfileId = profileId;
    tgSchema.tags = [1]; // flaresolverr tag

    const baseUrl = tgSchema.fields.find((f: any) => f.name === 'baseUrl');
    if (baseUrl) baseUrl.value = tgSchema.indexerUrls[0];

    console.log('Sending payload for TorrentGalaxy...');
    const addRes = await fetch(`${url}/indexer`, {
      method: 'POST',
      headers,
      body: JSON.stringify(tgSchema)
    });

    if (addRes.ok) {
      console.log('TorrentGalaxy added correctly with FlareSolverr proxy.');
    } else {
      console.log('Error adding:', await addRes.text());
    }
  } catch (err: any) {
    console.log('Exception:', err.message);
  }
}
addTG();
