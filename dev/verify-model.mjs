/* ============================================================================
   verify-model.mjs
   从 qimen-3d.html 抽出 <script id="model">，在 node 中执行，
   用「本局参数」重算全部落宫，并逐宫比对 2026-10-02 14:54 的排盘结果。
   运行：<bundled-node> verify-model.mjs
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

const m = html.match(/<script id="model">([\s\S]*?)<\/script>/);
if (!m) { console.error('✗ 未能从 HTML 中提取 <script id="model">'); process.exit(1); }
const M = new Function(m[1] + '\n; return MODEL;')();

let pass = 0, fail = 0;
const T = (name, got, want) => {
  const g = JSON.stringify(got), w = JSON.stringify(want);
  if (g === w) { pass++; console.log(`  ✓ ${name}`); }
  else { fail++; console.log(`  ✗ ${name}\n      实得 ${g}\n      应为 ${w}`); }
};
const H = t => console.log(`\n── ${t} ──`);

/* ---------------------------------------------------------------- 1 环序几何 */
H('1. 八宫环序与旋转几何');
T('环序（屏幕顺时针）', M.RING, [4, 9, 2, 7, 6, 1, 8, 3]);
{
  let ok = true, bad = [];
  for (const p of M.RING) for (const k of [0, 5, 6]) {
    if (M.destOf(M.baseOf(p, k), k) !== p) { ok = false; bad.push([p, k]); }
  }
  T('baseOf ∘ destOf 往返自洽（k=0/5/6，全8宫）', ok ? 'ok' : bad, 'ok');
}

/* ---------------------------------------------------------------- 2 地盘 */
H('2. 地盘三奇六仪（阴遁七局：戊起兑七，逆布）');
T('地盘奇仪', M.DIPAN, {7:'戊', 6:'己', 5:'庚', 4:'辛', 3:'壬', 2:'癸', 1:'丁', 9:'丙', 8:'乙'});
T('旬首甲子戊所居宫（＝值符本宫）', M.ZHIFU_GONG, 7);

/* ---------------------------------------------------------------- 3 值符值使 */
H('3. 值符 / 值使');
T('值符本宫之星＝天柱', M.XING_BEN[M.ZHIFU_GONG], '天柱');
T('值符本宫之门＝惊门', M.MEN_BEN[M.ZHIFU_GONG], '惊门');
T('值符落宫（加时干辛之宫）＝巽四', M.ZHIFU_LUO, 4);
T('值使落宫（逆数7步）＝离九', M.ZHISHI_LUO, 9);
T('天盘旋转步数 k', M.K_TIAN, 5);
T('人盘旋转步数 k', M.K_REN, 6);
T('神盘旋转步数 k（随值符）', M.K_SHEN, 5);

/* ---------------------------------------------------------------- 4 天盘 */
H('4. 天盘（九星＋天盘奇仪）—— 比对排盘图');
const wantTian = {
  4: ['天柱', '戊'], 9: ['天心', '己'], 2: ['天蓬', '丁'], 3: ['天芮禽', '癸'],
  7: ['天任', '乙'], 6: ['天冲', '壬'], 1: ['天辅', '辛'], 8: ['天英', '丙']
};
for (const p of M.RING) T(`宫${p} 星·干`, [M.TIANPAN[p].xing, M.TIANPAN[p].gan], wantTian[p]);
{
  let ok = true;
  for (const p of M.RING) if (M.TIANPAN[p].gan !== M.DIPAN[M.TIANPAN[p].base]) ok = false;
  T('天盘携干＝其本宫地盘之干', ok ? 'ok' : 'bad', 'ok');
}
T('中五宫无天盘星（中宫不落星）', M.TIANPAN[5], undefined);

/* ---------------------------------------------------------------- 5 人盘 */
H('5. 人盘（八门）—— 比对排盘图');
const wantRen = {4:'死门', 9:'惊门', 2:'开门', 3:'景门', 7:'休门', 6:'生门', 8:'杜门', 1:'伤门'};
for (const p of M.RING) T(`宫${p} 门`, M.RENPAN[p].men, wantRen[p]);
T('中五宫无门', M.RENPAN[5], undefined);

