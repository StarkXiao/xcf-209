import type { 
  CorruptionMilestone, 
  EndingDescriptor, 
  SaveRiskAssessment, 
  SaveRiskLevel,
  SpiritualPollutionState,
  EndingDeterminationContext,
  EndingConsequenceSummary,
  EndingCategory
} from '@/types'

export const CORRUPTION_MILESTONES: CorruptionMilestone[] = [
  {
    id: 'milestone-unsettling',
    name: '心神不宁',
    description: '你开始注意到一些不对劲的地方，但还能保持理智。',
    erosionThreshold: 15,
    effects: {
      sanityRecoveryPenalty: 10,
      anomalyEventBonus: 10
    },
    triggered: false
  },
  {
    id: 'milestone-night-terrors',
    name: '噩梦缠身',
    description: '夜晚的梦境变得越来越真实，你开始分不清梦境与现实。',
    erosionThreshold: 30,
    effects: {
      maxSanityReduction: 5,
      sanityRecoveryPenalty: 20,
      anomalyEventBonus: 20
    },
    triggered: false
  },
  {
    id: 'milestone-echoes',
    name: '深渊回响',
    description: '你听到了来自虚空的低语，它们在讲述着不该被知道的真相。',
    erosionThreshold: 50,
    effects: {
      maxSanityReduction: 10,
      sanityRecoveryPenalty: 35,
      hitRatePenalty: 10,
      anomalyEventBonus: 30,
      unlockEnding: 'forgetful'
    },
    triggered: false
  },
  {
    id: 'milestone-corruption',
    name: '精神侵蚀',
    description: '你的灵魂已经被印记所触及，凡人的世界开始变得陌生。',
    erosionThreshold: 70,
    effects: {
      maxSanityReduction: 20,
      sanityRecoveryPenalty: 50,
      hitRatePenalty: 20,
      anomalyEventBonus: 50,
      unlockEnding: 'corrupted'
    },
    triggered: false
  },
  {
    id: 'milestone-abyss',
    name: '凝视深渊',
    description: '当你凝视深渊时，深渊也在凝视着你。现在，它微笑了。',
    erosionThreshold: 90,
    effects: {
      maxSanityReduction: 35,
      sanityRecoveryPenalty: 75,
      hitRatePenalty: 35,
      anomalyEventBonus: 75,
      unlockEnding: 'fully_insane'
    },
    triggered: false
  }
]

