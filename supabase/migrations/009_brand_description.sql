-- Add description column to brands table and seed brand summaries.

ALTER TABLE brands ADD COLUMN IF NOT EXISTS description TEXT;

UPDATE brands SET
  description = 'Abercrombie is known for modern casual apparel that blends trend-conscious style with an elevated, wearable feel. The brand is a popular choice for versatile wardrobe staples that work across everyday wear, going out, and polished casual outfits.',
  website_url = 'https://www.abercrombie.com'
WHERE slug = 'abercrombie';

UPDATE brands SET
  description = 'Vuori is known for premium performance apparel that combines athletic function with a relaxed, everyday style. The brand appeals to people who want comfortable, versatile pieces that transition easily from workouts to daily life.',
  website_url = 'https://www.vuori.com'
WHERE slug = 'vuori';

UPDATE brands SET
  description = 'Lululemon is known for premium athletic and lifestyle apparel built around performance, comfort, and technical design. The brand is especially popular with people looking for versatile pieces that work for training, travel, and everyday wear.',
  website_url = 'https://www.lululemon.com'
WHERE slug = 'lululemon';

UPDATE brands SET
  description = 'Peter Millar is known for refined apparel that combines classic styling with premium materials and modern comfort. The brand is especially popular in golf, business casual, and upscale everyday wear.',
  website_url = 'https://www.petermillar.com'
WHERE slug = 'peter-millar';

UPDATE brands SET
  description = 'Nike is known for performance-driven athletic apparel and footwear designed for a wide range of sports and activities. The brand appeals to both serious athletes and everyday consumers through its mix of innovation, functionality, and recognizable style.',
  website_url = 'https://www.nike.com'
WHERE slug = 'nike';
