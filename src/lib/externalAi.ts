export const PERSONAL_AI_SERVICES = {
  chatgpt: { name: 'ChatGPT', url: 'https://chatgpt.com/' },
  gemini: { name: 'Gemini', url: 'https://gemini.google.com/' },
  claude: { name: 'Claude', url: 'https://claude.ai/' },
} as const;

export function buildPersonalAiPrompt(question: string, city: string, language: string, tourId?: string) {
  return `I am exploring Jewish heritage in ${city || 'a European city'} using Moreshet.\nPlease answer in ${language}.\n${tourId ? `Tour reference: ${tourId}. This reference is not evidence of access to Moreshet's database.\n` : ''}Question: ${question.trim()}\n\nDistinguish verified history from legends and uncertainty. Cite reliable sources with links where possible. Do not invent opening hours, accessibility, prices, current safety conditions or archival references. I will verify practical information with the venue. You do not have access to my Moreshet account, private notes, or GPS. This answer is for my personal research and will not be automatically published in Moreshet.`;
}
