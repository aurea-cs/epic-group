import { supabase } from '../src/config/supabase';

const dict: Record<string, string> = {
    'Ciencias': 'Science',
    'Ciencia': 'Science',
    'Ética': 'Ethics',
    'Etica': 'Ethics',
    'Lenguaje': 'Language',
    'Lenguajes': 'Languages',
    'Matemática': 'Mathematics', // singular form
    'Geografía': 'Geography',
    'Geografia': 'Geography',
    'Artes': 'Arts',
    'Arte': 'Art',
    'Español': 'Spanish',
    'Tutoría': 'Tutoring',
    'Humano y Comunitario': 'Human and Community',
    'Humano': 'Human',
    'Ingles': 'English',
    'Inglés': 'English'
};

async function run() {
    const { data: subjects } = await supabase.from('subjects').select('id, name, name_en').not('name_en', 'is', null);
    if (!subjects) return;

    for (const sub of subjects) {
        let name_en = sub.name_en || sub.name;
        for (const [es, en] of Object.entries(dict)) {
            name_en = name_en.replace(new RegExp(es, 'gi'), en);
        }
        if (name_en !== sub.name_en) {
            console.log(`Updating ${sub.name} -> ${name_en}`);
            await supabase.from('subjects').update({ name_en }).eq('id', sub.id);
        }
    }
    console.log('Keyword translation complete.');
}
run();
