import { supabase } from '../src/config/supabase';

async function manualTranslate() {
    console.log('Manually translating more Ética records...');

    try {
        await supabase.from('modules').update({ title_en: 'Content 2. Rules, coexistence, and participation' }).eq('title', 'Contenido 2. Normas, convivencia y participación');

        await supabase.from('module_items').update({ title_en: 'Transfer to Nova Terra' }).eq('title', 'Traslado a Nova Terra');
        await supabase.from('module_items').update({ title_en: 'Territorial Restorers' }).eq('title', 'Restauradores Territoriales');
        await supabase.from('module_items').update({ title_en: 'The Island of Harmony' }).eq('title', 'La Isla de la Armonía');

        console.log('✅ Manual translation successful!');
    } catch (error) {
        console.error('Error during manual translation:', error);
    }
}

manualTranslate();
