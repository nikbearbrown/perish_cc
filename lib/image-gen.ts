import { perishSql } from '@/lib/db-perish'

const IMAGE_GEN_API_URL = () => process.env.IMAGE_GEN_API_URL || ''
const IMAGE_GEN_API_KEY = () => process.env.IMAGE_GEN_API_KEY || ''

export function extractHeroImageInstructions(personaPrompt: string): string | null {
  const match = personaPrompt.match(/\[HERO IMAGE:\s*(.*?)\]/i)
  return match ? match[1].trim() : null
}

export async function generateHeroImage(
  articleId: string,
  personaPrompt: string,
  articleTitle: string,
): Promise<string | null> {
  const instructions = extractHeroImageInstructions(personaPrompt)
  if (!instructions) return null

  const prompt = `${instructions}. Abstract visualization for an article titled: "${articleTitle}". Do not include text or typography.`

  try {
    const res = await fetch(IMAGE_GEN_API_URL(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${IMAGE_GEN_API_KEY()}`,
      },
      body: JSON.stringify({ prompt, n: 1, size: '1024x1024' }),
    })

    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      console.error(`[image-gen] Failed for article ${articleId}: ${res.status}`, data)
      return null
    }

    const data = await res.json()
    const url = data.data?.[0]?.url
    if (!url) {
      console.error(`[image-gen] No URL in response for article ${articleId}`)
      return null
    }

    return url
  } catch (err) {
    console.error(`[image-gen] Error for article ${articleId}:`, err)
    return null
  }
}

export async function attachHeroImage(articleId: string, imageUrl: string): Promise<void> {
  await perishSql`
    UPDATE articles SET hero_image_url = ${imageUrl} WHERE id = ${articleId}
  `
}
