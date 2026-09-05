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

    const levelNum =
        levelVal !== undefined && levelVal !== null && levelVal !== ''
            ? parseInt(String(levelVal), 10)
            : NaN
    if (isNaN(levelNum)) {
        return name
    }

    const nameLower = name.toLowerCase()

    if (levelNum === 0) return `${t('professorCourses.general', { defaultValue: 'General' })} ${name}`

    // Preparatoria / Prepa / Bachillerato -> Semestres 1-6
    if (nameLower.includes('prepa') || nameLower.includes('bachillerato')) {
        const ordinal =
            levelNum === 1
                ? t('professorCourses.ordinal1', { defaultValue: '1er' })
                : levelNum === 2
                    ? t('professorCourses.ordinal2', { defaultValue: '2do' })
                    : levelNum === 3
                        ? t('professorCourses.ordinal3', { defaultValue: '3er' })
                        : `${levelNum}${t('professorCourses.ordinalOther', { defaultValue: 'to' })}`
        return `${ordinal} ${t('professorCourses.semesterOf', { defaultValue: 'Semestre de' })} ${name}`
    }

    // Primaria (1-6), Secundaria (1-3), or default level
    let suffix = t('professorCourses.ordinalOther', { defaultValue: 'º' })
    if (levelNum === 1) suffix = t('professorCourses.ordinal1', { defaultValue: '1er' }).replace('1', '')
    else if (levelNum === 2) suffix = t('professorCourses.ordinal2', { defaultValue: '2do' }).replace('2', '')
    else if (levelNum === 3) suffix = t('professorCourses.ordinal3', { defaultValue: '3er' }).replace('3', '')

    return `${levelNum}${suffix} ${t('professorCourses.of', { defaultValue: 'de' })} ${name}`
}