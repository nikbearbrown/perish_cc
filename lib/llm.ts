export type LLMMode = 'article' | 'comment' | 'bot_seed' | 'auto_seed'

export interface LLMRequest {
  persona_prompt: string
  seed: string
  mode: LLMMode
  account_id: string
  tier_id?: number
  temperature?: number  // defaults to 0.7 if not provided
}

export interface LLMResponse {
  generated_text: string
  token_count: number
  model_used: string
  latency_ms: number
}

export type LLMError = 'context_window_exceeded' | 'api_unavailable' | 'content_policy'

export class LLMException extends Error {
  constructor(public code: LLMError, message: string) {
    super(message)
    this.name = 'LLMException'
  }
}

const LLM_API_KEY = () => process.env.LLM_API_KEY || ''
const LLM_API_URL = () => process.env.LLM_API_URL || ''
const LLM_MODEL = () => process.env.LLM_MODEL || 'default'
const LLM_MAX_CONTEXT = () => parseInt(process.env.LLM_MAX_CONTEXT || '100000', 10)

export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

export function buildMessages(req: LLMRequest): { system: string; user: string } {
  const system = req.persona_prompt

  switch (req.mode) {
    case 'article':
      return { system, user: `Write an article exploring this topic: ${req.seed}` }
    case 'comment':
      return { system, user: `Write a brief comment of 1–3 sentences responding to this: ${req.seed}` }
    case 'bot_seed':
      return { system, user: `Write an article exploring this topic in the context of intelligence research: ${req.seed}` }
    case 'auto_seed':
      return { system, user: `Write an article exploring this topic in the context of intelligence research: ${req.seed}` }
  }
}

const RETRY_DELAYS = [500, 1000, 2000]

export async function generateContent(req: LLMRequest): Promise<LLMResponse> {
  const contextEstimate = estimateTokens(req.persona_prompt + req.seed)
  if (contextEstimate > LLM_MAX_CONTEXT()) {
    throw new LLMException(
      'context_window_exceeded',
      `Estimated ${contextEstimate} tokens exceeds max context ${LLM_MAX_CONTEXT()}`,
    )
  }

  const { system, user } = buildMessages(req)
  const model = LLM_MODEL()
  const apiUrl = LLM_API_URL()
  const apiKey = LLM_API_KEY()

  const temperature = req.temperature ?? 0.7

  const body = JSON.stringify({
    model,
    system: system,
    messages: [{ role: 'user', content: user }],
    max_tokens: 2000,
    temperature,
  })

  let lastError: Error | null = null

  for (let attempt = 0; attempt <= RETRY_DELAYS.length; attempt++) {
    const start = Date.now()

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body,
      })

      const latencyMs = Date.now() - start

      if (res.status >= 400 && res.status < 500) {
        const data = await res.json().catch(() => ({}))
        const msg = data.error?.message || `LLM API returned ${res.status}`
        console.log(JSON.stringify({
          mode: req.mode,
          account_id: req.account_id,
          latency_ms: latencyMs,
          model_used: model,
          error: 'content_policy' as LLMError,
        }))
        throw new LLMException('content_policy', msg)
      }

      if (res.status >= 500 || !res.ok) {
        throw new Error(`LLM API returned ${res.status}`)
      }

      const data = await res.json()
      const generatedText = data.content?.[0]?.text || ''
      const tokenCount = (data.usage?.input_tokens || 0) + (data.usage?.output_tokens || 0) || estimateTokens(generatedText)

      if (latencyMs > 25000) {
        console.warn(JSON.stringify({
          warning: 'LLM latency exceeded 25s',
          mode: req.mode,
          account_id: req.account_id,
          latency_ms: latencyMs,
          model_used: model,
        }))
      }

      console.log(JSON.stringify({
        mode: req.mode,
        account_id: req.account_id,
        latency_ms: latencyMs,
        token_count: tokenCount,
        model_used: model,
      }))

      return {
        generated_text: generatedText,
        token_count: tokenCount,
        model_used: model,
        latency_ms: latencyMs,
      }
    } catch (err) {
      if (err instanceof LLMException) throw err
      lastError = err instanceof Error ? err : new Error(String(err))

      if (attempt < RETRY_DELAYS.length) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAYS[attempt]))
      }
    }
  }

  console.log(JSON.stringify({
    mode: req.mode,
    account_id: req.account_id,
    model_used: model,
    error: 'api_unavailable' as LLMError,
  }))

  throw new LLMException(
    'api_unavailable',
    `LLM API unavailable after ${RETRY_DELAYS.length + 1} attempts: ${lastError?.message}`,
  )
}
