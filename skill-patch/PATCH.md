# `qimen-dunjia` 技能补丁

本目录用于把《阴符经》校勘成果**重新应用**到 `qimen-dunjia` 技能上。

---

## 一、为什么需要它：这个技能不是我们写的

`%USERPROFILE%\.agents\.skill-lock.json` 记录：

```json
"qimen-dunjia": {
  "source": "FANzR-arch/Numerologist_skills",
  "sourceType": "github",
  "sourceUrl": "https://github.com/FANzR-arch/Numerologist_skills.git",
  "skillPath": "qimen-dunjia/SKILL.md",
  "skillFolderHash": "16a4b21bef42659dd37b1a6724bf485f05d63a4e",
  "installedAt": "2026-10-11T06:46:08.862Z"
}
```

即：这是从**上游第三方仓库**安装的技能（与 `bazi`、`ziwei-doushu` 同源）。

### ⚠️ 由此产生两个后果

| 后果 | 说明 |
| :-- | :-- |
| **本地改动可能被覆盖** | lock 文件记了 `skillFolderHash`。我们对 `SKILL.md`、`references/yinfujing.md` 的编辑改变了该目录，**上游更新／重装后本地改动很可能被冲掉**。→ 用本目录的 `apply-patch.ps1` 还原 |
| **不可随意公开分发** | 技能内含上游的 `scripts/qimen_cli.py`（30 KB）与 `scripts/tests/test_qimen_cli.py`（32 KB），**目录内无任何 LICENSE 文件**。无许可证的代码默认「保留所有权利」。→ 本目录**只放我们自己的著作物**，不复制上游代码 |

---

## 二、本目录内容

| 文件 | 性质 | 说明 |
| :-- | :-- | :-- |
| `yinfujing-versions.md` | ✅ **完全我们自己的著作物** | 30 余种注本的异文汇编。内容为逐字抓取的**公有领域古籍原文**与我们的整理，不含上游技能的任何文字 |
| `apply-patch.ps1` | ✅ 我们写的脚本 | 把改动重新应用到技能目录 |
| `PATCH.md` | ✅ 本文件 | — |

> **本目录不含**上游的 `SKILL.md`、`yinfujing.md` 全文，也不含 `scripts/`。
> 脚本以**锚点替换**方式改上游文件，属正常补丁做法。

---

## 三、怎么用

```powershell
# 默认作用于 %USERPROFILE%\.agents\skills\qimen-dunjia
powershell -NoProfile -File apply-patch.ps1

# 指定其他技能目录
powershell -NoProfile -File apply-patch.ps1 -SkillDir "D:\path\to\qimen-dunjia"
```

**幂等**：已打过补丁则跳过，不会重复插入。

> ⚠️ **`apply-patch.ps1` 必须保存为 UTF-8 带 BOM**。
> PowerShell 5.1 会把**无 BOM** 的 `.ps1` 当 ANSI（本机为 GBK）读，中文全部乱码 → 语法报错。
> 若用编辑器重存过该脚本，务必确认 BOM 仍在。

---

## 四、补丁做了什么（4 处改动）

| # | 目标文件 | 改动 |
| :-- | :-- | :-- |
| 1 | `references/yinfujing-versions.md` | **新增**（30 余种注本异文汇编，21 KB） |
| 2 | `references/yinfujing.md` §二 | 「分章」至「## 三、原文」整段重建：补**章名文献源头**（李筌疏序）、**「富国安人／安民」避讳断代旁证**、「**校验状态：已完成**」、20 余种注本清单、**未抓取 ctext.org** 声明，并新增**「版本差异（引用前须知）」** 六行表 + 指向附录的 📎 |
| 3 | `references/yinfujing.md` §五 | 第 6 条（标注来源）改写为核定后说法；**新增第 7 条：「八卦甲子，神机鬼藏」的引用警示**（张果本补全 + 陆西星「兵家窃取、不根」之讥） |
| 4 | `SKILL.md` | 参考文件列表新增附录条目；「以《阴符经》印证」小节新增**「追问版本时」**分支（要求读附录、不得凭印象作答、避开附录 §九 四句误说） |

---

## 五、验证：往返测试

`apply-patch.ps1` 已通过**往返测试**（测试脚本一次性，未入库）：

```
① 复制技能目录到临时区
② 手工把两份被改文件还原为「上游原样」，并删掉附录
③ 运行 apply-patch.ps1 打补丁
④ 与线上已打补丁的文件逐行比对
   ✅ SKILL.md                      (382 行)
   ✅ references/yinfujing.md        (78 行)
   ✅ references/yinfujing-versions.md (324 行)
⑤ 再跑一次，验证幂等
   ✅ 未重复插入
════ 全部通过 ════
```

测试中发现并修掉的两处真实缺陷：

| 缺陷 | 现象 | 修法 |
| :-- | :-- | :-- |
| `Replace-Tail` 用了 `$lines[$i1..($n-1)]` | PowerShell 在 `a > b` 时是**降序**切片（`78..77` → 78,77；`0..-1` → 0,-1），会把原末条**又捞回来** | 新增 `Slice()`，越界收敛、`to < from` 返回空 |
| 块尾少一个空行 | 整段替换吃掉了「`## 三、原文`」前的空行，逐行比对差 1 行 | block2 末尾补空行 |

> 另有一处是**测试脚本自己的期望值写错**（SKILL.md 本就有 2 行含附录名，非 1 行）。

---

## 六、许可与上游建议

| 做法 | 评价 |
| :-- | :-- |
| **本目录只放自己的著作物**（现方案） | ✅ 安全。不重分发上游代码，只以锚点补丁方式改本地文件 |
| 把整个 `qimen-dunjia/` 目录纳入公开仓库 | ❌ **不建议**。会把上游无许可证的 `scripts/` 一并公开分发 |
| 把整个 `~/.agents/skills/` 纳入版本管理 | ❌ **更不建议**。该目录下还有 9 个别人的技能（含 `hithink-finance`、多个量化因子技能），来源各异 |
| **Fork 上游 `FANzR-arch/Numerologist_skills`，在其上提交** | ✅ **推荐的正解**。改动留在自己可控的仓库里，上游更新时可 merge，也不会丢 |

### 若要 fork（后续可做）

```bash
# 1) 在 GitHub fork FANzR-arch/Numerologist_skills
# 2) 克隆自己的 fork
git clone https://github.com/<你的账号>/Numerologist_skills.git
# 3) 把本目录的 yinfujing-versions.md 放入 qimen-dunjia/references/
# 4) 按 PATCH.md §四 的 4 处改动改 SKILL.md 与 yinfujing.md
# 5) commit + push（可选：向上游提 PR）
```

---

## 七、备份

改动前的状态与当前状态均已留存于工作区 `_skill-backup\`（**未纳入仓库**）：

```
_skill-backup/
├─ qimen-dunjia-20261013.zip     完整技能目录快照（49.1 KB）
└─ edited/                       我们改过的三个文件
   ├─ SKILL.md
   ├─ yinfujing.md
   └─ yinfujing-versions.md
```
