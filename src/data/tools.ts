import type { Tool, ToolType } from '@/types'

export const tools: Tool[] = [
  {
    id: 'tool-magnifier-basic',
    name: '基础放大镜',
    description: '一枚普通的放大镜，能够帮助你观察细节。对文档和物体类证据有加成。',
    icon: '🔍',
    type: 'magnifier',
    uses: 20,
    maxUses: 20,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 15,
    effectiveEvidenceTypes: ['document', 'object'],
    tier: 1,
    repairable: true,
    repairCost: 10
  },
  {
    id: 'tool-magnifier-pro',
    name: '专业放大镜',
    description: '高倍率专业放大镜，能够发现极其微小的线索。',
    icon: '🔬',
    type: 'magnifier',
    uses: 30,
    maxUses: 30,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 30,
    effectiveEvidenceTypes: ['document', 'object', 'trace'],
    tier: 2,
    repairable: true,
    repairCost: 25
  },
  {
    id: 'tool-fingerprint-kit',
    name: '指纹采集套件',
    description: '专业的指纹刷和粉末，用于提取和识别指纹痕迹。',
    icon: '👆',
    type: 'fingerprint',
    uses: 15,
    maxUses: 15,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 25,
    effectiveEvidenceTypes: ['object', 'trace'],
    tier: 1,
    repairable: true,
    repairCost: 15
  },
  {
    id: 'tool-uv-light',
    name: '紫外线灯',
    description: '特殊的紫外线灯，能够显现肉眼无法看到的痕迹和荧光物质。',
    icon: '💡',
    type: 'uv_light',
    uses: 25,
    maxUses: 25,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 20,
    effectiveEvidenceTypes: ['trace', 'object'],
    tier: 1,
    repairable: true,
    repairCost: 20
  },
  {
    id: 'tool-uv-light-advanced',
    name: '高级紫外线探测仪',
    description: '多波段紫外线探测仪，可以发现更深层的隐藏痕迹。',
    icon: '✨',
    type: 'uv_light',
    uses: 20,
    maxUses: 20,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 35,
    effectiveEvidenceTypes: ['trace', 'object', 'document'],
    tier: 2,
    repairable: true,
    repairCost: 35
  },
  {
    id: 'tool-recorder',
    name: '便携式录音笔',
    description: '高灵敏度录音设备，能够捕捉微弱的声音和异常频率。',
    icon: '🎙️',
    type: 'recorder',
    uses: 10,
    maxUses: 10,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 20,
    effectiveEvidenceTypes: ['testimony', 'trace'],
    tier: 1,
    repairable: true,
    repairCost: 15
  },
  {
    id: 'tool-chemical-analyzer',
    name: '化学分析仪',
    description: '便携式化学成分分析设备，能够检测未知物质的组成。',
    icon: '⚗️',
    type: 'analyzer',
    uses: 8,
    maxUses: 8,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 30,
    effectiveEvidenceTypes: ['object', 'trace'],
    tier: 2,
    repairable: true,
    repairCost: 40
  },
  {
    id: 'tool-lockpick',
    name: '开锁工具组',
    description: '一套专业的开锁工具，可以打开上锁的容器和房间。',
    icon: '🔓',
    type: 'picklock',
    uses: 12,
    maxUses: 12,
    durability: 100,
    maxDurability: 100,
    hitRateBonus: 25,
    effectiveEvidenceTypes: ['object', 'document'],
    tier: 1,
    repairable: true,
    repairCost: 20
  }
]

export const defaultStartingTools = [
  'tool-magnifier-basic',
  'tool-fingerprint-kit',
  'tool-uv-light'
]

export function getToolById(id: string): Tool | undefined {
  return tools.find(t => t.id === id)
}

export function getToolsByType(type: ToolType): Tool[] {
  return tools.filter(t => t.type === type)
}

export function createToolInstance(toolId: string): Tool | null {
  const template = getToolById(toolId)
  if (!template) return null
  return { ...template }
}

export function getToolEffectiveness(tool: Tool, evidenceType: string): number {
  if (tool.effectiveEvidenceTypes.includes(evidenceType as any)) {
    return tool.hitRateBonus
  }
  return Math.floor(tool.hitRateBonus * 0.3)
}

export function getDurabilityPenalty(durability: number, maxDurability: number): number {
  const ratio = durability / maxDurability
  if (ratio >= 0.8) return 0
  if (ratio >= 0.5) return 5
  if (ratio >= 0.3) return 15
  return 25
}

export function getSanityPenalty(sanity: number, maxSanity: number): number {
  const ratio = sanity / maxSanity
  if (ratio >= 0.8) return 0
  if (ratio >= 0.5) return 5
  if (ratio >= 0.3) return 15
  return 25
}
