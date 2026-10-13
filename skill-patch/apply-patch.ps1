# 重新把《阴符经》校勘补丁应用到 qimen-dunjia 技能
#
# 适用场景：`qimen-dunjia` 是从上游 FANzR-arch/Numerologist_skills 安装的第三方技能
#          （见 %USERPROFILE%\.agents\.skill-lock.json）。上游更新／重装后本地改动会被覆盖，
#          跑一次本脚本即可还原。
#
# 用法（本机为 Windows PowerShell 5.1，无 pwsh 7；两者皆可）：
#   powershell -NoProfile -File apply-patch.ps1
#   powershell -NoProfile -File apply-patch.ps1 -SkillDir "D:\path\to\qimen-dunjia"
#
# ⚠️ 本文件必须保存为「UTF-8 带 BOM」。PowerShell 5.1 会把无 BOM 的 .ps1 当 ANSI 读，中文会乱码报错。
#
# 幂等：重复运行不会产生重复内容。

param(
    [string]$SkillDir = "$env:USERPROFILE\.agents\skills\qimen-dunjia"
)

$ErrorActionPreference = 'Stop'
$here = Split-Path -Parent $MyInvocation.MyCommand.Path

if (-not (Test-Path -LiteralPath $SkillDir)) { throw "找不到技能目录：$SkillDir" }
$yfPath = Join-Path $SkillDir 'references\yinfujing.md'
$skPath = Join-Path $SkillDir 'SKILL.md'
foreach ($p in @($yfPath, $skPath)) {
    if (-not (Test-Path -LiteralPath $p)) { throw "找不到目标文件：$p" }
}

function Read-Lines([string]$p) { return ,@(Get-Content -LiteralPath $p -Encoding UTF8) }
function Write-Lines([string]$p, $lines) {
    [System.IO.File]::WriteAllLines($p, [string[]]$lines, (New-Object System.Text.UTF8Encoding($false)))
}
function Find-Index($lines, [string]$prefix) {
    for ($i = 0; $i -lt $lines.Count; $i++) { if ($lines[$i].StartsWith($prefix)) { return $i } }
    return -1
}
# 闭区间切片 [from,to]，越界自动收敛。
# 注意：不能直接用 $lines[$a..$b]——PowerShell 在 a>b 时是「降序」而非空集（如 0..-1 → 0,-1），会捞回错误的行。
function Slice($lines, [int]$from, [int]$to) {
    if ($to -lt $from) { return @() }
    if ($from -lt 0) { $from = 0 }
    if ($to -ge $lines.Count) { $to = $lines.Count - 1 }
    if ($to -lt $from) { return @() }
    return @($lines[$from..$to])
}
# 用 $newLines 替换 [起于 $startPrefix, 止于 $endPrefix) 这一段
function Replace-Range([string]$p, [string]$startPrefix, [string]$endPrefix, [string[]]$newLines) {
    $lines = Read-Lines $p
    $i0 = Find-Index $lines $startPrefix
    $i1 = Find-Index $lines $endPrefix
    if ($i0 -lt 0) { throw "锚点未命中（起）：$startPrefix" }
    if ($i1 -lt 0 -or $i1 -le $i0) { throw "锚点未命中（止）：$endPrefix" }
    Write-Lines $p ((Slice $lines 0 ($i0-1)) + $newLines + (Slice $lines $i1 ($lines.Count-1)))
}
# 用 $newLines 替换 [起于 $startPrefix, 止于下一个 $nextPrefix 或文件末)
function Replace-Tail([string]$p, [string]$startPrefix, [string]$nextPrefix, [string[]]$newLines) {
    $lines = Read-Lines $p
    $i0 = Find-Index $lines $startPrefix
    if ($i0 -lt 0) { throw "锚点未命中（起）：$startPrefix" }
    $i1 = $lines.Count
    if ($nextPrefix) {
        for ($i = $i0 + 1; $i -lt $lines.Count; $i++) { if ($lines[$i].StartsWith($nextPrefix)) { $i1 = $i; break } }
    }
    Write-Lines $p ((Slice $lines 0 ($i0-1)) + $newLines + (Slice $lines $i1 ($lines.Count-1)))
}
function Insert-After([string]$p, [string]$needle, [string[]]$newLines) {
    $lines = Read-Lines $p
    $out = New-Object System.Collections.Generic.List[string]
    $hit = $false
    foreach ($l in $lines) {
        $out.Add($l)
        if (-not $hit -and $l.Contains($needle)) { $newLines | ForEach-Object { $out.Add($_) }; $hit = $true }
    }
    if (-not $hit) { throw "锚点未命中（包含）：$needle" }
    Write-Lines $p $out
}

