import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: 'c:/Projects/Boho mentos v2/.env' });
const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

fetch(`${url}/rest/v1/?apikey=${key}`)
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('c:/Projects/Boho mentos v2/schema_output.json', JSON.stringify(data.paths, null, 2));
    console.log('Done');
  }).catch(e => console.error(e));
