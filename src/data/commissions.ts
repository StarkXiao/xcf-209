import { reactive } from 'vue'
import type { Commission } from '@/types'

export const commissions = reactive<Commission[]>([
  {
    id: 'commission-001',
    title: '海岸失踪渔民调查',
    client: '渔港管理局',
    clientAvatar: '⚓',
    description: '黑石岛三名渔民在出海后失踪，渔船被发现空无一人地漂浮在海面，船上有奇怪的黏液痕迹。',
    fullDetails: '三名经验丰富的渔民于三日前黎明出海，当日下午渔船被发现漂浮在距海岸五海里处。船上空无一人，但所有设备完好，渔网还未收起。船舱内壁发现大量黑色黏液，接触者报告有恶心和头晕症状。渔民家属声称他们前几日都提到过"海里有东西在叫"。',
    category: 'missing_person',
    difficulty: 'easy',
    riskLevel: 'medium',
    status: 'available',
    sanityCost: 10,
    recommendedSanity: 70,
    timeLimitMinutes: 45,
    rewards: {
      sanityBonus: 8,
      materials: [
        { materialId: 'mat-organic-residue', quantity: 3 },
        { materialId: 'mat-mysterious-liquid', quantity: 2 }
      ],
      reputation: 50,
      specialUnlocks: []
    },
    failurePenalty: {
      sanityLoss: 15,
      reputationLoss: 20,
      description: '失踪渔民无法找回，渔港将对你失去信任'
    },
    riskWarnings: [
      '可能接触深海未知生物残留',
      '精神污染风险：中等',
      '建议携带紫外线灯和录音设备'
    ],
    prerequisites: {},
    relatedCaseId: 'case-001',
    tags: ['失踪', '海洋', '新手友好'],
    isRecommended: true,
    recommendationReason: '与你已完成的灯塔案件相关，且难度适合当前等级'
  },
  {
    id: 'commission-002',
    title: '图书馆异常声响排查',
    client: '市立图书馆',
    clientAvatar: '📚',
    description: '图书馆地下藏书室外的走廊夜间传出奇怪的翻书声和低语声，但监控未发现任何人影。',
    fullDetails: '过去两周，多名夜班图书管理员报告在地下一层走廊听到翻书声和低语声。声音来源似乎是已封闭的旧藏书室方向。监控录像在相应时间段显示画面轻微抖动，但未捕捉到任何生物形态。一名管理员声称听到有人在叫她的名字，次日出现发烧和幻听症状。',
    category: 'paranormal',
    difficulty: 'normal',
    riskLevel: 'high',
    status: 'available',
    sanityCost: 20,
    recommendedSanity: 75,
    timeLimitMinutes: 60,
    rewards: {
      sanityBonus: 15,
      materials: [
        { materialId: 'mat-torn-page', quantity: 5 },
        { materialId: 'mat-cipher-text', quantity: 2 },
        { materialId: 'mat-ancient-rune', quantity: 1 }
      ],
      tools: ['tool-chemical-analyzer'],
      reputation: 100,
      specialUnlocks: ['bestiary-entry-forbidden-knowledge']
    },
    failurePenalty: {
      sanityLoss: 25,
      reputationLoss: 40,
      description: '异常活动将加剧，可能导致更多人受到精神侵蚀'
    },
    riskWarnings: [
      '禁忌知识精神侵蚀风险：高',
      '可能触发幻听和幻觉',
      '需要携带录音设备和护符'
    ],
    prerequisites: {
      completedCases: ['case-001'],
      requiredTools: ['tool-recorder', 'tool-uv-light']
    },
    relatedCaseId: 'case-002',
    tags: ['超自然', '知识侵蚀', '录音'],
    isRecommended: true,
    recommendationReason: '你已解锁必要工具，图书馆案件与你正在调查的线索相连'
  },
  {
    id: 'commission-003',
    title: '私人藏品鉴定请求',
    client: '匿名收藏家',
    clientAvatar: '🎭',
    description: '收藏家获得一件疑似超自然物品，需要专业鉴定和安全处理建议。',
    fullDetails: '委托人通过神秘渠道获得一件青铜时代的护符，声称佩戴后噩梦频发，梦境中反复出现螺旋图案和深海景象。护符表面刻有触手缠绕的未知符号。委托人拒绝透露物品来源，但表示愿意支付高额报酬，前提是对其身份绝对保密。',
    category: 'artifact',
    difficulty: 'normal',
    riskLevel: 'high',
    status: 'available',
    sanityCost: 18,
    recommendedSanity: 80,
    timeLimitMinutes: 30,
    rewards: {
      sanityBonus: 12,
      materials: [
        { materialId: 'mat-ancient-rune', quantity: 3 },
        { materialId: 'metallic-fragment', quantity: 5 },
        { materialId: 'mat-elder-sign', quantity: 1 }
      ],
      reputation: 120,
      specialUnlocks: []
    },
    failurePenalty: {
      sanityLoss: 30,
      reputationLoss: 50,
      description: '护符可能被激活，释放未知力量'
    },
    riskWarnings: [
      '直接接触可能触发深层噩梦',
      '长期精神污染风险',
      '建议在隔离环境中进行鉴定'
    ],
    prerequisites: {
      minReputation: 80,
      requiredTools: ['tool-chemical-analyzer', 'tool-uv-light']
    },
    tags: ['物品鉴定', '高报酬', '保密'],
    isRecommended: false
  },
  {
    id: 'commission-004',
    title: '邪教活动踪迹追踪',
    client: '神秘学研究会',
    clientAvatar: '🔮',
    description: '有情报显示一个崇拜深海存在的秘密教团正在本市活动，需要搜集其活动证据。',
    fullDetails: '研究会线人报告，一个自称"深渊使徒"的组织近期在城郊废弃教堂举行秘密集会。参与者身穿黑色长袍，吟唱未知语言的祷词。据信他们正在筹备某种召唤仪式。需要潜入调查，搜集教义手册和仪式用品作为证据。',
    category: 'organization',
    difficulty: 'hard',
    riskLevel: 'extreme',
    status: 'available',
    sanityCost: 35,
    recommendedSanity: 85,
    timeLimitMinutes: 90,
    rewards: {
      sanityBonus: 25,
      materials: [
        { materialId: 'mat-cipher-text', quantity: 5 },
        { materialId: 'mat-ancient-rune', quantity: 4 },
        { materialId: 'mat-abyssal-essence', quantity: 2 },
        { materialId: 'mat-elder-sign', quantity: 2 }
      ],
      tools: ['tool-uv-light-advanced'],
      reputation: 250,
      specialUnlocks: ['bestiary-entry-cult', 'hidden-case-001']
    },
    failurePenalty: {
      sanityLoss: 50,
      reputationLoss: 80,
      description: '身份暴露将遭到教团追杀，且仪式可能如期举行'
    },
    riskWarnings: [
      '极端精神污染风险',
      '人身安全威胁：高',
      '仪式现场可能有超自然存在显现',
      '禁止单独行动，建议携带防护装备'
    ],
    prerequisites: {
      completedCases: ['case-001', 'case-002'],
      minReputation: 200,
      unlockedBestiaryEntries: ['creature-deep-one']
    },
    tags: ['潜入', '邪教', '召唤仪式'],
    isRecommended: false
  },
  {
    id: 'commission-005',
    title: '画家遗物回收',
    client: '艺术家遗产管理处',
    clientAvatar: '🎨',
    description: '已故画家工作室中遗留数幅未公开画作，据称接触者均出现异常反应，需安全回收。',
    fullDetails: '画家自杀前完成的最后三幅作品一直存放在其工作室中。管理处工作人员在试图清点遗物时，多人报告看到画中景象在动，并出现持续性偏头痛。工作室夜间传出颜料搅拌的声音，但无人在场。需要对画作进行鉴定、记录和安全封存。',
    category: 'artifact',
    difficulty: 'hard',
    riskLevel: 'high',
    status: 'available',
    sanityCost: 28,
    recommendedSanity: 75,
    timeLimitMinutes: 75,
    rewards: {
      sanityBonus: 20,
      materials: [
        { materialId: 'mat-crystal-shard', quantity: 4 },
        { materialId: 'mat-mysterious-liquid', quantity: 3 },
        { materialId: 'mat-mind-focus', quantity: 2 }
      ],
      reputation: 180,
      specialUnlocks: []
    },
    failurePenalty: {
      sanityLoss: 40,
      reputationLoss: 60,
      description: '画作可能"苏醒"，造成更广泛的精神污染'
    },
    riskWarnings: [
      '视觉型精神侵蚀：强',
      '可能触发共同梦境',
      '建议佩戴紫外线护目镜'
    ],
    prerequisites: {
      completedCases: ['case-002'],
      requiredTools: ['tool-magnifier-pro', 'tool-uv-light']
    },
    relatedCaseId: 'case-003',
    tags: ['艺术品', '视觉污染', '封存'],
    isRecommended: true,
    recommendationReason: '与梦魇画作案件有直接关联，可获得关键线索'
  },
  {
    id: 'commission-006',
    title: '失踪宠物追踪（简单）',
    client: '焦急的市民',
    clientAvatar: '🐱',
    description: '多只宠物在同一街区离奇失踪，现场只留下奇怪的爪印和几根银色毛发。',
    fullDetails: '过去一周，橡树街区有七只家猫和三只小型犬失踪。所有失踪现场都在夜间，附近居民听到类似婴儿啼哭的怪声。地上发现三趾爪印，尺寸约15厘米，不属于任何已知本地物种。爪印附近有银色反光毛发，在紫外线照射下发出荧光。',
    category: 'creature',
    difficulty: 'trivial',
    riskLevel: 'low',
    status: 'available',
    sanityCost: 5,
    recommendedSanity: 60,
    timeLimitMinutes: 30,
    rewards: {
      sanityBonus: 3,
      materials: [
        { materialId: 'mat-organic-residue', quantity: 2 }
      ],
      reputation: 25,
      specialUnlocks: []
    },
    failurePenalty: {
      sanityLoss: 8,
      reputationLoss: 10,
      description: '失踪宠物无法找回，市民将陷入恐慌'
    },
    riskWarnings: [
      '可能遭遇未知生物，攻击性未知',
      '夜间调查建议'
    ],
    prerequisites: {},
    tags: ['生物', '新手', '宠物'],
    isRecommended: true,
    recommendationReason: '适合新手调查员，风险极低'
  },
  {
    id: 'commission-007',
    title: '古宅地基勘察',
    client: '建筑事务所',
    clientAvatar: '🏚️',
    description: '即将拆除的维多利亚式古宅地下发现异常空间，施工人员出现集体幻觉。',
    fullDetails: '待拆除的范德老宅在地基施工时发现了一个不在图纸上的地下室入口。三名工人进入探索后出现不同程度的精神症状：记忆混乱、重复书写螺旋图案、声称"墙里有东西在看"。地下室入口被暂时封闭，但夜间仍有低沉敲击声传出。',
    category: 'paranormal',
    difficulty: 'nightmare',
    riskLevel: 'extreme',
    status: 'available',
    sanityCost: 50,
    recommendedSanity: 95,
    timeLimitMinutes: 120,
    rewards: {
      sanityBonus: 40,
      materials: [
        { materialId: 'mat-ancient-rune', quantity: 8 },
        { materialId: 'mat-abyssal-essence', quantity: 5 },
        { materialId: 'mat-elder-sign', quantity: 3 },
        { materialId: 'mat-crystal-shard', quantity: 6 }
      ],
      tools: ['tool-magnifier-pro', 'tool-lockpick'],
      reputation: 500,
      specialUnlocks: ['bestiary-entry-ancient-god', 'hidden-case-final']
    },
    failurePenalty: {
      sanityLoss: 80,
      reputationLoss: 150,
      description: '地下室中的存在可能被完全释放，后果不堪设想'
    },
    riskWarnings: [
      '⚠️ 致命精神污染风险',
      '⚠️ 可能遭遇高阶超自然实体',
      '⚠️ 建议调查员理智值100以上',
      '必须携带全套高级工具和防护护符',
      '不建议新手参与'
    ],
    prerequisites: {
      completedCases: ['case-001', 'case-002', 'case-003'],
      minReputation: 500,
      requiredTools: ['tool-uv-light-advanced', 'tool-chemical-analyzer', 'tool-recorder', 'tool-lockpick'],
      unlockedBestiaryEntries: ['creature-deep-one', 'forbidden-item-neconomicon']
    },
    tags: ['古宅', '高风险', '终极挑战'],
    isRecommended: false
  },
  {
    id: 'commission-008',
    title: '废弃仓库异常清理',
    client: '港区物流',
    clientAvatar: '📦',
    description: '码头区一废弃仓库传出恶臭和怪声，夜间有不明生物活动迹象。',
    fullDetails: '13号仓库已废弃多年，近期附近居民报告闻到强烈的腐臭气味，并在深夜听到类似拖拽重物的声音。仓库窗户偶尔闪烁绿光。一名流浪汉声称看到"湿漉漉的人影"在仓库附近徘徊。仓库门上的锁已从内部被破坏。',
    category: 'creature',
    difficulty: 'normal',
    riskLevel: 'medium',
    status: 'available',
    sanityCost: 15,
    recommendedSanity: 65,
    timeLimitMinutes: 40,
    rewards: {
      sanityBonus: 10,
      materials: [
        { materialId: 'mat-organic-residue', quantity: 5 },
        { materialId: 'mat-mysterious-liquid', quantity: 3 },
        { materialId: 'mat-reagent-powder', quantity: 2 }
      ],
      reputation: 80,
      specialUnlocks: []
    },
    failurePenalty: {
      sanityLoss: 20,
      reputationLoss: 30,
      description: '生物可能扩散至居民区'
    },
    riskWarnings: [
      '可能遭遇变异生物',
      '环境含有毒物质',
      '建议携带防护手套和化学分析仪'
    ],
    prerequisites: {
      requiredTools: ['tool-fingerprint-kit', 'tool-chemical-analyzer']
    },
    tags: ['生物', '废弃地点', '夜间'],
    isRecommended: false
  }
])