Write-Host "目标技能目录：$SkillDir`n"

# ================================================================ 1) 新增参考文件
Copy-Item -LiteralPath (Join-Path $here 'yinfujing-versions.md') `
          -Destination (Join-Path $SkillDir 'references\yinfujing-versions.md') -Force
Write-Host '[1/4] OK   references/yinfujing-versions.md'

# ================================================================ 2) yinfujing.md
if (((Read-Lines $yfPath) -join "`n").Contains('yinfujing-versions.md')) {
    Write-Host '[2/4] SKIP yinfujing.md 已打过补丁'
} else {
    # --- 2a §二：自「分章」起至「## 三、原文」前，整段重建 ---
    $block2 = @'
- 分章：上篇 / 中篇 / 下篇。李筌分章法，对应「神仙抱一之道（演道）／富国安人之法（演法）／强兵战胜之术（演术）」。
  - **章名的文献源头**：李筌《阴符经疏》序——「《黃帝陰符》三百言，百言演道，百言演法，百言演術……上有神仙抱一之道，中有富國安人之法，下有強兵戰勝之術。」（https://zh.wikisource.org/wiki/黃帝陰符經疏）
  - 唐系本作「富國安**人**」，宋以后多作「富國安**民**」（避唐太宗讳的回改），可作断代旁证。
- 校勘提示（来源页原注）：上篇「移星易宿」「地发杀机」八字，底本无；据唐初褚遂良奉手写《阴符经》影印帖本、道藏本《黄帝阴符经注解》增补。
- **校验状态：已完成（逐字核对通过）**。已取古文岛原页三章与本地录入本**逐字比对，完全一致，无一字出入**；原先「单一来源录入、待第二来源校对」的待办**已结**。
  - 另已取 **20 余种注本**（唐·张果、集注七家、李筌疏、宋·朱熹〈邹訢〉、侯善渊、唐淳、沈亚夫、任照一、胥元一、蹇昌辰、夏元鼎、袁淑真、赤松子等、三皇玉诀、元明·王道渊、明·陆西星、清·刘一明、闵一得、黄元炳、唐琳本、释氏《发隐》、张宇初《辨陰符經》等）的经文异文与注文，用于版本比对。
  - 全程**未抓取 `ctext.org`**——该站明确声明禁止抓取，并称会对抓取者故意返回污染数据，服从其条款。

### 版本差异（**引用前须知**）

本文件所录为**通行本**。此经异文极多，**所述经文并非唯一写法**：

| 争点 | 各本分布 |
|----|----------|
| 「天发杀机，**移星易宿**；**地发杀机**，龙蛇起陆」 | **唐系多数无此八字**（张果本、集注本、七注、李筌疏、云笈七签本、刘处玄等）；**宋以后一系有**（朱熹邹訢本、刘一明、闵一得、发隐、三皇玉诀）。朱熹按语明言「唐褚遂良得太極真人所注本……諸本逸移星易宿、地發殺機八字，**當以褚氏本為正**」；通行本亦自注系增补 |
| 「天人合**发**」／「合**德**」 | **合发**为多数本；**合德仅见于《云笈七签》卷十五一系** |
| 「万**变**定基」／「万**化**定基」 | **万变**为多数本；**万化**见于朱熹（邹訢）、刘一明、闵一得、三皇玉诀——**是真实异文，不是错字**；另有「万变定**机**」（沈亚夫、蹇昌辰、袁淑真） |
| 「五贼」所指 | **五行之炁**：李筌《疏》「五賊者，五行之炁也」、朱熹、沈亚夫等；**命·物·时·功·神**：太公、张果、吕望、子房、《云笈七签》传曰 |
| 「愚人以天地文理圣」一句 | **至少六种字面**，明·唐琳本自注「**未知孰是。今從諸本。**」 |
| 分章章名 | **至少六种形制**（三章带章名／仅上中下／完全不分章／分演道演法演术篇／胥元一另起章名／三皇玉诀分天皇地皇人皇） |

> 引用时**不必逐一交代版本**；但若用户追问、或需据经文作断语，须知道**本文件所录只是其中一种写法**。

> 📎 **版本考据附录**：`references/yinfujing-versions.md`
> 载有 **30 余种注本**的逐字异文、注家原说、注疏史争议与未取得清单。
> **凡用户追问出处、版本、异文、注疏家、成书年代，一律读该文件作答，不得凭印象或记忆回答。**

'@ -split "`r?`n"
    Replace-Range $yfPath '- 分章：上篇' '## 三、原文' $block2

    # --- 2b §五：自第 6 条起（原本为末条）整段重建 ---
    $block5 = @'
6. **标注来源**：如用户追问出处，如实说明「古诗文网·古籍（古文岛）子部道家类」，并说明**该录入本已与原页逐字核对通过**；若涉及版本或断代问题，按 §二「版本差异」如实交代异文，不得把通行本一种写法说成唯一原文。
7. **「八卦甲子，神机鬼藏」的引用警示（重要）**：这一句最常被用来给奇门等术数立义理依据，但须知两事——
   - **（一）其传本稳定性有限**：该句所属段落（「人以愚虞圣」以下「二十一句百一十六字」）在部分传本中被删，靠**张果本**才得补全。元明·王道渊《黄帝阴符经夹颂解注》明言：「近有注本多於此止，余按褚遂良得太极丹真人所注本及与张果老人注本，其下皆有二十一句百一十六字……**诸本逸去，皆后人传注之误尔**。」
   - **（二）古人早有「兵家窃取」之讥**：明·陆西星《黄帝阴符经测疏》后序（隆庆元年，1567）直言——「**而兵家者流又竊其『八卦甲子，神機鬼藏』之說以為兵機，不根甚矣。**」
   - 故：**不得用此句为任何奇门判断作背书、作权威来源或作断语依据**。它只可作心法层的义理参照；且引用时若被追问，应承认**这一层关联在文献上是有争议的**。
'@ -split "`r?`n"
    Replace-Tail $yfPath '6. **标注来源**' '7. ' $block5

    Write-Host '[2/4] OK   references/yinfujing.md（§二 + §五）'
}