export const ENDING_DESCRIPTORS: EndingDescriptor[] = [
  {
    id: 'truth_seeker',
    name: '追寻真相者',
    description: '你以钢铁般的意志承受了一切，将真相公之于众。完整的证据链、清醒的头脑、正确的推理——这是教科书般的完美调查。虽然伤痕累累，但你的灵魂依然纯净。',
    pollutionRequirement: {
      maxLongTermErosion: 29,
      maxTotalPollution: 60
    },
    sanityRequirement: { min: 40 },
    evidenceRequirement: {
      minEvidenceRatio: 0.8,
      maxMissingKeyEvidence: 0
    },
    choiceRequirement: {
      requiresCorrectConclusion: true,
      maxWrongDeductionAttempts: 1
    },
    scoreModifier: 15,
    unlocksBranches: ['deep-truth'],
    endingFlavor: {
      tone: 'hopeful',
      truthRevealLevel: 'full'
    }
  },
  {
    id: 'lucky_break',
    name: '侥幸破局',
    description: '关键证据的缺口让你的推理如空中楼阁，但你惊人的直觉在关键时刻发挥了作用。真相大白了，但没人知道你是如何在证据链千疮百孔时做出正确判断的——包括你自己。',
    pollutionRequirement: {
      maxLongTermErosion: 49,
      maxTotalPollution: 80
    },
    sanityRequirement: { min: 40 },
    evidenceRequirement: {
      minEvidenceRatio: 0.4,
      maxEvidenceRatio: 0.79
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: 3,
    endingFlavor: {
      tone: 'neutral',
      truthRevealLevel: 'partial'
    }
  },
  {
    id: 'survivor',
    name: '幸存者',
    description: '你选择了更安全的道路，没有触碰最黑暗的秘密。证据够用，思路没错，你交出了一份合格的答卷。你活下来了，带着少许噩梦。',
    pollutionRequirement: {
      maxLongTermErosion: 49,
      maxTotalPollution: 100
    },
    sanityRequirement: { min: 25, max: 39 },
    evidenceRequirement: {
      minEvidenceRatio: 0.6
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: 5,
    endingFlavor: {
      tone: 'neutral',
      truthRevealLevel: 'partial'
    }
  },
  {
    id: 'intuition_guided',
    name: '直觉指引',
    description: '证据的缺口本该让此案悬而未决，但你在半梦半醒间抓住了那根关键的线。理智正在消散的边缘，你凭借本能做出了正确的抉择——没人相信你是怎么做到的。',
    pollutionRequirement: {
      maxLongTermErosion: 49,
      maxTotalPollution: 100
    },
    sanityRequirement: { min: 25, max: 39 },
    evidenceRequirement: {
      minEvidenceRatio: 0.3,
      maxEvidenceRatio: 0.59
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: 0,
    endingFlavor: {
      tone: 'melancholic',
      truthRevealLevel: 'partial'
    }
  },
  {
    id: 'forgetful',
    name: '选择性遗忘',
    description: '为了保护心智，你的大脑主动封存了最可怕的记忆。案件档案完美闭合，但你不记得自己是怎么得出那个结论的——有些空白，或许是一种恩赐。',
    pollutionRequirement: {
      minLongTermErosion: 30,
      maxLongTermErosion: 69
    },
    sanityRequirement: { min: 10 },
    evidenceRequirement: {
      minEvidenceRatio: 0.5
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: -5,
    endingFlavor: {
      tone: 'melancholic',
      truthRevealLevel: 'obscured'
    }
  },
  {
    id: 'grasping_straws',
    name: '抓住救命稻草',
    description: '理智在崩溃的悬崖边摇摇欲坠，证据如风中残烛般脆弱。但你在最后一刻，如同溺水者抓住最后一根稻草般，得出了正确的答案。你不知道这是幸运还是命运。',
    pollutionRequirement: {
      maxLongTermErosion: 69
    },
    sanityRequirement: { max: 24 },
    evidenceRequirement: {
      minEvidenceRatio: 0.3,
      maxEvidenceRatio: 0.59
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: 5,
    endingFlavor: {
      tone: 'tragic',
      truthRevealLevel: 'partial'
    }
  },
  {
    id: 'martyr',
    name: '殉道者',
    description: '你以理智为代价，换来了至关重要的信息。真相完整地呈现在世人面前，而你将在疗养院的白色房间里度过漫长的岁月。愿后人能够完成你未竟的事业。',
    pollutionRequirement: {
      maxLongTermErosion: 69,
      minTotalPollution: 80
    },
    sanityRequirement: { max: 25 },
    evidenceRequirement: {
      minEvidenceRatio: 0.7
    },
    choiceRequirement: {
      requiresCorrectConclusion: true
    },
    scoreModifier: 10,
    endingFlavor: {
      tone: 'tragic',
      truthRevealLevel: 'full'
    }
  },
  {
    id: 'false_prophet',
    name: '伪先知',
    description: '证据完整得可以载入教科书，而你却从中得出了完全错误的结论。你自信满满地向众人宣告了"真相"，没人怀疑你——除了那个逍遥法外的真凶，他正在暗处鼓掌。',
    pollutionRequirement: {
      maxLongTermErosion: 39,
      maxTotalPollution: 80
    },
    sanityRequirement: { min: 40 },
    evidenceRequirement: {
      minEvidenceRatio: 0.7
    },
    choiceRequirement: {
      requiresWrongConclusion: true
    },
    scoreModifier: -10,
    endingFlavor: {
      tone: 'melancholic',
      truthRevealLevel: 'hidden'
    }
  },
  {
    id: 'hasty_conclusion',
    name: '草率定论',
    description: '证据的缺口大到能驶过一列火车，但你急于结案。你挑选了最省事的那个结论，匆匆合上了卷宗。也许有一天，会有人重新打开它——但那已经不是你的问题了。',
    pollutionRequirement: {
      maxLongTermErosion: 39,
      maxTotalPollution: 80
    },
    sanityRequirement: { min: 40 },
    evidenceRequirement: {
      maxEvidenceRatio: 0.69
    },
    choiceRequirement: {
      requiresWrongConclusion: true,
      maxWrongDeductionAttempts: 1
    },
    scoreModifier: -8,
    endingFlavor: {
      tone: 'neutral',
      truthRevealLevel: 'hidden'
    }
  },
  {
    id: 'compromised',
    name: '妥协收场',
    description: '理智在长期侵蚀下已经不再锐利，你看着面前如山的证据，却选择了一个各方都能接受的妥协方案。真凶得到了部分惩罚，正义被打了折扣——但至少，所有人都松了一口气。',
    pollutionRequirement: {
      minLongTermErosion: 20,
      maxLongTermErosion: 59
    },
    sanityRequirement: { min: 25, max: 59 },
    evidenceRequirement: {
      minEvidenceRatio: 0.6
    },
    choiceRequirement: {
      requiresWrongConclusion: true
    },
    scoreModifier: -12,
    endingFlavor: {
      tone: 'melancholic',
      truthRevealLevel: 'partial'
    }
  },
  {
    id: 'self_deceived',
    name: '自欺欺人',
    description: '证据不足，理智也在动摇，但你说服了自己相信那个破绽百出的推理。你对自己撒了一个弥天大谎，并且深信不疑。镜子里的那个人，你还认识吗？',
    pollutionRequirement: {
      maxLongTermErosion: 59
    },
    sanityRequirement: { min: 20, max: 49 },
    evidenceRequirement: {
      maxEvidenceRatio: 0.59
    },
    choiceRequirement: {
      requiresWrongConclusion: true,
      minWrongDeductionAttempts: 1
    },
    scoreModifier: -15,
    endingFlavor: {
      tone: 'melancholic',
      truthRevealLevel: 'distorted'
    }
  },
  {
    id: 'shattered_mind',
    name: '破碎心智',
    description: '完整的证据链摆在面前，但你的理智已经碎成了一地玻璃。真相从指缝间溜走，你抓住的只是幻影。卷宗上写着你的结论，但那不过是一个疯子的胡言乱语。',
    pollutionRequirement: {
      minLongTermErosion: 30,
      maxLongTermErosion: 89
    },
    sanityRequirement: { max: 39 },
    evidenceRequirement: {
      minEvidenceRatio: 0.7
    },
    choiceRequirement: {
      requiresWrongConclusion: true
    },
    scoreModifier: -20,
    endingFlavor: {
      tone: 'tragic',
      truthRevealLevel: 'distorted'
    }
  },
  {
    id: 'corrupted',
    name: '堕落者',
    description: '你窥见了真相的全貌，它改变了你。现在的你，已不再是从前的那个人了。你写下了一个似是而非的结论——它既不是真相，也不是谎言，只是某种更古老的存在想让世人知道的版本。',
    pollutionRequirement: {
      minLongTermErosion: 50,
      maxLongTermErosion: 89
    },
    sanityRequirement: { max: 40 },
    scoreModifier: -15,
    unlocksBranches: ['corrupted-truth'],
    endingFlavor: {
      tone: 'terrifying',
      truthRevealLevel: 'distorted'
    }
  },
  {
    id: 'abyss_plaything',
    name: '深渊玩物',
    description: '证据荡然无存，理智支离破碎，你的推理不过是深渊借你之口说出的呓语。这是最完美的失败——你甚至不知道自己失败了。卷宗上的字迹潦草难辨，它们在夜里会自己蠕动。',
    pollutionRequirement: {
      minLongTermErosion: 40
    },
    sanityRequirement: { max: 29 },
    evidenceRequirement: {
      maxEvidenceRatio: 0.49
    },
    choiceRequirement: {
      requiresWrongConclusion: true,
      minWrongDeductionAttempts: 2
    },
    scoreModifier: -25,
    unlocksBranches: ['forbidden-truth'],
    endingFlavor: {
      tone: 'terrifying',
      truthRevealLevel: 'none'
    }
  },
  {
    id: 'fully_insane',
    name: '失心者',
    description: '你的心智已彻底崩解，成为深渊的又一个囚徒。但在疯狂之中，你看到了...一切。你的结案报告是用无人能懂的符号写成的，它们在无人注视时会低声歌唱。',
    pollutionRequirement: {
      minLongTermErosion: 70
    },
    sanityRequirement: { max: 20 },
    scoreModifier: -30,
    unlocksBranches: ['forbidden-truth'],
    endingFlavor: {
      tone: 'terrifying',
      truthRevealLevel: 'distorted'
    }
  }
]

export function createInitialPollutionState(): SpiritualPollutionState {
  return {
    shortTermShock: 0,
    longTermErosion: 0,
    maxShortTermShock: 100,
    maxLongTermErosion: 100,
    pollutionEvents: [],
    lastDecayTime: Date.now(),
    lowSanityStreak: 0,
    consecutiveDarkChoices: 0,
    unlockedCorruptionMilestones: []
  }
}

export function getTotalPollution(state: SpiritualPollutionState): number {
  return state.shortTermShock + state.longTermErosion
}

export function getShockTier(shock: number): 'calm' | 'jittery' | 'terrified' | 'panic' | 'catatonic' {
  if (shock < 20) return 'calm'
  if (shock < 45) return 'jittery'
  if (shock < 70) return 'terrified'
  if (shock < 90) return 'panic'
  return 'catatonic'
}

export function getErosionTier(erosion: number): 'pure' | 'touched' | 'marked' | 'stained' | 'lost' {
  if (erosion < 15) return 'pure'
  if (erosion < 30) return 'touched'
  if (erosion < 50) return 'marked'
  if (erosion < 70) return 'stained'
  return 'lost'
}

export function assessSaveRisk(state: SpiritualPollutionState, sanity: number, maxSanity: number): SaveRiskAssessment {
  const totalPollution = getTotalPollution(state)
  const sanityRatio = sanity / maxSanity
  const erosionRatio = state.longTermErosion / state.maxLongTermErosion

  let level: SaveRiskLevel = 'safe'
  let corruptionChance = 0
  let dataLossChance = 0
  let hallucinationChance = 0
  let sanityLossOnLoad = 0
  let pollutionGain = 0
  let warningMessage = '存档稳定，可以安全保存。'

  const riskScore = erosionRatio * 60 + (state.shortTermShock / state.maxShortTermShock) * 25 + (1 - sanityRatio) * 15

  if (riskScore < 15) {
    level = 'safe'
    corruptionChance = 0
    dataLossChance = 0
    hallucinationChance = 0
    sanityLossOnLoad = 0
    pollutionGain = 0
    warningMessage = '精神状态稳定，存档安全。'
  } else if (riskScore < 35) {
    level = 'caution'
    corruptionChance = 5
    dataLossChance = 0
    hallucinationChance = 8
    sanityLossOnLoad = 2
    pollutionGain = 1
    warningMessage = '你感到一丝不安...存档时请小心。'
  } else if (riskScore < 55) {
    level = 'danger'
    corruptionChance = 15
    dataLossChance = 3
    hallucinationChance = 20
    sanityLossOnLoad = 5
    pollutionGain = 3
    warningMessage = '⚠️ 精神波动剧烈，存档可能受到干扰！'
  } else if (riskScore < 80) {
    level = 'critical'
    corruptionChance = 30
    dataLossChance = 10
    hallucinationChance = 40
    sanityLossOnLoad = 10
    pollutionGain = 6
    warningMessage = '🚨 深渊正在凝视你！强烈建议恢复精神后再存档！'
  } else {
    level = 'corrupted'
    corruptionChance = 50
    dataLossChance = 25
    hallucinationChance = 60
    sanityLossOnLoad = 18
    pollutionGain = 12
    warningMessage = '💀 你的心智已濒临崩溃。此存档可能...无法保证原样读回。'
  }

  if (totalPollution > 150) {
    corruptionChance = Math.min(80, corruptionChance + 20)
    dataLossChance = Math.min(50, dataLossChance + 15)
    sanityLossOnLoad = Math.min(25, sanityLossOnLoad + 5)
    pollutionGain = Math.min(20, pollutionGain + 5)
  }

  return {
    level,
    corruptionChance: Math.round(corruptionChance) / 100,
    dataLossChance: Math.round(dataLossChance) / 100,
    hallucinationChance: Math.round(hallucinationChance) / 100,
    sanityLossOnLoad: Math.round(sanityLossOnLoad),
    pollutionGain: Math.round(pollutionGain),
    warningMessage
  }
}

export function getMilestoneEffects(state: SpiritualPollutionState): {
  maxSanityReduction: number
  sanityRecoveryPenalty: number
  hitRatePenalty: number
  anomalyEventBonus: number
  unlockedEndings: string[]
} {
  let maxSanityReduction = 0
  let sanityRecoveryPenalty = 0
  let hitRatePenalty = 0
  let anomalyEventBonus = 0
  const unlockedEndings: string[] = []

  for (const milestone of CORRUPTION_MILESTONES) {
    if (state.longTermErosion >= milestone.erosionThreshold) {
      if (milestone.effects.maxSanityReduction) {
        maxSanityReduction = Math.max(maxSanityReduction, milestone.effects.maxSanityReduction)
      }
      if (milestone.effects.sanityRecoveryPenalty) {
        sanityRecoveryPenalty = Math.max(sanityRecoveryPenalty, milestone.effects.sanityRecoveryPenalty)
      }
      if (milestone.effects.hitRatePenalty) {
        hitRatePenalty = Math.max(hitRatePenalty, milestone.effects.hitRatePenalty)
      }
      if (milestone.effects.anomalyEventBonus) {
        anomalyEventBonus = Math.max(anomalyEventBonus, milestone.effects.anomalyEventBonus)
      }
      if (milestone.effects.unlockEnding) {
        unlockedEndings.push(milestone.effects.unlockEnding)
      }
    }
  }

  return {
    maxSanityReduction,
    sanityRecoveryPenalty,
    hitRatePenalty,
    anomalyEventBonus,
    unlockedEndings
  }
}

export function determineEndingAlignment(
  state: SpiritualPollutionState,
  sanity: number,
  maxSanity: number,
  context: EndingDeterminationContext
): EndingDescriptor {
  const totalPollution = getTotalPollution(state)
  const sanityRatio = sanity / maxSanity
  const { evidenceRatio, isCorrectConclusion, wrongDeductionAttempts, keyEvidenceDiscoveredCount, keyEvidenceTotalCount } = context
  const missingKeyEvidence = keyEvidenceTotalCount - keyEvidenceDiscoveredCount

  const candidates = ENDING_DESCRIPTORS.filter(desc => {
    const req = desc.pollutionRequirement
    
    if (req.maxShortTermShock !== undefined && state.shortTermShock > req.maxShortTermShock) {
      return false
    }
    if (req.minLongTermErosion !== undefined && state.longTermErosion < req.minLongTermErosion) {
      return false
    }
    if (req.maxLongTermErosion !== undefined && state.longTermErosion > req.maxLongTermErosion) {
      return false
    }
    if (req.minTotalPollution !== undefined && totalPollution < req.minTotalPollution) {
      return false
    }
    if (req.maxTotalPollution !== undefined && totalPollution > req.maxTotalPollution) {
      return false
    }
    if (desc.sanityRequirement.min !== undefined && sanity < desc.sanityRequirement.min) {
      return false
    }
    if (desc.sanityRequirement.max !== undefined && sanity > desc.sanityRequirement.max) {
      return false
    }

    if (desc.evidenceRequirement) {
      const evReq = desc.evidenceRequirement
      if (evReq.minEvidenceRatio !== undefined && evidenceRatio < evReq.minEvidenceRatio) {
        return false
      }
      if (evReq.maxEvidenceRatio !== undefined && evidenceRatio > evReq.maxEvidenceRatio) {
        return false
      }
      if (evReq.minKeyEvidenceCount !== undefined && keyEvidenceDiscoveredCount < evReq.minKeyEvidenceCount) {
        return false
      }
      if (evReq.maxMissingKeyEvidence !== undefined && missingKeyEvidence > evReq.maxMissingKeyEvidence) {
        return false
      }
    }

    if (desc.choiceRequirement) {
      const chReq = desc.choiceRequirement
      if (chReq.requiresCorrectConclusion === true && !isCorrectConclusion) {
        return false
      }
      if (chReq.requiresWrongConclusion === true && isCorrectConclusion) {
        return false
      }
      if (chReq.minWrongDeductionAttempts !== undefined && wrongDeductionAttempts < chReq.minWrongDeductionAttempts) {
        return false
      }
      if (chReq.maxWrongDeductionAttempts !== undefined && wrongDeductionAttempts > chReq.maxWrongDeductionAttempts) {
        return false
      }
    }

    return true
  })

  if (candidates.length === 0) {
    return getFallbackEnding(state, sanityRatio, context)
  }

  candidates.sort((a, b) => {
    const aPriority = calculateEndingPriority(a, state, sanityRatio, context)
    const bPriority = calculateEndingPriority(b, state, sanityRatio, context)
    return bPriority - aPriority
  })

  return candidates[0]
}

function calculateEndingPriority(
  desc: EndingDescriptor,
  state: SpiritualPollutionState,
  sanityRatio: number,
  context: EndingDeterminationContext
): number {
  let priority = 0

  const req = desc.pollutionRequirement
  if (req.minLongTermErosion !== undefined) {
    const erosionRatio = state.longTermErosion / 100
    const targetRatio = req.minLongTermErosion / 100
    priority += (1 - Math.abs(erosionRatio - targetRatio)) * 30
  } else if (req.maxLongTermErosion !== undefined) {
    const erosionRatio = state.longTermErosion / 100
    const targetRatio = req.maxLongTermErosion / 100
    priority += (1 - Math.abs(erosionRatio - targetRatio * 0.8)) * 20
  }

  if (desc.sanityRequirement.min !== undefined) {
    const target = desc.sanityRequirement.min / 100
    priority += (1 - Math.abs(sanityRatio - (target + 0.3))) * 20
  } else if (desc.sanityRequirement.max !== undefined) {
    const target = desc.sanityRequirement.max / 100
    priority += (1 - Math.abs(sanityRatio - target * 0.7)) * 20
  }

  if (desc.evidenceRequirement) {
    const evReq = desc.evidenceRequirement
    if (evReq.minEvidenceRatio !== undefined) {
      priority += (1 - Math.abs(context.evidenceRatio - (evReq.minEvidenceRatio + 0.1))) * 25
    }
    if (evReq.maxEvidenceRatio !== undefined) {
      priority += (1 - Math.abs(context.evidenceRatio - evReq.maxEvidenceRatio * 0.9)) * 15
    }
  }

  priority += (desc.scoreModifier + 30) * 0.3

  return priority
}

function getFallbackEnding(
  state: SpiritualPollutionState,
  sanityRatio: number,
  context: EndingDeterminationContext
): EndingDescriptor {
  const { evidenceRatio, isCorrectConclusion, wrongDeductionAttempts } = context

  if (state.longTermErosion >= 70 || sanityRatio < 0.2) {
    return ENDING_DESCRIPTORS.find(e => e.id === 'fully_insane')!
  }

  if (state.longTermErosion >= 50 && sanityRatio < 0.3) {
    if (!isCorrectConclusion && evidenceRatio < 0.5) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'abyss_plaything')!
    }
    return ENDING_DESCRIPTORS.find(e => e.id === 'corrupted')!
  }

  if (sanityRatio < 0.3) {
    if (!isCorrectConclusion && evidenceRatio >= 0.7) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'shattered_mind')!
    }
    if (isCorrectConclusion && evidenceRatio >= 0.7) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'martyr')!
    }
    if (isCorrectConclusion && evidenceRatio < 0.6) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'grasping_straws')!
    }
    return ENDING_DESCRIPTORS.find(e => e.id === 'martyr')!
  }

  if (state.longTermErosion >= 30) {
    if (!isCorrectConclusion) {
      if (wrongDeductionAttempts >= 1 && evidenceRatio < 0.6) {
        return ENDING_DESCRIPTORS.find(e => e.id === 'self_deceived')!
      }
      if (evidenceRatio >= 0.6) {
        return ENDING_DESCRIPTORS.find(e => e.id === 'compromised')!
      }
    }
    return ENDING_DESCRIPTORS.find(e => e.id === 'forgetful')!
  }

  if (!isCorrectConclusion) {
    if (evidenceRatio >= 0.7) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'false_prophet')!
    }
    if (evidenceRatio < 0.7 && wrongDeductionAttempts <= 1) {
      return ENDING_DESCRIPTORS.find(e => e.id === 'hasty_conclusion')!
    }
    return ENDING_DESCRIPTORS.find(e => e.id === 'self_deceived')!
  }

  if (evidenceRatio >= 0.8) {
    return ENDING_DESCRIPTORS.find(e => e.id === 'truth_seeker')!
  }
  if (evidenceRatio >= 0.4 && sanityRatio >= 0.4) {
    return ENDING_DESCRIPTORS.find(e => e.id === 'lucky_break')!
  }
  if (sanityRatio >= 0.25) {
    return ENDING_DESCRIPTORS.find(e => e.id === 'survivor')!
  }
  return ENDING_DESCRIPTORS.find(e => e.id === 'grasping_straws')!
}