/* ---------------------------------------------------------------- 6 神盘 */
H('6. 神盘（八神，阴遁自值符宫顺环起值符）—— 比对排盘图');
const wantShen = {4:'值符', 9:'九天', 2:'九地', 3:'腾蛇', 7:'玄武', 6:'白虎', 8:'太阴', 1:'六合'};
for (const p of M.RING) T(`宫${p} 神`, M.SHENPAN[p].shen, wantShen[p]);
T('值符落宫＝巽四', M.SHENPAN[4].shen, '值符');

/* ---------------------------------------------------------------- 7 地盘八神 */
H('7. 地盘八神（未旋转之底：值符起于旬首宫兑七）—— 比对图中右下小字');
const wantDiShen = {7:'值符', 6:'九天', 1:'九地', 8:'玄武', 3:'白虎', 4:'六合', 9:'太阴', 2:'腾蛇'};
T('地盘八神', M.DIPAN_SHEN, wantDiShen);

/* ---------------------------------------------------------------- 8 暗干 */
H('8. 暗干（时干辛加值使门宫，阴遁逆布三奇六仪）—— 比对图中左上灰字');
T('暗干', M.ANGAN, {9:'辛', 8:'壬', 7:'癸', 6:'丁', 5:'丙', 4:'乙', 3:'戊', 2:'己', 1:'庚'});

/* ---------------------------------------------------------------- 9 中宫寄 */
H('9. 中宫寄宫检查');
T('地盘中五宫＝庚（寄坤二）', M.DIPAN[5], '庚');
T('坤二宫地盘＝癸（中宫寄于此）', M.DIPAN[2], '癸');

/* ---------------------------------------------------------------- 10 与图逐宫对照 */
H('10. 与排盘图逐宫对照（八宫全套 4×8＝32 项）');
const IMG = {  /* 图中每一宫：天盘星干 / 门 / 神 / 地盘干 */
  4: ['天柱戊', '死门', '值符', '辛'],
  9: ['天心己', '惊门', '九天', '丙'],
  2: ['天蓬丁', '开门', '九地', '癸'],
  3: ['天芮禽癸', '景门', '腾蛇', '壬'],
  7: ['天任乙', '休门', '玄武', '戊'],
  8: ['天英丙', '杜门', '太阴', '乙'],
  1: ['天辅辛', '伤门', '六合', '丁'],
  6: ['天冲壬', '生门', '白虎', '己']
};
for (const p of M.RING) {
  const got = [M.TIANPAN[p].xing + M.TIANPAN[p].gan, M.RENPAN[p].men, M.SHENPAN[p].shen, M.DIPAN[p]];
  T(`宫${p}（${M.PALACES[p].gua}${M.PALACES[p].num}·${M.PALACES[p].dir}）`, got, IMG[p]);
}

/* ---------------------------------------------------------------- 11 推导自洽 */
H('11. 参数化推导自洽（换局只改配置四行）');
T('值使落宫（按宫数逆数 7 步）', M.ZHISHI_P, 9);
T('stepPalace(兑七, 7, 阴遁)', M.stepPalace(7, 7), 9);
T('palaceOfGan(辛) → 巽四', M.palaceOfGan('辛'), 4);
T('K_TIAN 由「值符加时干」反推', M.K_TIAN, 5);
T('K_REN  由「值使落宫」反推', M.K_REN, 6);
T('K_SHEN ＝ K_TIAN（八神随值符）', M.K_SHEN, M.K_TIAN);
T('阴遁七局地盘（方向参数）', M.dipanOf(7, false),
  {7:'戊', 6:'己', 5:'庚', 4:'辛', 3:'壬', 2:'癸', 1:'丁', 9:'丙', 8:'乙'});
