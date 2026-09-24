import dotenv from 'dotenv';
dotenv.config();
import { SerpApiProvider } from '../search/serpApiProvider';

(async () => {
  const serp = new SerpApiProvider();
  const fb = await serp.request('facebook_profile', { profile_id: 'hubert.amponsah' });
  console.log('FACEBOOK error:', fb.error, 'cached:', fb.fromCache);
  if (fb.data) {
    const { search_metadata, search_parameters, ...rest } = fb.data;
    console.log(JSON.stringify(rest, null, 2).slice(0, 2500));
  }
  const ig = await serp.request('instagram_profile', { profile_id: 'dr_anane' });
  console.log('\nINSTAGRAM error:', ig.error, 'cached:', ig.fromCache);
  if (ig.data) {
    const { search_metadata, search_parameters, ...rest } = ig.data;
    console.log(JSON.stringify(rest, null, 2).slice(0, 1500));
  }
})();