export function generateEndingConsequenceSummary(
  ending: EndingDescriptor,
  context: EndingDeterminationContext
): EndingConsequenceSummary {
  const { isCorrectConclusion, evidenceRatio, wrongDeductionAttempts, missingKeyEvidenceIds } = context

  let category: EndingCategory = 'compromised'
  let justiceServed = false
  let truthLevel: EndingConsequenceSummary['truthLevel'] = 'partial'
  let detectiveFate = ''
  let perpetratorFate = ''
  const collateralDamage: string[] = []

  if (ending.endingFlavor) {
    switch (ending.endingFlavor.truthRevealLevel) {
      case 'full': truthLevel = 'full'; break
      case 'partial': truthLevel = 'partial'; break
      case 'obscured': truthLevel = 'partial'; break
      case 'distorted': truthLevel = 'distorted'; break
      case 'none': truthLevel = 'hidden'; break
    }
  }

  justiceServed = isCorrectConclusion

  if (evidenceRatio >= 0.8 && isCorrectConclusion && ending.scoreModifier >= 10) {
    category = 'perfect_truth'
  } else if (isCorrectConclusion && evidenceRatio >= 0.5) {
    category = 'flawed_success'
  } else if (!isCorrectConclusion && ending.endingFlavor?.tone === 'terrifying') {
    category = 'psychological_breakdown'
  } else if (!isCorrectConclusion) {
    category = 'tragic_failure'
  }

  switch (ending.id) {
    case 'truth_seeker':
      detectiveFate = '身心俱疲但意志坚定，继续追寻下一个案件的真相'
      perpetratorFate = '被绳之以法，所有罪行公之于众'
      break
    case 'lucky_break':
      detectiveFate = '此案成为职业生涯中的"神秘好运"案例，没人敢问细节'
      perpetratorFate = '被定罪，但部分关键证据的缺失让辩护律师抓住了把柄'
      collateralDamage.push('案件存在程序瑕疵，可能在未来引发再审')
      break
    case 'survivor':
      detectiveFate = '案件告一段落，选择休假以平复精神创伤'
      perpetratorFate = '主要罪名成立，次要情节因证据不足未被追究'
      break
    case 'intuition_guided':
      detectiveFate = '被同事称为"第六感侦探"，自己却开始怀疑这份直觉的来源'
      perpetratorFate = '被定罪，但案件的某些细节永远成谜'
      collateralDamage.push('部分关联案件因证据不足而搁置')
      break
    case 'forgetful':
      detectiveFate = '通过心理治疗封存了创伤记忆，对此案仅有模糊印象'
      perpetratorFate = '被定罪，但侦探无法出庭作证的情况引发了舆论争议'
      collateralDamage.push('侦探的专业信誉受到一定影响')
      break
    case 'grasping_straws':
      detectiveFate = '此案后申请了长期心理咨询，不确定是否还能继续工作'
      perpetratorFate = '勉强被定罪，判决书措辞谨慎，留下了诸多疑点'
      collateralDamage.push('案件的判决在司法界引起了广泛讨论')
      break
    case 'martyr':
      detectiveFate = '因精神崩溃被强制送医，在疗养院中度过漫长岁月'
      perpetratorFate = '基于侦探留下的完整证据链被判处最高刑罚'
      collateralDamage.push('侦探的职业生涯就此终结')
      break
    case 'false_prophet':
      detectiveFate = '在鲜花与掌声中结案，只有夜深人静时才会感到那一丝不对劲'
      perpetratorFate = '逍遥法外，甚至可能正在策划下一起案件'
      collateralDamage.push('无辜者可能被错误定罪')
      collateralDamage.push('真凶的继续犯罪造成了新的受害者')
      break
    case 'hasty_conclusion':
      detectiveFate = '因破案速度受到嘉奖，但卷宗被标记为"需要复核"的灰色案件'
      perpetratorFate = `${isCorrectConclusion ? '被定罪但证据链存在隐患' : '很可能仍在社会上活动'}`
      if (missingKeyEvidenceIds.length > 0) {
        collateralDamage.push(`${missingKeyEvidenceIds.length}项关键证据的缺失可能导致案件在未来被翻案`)
      }
      break
    case 'compromised':
      detectiveFate = '接受了这个不完美的结果，开始在正义与现实之间寻找平衡'
      perpetratorFate = '部分罪名成立，获得了减刑，有朝一日会重获自由'
      collateralDamage.push('部分受害者家属对判决结果不满')
      break
    case 'self_deceived':
      detectiveFate = '坚信自己的判断正确，但每当独处时卷宗上的字迹似乎在变形'
      perpetratorFate = `${isCorrectConclusion ? '虽然推理过程存疑，但结果碰巧正确' : '真正的罪犯可能正在嘲笑这个结果'}`
      if (wrongDeductionAttempts >= 2) {
        collateralDamage.push(`侦探在推演中犯了${wrongDeductionAttempts}次严重错误`)
      }
      break
    case 'shattered_mind':
      detectiveFate = '被诊断为重度创伤后应激障碍，不再适合从事刑侦工作'
      perpetratorFate = '由于侦探的精神状态，案件被发回重审，真凶几乎逃脱制裁'
      collateralDamage.push('完整的证据链因侦探的证词失效而大打折扣')
      break
    case 'corrupted':
      detectiveFate = '表面上完成了任务，但眼中多了某种不该存在的古老智慧'
      perpetratorFate = '得到了一个奇怪的结局——既不是正义，也非完全的邪恶'
      collateralDamage.push('侦探接触到了不应被人类知晓的存在')
      break
    case 'abyss_plaything':
      detectiveFate = '成为了某种更古老存在的传声筒，偶尔说的话会准确预言未来'
      perpetratorFate = '没人在乎真凶是谁了，所有人都被侦探的疯狂状态所吸引'
      collateralDamage.push('此案的部分卷宗被列为最高机密')
      collateralDamage.push('接触过侦探的调查员也出现了轻微的精神异常')
      break
    case 'fully_insane':
      detectiveFate = '被送入特殊精神病院，永远沉浸在自己窥见的"真理"中'
      perpetratorFate = '案件悬而未决，所有的推理都因侦探的疯癫而不被采纳'
      collateralDamage.push('该案成为悬案档案中的传说级案件')
      collateralDamage.push('阅读过侦探结案报告的调查员都做了相同的噩梦')
      break
    default:
      detectiveFate = '案件告一段落，生活继续'
      perpetratorFate = isCorrectConclusion ? '被绳之以法' : '命运未知'
  }

  if (evidenceRatio < 0.5 && category !== 'psychological_breakdown') {
    collateralDamage.push('案件档案被标记为"证据不足待复核"')
  }

  return {
    category,
    justiceServed,
    truthLevel,
    detectiveFate,
    perpetratorFate,
    collateralDamage: [...new Set(collateralDamage)]
  }
}

