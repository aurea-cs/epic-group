import { supabase } from '../src/config/supabase';

const dict: Record<string, string> = {
    'Biologia': 'Biology',
    'Biología': 'Biology',
    'Matemáticas': 'Mathematics',
    'Matematicas': 'Mathematics',
    'Historia': 'History',
    'Fisica': 'Physics',
    'Física': 'Physics',
    'Literatura': 'Literature',
    'Desarrollo de Emp': 'Entrepreneurship Dev',
    'Química': 'Chemistry',
    'Quimica': 'Chemistry',
    'Preparatoria': 'High School',
    'Secundaria': 'Middle School',
    'Primaria': 'Elementary',
    'Semestre': 'Semester',
    'Trimestre': 'Trimester',
    '3°': '3rd',
    '2°': '2nd',
    '1°': '1st',
    '4°': '4th',
    '5°': '5th',
    '6°': '6th'
};

async function run() {
    const { data: subjects } = await supabase.from('subjects').select('id, name').is('name_en', null);
    if (!subjects) return;

    for (const sub of subjects) {
        let name_en = sub.name;
        for (const [es, en] of Object.entries(dict)) {
            name_en = name_en.replace(new RegExp(es, 'gi'), en);
        }
        if (name_en !== sub.name) {
            console.log(`Updating ${sub.name} -> ${name_en}`);
            await supabase.from('subjects').update({ name_en }).eq('id', sub.id);
        }
    }
    console.log('Keyword translation complete.');
}
run();
