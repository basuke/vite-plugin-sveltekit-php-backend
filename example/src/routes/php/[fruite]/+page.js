import { error } from '@sveltejs/kit';

export async function load({ params, data, fetch }) {
    const res = await fetch(`/php/emoji/${params.fruite}`);
    try {
        const result = await res.json();
        return { ...(data ?? {}), emoji: result.emoji };
    } catch (e) {
        throw error(500, 'Invalid JSON');
    }
}