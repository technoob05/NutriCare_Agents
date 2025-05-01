// Search images from Pexels API
// Usage: searchPexelsImages(query: string, apiKey?: string)

export async function searchPexelsImages(query: string, apiKey?: string): Promise<string[]> {
    const key = apiKey || 'Y87roQ8SdQsa0J4PTcKDCZh5mA12e8BAwIpj1G10nZtyJMr0XTzWgc4f';
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=10`;
    const headers = { 'Authorization': key };
    try {
        const res = await fetch(url, { headers });
        if (!res.ok) return [];
        const data = await res.json();
        if (!data.photos || !Array.isArray(data.photos)) return [];
        const lowerQuery = query.toLowerCase();
        // Ưu tiên ảnh có alt/title liên quan đến query
        const related = data.photos.filter((p: any) =>
            (p.alt && p.alt.toLowerCase().includes(lowerQuery)) ||
            (p.photographer && p.photographer.toLowerCase().includes(lowerQuery))
        );
        const all = related.length > 0 ? related : data.photos;
        return all.map((p: any) => p.src?.large2x || p.src?.original || p.src?.large).filter(Boolean);
    } catch (e) {
        return [];
    }
}
