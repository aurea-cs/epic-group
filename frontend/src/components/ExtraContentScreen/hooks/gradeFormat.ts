// Determines display order between educational stages (Primaria, Secundaria, Prepa/Bachillerato).
export const getStageOrder = (name: string): number => {
    const n = name.toLowerCase()
    if (n.includes('primaria')) return 1
    if (n.includes('secundaria')) return 2
    if (n.includes('prepa') || n.includes('bachillerato') || n.includes('preparatoria')) return 3
    return 4
}

// Formats grade level into clear human-readable strings based on the level attribute:
// - Primaria (1-6): "1er de Primaria", "2do de Primaria", ... "6to de Primaria"
// - Secundaria (1-3): "1er de Secundaria", "2do de Secundaria", "3er de Secundaria"
// - Preparatoria / Bachillerato (1-6): "1er Semestre de Preparatoria", ... "6to Semestre de Preparatoria"
export const formatGradeDisplayName = (
    t: any,
    rawName?: string,
    levelVal?: number | string | null
): string => {
    if (!rawName) return t('professorCourses.noGrade', { defaultValue: 'Sin Grado' })
    const name = rawName.trim()
    if (!name) return t('professorCourses.noGrade', { defaultValue: 'Sin Grado' })

    const nameLower = name.toLowerCase()
    let stageName = name
    if (nameLower.includes('primaria')) stageName = 'Primaria'
    else if (nameLower.includes('secundaria')) stageName = 'Secundaria'
    else if (nameLower.includes('prepa') || nameLower.includes('bachillerato') || nameLower.includes('preparatoria')) stageName = 'Preparatoria'

    const translatedName = t(`dynamicSubjects.${stageName}`, {
        defaultValue: t(`dynamicSubjects.${name}`, { defaultValue: name })
    })

    const levelNum =
        levelVal !== undefined && levelVal !== null && levelVal !== ''
            ? parseInt(String(levelVal), 10)
            : NaN

    if (isNaN(levelNum)) {
        return translatedName
    }

    if (levelNum === 0) return `${t('professorCourses.general', { defaultValue: 'General' })} ${translatedName}`

    // Preparatoria / Prepa / Bachillerato -> Semestres 1-6
    if (nameLower.includes('prepa') || nameLower.includes('bachillerato') || nameLower.includes('preparatoria')) {
        const ordinal =
            levelNum === 1
                ? t('professorCourses.ordinal1', { defaultValue: '1er' })
                : levelNum === 2
                    ? t('professorCourses.ordinal2', { defaultValue: '2do' })
                    : levelNum === 3
                        ? t('professorCourses.ordinal3', { defaultValue: '3er' })
                        : `${levelNum}${t('professorCourses.ordinalOther', { defaultValue: 'to' })}`
        return `${ordinal} ${t('professorCourses.semesterOf', { defaultValue: 'Semestre de' })} ${translatedName}`
    }

    // Primaria (1-6), Secundaria (1-3), or default level
    const ordinalStr =
        levelNum === 1
            ? t('professorCourses.ordinal1', { defaultValue: '1er' })
            : levelNum === 2
                ? t('professorCourses.ordinal2', { defaultValue: '2do' })
                : levelNum === 3
                    ? t('professorCourses.ordinal3', { defaultValue: '3er' })
                    : `${levelNum}${t('professorCourses.ordinalOther', { defaultValue: 'to' })}`

    return `${ordinalStr} ${t('professorCourses.of', { defaultValue: 'de' })} ${translatedName}`
}