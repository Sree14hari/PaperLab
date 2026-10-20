const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function fineTuneImages() {
  console.log('--- 1. Creating ultra-optimized 400px mobile illustrations ---')
  const illustrations = [
    {
      src: 'public/illustrations/AI Detection Workspace Illustration.png',
      out: 'public/illustrations/AI Detection Workspace Illustration-sm.webp',
    },
    {
      src: 'public/illustrations/Seamless Team Collaboration Workspace.png',
      out: 'public/illustrations/Seamless Team Collaboration Workspace-sm.webp',
    },
  ]

  for (const item of illustrations) {
    // 400px width at quality 70 is ~15-20 KB and matches the 380px displayed mobile size
    const buf = await sharp(item.src)
      .resize({ width: 400, withoutEnlargement: true })
      .webp({ quality: 72, effort: 6 })
      .toBuffer()
    fs.writeFileSync(item.out, buf)
    console.log(`${path.basename(item.out)}: ${buf.length} bytes`)
  }

  console.log('--- 2. Creating responsive video posters ---')
  const posters = [
    'public/media/hero-video/poster.webp',
    'public/media/citation/poster.webp',
    'public/media/workspaces/poster.webp',
  ]

  for (const p of posters) {
    const dir = path.dirname(p)
    const smPoster = path.join(dir, 'poster-sm.webp')
    // Mobile video displayed size is ~380px to 480px, so 480px width is perfect
    const buf = await sharp(p)
      .resize({ width: 480, withoutEnlargement: true })
      .webp({ quality: 70, effort: 6 })
      .toBuffer()
    fs.writeFileSync(smPoster, buf)
    console.log(`Created ${smPoster}: ${buf.length} bytes`)
  }
}

fineTuneImages().catch(console.error)
