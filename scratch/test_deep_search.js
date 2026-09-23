const http = require('http');

function postSearch(payload) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(payload);
    const req = http.request('http://localhost:5000/api/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(body);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=== TEST 1: Person Search 'Kingsley Anaab' ===");
  try {
    const res1 = await postSearch({ query: 'Kingsley Anaab', type: 'name', searchDepth: 'deep' });
    console.log("Success:", res1.success);
    console.log("Stats:", res1.deepStats);
    console.log("Search Coverage Count:", res1.searchCoverage?.length);
    console.log("Possible Identities Count:", res1.possibleIdentities?.length);
    console.log("Social Profiles Discovered:", res1.investigation?.socialProfiles?.length);
    console.log("First 3 Profiles:", (res1.investigation?.socialProfiles || []).slice(0, 3).map(p => ({
      platform: p.platform,
      username: p.username,
      url: p.url,
      confidence: p.confidence,
      confidenceLevel: p.confidenceLevel
    })));
  } catch (e) {
    console.error("Test 1 Failed:", e);
  }

  console.log("\n=== TEST 2: Username Search 'KingsleyAnaab' ===");
  try {
    const res2 = await postSearch({ query: 'KingsleyAnaab', type: 'username', searchDepth: 'deep' });
    console.log("Success:", res2.success);
    console.log("Stats:", res2.deepStats);
    console.log("Social Profiles Discovered:", res2.investigation?.socialProfiles?.length);
    console.log("Discovered Profiles:", (res2.investigation?.socialProfiles || []).map(p => ({
      platform: p.platform,
      username: p.username,
      url: p.url,
      confidenceLabel: p.confidenceLevel
    })));
  } catch (e) {
    console.error("Test 2 Failed:", e);
  }
}

runTests();
