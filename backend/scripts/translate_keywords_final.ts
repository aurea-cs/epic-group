import { supabase } from '../src/config/supabase';

const dict: Record<string, string> = {
    'Saberes Matemáticos': 'Mathematical Knowledge',
    'Saberes Científicos': 'Scientific Knowledge',
    'Intro a Desarrollo': 'Intro to Development',
    'Modelado 3D': '3D Modeling',
    'Administración': 'Administration',
    'Administracion': 'Administration',
    'Tutoría': 'Tutoring',
    'Tutoria': 'Tutoring',
    'Metodología de la Investigación': 'Research Methodology',
    'Metodología de la Inv.': 'Research Methodology',
    'Taller de Lectura y Redacción': 'Reading and Writing Workshop',
    'Redacción y Lectura': 'Reading and Writing',
    'Formación Cívica y Ética': 'Civic and Ethical Education',
    'Salud Integral Movimiento y Bienestar': 'Integral Health, Movement, and Wellness',
    'Carácter y Liderazgo': 'Character and Leadership',
    'Geografía': 'Geography',
    'Vida Saludable': 'Healthy Living',
    'Tecnologías': 'Technologies',
    'Tecnología': 'Technology',
    'Cálculo Diferencial': 'Differential Calculus',
    'Calculo': 'Calculus',
    'Cálculo': 'Calculus',
    'Probabilidad y Estadística': 'Probability and Statistics',
    'Prob y Est': 'Prob and Stats',
    'Estructura Socioeconómica de México': 'Socioeconomic Structure of Mexico',
    'Estructura Socioeco.': 'Socioeconomic Structure',
    'Animación y Pixel Art': 'Animation and Pixel Art',
    'Incubación': 'Incubation',
    'Grado': 'Grade',
    'Material Extra': 'Extra Material',
    'Lenguajes': 'Languages'
};

async function run() {
    const { data: subjects } = await supabase.from('subjects').select('id, name, name_en');
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
    console.log('Final Keyword translation complete.');
}
run();
