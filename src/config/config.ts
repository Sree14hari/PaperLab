// Config
// ------------
// Description: The configuration file for the website.

export interface Logo {
	src: string
	srcDark: string
	alt: string
}

export type Mode = 'auto' | 'light' | 'dark'

export interface Config {
	siteTitle: string
	siteDescription: string
	ogImage: string
	logo: Logo
	canonical: boolean
	noindex: boolean
	mode: Mode
	scrollAnimations: boolean
}

export const configData: Config = {
	siteTitle:
		'Paper Lab | Modern Academic Report Editor',
	siteDescription:
		'Paper Lab is a comprehensive, modern Research and Academic Editor designed to streamline the process of writing, formatting, and collaborating on academic papers and professional documents.',
	ogImage: '/previe.png',
	logo: {
		src: '/assets/paperlablogo.svg',
		srcDark: '/assets/paperlablogo.svg',
		alt: 'Paper Lab logo'
	},
	canonical: true,
	noindex: false,
	mode: 'dark',
	scrollAnimations: true
}
