const fs = require('fs');

const path = '../frontend/src/components/ExtraContentScreen/components/exitTicketEditorScreen.tsx';
let content = fs.readFileSync(path, 'utf8');

// Inject useTranslation
if (!content.includes('useTranslation')) {
    content = content.replace(
        `import React, { useEffect, useState } from 'react'`,
        `import React, { useEffect, useState } from 'react'\nimport { useTranslation } from 'react-i18next'`
    );
}

content = content.replace(
    `const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {`,
    `const ExitTicketEditorScreen: React.FC<ExitTicketEditorScreenProps> = ({ templateId, onBack, onSaved }) => {\n    const { t, i18n } = useTranslation()`
);

const replacements = [
    { from: `'¿Qué concepto principal aprendiste hoy en clase?'`, to: `i18n.language.startsWith('en') ? 'What main concept did you learn today in class?' : '¿Qué concepto principal aprendiste hoy en clase?'` },
    { from: `'¿Qué tan clara fue la lección de hoy?'`, to: `i18n.language.startsWith('en') ? 'How clear was today\\'s lesson?' : '¿Qué tan clara fue la lección de hoy?'` },
    { from: `← volver`, to: `← {i18n.language.startsWith('en') ? 'back' : 'volver'}` },
    { from: `Información`, to: `{i18n.language.startsWith('en') ? 'Information' : 'Información'}` },
    { from: `>Título *<`, to: `>{i18n.language.startsWith('en') ? 'Title *' : 'Título *'}<` },
    { from: `>Descripción<`, to: `>{i18n.language.startsWith('en') ? 'Description' : 'Descripción'}<` },
    { from: `Ej: Ticket de Salida - Reflexión Diaria`, to: `{i18n.language.startsWith('en') ? 'Ex: Exit Ticket - Daily Reflection' : 'Ej: Ticket de Salida - Reflexión Diaria'}` },
    { from: `Instrucciones breves para el alumno...`, to: `{i18n.language.startsWith('en') ? 'Brief instructions for the student...' : 'Instrucciones breves para el alumno...'}` },
    { from: `>Preguntas (`, to: `>{i18n.language.startsWith('en') ? 'Questions' : 'Preguntas'} (` },
    { from: `>Nueva pregunta<`, to: `>{i18n.language.startsWith('en') ? 'New question' : 'Nueva pregunta'}<` },
    { from: `Tipo: `, to: `{i18n.language.startsWith('en') ? 'Type: ' : 'Tipo: '}` },
    { from: `Respuesta Abierta`, to: `{i18n.language.startsWith('en') ? 'Open Answer' : 'Respuesta Abierta'}` },
    { from: `VISTA PREVIA (ESTUDIANTE)`, to: `{i18n.language.startsWith('en') ? 'PREVIEW (STUDENT)' : 'VISTA PREVIA (ESTUDIANTE)'}` },
    { from: `Título del Cuestionario`, to: `{i18n.language.startsWith('en') ? 'Questionnaire Title' : 'Título del Cuestionario'}` },
    { from: `Sin instrucciones adicionales.`, to: `{i18n.language.startsWith('en') ? 'No additional instructions.' : 'Sin instrucciones adicionales.'}` },
    { from: `El alumno escribirá su respuesta aquí...`, to: `{i18n.language.startsWith('en') ? 'The student will write their answer here...' : 'El alumno escribirá su respuesta aquí...'}` },
    { from: `>Guardar<`, to: `>{i18n.language.startsWith('en') ? 'Save' : 'Guardar'}<` },
    { from: `>Cancelar<`, to: `>{i18n.language.startsWith('en') ? 'Cancel' : 'Cancelar'}<` },
    { from: `'Nuevo ticket de salida'`, to: `i18n.language.startsWith('en') ? 'New exit ticket' : 'Nuevo ticket de salida'` },
    { from: `'Opción 1', 'Opción 2'`, to: `i18n.language.startsWith('en') ? ['Option 1', 'Option 2'] : ['Opción 1', 'Opción 2']` },
];

for (const r of replacements) {
    // Escape standard regex characters in `from` except we can just use split/join for global replace
    content = content.split(r.from).join(r.to);
}

// Ensure the DEFAULT_NEW_QUESTIONS uses i18n inside the component, but it's defined outside!
// Let's change the default state initialization:
content = content.replace(
    `const [questions, setQuestions] = useState<ExitTicketQuestionFormState[]>(`,
    `const [questions, setQuestions] = useState<ExitTicketQuestionFormState[]>(`
);
content = content.replace(
    `isEditing ? [] : DEFAULT_NEW_QUESTIONS`,
    `isEditing ? [] : [
            { title: i18n.language.startsWith('en') ? 'What main concept did you learn today in class?' : '¿Qué concepto principal aprendiste hoy en clase?', type: 'text', required: true, question_order: 0 },
            { title: i18n.language.startsWith('en') ? 'How clear was today\\'s lesson?' : '¿Qué tan clara fue la lección de hoy?', type: 'rating', required: true, question_order: 1 }
        ]`
);


fs.writeFileSync(path, content, 'utf8');
console.log('Done replacing strings in exitTicketEditorScreen.tsx');
