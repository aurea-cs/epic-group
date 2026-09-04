import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vlkhyeiasecfbuakenfm.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsa2h5ZWlhc2VjZmJ1YWtlbmZtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODczNTYzOSwiZXhwIjoyMDc0MzExNjM5fQ.C4A1NbEdi8MN68aK9feL5GjNIMwt2WEQUWvsCwahPYw';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('subjects').select('name');
  if (error) {
    console.error(error);
    return;
  }
  const uniqueNames = [...new Set(data.map(d => d.name))];
  console.log('Unique subjects:');
  console.log(JSON.stringify(uniqueNames, null, 2));
}

main();
