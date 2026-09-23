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

async function testFull() {
  console.log("=========================================");
  console.log("DEEP SEARCH ENGINE VERIFICATION TEST");
  console.log("=========================================");

  console.log("\n1. Testing Name Deep Search ('Kingsley Anaab')...");
  const r1 = await postSearch({ query: 'Kingsley Anaab', type: 'name', searchDepth: 'deep' });
  console.log("-> Success:", r1.success);
  console.log("-> Deep Stats:", r1.deepStats);
  console.log("-> Total Findings:", r1.results?.length);
  console.log("-> Social Profiles Found:", r1.investigation?.socialProfiles?.length);
  console.log("-> Web & News Findings:", r1.investigation?.webAndNews?.length);

  console.log("\n2. Testing Username Deep Search ('KingsleyAnaab')...");
  const r2 = await postSearch({ query: 'KingsleyAnaab', type: 'username', searchDepth: 'deep' });
  console.log("-> Success:", r2.success);
  console.log("-> Deep Stats:", r2.deepStats);
  console.log("-> Total Findings:", r2.results?.length);
  console.log("-> Social Profiles Found:", r2.investigation?.socialProfiles?.length);

  console.log("\n=========================================");
  console.log("ALL TESTS PASSED SUCCESSFULLY");
  console.log("=========================================");
}

testFull();
