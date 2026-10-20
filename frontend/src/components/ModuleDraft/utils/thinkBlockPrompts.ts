import type { ThinkBlock } from '../../../lib/adminApi'

const countPrompts = (block: ThinkBlock): number => {
  if (Array.isArray(block.prompts)) return block.prompts.length

  const nested = block.think_block_prompts
  if (Array.isArray(nested) && nested.length > 0) {
    const first = nested[0]
    return typeof first === 'object' && 'count' in first
      ? (first as { count: number }).count
      : nested.length
  }
  return 0
}

export const countThinkBlockPrompts = (blocks: ThinkBlock[]): number =>
  blocks.reduce((total, block) => total + countPrompts(block), 0)