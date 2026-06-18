import type { SanityRecoveryEvent } from '@/types'

export const sanityRecoveryEvents: SanityRecoveryEvent[] = [
  {
    id: 'quiet_corner',
    name: '安静的角落',
    description: '你注意到一个相对安静的地方，或许可以在这里稍作休整，恢复一些精神状态。',
    triggerContext: 'scene_enter',
    maximumSanityThreshold: 95,
    options: [
      {
        id: 'quick_rest',
        text: '短暂休息（低代价）',
        sanityRecovery: 8,
        costs: [
          { type: 'time', value: 15, description: '消耗 15 秒时间' }
        ],
        flavorText: '你闭上眼睛深呼吸了几次，感觉稍微平静了一些。'
      },
      {
        id: 'deep_meditation',
        text: '深度冥想（高代价高回报）',
        sanityRecovery: 20,
        costs: [
          { type: 'time', value: 45, description: '消耗 45 秒时间' },
          { type: 'evidence_penalty', value: 10, description: '后续证据发现率 -10%（持续 3 次搜索）' }
        ],
        flavorText: '你进入了深度冥想状态，心灵得到了净化，但也错过了一些搜查时机。'
      },
      {
        id: 'smoke_break',
        text: '抽根烟（平衡选择）',
        sanityRecovery: 12,
        costs: [
          { type: 'time', value: 25, description: '消耗 25 秒时间' },
          { type: 'pollution_erosion', value: 3, description: '长期精神侵蚀 +3' }
        ],
        flavorText: '尼古丁暂时麻痹了你的神经，但代价是慢性的精神腐蚀。'
      }
    ]
  },
  {
    id: 'old_photograph',
    name: '泛黄的照片',
    description: '你发现了一张旧照片，照片中的人似乎在微笑。注视着它，你想起了一些美好的往事...',
    triggerContext: 'after_search',
    maximumSanityThreshold: 90,
    options: [
      {
        id: 'glance_photo',
        text: '瞥一眼就继续工作',
        sanityRecovery: 5,
        costs: [],
        flavorText: '照片中的微笑让你心头一暖，但你很快将注意力放回工作上。'
      },
      {
        id: 'stare_photo',
        text: '久久凝视，沉浸回忆',
        sanityRecovery: 18,
        costs: [
          { type: 'time', value: 30, description: '消耗 30 秒时间' },
          { type: 'anomaly_risk', value: 15, description: '异常事件触发率 +15%（持续 30 秒）' }
        ],
        flavorText: '你陷入了深深的回忆之中，过去的温暖给了你力量...但当你回过神时，感觉周围似乎有什么在窥视着你。'
      },
      {
        id: 'pocket_photo',
        text: '将照片收入口袋',
        sanityRecovery: 10,
        costs: [
          { type: 'tool_durability', value: 8, description: '所有工具耐久 -8（口袋空间挤压）' }
        ],
        flavorText: '你决定保留这张照片作为护身符，哪怕它占用了一些宝贵的装备空间。'
      }
    ]
  },
  {
    id: 'whispering_wind',
    name: '风中的低语',
    description: '一阵微风吹过，带来了远处模糊的低语声。这些声音似乎有某种韵律，也许可以利用它们来集中精神...',
    triggerContext: 'random',
    minimumSanityThreshold: 20,
    maximumSanityThreshold: 92,
    options: [
      {
        id: 'ignore_whispers',
        text: '无视这些声音，保持警惕',
        sanityRecovery: 0,
        costs: [],
        flavorText: '你选择保持清醒，不为这些诡异的声音所动。'
      },
      {
        id: 'listen_carefully',
        text: '仔细聆听，尝试理解',
        sanityRecovery: 15,
        costs: [
          { type: 'pollution_erosion', value: 8, description: '长期精神侵蚀 +8' },
          { type: 'clue_analysis_penalty', value: 15, description: '线索分析速度 -15%（持续 60 秒）' }
        ],
        flavorText: '这些低语中似乎藏着某种古老的秘密，你理解了其中的含义...但这知识正在侵蚀你的心智。'
      },
      {
        id: 'chant_back',
        text: '尝试跟着低声哼唱',
        sanityRecovery: 25,
        costs: [
          { type: 'pollution_erosion', value: 12, description: '长期精神侵蚀 +12' },
          { type: 'anomaly_risk', value: 25, description: '异常事件触发率 +25%（持续 60 秒）' },
          { type: 'time', value: 20, description: '消耗 20 秒时间' }
        ],
        flavorText: '你发现自己在跟着这些低语哼唱，一股奇异的平静感笼罩了你...但你隐约感到，有什么东西开始注意到你了。'
      }
    ]
  },
  {
    id: 'sanity_crisis',
    name: '⚠️ 理智危机',
    description: '你感到意识开始模糊，必须立刻采取措施稳住心神！',
    triggerContext: 'low_sanity',
    maximumSanityThreshold: 30,
    options: [
      {
        id: 'self_harm',
        text: '用疼痛唤醒自己（极端手段）',
        sanityRecovery: 15,
        costs: [
          { type: 'tool_durability', value: 15, description: '所有工具耐久 -15' },
          { type: 'time', value: 5, description: '消耗 5 秒时间' }
        ],
        flavorText: '你用力咬了一下自己的嘴唇，剧烈的疼痛让你瞬间清醒了过来...代价是你的装备在慌乱中受到了损伤。'
      },
      {
        id: 'forced_calm',
        text: '强行压制恐惧',
        sanityRecovery: 22,
        costs: [
          { type: 'pollution_erosion', value: 15, description: '长期精神侵蚀 +15' },
          { type: 'evidence_penalty', value: 20, description: '证据发现率 -20%（持续 5 次搜索）' }
        ],
        flavorText: '你用意志力强行将恐惧压入内心深处。这些被压抑的情感会在未来埋下隐患...'
      },
      {
        id: 'embrace_insanity',
        text: '短暂放开理智...',
        sanityRecovery: 35,
        costs: [
          { type: 'pollution_erosion', value: 25, description: '长期精神侵蚀 +25' },
          { type: 'anomaly_risk', value: 40, description: '异常事件触发率 +40%（持续 120 秒）' },
          { type: 'clue_analysis_penalty', value: 30, description: '线索分析速度 -30%（持续 120 秒）' }
        ],
        flavorText: '你选择...放任自己。在那短暂的疯狂中，你看到了真相的一角，内心获得了奇异的平静。但你知道，有什么东西已经永远改变了...'
      }
    ]
  },
  {
    id: 'mystical_sigil',
    name: '神秘符文',
    description: '墙壁上刻着一个散发微光的古老符文，它似乎蕴含着某种平复精神的力量。',
    triggerContext: 'scene_enter',
    maximumSanityThreshold: 95,
    options: [
      {
        id: 'study_sigil',
        text: '研究符文的含义',
        sanityRecovery: 12,
        costs: [
          { type: 'time', value: 20, description: '消耗 20 秒时间' }
        ],
        flavorText: '你花了一些时间解读符文，古老的智慧让你感到了一丝平静。'
      },
      {
        id: 'touch_sigil',
        text: '直接触摸符文',
        sanityRecovery: 25,
        costs: [
          { type: 'pollution_erosion', value: 6, description: '长期精神侵蚀 +6' },
          { type: 'time', value: 10, description: '消耗 10 秒时间' }
        ],
        flavorText: '符文在接触的瞬间释放出温暖的光芒，精神上的疲惫一扫而空...但你的手背上留下了淡淡的红色印记。'
      },
      {
        id: 'copy_sigil',
        text: '临摹符文到笔记本上',
        sanityRecovery: 16,
        costs: [
          { type: 'time', value: 35, description: '消耗 35 秒时间' },
          { type: 'evidence_penalty', value: 5, description: '证据发现率 -5%（持续 2 次搜索）' }
        ],
        flavorText: '你仔细地将符文描绘下来，在临摹的过程中你感到了渐进的平静。以后或许还能再用到它。'
      }
    ]
  },
  {
    id: 'childrens_laughter',
    name: '孩童的笑声',
    description: '你似乎听到了远处传来孩童纯真的笑声，这声音让你想起了那些无忧无虑的日子...',
    triggerContext: 'random',
    maximumSanityThreshold: 85,
    options: [
      {
        id: 'chase_sound',
        text: '循声而去',
        sanityRecovery: 10,
        costs: [
          { type: 'time', value: 30, description: '消耗 30 秒时间' }
        ],
        flavorText: '你追寻着声音走了一段路，虽然没有找到孩子们，但他们的笑声已经治愈了你的心灵。'
      },
      {
        id: 'close_eyes_listen',
        text: '闭上眼睛静静聆听',
        sanityRecovery: 18,
        costs: [
          { type: 'time', value: 20, description: '消耗 20 秒时间' },
          { type: 'anomaly_risk', value: 10, description: '异常事件触发率 +10%（持续 45 秒）' }
        ],
        flavorText: '你闭上眼，让纯真的声音充满你的内心。但当你睁开眼时，周围的环境似乎...有一丝微妙的变化。'
      },
      {
        id: 'ignore_laughter',
        text: '保持专注，这可能是陷阱',
        sanityRecovery: 3,
        costs: [],
        flavorText: '你强忍着内心的触动，选择不被这些声音诱惑。毕竟，在这种地方出现孩童的笑声，本来就很奇怪...'
      }
    ]
  }
]

export function getSanityRecoveryEventsForContext(
  context: SanityRecoveryEvent['triggerContext'],
  currentSanity: number,
  maxSanity: number
): SanityRecoveryEvent[] {
  const sanityPercent = (currentSanity / maxSanity) * 100
  
  return sanityRecoveryEvents.filter(event => {
    if (event.triggerContext !== context) return false
    if (event.maximumSanityThreshold !== undefined && sanityPercent > event.maximumSanityThreshold) return false
    if (event.minimumSanityThreshold !== undefined && sanityPercent < event.minimumSanityThreshold) return false
    return true
  })
}

export function pickRandomSanityRecoveryEvent(
  context: SanityRecoveryEvent['triggerContext'],
  currentSanity: number,
  maxSanity: number,
  baseChance: number = 100
): SanityRecoveryEvent | null {
  const available = getSanityRecoveryEventsForContext(context, currentSanity, maxSanity)
  if (available.length === 0) return null
  
  if (Math.random() * 100 > baseChance) return null
  
  return available[Math.floor(Math.random() * available.length)]
}