export function getCommissionById(id: string): Commission | undefined {
  return commissions.find(c => c.id === id)
}

export function getCommissionsByStatus(status: Commission['status']): Commission[] {
  return commissions.filter(c => c.status === status)
}

export function getCommissionsByCategory(category: Commission['category']): Commission[] {
  return commissions.filter(c => c.category === category)
}

export function getCommissionsByDifficulty(difficulty: Commission['difficulty']): Commission[] {
  return commissions.filter(c => c.difficulty === difficulty)
}

export function getRecommendedCommissions(sanity: number, reputation: number, _completedCases: string[]): Commission[] {
  return commissions.filter(c => {
    if (c.status !== 'available') return false
    if (sanity < c.recommendedSanity * 0.7) return false
    if (c.prerequisites?.minReputation && reputation < c.prerequisites.minReputation) return false
    return true
  }).sort((a, b) => {
    if (a.isRecommended && !b.isRecommended) return -1
    if (!a.isRecommended && b.isRecommended) return 1
    const aDiff = Math.abs(a.recommendedSanity - sanity)
    const bDiff = Math.abs(b.recommendedSanity - sanity)
    return aDiff - bDiff
  }).slice(0, 4)
}

export function setCommissionStatus(id: string, status: Commission['status']) {
  const commission = getCommissionById(id)
  if (commission) {
    commission.status = status
    if (status === 'in_progress') {
      commission.acceptedAt = Date.now()
      commission.deadline = Date.now() + commission.timeLimitMinutes * 60 * 1000
    } else if (status === 'completed' || status === 'failed') {
      commission.completedAt = Date.now()
    }
  }
}
