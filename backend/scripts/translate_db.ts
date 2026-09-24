import { supabase } from '../src/config/supabase';
import { translateToEnglish } from '../src/utils/translator';

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function translateExistingData() {
    console.log('Iniciando traducción masiva con límite de velocidad (Anti-bloqueo)...');
    
    let requestCount = 0;

    const checkRateLimit = async () => {
        requestCount++;
        // Google free tier allows 15 requests per minute. We stop at 10 just to be safe.
        if (requestCount >= 10) {
            console.log('⏳ Límite seguro alcanzado (10 peticiones). Pausando 60 segundos para evitar bloqueo de Google...');
            await delay(61000); // Wait 61 seconds
            requestCount = 0;
            console.log('▶️ Continuando traducción...');
        } else {
            // Small delay between normal requests to not overwhelm
            await delay(1500); 
        }
    };

    try {
        // 1. Translate Subjects
        console.log('\n--- Traduciendo Materias (Subjects) ---');
        const { data: subjects, error: subErr } = await supabase.from('subjects').select('id, name, description, name_en, description_en');
        if (subErr) throw subErr;

        for (const subject of subjects || []) {
            if (!subject.name_en || subject.name === subject.name_en) {
                console.log(`Traduciendo materia: ${subject.name}`);
                await checkRateLimit();
                const name_en = await translateToEnglish(subject.name);
                
                let description_en = subject.description_en;
                if (!subject.description_en || (subject.description && subject.description === subject.description_en)) {
                    await checkRateLimit();
                    description_en = await translateToEnglish(subject.description);
                }
                
                await supabase.from('subjects').update({ name_en, description_en }).eq('id', subject.id);
            }
        }

        // 2. Translate Modules
        console.log('\n--- Traduciendo Módulos ---');
        const { data: modules, error: modErr } = await supabase.from('modules').select('id, title, title_en');
        if (modErr) throw modErr;

        for (const mod of modules || []) {
            if (!mod.title_en || mod.title === mod.title_en) {
                console.log(`Traduciendo módulo: ${mod.title}`);
                await checkRateLimit();
                const title_en = await translateToEnglish(mod.title);
                await supabase.from('modules').update({ title_en }).eq('id', mod.id);
            }
        }

        // 3. Translate Module Items
        console.log('\n--- Traduciendo Clases (Module Items) ---');
        const { data: items, error: itemErr } = await supabase.from('module_items').select('id, title, description, title_en, description_en');
        if (itemErr) throw itemErr;

        for (const item of items || []) {
            if (!item.title_en || item.title === item.title_en) {
                console.log(`Traduciendo clase: ${item.title}`);
                await checkRateLimit();
                const title_en = await translateToEnglish(item.title);
                
                let description_en = item.description_en;
                if (!item.description_en || (item.description && item.description === item.description_en)) {
                    await checkRateLimit();
                    description_en = await translateToEnglish(item.description);
                }
                
                await supabase.from('module_items').update({ title_en, description_en }).eq('id', item.id);
            }
        }

        console.log('\n✅ ¡Traducción masiva completada con éxito!');
    } catch (error) {
        console.error('Error durante la traducción masiva:', error);
    }
}

translateExistingData();
