/* ============================================================================
   render-previews.mjs
   用无头 Chrome 为各视图截屏，生成预览图。
   兼容两种布局：脚本与 qimen-3d.html 同目录（工作区），或脚本在 dev/ 而 HTML 在仓库根；
   输出优先写入 <HTML 所在目录>/docs/preview/，该目录不存在时写入 HTML 所在目录。
   依赖：Google Chrome（Windows 默认路径，可用 CHROME 环境变量覆盖）。
   ============================================================================ */
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const HTML = [
  path.join(here, 'qimen-3d.html'),
  path.join(here, '..', 'qimen-3d.html'),
].find(p => fs.existsSync(p));
if (!HTML) { console.error('✗ 找不到 qimen-3d.html（已试：脚本同目录、上一级）'); process.exit(1); }

const htmlDir = path.dirname(HTML);
const previewDir = path.join(htmlDir, 'docs', 'preview');
const outDir = fs.existsSync(previewDir) ? previewDir : htmlDir;
fs.mkdirSync(outDir, {recursive: true});

const chrome = process.env.CHROME || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
if (!fs.existsSync(chrome)) { console.error(`✗ 找不到 Chrome：${chrome}（可用 CHROME 环境变量指定）`); process.exit(1); }

const url = p => 'file:///' + p.replace(/\\/g, '/');
console.log(`HTML : ${HTML}\n输出 : ${outDir}\n`);

for (const [hash, out] of [['view3d','shot-view3d.png'],['flat','shot-flat.png'],
                           ['flat4','shot-flat4.png'],['path','shot-path.png'],
                           ['slice','shot-slice.png'],['theory','shot-theory.png'],
                           ['ai','shot-ai.png']]) {
  const target = path.join(outDir, out);
  if (fs.existsSync(target)) fs.unlinkSync(target);
  execFileSync(chrome, ['--headless','--no-sandbox','--disable-gpu','--hide-scrollbars',
    '--window-size=1680,1050','--virtual-time-budget=5000',
    `--screenshot=${target}`, url(HTML) + '#' + hash], {stdio:'ignore'});
  console.log(fs.existsSync(target) ? `OK  ${out}  ${fs.statSync(target).size}` : `FAIL ${out}`);
}
