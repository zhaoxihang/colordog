## 生成题库

```powershell
$env:PUZZLE_COUNT='5'
$env:PUZZLE_SIZES='4,5,6,7,8,9,10,11,12'
npm run generate:puzzles
```

### 单独补大尺寸

```powershell
$env:PUZZLE_COUNT='1'
$env:PUZZLE_SIZES='13'
$env:PUZZLE_ATTEMPTS='50'
npm run generate:puzzles
```

### 生成速度与「唯一解」

脚本会依次校验：

1. **合法布局**：每行/列/色块各一头牛，且不相邻  
2. **唯一放牛方案**（默认开启）：在仅看颜色的前提下，满足规则的放法只有 1 种  
3. **提示链可解**：玩家按游戏内提示规则能推到通关（与运行时一致）

若大尺寸太慢，可临时跳过第 2 步（更快，但可能出现多解棋盘）：

```powershell
$env:PUZZLE_SKIP_UNIQUE='1'
npm run generate:puzzles
```

其它可调环境变量：

| 变量 | 含义 | 默认 |
|------|------|------|
| `PUZZLE_COUNT` | 每个边长生成几题 | `5` |
| `PUZZLE_SIZES` | 边长列表，逗号分隔 | `4..15` |
| `PUZZLE_ATTEMPTS` | 单题最多重试次数 | `30` |
| `PUZZLE_SKIP_UNIQUE` | `1` 跳过唯一解预检 | 关闭 |

**为何以前很慢**：`createGameState` 内部已对每盘棋跑一遍提示链，脚本又再跑一遍，相当于每题最多校验 **180×2** 次。现在生成器只做一次提示链校验。

**若一直 `non-unique retry`**：蛇形着色在 n≥4 时放牛方案恒为 2 种以上。脚本已改为 **`grow` 区域生长着色** 并在布局阶段筛唯一解；仍失败时可加大 `PUZZLE_ATTEMPTS` 或临时 `PUZZLE_SKIP_UNIQUE=1`。