# ================================================================ 3) SKILL.md
if (((Read-Lines $skPath) -join "`n").Contains('yinfujing-versions.md')) {
    Write-Host '[3/4] SKIP SKILL.md 已打过补丁'
} else {
    Insert-After $skPath '`references/yinfujing.md`：《阴符经》' @(
        '- `references/yinfujing-versions.md`：《阴符经》版本、异文与注疏汇编（**校勘附录**，30 余种注本；仅在用户追问版本／异文／注疏／成书时读取）'
    )
    Insert-After $skPath '用法：按需读取 `references/yinfujing.md`' @(
        '- **追问版本时**：若用户追问该经的出处、版本、异文、注疏家、成书年代，或质疑某句是否可靠，按需读取 `references/yinfujing-versions.md`——**该文件载有 30 余种注本的逐字异文与注家原说；不得凭印象或记忆作答**。该文件 §九 列有四句「流行但不成立」的说法，务必避开。'
    )
    Write-Host '[3/4] OK   SKILL.md（2 处）'
}

# ================================================================ 4) 自检
$ok = $true
foreach ($p in @($yfPath, $skPath)) {
    if (-not (((Read-Lines $p) -join "`n").Contains('yinfujing-versions.md'))) { Write-Host "FAIL 自检未通过：$p"; $ok = $false }
}
if (-not (Test-Path -LiteralPath (Join-Path $SkillDir 'references\yinfujing-versions.md'))) { Write-Host 'FAIL 附录文件缺失'; $ok = $false }
$yfTxt = (Read-Lines $yfPath) -join "`n"
foreach ($need in @('校验状态：已完成', '版本差异（**引用前须知**）', '八卦甲子，神机鬼藏」的引用警示', '未知孰是。今從諸本。')) {
    if (-not $yfTxt.Contains($need)) { Write-Host "FAIL 缺少内容：$need"; $ok = $false }
}
if ($ok) { Write-Host '[4/4] OK   自检通过——补丁已就位' } else { exit 1 }
