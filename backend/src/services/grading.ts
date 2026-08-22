// Returns true/false if the element type is auto-gradable and we could
// evaluate it, or null if it's not auto-gradable (e.g. open_ended) or the
// response shape was invalid.
export function gradeResponse(type: string, config: any, response: any): boolean | null {
    switch (type) {
        case 'true_false':
            if (typeof response?.value !== 'boolean') return null;
            return response.value === config.correct;

        case 'multiple_choice':
            if (typeof response?.selected_index !== 'number') return null;
            return response.selected_index === config.correct_index;

        case 'open_ended':
            // Free text — needs a human to grade it. Always ungraded.
            return null;

        case 'connect': {
            const pairs: [string, string][] = response?.pairs || [];
            const correctPairs: [string, string][] = config.correct_pairs || [];
            if (!Array.isArray(pairs) || pairs.length !== correctPairs.length) return false;

            const normalize = (pair: [string, string]) => [...pair].sort().join('|');
            const correctSet = new Set(correctPairs.map(normalize));
            return pairs.every(pair => correctSet.has(normalize(pair)));
        }

        case 'rank': {
            const order: string[] = response?.order || [];
            const correctOrder: string[] = config.correct_order || [];
            if (!Array.isArray(order) || order.length !== correctOrder.length) return false;
            return order.every((id, i) => id === correctOrder[i]);
        }

        case 'checkbox':
            if (typeof response?.checked !== 'boolean') return null;
            if (typeof config?.correct !== 'boolean') return null;
            return response.checked === config.correct;

        case 'dropdown': {
            const selected = response?.selected ?? (typeof response?.selected_index === 'number' ? config?.options?.[response.selected_index] : null);
            if (typeof selected !== 'string' || !selected) return null;
            if (typeof config?.correct_value === 'string') {
                return selected.trim().toLowerCase() === config.correct_value.trim().toLowerCase();
            }
            if (typeof config?.correct_index === 'number') {
                return response?.selected_index === config.correct_index;
            }
            return null;
        }

        default:
            return null;
    }
}