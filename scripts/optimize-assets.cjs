const fs = require('fs')
const path = require('path')
const sharp = require('sharp')

async function optimizeAssets() {
  console.log('--- 1. Optimizing paperlablogo.svg ---')
  const logoBuf = await sharp('public/favicon.png')
    .resize(256, 256)
    .png({ quality: 90, compressionLevel: 9 })
    .toBuffer()
  const b64 = logoBuf.toString('base64')
  const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="256" height="256"><image width="256" height="256" href="data:image/png;base64,${b64}"/></svg>`
  fs.writeFileSync('public/logos/paperlablogo.svg', svgContent, 'utf8')
  console.log(
    'New paperlablogo.svg size:',
    fs.statSync('public/logos/paperlablogo.svg').size,
    'bytes'
  )

  console.log('--- 2. Optimizing illustrations ---')
  const illustrations = [
    'public/illustrations/AI Detection Workspace Illustration.png',
    'public/illustrations/Seamless Team Collaboration Workspace.png',
  ]

  for (const imgPath of illustrations) {
    const meta = await sharp(imgPath).metadata()
    console.log(
      `Original ${path.basename(imgPath)}: ${meta.width}x${meta.height}, ${fs.statSync(imgPath).size} bytes`
    )

    // Resize to max width 1200 and compress WebP / PNG
    const webpPath = imgPath.replace('.png', '.webp')
    await sharp(imgPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .webp({ quality: 80, effort: 6 })
      .toFile(webpPath)
    console.log(`Created WebP ${path.basename(webpPath)}: ${fs.statSync(webpPath).size} bytes`)

    // Also optimize original PNG in-place to reasonable size (max width 1200)
    const optimizedPngBuf = await sharp(imgPath)
      .resize({ width: 1200, withoutEnlargement: true })
      .png({ quality: 80, compressionLevel: 9 })
      .toBuffer()
    fs.writeFileSync(imgPath, optimizedPngBuf)
    console.log(`Optimized PNG ${path.basename(imgPath)}: ${fs.statSync(imgPath).size} bytes`)
  }

  console.log('--- 3. Optimizing posters ---')
  const posters = [
    'public/media/hero-video/poster.webp',
    'public/media/workspaces/poster.webp',
    'public/media/citation/poster.webp',
    'public/media/glance/poster.webp',
    'public/media/compact-mode/poster.webp',
    'public/media/split-views/poster.webp',
  ]

  for (const p of posters) {
    if (fs.existsSync(p)) {
      const oldSize = fs.statSync(p).size
      const meta = await sharp(p).metadata()
      const targetWidth = Math.min(meta.width, 960)
      const buf = await sharp(p)
        .resize({ width: targetWidth, withoutEnlargement: true })
        .webp({ quality: 75, effort: 6 })
        .toBuffer()
      fs.writeFileSync(p, buf)
      console.log(
        `Poster ${path.basename(path.dirname(p))}: ${oldSize} -> ${fs.statSync(p).size} bytes`
      )
    }
  }
}

optimizeAssets().catch(console.error)
