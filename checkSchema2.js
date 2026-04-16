import dotenv from 'dotenv';
import fs from 'fs';

const url = 'https://duglvjdwwhqrqbmvjgla.supabase.co';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR1Z2x2amR3d2hxcnFibXZqZ2xhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYyOTQ4MDgsImV4cCI6MjA5MTg3MDgwOH0.3yYVU5WfF1-IIdm2J2tOQj21ILwmrExQ2PRyvARPh00';

fetch(`${url}/rest/v1/?apikey=${key}`)
  .then(res => res.json())
  .then(data => {
    fs.writeFileSync('c:/Projects/Boho mentos v2/schema_output.json', JSON.stringify(data.paths, null, 2));
    console.log('Done');
  }).catch(e => console.error(e));
