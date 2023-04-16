
export async function load({ params, data, fetch }) {
    const res = await fetch(`/php/emoji/${params.fruite}`);
    const result = await res.json();
    console.log('+page.js', result);
    return { ...data, emoji: result.emoji };
}