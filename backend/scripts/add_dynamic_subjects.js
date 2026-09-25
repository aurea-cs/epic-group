const fs = require('fs');
const path = '../frontend/src/locales/en.json';

const data = JSON.parse(fs.readFileSync(path, 'utf8'));

if (!data.dynamicSubjects) {
    data.dynamicSubjects = {};
}
Object.assign(data.dynamicSubjects, {
    "Primer Trimestre": "First Trimester",
    "Segundo Trimestre": "Second Trimester",
    "Tercer Trimestre": "Third Trimester",
    "Semestre 1": "Semester 1",
    "Semestre 2": "Semester 2",
    "Semestre 3": "Semester 3",
    "Semestre 4": "Semester 4",
    "Semestre 5": "Semester 5",
    "Semestre 6": "Semester 6"
});

fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Done updating en.json');
