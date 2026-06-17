import { reactive } from 'vue'
import type { Case } from '@/types'

export const cases = reactive<Case[]>([
  {
    id: 'case-001',
    title: '消失的灯塔守望者',
    description: '1932年，黑石岛灯塔的守望者在一夜之间神秘失踪。当地渔民报告称，那晚灯塔发出了诡异的紫光，并伴随着令人毛骨悚然的低语声。你被派往调查这起离奇案件。',
    difficulty: 'easy',
    status: 'available',
    sanityCost: 15,
    recommendedSanity: 80,
    startingTools: ['tool-magnifier-basic', 'tool-fingerprint-kit', 'tool-uv-light'],
    chapter: 1,
    prerequisites: [],
    rewards: {
      tools: ['tool-recorder'],
      unlocksCases: ['case-002'],
      sanityBonus: 10,
      description: '解锁录音笔，可捕捉声音类证据'
    },
    timeLimit: {
      totalSeconds: 900,
      sceneSwitchCost: 10,
      searchAttemptCost: 5,
      failedSearchPenalty: 15,
      clueAnalysisCost: 8,
      specialEventBonus: 30
    },
    branchRewards: {
      'standard': {
        tools: ['tool-recorder'],
        unlocksCases: ['case-002'],
        sanityBonus: 10,
        description: '标准结局奖励'
      },
      'deep-truth': {
        tools: ['tool-magnifier-pro', 'tool-uv-light-advanced', 'tool-lockpick', 'tool-recorder'],
        unlocksCases: ['case-002'],
        sanityBonus: 20,
        description: '深渊真相结局奖励：解锁全套高级工具'
      }
    },
    scenes: [
      {
        id: 'scene-lighthouse',
        name: '废弃灯塔',
        description: '一座古老的灯塔矗立在悬崖边，塔身布满苔藓和奇怪的刻痕。空气中弥漫着咸腥的海风和一股说不清的腐朽气息。',
        background: 'lighthouse',
        searched: false,
        evidence: [
          {
            id: 'evidence-diary',
            name: '守望者的日记',
            description: '一本沾满海水的皮革日记，最后几页的字迹变得扭曲疯狂，反复提到"来自深渊的呼唤"和"他即将苏醒"。',
            type: 'document',
            sanityEffect: -5,
            discovered: false,
            location: { x: 30, y: 45 },
            size: { width: 15, height: 20 },
            baseHitRate: 75,
            toolBoost: ['tool-magnifier-basic', 'tool-magnifier-pro'],
            hiddenClues: ['clue-call', 'clue-awakening']
          },
          {
            id: 'evidence-symbol',
            name: '奇怪的符文',
            description: '灯塔内部墙壁上刻满了诡异的螺旋状符文，触摸时会感到一阵刺骨的寒意。这些符文似乎在微微发光。',
            type: 'trace',
            sanityEffect: -8,
            discovered: false,
            location: { x: 60, y: 30 },
            size: { width: 20, height: 25 },
            baseHitRate: 60,
            toolBoost: ['tool-uv-light', 'tool-uv-light-advanced'],
            isSpecial: false
          },
          {
            id: 'evidence-telescope',
            name: '破碎的望远镜',
            description: '守望者的望远镜被摔碎在地上，镜片上残留着一些黑色的黏液，散发着令人作呕的气味。',
            type: 'object',
            sanityEffect: -3,
            discovered: false,
            location: { x: 75, y: 55 },
            size: { width: 12, height: 15 },
            baseHitRate: 70,
            toolBoost: ['tool-fingerprint-kit', 'tool-chemical-analyzer'],
            hiddenClues: ['clue-substance']
          },
          {
            id: 'evidence-hidden-mark',
            name: '隐藏的印记',
            description: '在灯塔楼梯的暗处，有一个几乎看不见的手印印记，在紫外线下会发出诡异的绿色荧光。手印的指节数量...似乎不太对。',
            type: 'trace',
            sanityEffect: -12,
            discovered: false,
            location: { x: 45, y: 70 },
            size: { width: 10, height: 12 },
            baseHitRate: 30,
            requiredTool: 'tool-uv-light',
            isSpecial: true,
            hiddenClues: ['clue-deep-one']
          },
          {
            id: 'evidence-secret-notes',
            name: '秘密笔记',
            description: '藏在灯塔顶部透镜缝隙中的一叠小纸条，上面写满了只有守望者自己能看懂的密码。破译后揭示了一个可怕的真相...',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 50, y: 15 },
            size: { width: 8, height: 10 },
            baseHitRate: 45,
            toolBoost: ['tool-magnifier-pro'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'clue_analyzed',
              requiredClueId: 'clue-call'
            },
            hiddenClues: ['clue-truth']
          }
        ]
      },
      {
        id: 'scene-cottage',
        name: '守望者小屋',
        description: '灯塔旁的一间破旧小屋，屋内一片狼藉，仿佛发生过激烈的挣扎。桌上还摆着半杯已经发霉的咖啡。',
        background: 'cottage',
        searched: false,
        evidence: [
          {
            id: 'evidence-letter',
            name: '神秘信件',
            description: '一封来自"深海研究协会"的信件，邀请守望者参加一个秘密研究项目，信纸上有淡淡的磷光。',
            type: 'document',
            sanityEffect: -4,
            discovered: false,
            location: { x: 45, y: 35 },
            size: { width: 18, height: 22 },
            baseHitRate: 70,
            toolBoost: ['tool-magnifier-basic'],
            hiddenClues: ['clue-organization']
          },
          {
            id: 'evidence-photo',
            name: '模糊的照片',
            description: '一张在灯塔顶部拍摄的照片，照片中央有一个模糊的人形轮廓，但仔细看去，那个轮廓似乎有太多的肢体...',
            type: 'document',
            sanityEffect: -10,
            discovered: false,
            location: { x: 20, y: 60 },
            size: { width: 15, height: 18 },
            baseHitRate: 65,
            toolBoost: ['tool-magnifier-pro'],
            hiddenClues: ['clue-entity']
          },
          {
            id: 'evidence-amulet',
            name: '古老护符',
            description: '一个用未知金属制成的护符，表面刻着触手缠绕的图案。握在手中时，你会感到一阵眩晕。',
            type: 'object',
            sanityEffect: -6,
            discovered: false,
            location: { x: 70, y: 70 },
            size: { width: 10, height: 12 },
            baseHitRate: 55,
            toolBoost: ['tool-chemical-analyzer']
          },
          {
            id: 'evidence-locked-drawer',
            name: '上锁的抽屉',
            description: '书桌最下面的抽屉被牢牢锁住，里面似乎藏着什么重要的东西。锁孔里有一些奇怪的刻痕。',
            type: 'object',
            sanityEffect: -8,
            discovered: false,
            location: { x: 55, y: 50 },
            size: { width: 15, height: 10 },
            baseHitRate: 40,
            requiredTool: 'tool-lockpick',
            isSpecial: true,
            hiddenClues: ['clue-ritual']
          },
          {
            id: 'evidence-hidden-chamber',
            name: '暗室入口',
            description: '壁炉后面似乎有一个隐藏的空间，边缘有新鲜的摩擦痕迹。里面可能藏着守望者最大的秘密。',
            type: 'trace',
            sanityEffect: -10,
            discovered: false,
            location: { x: 30, y: 75 },
            size: { width: 18, height: 15 },
            baseHitRate: 35,
            toolBoost: ['tool-magnifier-pro', 'tool-uv-light-advanced'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'evidence_discovered',
              requiredEvidenceId: 'evidence-diary'
            },
            hiddenClues: ['clue-deep-one']
          }
        ]
      },
      {
        id: 'scene-shore',
        name: '黑石海滩',
        description: '灯塔下方的海滩上散落着大量死鱼，它们的眼睛都朝着同一个方向——深海。远处，海面上似乎有什么东西在蠕动...',
        background: 'shore',
        searched: false,
        evidence: [
          {
            id: 'evidence-fish',
            name: '变异的死鱼',
            description: '这些死鱼不仅眼睛朝向异常，部分鱼身上还长出了奇怪的小触手，触手仍在微微抽动。',
            type: 'trace',
            sanityEffect: -12,
            discovered: false,
            location: { x: 35, y: 50 },
            size: { width: 25, height: 20 },
            baseHitRate: 80,
            toolBoost: ['tool-magnifier-basic']
          },
          {
            id: 'evidence-footprints',
            name: '奇怪的脚印',
            description: '沙滩上有一串脚印从海边延伸到灯塔，但脚印的形状...不像是人类。更像是某种有蹼的生物。',
            type: 'trace',
            sanityEffect: -7,
            discovered: false,
            location: { x: 65, y: 40 },
            size: { width: 20, height: 15 },
            baseHitRate: 65,
            toolBoost: ['tool-fingerprint-kit'],
            hiddenClues: ['clue-creature']
          },
          {
            id: 'evidence-bottle',
            name: '漂流瓶',
            description: '一个被冲上岸的漂流瓶，里面有一张发黄的纸条，上面写着："他们不是失踪，而是回归了..."',
            type: 'document',
            sanityEffect: -5,
            discovered: false,
            location: { x: 80, y: 65 },
            size: { width: 12, height: 18 },
            baseHitRate: 50,
            toolBoost: ['tool-magnifier-basic', 'tool-fingerprint-kit']
          },
          {
            id: 'evidence-whisper',
            name: '诡异的低语',
            description: '在海浪声中，你似乎能听到某种低沉的呢喃声。用录音设备捕捉后，发现那是一种不属于人类语言的诡异音节...',
            type: 'testimony',
            sanityEffect: -15,
            discovered: false,
            location: { x: 15, y: 30 },
            size: { width: 18, height: 15 },
            baseHitRate: 25,
            requiredTool: 'tool-recorder',
            isSpecial: true,
            hiddenClues: ['clue-call-of-deep']
          },
          {
            id: 'evidence-deep-statue',
            name: '海底雕像',
            description: '被海浪冲上岸的怪异雕像，描绘着一个有着章鱼头部和人类躯体的存在。雕像的眼睛似乎在追踪你的移动...',
            type: 'object',
            sanityEffect: -18,
            discovered: false,
            location: { x: 50, y: 75 },
            size: { width: 12, height: 18 },
            baseHitRate: 25,
            toolBoost: ['tool-magnifier-pro', 'tool-chemical-analyzer'],
            isInitiallyHidden: true,
            isSpecial: true,
            discoveryTrigger: {
              type: 'scene_visited_count',
              requiredSceneVisitCount: 3,
              sceneId: 'scene-shore'
            },
            hiddenClues: ['clue-entity']
          },
          {
            id: 'evidence-mysterious-scale',
            name: '神秘鳞片',
            description: '一块不属于任何已知生物的巨大鳞片，在月光下会散发出诡异的彩虹色光芒。',
            type: 'trace',
            sanityEffect: -8,
            discovered: false,
            location: { x: 75, y: 80 },
            size: { width: 8, height: 10 },
            baseHitRate: 40,
            toolBoost: ['tool-magnifier-basic'],
            isInitiallyHidden: true,
            discoveryTrigger: {
              type: 'random_after_search',
              chance: 12
            }
          }
        ]
      }
    ],
    clues: [
      {
        id: 'clue-call',
        name: '深渊呼唤',
        description: '日记中提到的"来自深渊的呼唤"似乎是一种精神感应，能够影响特定人群的心智。',
        type: 'documentary',
        source: '守望者的日记',
        connections: ['clue-entity', 'clue-awakening'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-awakening',
        name: '苏醒仪式',
        description: '符文和日记暗示，某种古老的仪式正在唤醒海底沉睡的存在。',
        type: 'deduction',
        source: '守望者的日记 + 奇怪的符文',
        connections: ['clue-call', 'clue-organization'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-substance',
        name: '深海黏液',
        description: '望远镜上的黑色黏液经过分析，含有未知的有机化合物，似乎来自深海生物。',
        type: 'physical',
        source: '破碎的望远镜',
        connections: ['clue-creature', 'clue-entity'],
        importance: 2,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-organization',
        name: '深海研究协会',
        description: '这个神秘组织似乎在进行某种深海相关的秘密研究，可能与守望者的失踪有关。',
        type: 'testimonial',
        source: '神秘信件',
        connections: ['clue-awakening', 'clue-call'],
        importance: 3,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-entity',
        name: '深渊存在',
        description: '照片中的模糊轮廓和所有证据指向同一个结论：某种不可名状的存在正在接近我们的世界。',
        type: 'deduction',
        source: '模糊的照片 + 深渊呼唤',
        connections: ['clue-call', 'clue-substance', 'clue-creature'],
        importance: 5,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-creature',
        name: '深潜者',
        description: '脚印和变异鱼类表明，深海中存在着某种半人半鱼生物，它们可能与守望者的失踪有关。',
        type: 'physical',
        source: '奇怪的脚印 + 变异的死鱼',
        connections: ['clue-substance', 'clue-entity'],
        importance: 4,
        discovered: false,
        analyzed: false
      },
      {
        id: 'clue-deep-one',
        name: '非人手印',
        description: '隐藏在暗处的手印显示出某种非人特征——指节数量异常，指间有蹼状痕迹。这证实了深潜者的存在。',
        type: 'physical',
        source: '隐藏的印记',
        connections: ['clue-creature', 'clue-ritual'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-uv-light'
      },
      {
        id: 'clue-ritual',
        name: '献祭仪式',
        description: '从锁着的抽屉中发现的仪式手册显示，守望者并非受害者，而是自愿的祭品。他相信通过献祭能够获得"深海的祝福"。',
        type: 'documentary',
        source: '上锁的抽屉',
        connections: ['clue-awakening', 'clue-organization'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-lockpick'
      },
      {
        id: 'clue-call-of-deep',
        name: '深海之音',
        description: '录音中捕捉到的低语是某种古老的语言，反复提及"达贡"和"克苏鲁"的名号。这些声音似乎具有某种精神控制的力量。',
        type: 'testimonial',
        source: '诡异的低语',
        connections: ['clue-entity', 'clue-call'],
        importance: 5,
        discovered: false,
        analyzed: false,
        requiredToolForAnalysis: 'tool-recorder'
      }
    ],
    conclusion: {
      correctAnswer: 'conclusion-ritual',
      evidence: ['evidence-diary', 'evidence-symbol', 'evidence-letter', 'evidence-photo'],
      sanityThreshold: 30,
      options: [
        {
          id: 'conclusion-accident',
          text: '守望者因意外坠海身亡',
          isCorrect: false,
          sanityCost: 0,
          feedback: '这个结论无法解释那些超自然的证据...'
        },
        {
          id: 'conclusion-escape',
          text: '守望者因精神崩溃而逃离',
          isCorrect: false,
          sanityCost: 5,
          feedback: '虽然守望者确实精神不稳定，但这无法解释那些物理证据...'
        },
        {
          id: 'conclusion-ritual',
          text: '守望者被深海教团献祭，以唤醒某种古老存在',
          isCorrect: true,
          sanityCost: 10,
          feedback: '所有证据都指向这个令人不安的真相。守望者成为了某个疯狂仪式的祭品...',
          branch: 'standard'
        },
        {
          id: 'conclusion-transformation',
          text: '守望者自愿转化为了某种深海生物',
          isCorrect: false,
          sanityCost: 15,
          feedback: '这个推测有一定道理，但缺乏决定性证据支持...'
        },
        {
          id: 'conclusion-deep-truth',
          text: '守望者并非被献祭，而是回应了深海的召唤，自愿成为深潜者的一员',
          isCorrect: true,
          sanityCost: 20,
          feedback: '你发现了隐藏在表面之下的真正真相。守望者并非被迫献祭，而是主动回应了深海的呼唤，完成了向深潜者的蜕变。这是一般调查无法触及的深渊真相...',
          requiredTools: ['tool-uv-light', 'tool-recorder', 'tool-lockpick'],
          requiredEvidence: ['evidence-hidden-mark', 'evidence-whisper', 'evidence-locked-drawer'],
          branch: 'deep-truth'
        }
      ]
    }
  },
  {
    id: 'case-002',
    title: '暗影图书馆',
    description: '市立图书馆的地下藏书室被发现，但没有任何建筑图纸记录过它的存在。进入过那里的图书管理员都声称听到了低语声，并且开始出现严重的精神问题。',
    difficulty: 'normal',
    status: 'locked',
    sanityCost: 25,
    recommendedSanity: 70,
    startingTools: ['tool-magnifier-basic', 'tool-fingerprint-kit', 'tool-uv-light', 'tool-recorder'],
    chapter: 2,
    prerequisites: ['case-001'],
    rewards: {
      tools: ['tool-chemical-analyzer'],
      unlocksCases: ['case-003'],
      sanityBonus: 15,
      description: '解锁化学分析仪，可分析微量物质证据'
    },
    timeLimit: {
      totalSeconds: 1200,
      sceneSwitchCost: 12,
      searchAttemptCost: 6,
      failedSearchPenalty: 20,
      clueAnalysisCost: 10,
      specialEventBonus: 45
    },
    branchRewards: {},
    scenes: [],
    clues: [],
    conclusion: {
      correctAnswer: 'conclusion-forbidden',
      evidence: [],
      sanityThreshold: 40,
      options: [
        {
          id: 'conclusion-hallucination',
          text: '图书管理员们集体产生了幻觉',
          isCorrect: false,
          sanityCost: 0,
          feedback: '集体幻觉无法解释地下室的物理存在...'
        },
        {
          id: 'conclusion-forbidden',
          text: '地下室藏有禁忌的知识，会侵蚀接触者的心智',
          isCorrect: true,
          sanityCost: 15,
          feedback: '某些知识确实不应该被人类知晓...',
          branch: 'standard'
        }
      ]
    }
  },
  {
    id: 'case-003',
    title: '梦魇画作',
    description: '著名画家在完成最后一幅作品后发疯自杀。所有看过那幅画的人都报告做同样的噩梦，梦中有一个反复出现的几何图案...',
    difficulty: 'hard',
    status: 'locked',
    sanityCost: 35,
    recommendedSanity: 60,
    startingTools: ['tool-magnifier-pro', 'tool-uv-light-advanced', 'tool-chemical-analyzer'],
    chapter: 3,
    prerequisites: ['case-002'],
    rewards: {
      tools: [],
      unlocksCases: [],
      sanityBonus: 25,
      description: '完成所有案件的最终奖励'
    },
    timeLimit: {
      totalSeconds: 1500,
      sceneSwitchCost: 15,
      searchAttemptCost: 8,
      failedSearchPenalty: 25,
      clueAnalysisCost: 12,
      specialEventBonus: 60
    },
    branchRewards: {},
    scenes: [],
    clues: [],
    conclusion: {
      correctAnswer: 'conclusion-gate',
      evidence: [],
      sanityThreshold: 50,
      options: [
        {
          id: 'conclusion-coincidence',
          text: '这只是巧合和心理暗示',
          isCorrect: false,
          sanityCost: 0,
          feedback: '太多的巧合就不是巧合了...'
        },
        {
          id: 'conclusion-gate',
          text: '画作是通往另一个维度的门户',
          isCorrect: true,
          sanityCost: 20,
          feedback: '艺术有时能够打开通往未知的大门...',
          branch: 'standard'
        }
      ]
    }
  }
])

export function getCaseById(id: string): Case | undefined {
  return cases.find(c => c.id === id)
}

export function unlockNextCase(currentCaseId: string): void {
  const currentIndex = cases.findIndex(c => c.id === currentCaseId)
  if (currentIndex >= 0 && currentIndex < cases.length - 1) {
    cases[currentIndex + 1].status = 'available'
  }
}

export function getEvidenceById(caseId: string, evidenceId: string) {
  const caseData = getCaseById(caseId)
  if (!caseData) return undefined
  
  for (const scene of caseData.scenes) {
    const evidence = scene.evidence.find(e => e.id === evidenceId)
    if (evidence) return evidence
  }
  return undefined
}

export function completeCase(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false
  
  caseData.status = 'completed'
  return true
}

export function setCaseStatus(caseId: string, status: Case['status']): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false
  
  caseData.status = status
  return true
}

export function resetCaseForReplay(caseId: string): boolean {
  const caseData = getCaseById(caseId)
  if (!caseData) return false

  caseData.scenes.forEach(scene => {
    scene.searched = false
    scene.evidence.forEach(e => {
      e.discovered = false
    })
  })

  caseData.clues.forEach(clue => {
    clue.discovered = false
    clue.analyzed = false
  })

  caseData.status = 'available'
  return true
}
