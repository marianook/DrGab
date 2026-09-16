const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const MODEL = 'claude-sonnet-5';

export function claudeDisponible() {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export async function llamarClaude({ system, prompt, maxTokens = 1024 }) {
  if (!claudeDisponible()) {
    const err = new Error('La integración con Claude no está configurada (falta ANTHROPIC_API_KEY)');
    err.code = 'CLAUDE_NO_CONFIGURADO';
    throw err;
  }

  const response = await fetch(ANTHROPIC_API_URL, {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const detalle = await response.text().catch(() => '');
    const err = new Error(`Error al consultar Claude (${response.status}): ${detalle}`);
    err.code = 'CLAUDE_ERROR';
    throw err;
  }

  const data = await response.json();
  const texto = (data.content || [])
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
  return texto;
}

export function extraerJSON(texto) {
  const match = texto.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]);
  } catch {
    return null;
  }
}
