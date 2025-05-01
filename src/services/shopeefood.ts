// ShopeeFood search URL builder (scalable, easy to extend)

export type ShopeeFoodCity =
  | 'ho-chi-minh'
  | 'ha-noi'
  | 'da-nang'
  | 'hai-phong'
  | 'can-tho';

export function buildShopeeFoodSearchUrl(
  dishName: string,
  city: ShopeeFoodCity = 'ho-chi-minh'
): string {
  const base = `https://shopeefood.vn/${city}/danh-sach-dia-diem-giao-tan-noi`;
  const q = encodeURIComponent(dishName);
  return `${base}?q=${q}`;
}

// TikTok search URL builder (scalable, easy to extend)
export function buildTiktokSearchUrl(query: string): string {
  return `https://www.tiktok.com/search?q=${encodeURIComponent(query)}`;
}

// Có thể mở rộng: buildShopeeFoodRestaurantUrl, buildShopeeFoodMenuUrl, ...