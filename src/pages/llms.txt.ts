import type { APIRoute } from 'astro'

export const GET: APIRoute = ({ site }) => {
	const siteUrl = site ? site.toString() : 'https://paperlab.r3actr.work/'
	const baseUrl = siteUrl.replace(/\/$/, '')

	const llmsTxt = `
# Paper Lab - Modern Academic & Research Editor

> Paper Lab is a comprehensive, modern Research and Academic Editor designed to streamline writing, formatting, and collaborating on academic papers and professional documents.

Paper Lab combines the ease of a rich-text WYSIWYG editor with the power of Python-based templating and LaTeX compilation.

## Key Capabilities & Features

- Visual WYSIWYG & Section-Based Editing: Structured document organization with drag-and-drop section management.
- Embedded Monaco LaTeX Editor: Direct editing of native LaTeX templates, preambles, and raw code.
- Live A4 Document Preview: Real-time visual rendering of academic reports and papers as you write.
- Citation & Reference Manager: Automated BibTeX import, reference search, and formatting (IEEE, APA, Harvard).
- Research Diagram & Figure Designer: Built-in vector tool for technical diagrams and illustrations.
- Publication-Ready Exports: One-click export to PDF, LaTeX zip packages, and Microsoft Word (.docx).

## Primary Pages & Documentation

- [Home](${baseUrl}/): Main overview and core value proposition of Paper Lab.
- [Features](${baseUrl}/features): Detailed breakdown of editor tools and workflows.
- [Pricing](${baseUrl}/pricing): Pricing plans for students, researchers, and academic institutions.
- [Get Started](${baseUrl}/get-started): Download guide and Microsoft Store installation link.
- [Contact](${baseUrl}/contact): Support and inquiry contact channels.
`.trim()

	return new Response(llmsTxt, {
		headers: {
			'Content-Type': 'text/plain; charset=utf-8'
		}
	})
}
