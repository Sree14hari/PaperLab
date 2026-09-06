import fs from 'node:fs'
import path from 'node:path'
import { marked } from 'marked'

export interface TOCHeading {
  id: string
  text: string
  depth: number
}

export interface BlogPost {
  id: string
  slug: string
  aliases: string[]
  title: string
  subtitle: string
  excerpt: string
  date: string
  isoDate: string
  readingTime: string
  author: {
    name: string
    role: string
    avatar: string
  }
  tags: string[]
  featured: boolean
  headings: TOCHeading[]
  contentHtml: string
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/<[^>]*>/g, '') // remove HTML tags
    .replace(/[^\w\s-]/g, '') // remove special chars
    .trim()
    .replace(/\s+/g, '-') // replace spaces with hyphens
}

export function getBlogPostById(id: string): BlogPost | null {
  const posts = getAllBlogPosts()
  return posts.find(p => p.id === id || p.slug === id || p.aliases.includes(id)) ?? null
}

export function getAllBlogPosts(): BlogPost[] {
  const blogDir = path.resolve(process.cwd(), 'public/Blog')
  const blog1Path = path.join(blogDir, 'blog1.md')

  if (!fs.existsSync(blog1Path)) {
    return []
  }

  const rawContent = fs.readFileSync(blog1Path, 'utf-8')

  // Calculate reading time (~200 wpm)
  const words = rawContent.trim().split(/\s+/).length
  const readingMinutes = Math.max(1, Math.ceil(words / 200))
  const readingTime = `${readingMinutes} min read`

  // Extract headings
  const headings: TOCHeading[] = []
  const headingRegex = /^(#{2,4})\s+(.+)$/gm
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(rawContent)) !== null) {
    const depth = match[1].length
    const rawHeadingText = match[2].trim()
    const cleanText = rawHeadingText.replace(/\*\*/g, '').replace(/__/, '')
    const id = slugify(cleanText)
    headings.push({
      id,
      text: cleanText,
      depth,
    })
  }

  // Configure marked renderer for beautiful article rendering
  const renderer = new marked.Renderer()

  renderer.heading = ({ tokens, depth }: { tokens: any[]; depth: number; text: string }) => {
    // In marked, parse tokens to render inline markdown like bold/code
    const text = renderer.parser.parseInline(tokens)
    const rawText = tokens.map(t => ('text' in t ? t.text : '')).join('')
    const id = slugify(rawText)

    if (depth === 2) {
      return `
        <h2 id="${id}" class="blog-heading-2 scroll-mt-28 group relative mt-14 mb-6 flex items-center justify-between text-2xl font-bold tracking-tight text-dark sm:text-3xl border-b border-dark/10 pb-3">
          <span>${text}</span>
          <a href="#${id}" class="ml-2 text-coral opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:underline" aria-label="Link to this section">
            #
          </a>
        </h2>
      `
    }

    if (depth === 3) {
      return `
        <h3 id="${id}" class="blog-heading-3 scroll-mt-28 group relative mt-12 mb-4 flex items-center justify-between text-xl font-bold tracking-tight text-dark sm:text-2xl">
          <span>${text}</span>
          <a href="#${id}" class="ml-2 text-coral opacity-0 transition-opacity duration-200 group-hover:opacity-100 hover:underline" aria-label="Link to this section">
            #
          </a>
        </h3>
      `
    }

    return `
      <h${depth} id="${id}" class="scroll-mt-28 group relative mt-8 mb-4 text-lg font-bold text-dark">
        <span>${text}</span>
        <a href="#${id}" class="ml-2 text-coral opacity-0 transition-opacity duration-200 group-hover:opacity-100" aria-label="Link to this section">
          #
        </a>
      </h${depth}>
    `
  }

  renderer.paragraph = ({ tokens }: { tokens: any[]; text: string }) => {
    const text = renderer.parser.parseInline(tokens)
    // Check if the paragraph is just a raw block-level element like <div> or <video>
    if (text.trim().startsWith('<div') || text.trim().startsWith('<video')) {
      return `${text}\n`
    }
    return `<p class="blog-paragraph text-dark/85 mb-6 text-lg leading-relaxed font-normal">${text}</p>\n`
  }

  renderer.strong = ({ tokens }: { tokens: any[]; text: string }) => {
    const text = renderer.parser.parseInline(tokens)
    return `<strong class="font-bold text-dark">${text}</strong>`
  }

  renderer.blockquote = ({ tokens }: { tokens: any[]; text: string }) => {
    const body = renderer.parser.parse(tokens)
    return `
      <blockquote class="my-8 rounded-r-2xl border-l-4 border-coral bg-coral/5 px-6 py-4 italic text-dark/90 shadow-xs dark:bg-coral/10">
        ${body}
      </blockquote>
    `
  }

  renderer.list = ({ ordered, items }: { ordered: boolean; items: any[] }) => {
    const type = ordered ? 'ol' : 'ul'
    const listClass = ordered
      ? 'my-6 list-decimal pl-6 space-y-2 text-dark/85 text-lg'
      : 'my-6 list-disc pl-6 space-y-2 text-dark/85 text-lg'
    let content = ''
    for (const item of items) {
      content += `<li class="leading-relaxed">${renderer.parser.parseInline(item.tokens)}</li>\n`
    }
    return `<${type} class="${listClass}">\n${content}</${type}>\n`
  }

  const contentHtml = marked.parse(rawContent, { renderer, gfm: true }) as string

  const blog1: BlogPost = {
    id: 'blog1',
    slug: 'is-paper-lab-the-ultimate-academic-writing-environment',
    aliases: ['blog1', 'ultimate-academic-writing-environment', 'paper-lab-deep-dive'],
    title: 'Paper Lab: Is It the Ultimate Academic Writing Environment?',
    subtitle:
      'A deep dive into how dual-mode editing, real-time A4 previews, and built-in citation workflows are rethinking the academic writing workflow.',
    excerpt:
      'If you’ve ever written a research paper, a thesis, or a dense technical report, you already know the dirty little secret of academic writing: the actual writing is only a fraction of the job. Here is how Paper Lab tackles the chaos of scientific publishing.',
    date: 'September 6, 2026',
    isoDate: '2026-09-06',
    readingTime,
    author: {
      name: 'Paper Lab Editorial',
      role: 'Research & Product Team',
      avatar: '/logos/paperlablogo.svg',
    },
    tags: ['Product Deep Dive', 'Academic Writing', 'LaTeX', 'WYSIWYG', 'Research Tools'],
    featured: true,
    headings,
    contentHtml,
  }

  return [blog1]
}
