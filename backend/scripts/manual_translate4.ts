import { supabase } from '../src/config/supabase';

async function manualTranslate() {
    console.log('Translating Humano records...');

    try {
        await supabase.from('subjects').update({ name_en: 'Human' }).eq('name', 'Humano');
        
        await supabase.from('modules').update({ title_en: 'Content 1. Construction of personal identity' }).ilike('title', '%Contenido 1. Construcción de la identidad personal%');
        await supabase.from('modules').update({ title_en: 'Content 2. Recognition and expression of emotions' }).ilike('title', '%Contenido 2. Reconocimiento y expresión de emociones%');

        await supabase.from('module_items').update({ title_en: 'Room - The core of emotions' }).ilike('title', '%Sala - El núcleo de las emociones%');
        await supabase.from('module_items').update({ title_en: 'The Lighthouse of Identity' }).ilike('title', '%El Faro de la Identidad%');
        await supabase.from('module_items').update({ title_en: 'The core of emotions' }).ilike('title', 'El núcleo de las emociones');
        await supabase.from('module_items').update({ title_en: 'The Valley of Magical Emotions' }).ilike('title', '%El Valle de las Emociones Mágicas%');

        console.log('✅ Humano translation successful!');
    } catch (error) {
        console.error('Error during translation:', error);
    }
}

manualTranslate();