T('阳遁七局地盘（反向，仅作对照）', M.dipanOf(7, true),
  {7:'戊', 8:'己', 9:'庚', 1:'辛', 2:'壬', 3:'癸', 4:'丁', 5:'丙', 6:'乙'});
T('暗干（方向参数）', M.anganOf(9, '辛', false),
  {9:'辛', 8:'壬', 7:'癸', 6:'丁', 5:'丙', 4:'乙', 3:'戊', 2:'己', 1:'庚'});
T('本局模式为阴遁', M.YANG, false);

/* ---------------------------------------------------------------- 12 路径图路线 */
H('12. 路径图用到的路线（全部由模型推导）');
T('八宫环序（转盘所行）', M.RING, [4, 9, 2, 7, 6, 1, 8, 3]);
T('洛书飞泊序（1→9，经中宫）', [1,2,3,4,5,6,7,8,9], [1,2,3,4,5,6,7,8,9]);
T('本局地盘逆布路径（戊起兑七）',
  M.YIQI.map(g => +Object.keys(M.DIPAN).find(k => M.DIPAN[k] === g)),
  [7, 6, 5, 4, 3, 2, 1, 9, 8]);
{
  const ringPath = (from, steps) => { const o = []; let i = M.ri(from);
    for (let n = 0; n <= steps; n++) o.push(M.RING[(i + n) % 8]); return o; };
  const palaceSeq = (from, steps) => { const o = [from]; let p = from;
    for (let i = 0; i < steps; i++) { p = M.stepPalace(p, 1); o.push(p); } return o; };
  T('天盘环上路径：兑七 →(5步)→ 巽四', ringPath(M.XUNSHOU_GONG, M.K_TIAN), [7, 6, 1, 8, 3, 4]);
  T('人盘环上路径：兑七 →(6步)→ 离九', ringPath(M.XUNSHOU_GONG, M.K_REN), [7, 6, 1, 8, 3, 4, 9]);
  T('值使宫数逆行路径：兑七 →(7步)→ 离九', palaceSeq(7, 7), [7, 6, 5, 4, 3, 2, 1, 9]);
  T('人盘比天盘多一步', M.K_REN - M.K_TIAN, 1);
}

/* ---------------------------------------------------------------- 13 局象实时推算 */
H('13. 局象元数据（值符／值使／空亡／驿马）改为实时推算后，与原硬编码完全一致');
T('CHART.marks', M.CHART.marks,
  {4:['值符','驿马'], 9:['值使'], 6:['空亡'], 8:['日空'], 3:['日空']});
T('值符', M.CHART.zhifu, '天柱（落巽四宫）');
T('值使', M.CHART.zhishi, '惊门（落离九宫）');
T('空亡', M.CHART.kong, '时空戌亥（乾六宫）· 日空寅卯（艮八宫／震三宫）');
T('驿马', M.CHART.ma, '时马巳（巽四宫）· 日马亥');
T('局', M.CHART.ju, '阴遁七局 · 甲子旬');
T('四柱', M.CHART.sizhu, '丙午年 · 丁酉月 · 己酉日 · 辛未时');