export function calculatePollutionFromSanityLoss(
  sanityLoss: number, 
  source: 'shock' | 'erosion' | 'mixed'
): { shock: number; erosion: number } {
  if (source === 'shock') {
    return {
      shock: Math.round(sanityLoss * 1.5),
      erosion: Math.round(sanityLoss * 0.1)
    }
  } else if (source === 'erosion') {
    return {
      shock: Math.round(sanityLoss * 0.3),
      erosion: Math.round(sanityLoss * 0.8)
    }
  }
  return {
    shock: Math.round(sanityLoss * 0.8),
    erosion: Math.round(sanityLoss * 0.4)
  }
}

export function calculateDecay(
  state: SpiritualPollutionState,
  elapsedMs: number,
  sanity: number,
  maxSanity: number
): { shockDecay: number; erosionDecay: number } {
  const minutes = elapsedMs / 60000
  const sanityRatio = sanity / maxSanity

  let shockDecayRate = 2.0
  let erosionDecayRate = 0.15

  if (sanityRatio > 0.8) {
    shockDecayRate *= 1.5
    erosionDecayRate *= 1.3
  } else if (sanityRatio > 0.5) {
    shockDecayRate *= 1.0
    erosionDecayRate *= 1.0
  } else if (sanityRatio > 0.3) {
    shockDecayRate *= 0.6
    erosionDecayRate *= 0.5
  } else {
    shockDecayRate *= 0.2
    erosionDecayRate *= 0.1
  }

  const shockDecay = Math.round(state.shortTermShock * Math.min(1, minutes * shockDecayRate / state.maxShortTermShock))
  const erosionDecay = Math.round(state.longTermErosion * Math.min(1, minutes * erosionDecayRate / state.maxLongTermErosion))

  return {
    shockDecay: Math.min(state.shortTermShock, Math.max(0, shockDecay)),
    erosionDecay: Math.min(state.longTermErosion, Math.max(0, erosionDecay))
  }
}
