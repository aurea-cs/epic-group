import { supabase } from '../src/config/supabase';

async function checkDb() {
    const { data: sub } = await supabase.from('subjects').select('name, name_en').eq('name', 'Humano');
    console.log('Subject Humano:', sub);

    const { data: mods } = await supabase.from('modules').select('title, title_en').ilike('title', '%Construcción de la identidad%');
    console.log('Module:', mods);

    const { data: items } = await supabase.from('module_items').select('title, title_en').ilike('title', '%El núcleo de las emociones%');
    console.log('Items:', items);
}
checkDb();
