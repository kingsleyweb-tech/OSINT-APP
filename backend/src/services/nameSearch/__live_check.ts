import dotenv from 'dotenv';
dotenv.config();
import fs from 'fs';
import { NameSearchEngine } from './nameSearchEngine';

(async () => {
  const name = process.argv[2];
  const depth = process.argv[3] || 'deep';
  const out = await NameSearchEngine.execute({ searchType: 'name', name }, { searchDepth: depth });
  if (process.env.DUMP_FILE) fs.writeFileSync(process.env.DUMP_FILE, JSON.stringify(out, null, 2));

  console.log(`\n=== ${name} (${depth}) ===`);
  console.log('STATS', JSON.stringify({ ...out.stats }, null, 0));
  console.log('\nCALLS');
  out.auditTrail.forEach(a => console.log(`  [${a.status}] ${a.engine} ${a.query} -> ${a.rawResults} raw${a.error ? ` ERR ${a.error}` : ''}`));
  console.log('\nPROFILES');
  out.profiles.forEach(p => {
    console.log(`  ${p.confidenceLabel.padEnd(14)} ${p.confidence} ${p.platform} [${p.pageKindLabel}] ${p.profileName || '-'} @${p.username || '-'}`);
    console.log(`     open:  ${p.profileUrl}`);
    console.log(`     serp:  ${p.originalUrl}`);
    console.log(`     title: ${p.title}`);
    console.log(`     why:   ${p.matchReason.join(' | ')}`);
    if (Object.keys(p.attributes).length) console.log(`     facts: ${JSON.stringify(p.attributes)}`);
  });
  console.log('\nIDENTITIES');
  out.identities.forEach(i => console.log(`  ${i.id} [${i.kind}] ${i.fullName} | ${i.publicRole} | ${i.location} | ${i.confidenceLabel} | profiles ${i.profiles.length} web ${i.webItems.length}\n     ${i.summary}`));
  console.log('\nWEB');
  out.webItems.forEach(w => console.log(`  [${w.metadata?.pageKindLabel}] ${w.title} -> ${w.url}`));
  console.log('\nREJECTED (sample)');
  out.rejected.slice(0, 40).forEach(r => console.log(`  ${r.reason} :: ${r.title} :: ${r.url}`));
})();
