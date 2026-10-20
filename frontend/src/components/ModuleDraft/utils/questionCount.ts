import type { TFunction } from 'i18next'

/** "3 questions" / "1 question" or the fallback label when the count is 0. */
export const formatQuestionCount = (count: number, t: TFunction, fallbackLabel: string): string =>
  count > 0
    ? `${count} ${count === 1 ? t('moduleDraft.questionSingle') : t('moduleDraft.questionPlural')}`
    : fallbackLabel