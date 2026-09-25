import { supabase } from '../src/config/supabase';

async function manualTranslate() {
    console.log('Manually translating specific Ética records for demonstration...');

    try {
        // 1. Update the subject
        await supabase.from('subjects').update({ name_en: 'Ethics' }).eq('name', 'Ética');
        
        // 2. Update the module
        await supabase.from('modules').update({ title_en: 'Content 1. My personal, family, and community history' }).eq('title', 'Contenido 1. Mi historia personal, familiar y comunitaria');

        // 3. Update the items
        await supabase.from('module_items').update({ title_en: 'First Settlers of America' }).eq('title', 'Primeros Pobladores de América');
        await supabase.from('module_items').update({ title_en: 'Treasures of Mesoamerica' }).eq('title', 'Tesoros de Mesoamérica');
        await supabase.from('module_items').update({ title_en: 'The Museum of Time' }).eq('title', 'El Museo del Tiempo');
        await supabase.from('module_items').update({ title_en: 'Living as a Mestizo' }).eq('title', 'Viviendo como Mestizo');

        console.log('✅ Manual translation successful!');
    } catch (error) {
        console.error('Error during manual translation:', error);
    }
}

manualTranslate();
