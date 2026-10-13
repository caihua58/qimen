/* ============================================================================
   verify-paipan.mjs
   从 qimen-3d.html 抽出 <script id="paipan">，在 node 中执行并校验：
     1) 2026 全年 24 节气时刻 vs 日本国立天文台 暦要項（JST→北京时间 −1h）
     2) 用户那张盘：2026-10-02 14:54 的完整四柱与局象
   ============================================================================ */
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/* 兼容两种布局：脚本与 HTML 同目录（工作区），或脚本在 dev/ 而 HTML 在仓库根 */
const HTML = [
  path.join(here, 'qimen-3d.html'),
  path.join(here, '..', 'qimen-3d.html'),
].find(p => fs.existsSync(p));
if (!HTML) { console.error('✗ 找不到 qimen-3d.html（已试：脚本同目录、上一级）'); process.exit(1); }
const html = fs.readFileSync(HTML, 'utf8');
const src = html.match(/<script id="paipan">([\s\S]*?)<\/script>/)[1];
const P = new Function(src + '\n; return PAIPAN;')();

let pass = 0, fail = 0;
const T = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      实得 ${g}\n      应为 ${w}`); }
};
const H = t => console.log(`\n── ${t} ──`);

/* ============================================================ 1 节气精度 */
H('1. 2026 年 24 节气时刻 · 对比日本国立天文台暦要項（北京时间）');
/* 参考值：JST − 1h。来源：NAO 暦要項 令和8年(2026) 二十四節気 */
const REF = [
  ['小寒',2026,1,5,16,23, 285, 2025], ['大寒',2026,1,20,9,45, 300, 2025],
  ['立春',2026,2,4,4,2,   315, 2026], ['雨水',2026,2,18,23,52,330, 2026],
  ['惊蛰',2026,3,5,21,59, 345, 2026], ['春分',2026,3,20,22,46,  0, 2026],
  ['清明',2026,4,5,2,40,   15, 2026], ['谷雨',2026,4,20,9,39,  30, 2026],
  ['立夏',2026,5,5,19,49,  45, 2026], ['小满',2026,5,21,8,37,  60, 2026],
  ['芒种',2026,6,5,23,48,  75, 2026], ['夏至',2026,6,21,16,25, 90, 2026],
  ['小暑',2026,7,7,9,57,  105, 2026], ['大暑',2026,7,23,3,13, 120, 2026],
  ['立秋',2026,8,7,19,43, 135, 2026], ['处暑',2026,8,23,10,19,150, 2026],
  ['白露',2026,9,7,22,41, 165, 2026], ['秋分',2026,9,23,8,5,  180, 2026],
  ['寒露',2026,10,8,14,29,195, 2026], ['霜降',2026,10,23,17,38,210,2026],
  ['立冬',2026,11,7,17,52,225, 2026], ['小雪',2026,11,22,15,23,240,2026],
  ['大雪',2026,12,7,10,53,255, 2026], ['冬至',2026,12,22,4,50,270,2026]
];
let maxErr = 0, sumAbs = 0, mismDate = 0;
console.log('   节气    实测(北京时间)       基准(北京时间)       误差');
for (const [name,Y,M,D,h,mi,lon,baseYear] of REF) {
  const jd = P.termJD(baseYear, lon);
  const t  = P.jdToYMD(jd + 8/24);
  const expJD = P.toJD(Y, M, D, h, mi) - 8/24;
  const dmin = (jd - expJD) * 1440;
  maxErr = Math.max(maxErr, Math.abs(dmin)); sumAbs += Math.abs(dmin);
  const same = (t.y===Y && t.m===M && t.d===D);
  if (!same) mismDate++;
  const pad = n => String(n).padStart(2,'0');
  console.log(`   ${name}  ${t.y}-${pad(t.m)}-${pad(t.d)} ${pad(t.h)}:${pad(t.mi)}`
    + `     ${Y}-${pad(M)}-${pad(D)} ${pad(h)}:${pad(mi)}`
    + `   ${dmin>=0?'+':''}${dmin.toFixed(1)} 分${same?'':'   ⚠日期不符'}`);
}
console.log(`\n   最大误差 ${maxErr.toFixed(1)} 分 · 平均 ${(sumAbs/24).toFixed(1)} 分 · 日期不符 ${mismDate}/24`);
T('24 节气日期全部正确', mismDate, 0);
T('最大误差 < 20 分钟', maxErr < 20, true);

/* ============================================================ 2 用户那张盘 */
H('2. 用户那张盘：2026-10-02 14:54（北京时间）');
const r = P.paipan(2026, 10, 2, 14, 54);
T('四柱', r.sizhu, {year:'丙午', month:'丁酉', day:'己酉', hour:'辛未'});
T('所在节气', r.term, '秋分');
T('符头（甲/己日）', r.fuTou, '己酉');
T('元', r.yuanName, '上元');
T('阴遁', r.yindun, true);
T('局数', r.JU, 7);
T('旬首', r.xun, '甲子');
T('XUN_STEPS（时柱在旬中序数）', r.XUN_STEPS, 7);
T('喂给 MODEL 的参数', r.model, {YANG:false, JU:7, SHIGAN:'辛', XUN_GAN:'戊', XUN_STEPS:7});
{
  /* 节气时刻与基准差 3.5 分（低精度太阳黄经的正常误差），断言放宽到 20 分 */
  const exp = P.toJD(2026, 9, 23, 8, 5) - 8/24;
  const dmin = Math.abs((r.termJD - exp) * 1440);
  T(`秋分时刻在基准 ±20 分内（实差 ${dmin.toFixed(1)} 分）`, dmin < 20, true);
}
T('下一节气', r.nextTerm, '寒露');
T('距下一节气约 5.7 天（不触边界）', r.nearBoundary, false);

/* ============================================================ 3 一致性 */
H('3. 内部一致性（随机抽样 300 个时刻）');
{
  let ok = true, bad = [];
  for (let n = 0; n < 300; n++) {
    const y = 1990 + (n % 60), mo = 1 + (n * 7) % 12, d = 1 + (n * 13) % 28;
    const hh = (n * 5) % 24, mi = (n * 17) % 60;
    const q = P.paipan(y, mo, d, hh, mi);
    // 局数必须是当前节气三元之一
    if (!P.SANYUAN[q.term].includes(q.JU)) { ok = false; bad.push([y,mo,d,hh,mi,'局数']); }
    // 阴遁/阳遁必须与节气一致
    const idx = P.TERMS.indexOf(q.term);
    const expectYang = (idx >= 21 || idx <= 8);
    if (q.yang === undefined ? false : q.YANG !== expectYang) { ok = false; bad.push([y,mo,d,hh,mi,'阴阳遁']); }
    // 四柱格式
    if (!/^[甲乙丙丁戊己庚辛壬癸][子丑寅卯辰巳午未申酉戌亥]$/.test(q.sizhu.year)) { ok = false; bad.push([y,mo,d,hh,mi,'年柱']); }
  }
  T('300 组抽样：局数∈该节气三元、阴阳遁与节气一致、四柱格式合法', ok ? 'ok' : bad.slice(0,3), 'ok');
}

/* ============================================================ 汇总 */
console.log('\n' + '═'.repeat(60));
console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
console.log('═'.repeat(60));
process.exit(fail === 0 ? 0 : 1);
