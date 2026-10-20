const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function resizeIllustrations() {
  const images = [
    {
      png: 'public/illustrations/AI Detection Workspace Illustration.png',
      webp: 'public/illustrations/AI Detection Workspace Illustration.webp',
      smWebp: 'public/illustrations/AI Detection Workspace Illustration-sm.webp',
    },
    {
      png: 'public/illustrations/Seamless Team Collaboration Workspace.png',
      webp: 'public/illustrations/Seamless Team Collaboration Workspace.webp',
      smWebp: 'public/illustrations/Seamless Team Collaboration Workspace-sm.webp',
    },
  ]

  for (const item of images) {
    // Generate small 600px width for mobile screens
    await sharp(item.png)
      .resize({ width: 600, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(item.smWebp)
    console.log(`Created mobile WebP ${item.smWebp}: ${fs.statSync(item.smWebp).size} bytes`)
  }
}

resizeIllustrations().catch(console.error)
