import type { CharacterProfile, CharacterStats } from '@/types'

export const defaultCharacters: CharacterProfile[] = [
  {
    id: 'detective',
    name: '艾伦·韦德',
    title: '私家侦探',
    avatar: '🕵️',
    background: '曾在纽约警局任职，因不满体制内的腐败而辞职成为私家侦探。以敏锐的观察力和不屈的意志著称。',
    stats: {
      courage: 70,
      wisdom: 65,
      perception: 80,
      willpower: 60,
      luck: 50
    },
    talents: ['keen_eye', 'quick_analysis'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: true
  },
  {
    id: 'professor',
    name: '伊丽莎白·摩尔',
    title: '民俗学教授',
    avatar: '👩‍🏫',
    background: '密斯卡托尼克大学的民俗学教授，对世界各地的神秘传说有深入研究。多年的学术训练让她对超自然现象有着独特的理解。',
    stats: {
      courage: 55,
      wisdom: 85,
      perception: 60,
      willpower: 70,
      luck: 45
    },
    talents: ['quick_analysis', 'occult_scholar'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: false
  },
  {
    id: 'veteran',
    name: '马库斯·科尔',
    title: '退伍军人',
    avatar: '🎖️',
    background: '曾在海军陆战队服役，参加过多次秘密行动。战场上的经历让他见惯了死亡，但某些东西比敌人的子弹更可怕。',
    stats: {
      courage: 85,
      wisdom: 50,
      perception: 65,
      willpower: 75,
      luck: 55
    },
    talents: ['brave_heart', 'steady_mind'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: false
  },
  {
    id: 'journalist',
    name: '苏菲·陈',
    title: '调查记者',
    avatar: '📰',
    background: '一名执着的调查记者，为了揭露真相不惜一切代价。她的直觉和人脉网络是她最强大的武器。',
    stats: {
      courage: 65,
      wisdom: 70,
      perception: 70,
      willpower: 55,
      luck: 75
    },
    talents: ['lucky_find', 'sixth_sense'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: false
  },
  {
    id: 'occultist',
    name: '阿德里安·布莱克',
    title: '神秘学者',
    avatar: '🌙',
    background: '出身于古老的神秘学家族，从小接触各种超自然现象。他身上似乎有某种不为人知的力量。',
    stats: {
      courage: 60,
      wisdom: 80,
      perception: 75,
      willpower: 85,
      luck: 40
    },
    talents: ['steady_mind', 'meditation', 'elder_sign_bearer'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: false
  }
]

export const statNames: Record<keyof CharacterStats, string> = {
  courage: '勇气',
  wisdom: '智慧',
  perception: '感知',
  willpower: '意志',
  luck: '幸运'
}

export const statDescriptions: Record<keyof CharacterStats, string> = {
  courage: '影响面对恐怖时的理智抗性，越高越不容易失去理智。',
  wisdom: '影响线索分析的速度和理解复杂线索的能力。',
  perception: '影响发现隐藏证据和线索的概率。',
  willpower: '影响对精神侵蚀的抵抗能力和理智恢复速度。',
  luck: '影响随机事件的结果和稀有物品的发现。'
}

export function getStatName(stat: keyof CharacterStats): string {
  return statNames[stat] || stat
}

export function getCharacterById(characterId: string): CharacterProfile | undefined {
  return defaultCharacters.find(c => c.id === characterId)
}

export function createNewCharacter(
  name: string,
  title: string,
  stats: CharacterStats,
  talents: string[]
): CharacterProfile {
  return {
    id: `char-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name,
    title,
    avatar: '👤',
    background: '自定义调查员档案。',
    stats: { ...stats },
    talents: [...talents],
    createdAt: Date.now(),
    updatedAt: Date.now(),
    playCount: 0,
    completedCases: [],
    totalSanityLost: 0,
    totalEvidenceDiscovered: 0,
    isActive: false
  }
}

export function getDefaultStats(): CharacterStats {
  return {
    courage: 50,
    wisdom: 50,
    perception: 50,
    willpower: 50,
    luck: 50
  }
}
