export const sortByOrder = <T extends { order_index?: number | null }>(items: T[]): T[] =>
  items.slice().sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0))