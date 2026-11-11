// Merekam animasi.html frame demi frame menjadi video MP4.
// Pemakaian:  node render.js            -> video lengkap
//             node render.js preview    -> beberapa gambar PNG untuk dicek
const { chromium } = require('playwright');
const { spawn } = require('child_process');
const path = require('path');

const FPS = 30;
const mode = process.argv[2] || 'video';
const outDir = __dirname;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  await page.goto('file://' + path.join(outDir, 'animasi.html') + '?record');
  await page.evaluate(() => document.fonts.ready);
  const total = await page.evaluate(() => window.TOTAL);

  if (mode === 'preview') {
    const times = process.argv.slice(3).map(Number);
    for (const t of times) {
      await page.evaluate(t => window.render(t), t);
      await page.screenshot({ path: path.join(process.env.PREVIEW_DIR || outDir, `frame-${t}.png`) });
    }
    await browser.close();
    return;
  }

  const frames = Math.round(total * FPS);
  const silent = path.join(outDir, 'tmp-silent.mp4');
  const ff = spawn('ffmpeg', ['-y', '-f', 'image2pipe', '-framerate', String(FPS), '-i', '-',
    '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '20', '-preset', 'medium', silent], { stdio: ['pipe', 'ignore', 'inherit'] });
  for (let i = 0; i < frames; i++) {
    await page.evaluate(t => window.render(t), i / FPS);
    const buf = await page.screenshot({ type: 'jpeg', quality: 92 });
    if (!ff.stdin.write(buf)) await new Promise(r => ff.stdin.once('drain', r));
    if (i % 150 === 0) console.log(`frame ${i}/${frames}`);
  }
  ff.stdin.end();
  await new Promise(r => ff.on('close', r));
  await browser.close();
  console.log('selesai:', silent, 'durasi', total, 'detik');
})();
