import { supabase } from '../src/config/supabase';

async function run() {
    const { data } = await supabase.from('subjects').select('name, name_en');
    if (data) {
        const unique = Array.from(new Set(data.map(d => d.name_en || d.name)));
        console.log(JSON.stringify(unique, null, 2));
    }
}
run();