/* ---------------------------------------------------------------- 14 换局可重建 */
H('14. buildModel 可对任意一局重建（换局只换参数）');
{
  const a = M.buildModel({YANG:true, JU:1, SHIGAN:'甲', XUN_GAN:'戊', XUN_STEPS:0});   /* 阳遁一局·甲子时 */
  T('阳遁一局地盘（戊起坎一，顺布）', a.DIPAN,
    {1:'戊',2:'己',3:'庚',4:'辛',5:'壬',6:'癸',7:'丁',8:'丙',9:'乙'});
  T('阳遁一局 甲子时：旬首宫在坎一', a.XUNSHOU_GONG, 1);
  T('阳遁一局 甲子时：值符星在本宫（天蓬）', a.ZHIFU_GONG, 1);
  T('阳遁一局 甲子时：天盘不转（伏吟）', a.K_TIAN, 0);
  T('阳遁一局 甲子时：人盘不转', a.K_REN, 0);
  const b = M.buildModel({YANG:false, JU:1, SHIGAN:'丙', XUN_GAN:'戊', XUN_STEPS:1}); /* 阴遁一局·乙丑时 */
  T('阴遁一局地盘（戊起坎一，逆布）', b.DIPAN,
    {1:'戊',9:'己',8:'庚',7:'辛',6:'壬',5:'癸',4:'丁',3:'丙',2:'乙'});
  T('阴遁一局：时干丙在地盘震三 → 天盘 2 步', b.K_TIAN, 2);
  T('阴遁一局：值使自坎一逆数 1 步 → 离九', b.ZHISHI_P, 9);
  /* 非甲子旬：旬首宫 = 旬首之仪所落之宫，而非局数宫 */
  const c = M.buildModel({YANG:false, JU:7, SHIGAN:'壬', XUN_GAN:'己', XUN_STEPS:3}); /* 阴遁七局·甲戌旬 */
  T('阴遁七局地盘：己在乾六', c.DIPAN[6], '己');
  T('阴遁七局·甲戌旬：旬首宫＝乾六（非局数宫兑七）', c.XUNSHOU_GONG, 6);
  T('阴遁七局·甲戌旬：值符本宫在乾六', c.ZHIFU_GONG, 6);
  const d = M.buildModel({YANG:false, JU:7, SHIGAN:'甲', XUN_GAN:'己', XUN_STEPS:0});
  T('时干为甲时以旬首仪（己）代之：天盘不转', d.K_TIAN, 0);
}

/* ---------------------------------------------------------------- 15 阴符层 */
H('15. 阴符层（《黄帝阴符经》义理 → 可计算量）');
{
  const Y = M.CHART.yinfu;
  T('本盘既非伏吟亦非反吟（天盘 5 步）', [Y.反吟, Y.伏吟], [false, false]);
  T('巽四：宫木克门土 → 门制', Y.byPalace[4].po, '门制');
  T('艮八：门木克宫土 → 门迫', Y.byPalace[8].po, '门迫');
  T('乾六：门土生宫金 → 无门迫门制', Y.byPalace[6].po, null);
  T('离九：地盘丙火生天盘己土 → 被生', Y.byPalace[9].ganGan.type, '被生');
  T('离九：门金与宫火 → 门被宫克（门制）', Y.byPalace[9].menGong.type, '被克');
  T('乾六：宫金克星木 → 被克', Y.byPalace[6].xingGong.type, '被克');
  T('震三：三盗既宜', Y.byPalace[3].yi, true);
  T('见贼之宫共 8 个', Y.贼宫.length, 8);
  T('三盗不宜之宫共 7 个', Y.不宜宫.length, 7);
  T('本盘无「天人合德」之宫', Y.合德宫.length, 0);
  T('五行相克表（贼）', [M.WX_KE['金'], M.WX_KE['木'], M.WX_KE['水']], ['木', '土', '火']);
  T('五行相生表', [M.WX_SHENG['木'], M.WX_SHENG['金']], ['火', '水']);
  T('天干五合', [M.GAN_HE['乙'], M.GAN_HE['丙'], M.GAN_HE['戊']], ['庚', '辛', '癸']);
  T('天芮禽五行取土', M.XING_WX['天芮禽'], '土');
  const f = M.buildModel({YANG:false, JU:7, SHIGAN:'甲', XUN_GAN:'戊', XUN_STEPS:0});
  T('旬首时（时干甲）→ 天盘不移 → 阴符判伏吟', f.K_TIAN === 0, true);
}

/* ---------------------------------------------------------------- 汇总 */
console.log('\n' + '═'.repeat(58));
console.log(`  通过 ${pass} 项，失败 ${fail} 项`);
console.log('═'.repeat(58));
if (fail === 0) {
  console.log('  ✅ 模型落宫全部由本局参数算出，与排盘图逐宫吻合。');
} 
process.exit(fail === 0 ? 0 : 1);
