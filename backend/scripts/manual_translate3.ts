import { supabase } from '../src/config/supabase';

async function manualTranslate() {
    console.log('Fuzzy matching to translate Ética records...');

    try {
        const { data: mods, error: modErr } = await supabase.from('modules').update({ title_en: 'Content 2. Rules, coexistence, and participation' }).ilike('title', '%Contenido 2. Normas%').select();
        console.log('Updated modules:', mods?.length);

        const { data: i1 } = await supabase.from('module_items').update({ title_en: 'Transfer to Nova Terra' }).ilike('title', '%Traslado a Nova Terra%').select();
        console.log('Updated item 1:', i1?.length);

        const { data: i2 } = await supabase.from('module_items').update({ title_en: 'Territorial Restorers' }).ilike('title', '%Restauradores Territoriales%').select();
        console.log('Updated item 2:', i2?.length);

        const { data: i3 } = await supabase.from('module_items').update({ title_en: 'The Island of Harmony' }).ilike('title', '%La Isla de la Armonía%').select();
        console.log('Updated item 3:', i3?.length);

        console.log('✅ Manual fuzzy translation successful!');
    } catch (error) {
        console.error('Error during manual translation:', error);
    }
}

manualTranslate();
