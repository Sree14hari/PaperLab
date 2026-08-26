import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
	const siteUrl = site ? site.toString() : 'https://paperlab.r3actr.work/'
	const sitemapUrl = new URL('sitemap-index.xml', siteUrl).href
	const llmsUrl = new URL('llms.txt', siteUrl).href

	const robotsTxt = `
# Global Web Crawlers
User-agent: *
Allow: /

# AI & LLM Search Crawlers
User-agent: GPTBot
Allow: /

User-agent: ChatGPT-User
Allow: /

User-agent: ClaudeBot
Allow: /

User-agent: Claude-Web
Allow: /

User-agent: PerplexityBot
Allow: /

User-agent: Google-Extended
Allow: /

User-agent: Applebot-Extended
Allow: /

User-agent: Cohere-ai
Allow: /

User-agent: Anthropic-ai
Allow: /

User-agent: Bytespider
Allow: /

User-agent: CCBot
Allow: /

# Sitemap & LLM Context
Sitemap: ${sitemapUrl}
# LLM Context: ${llmsUrl}
`.trim()

	return new Response(robotsTxt, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	})
}
