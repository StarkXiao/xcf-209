import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  NewGamePlusState,
  InheritedCaseData,
  GlobalMilestone,
  MilestoneRequirement,
  HiddenCaseConfig,
  SpecialEvidenceConfig,
  NewGamePlusEnding,
  ScoreGrade
} from '@/types'
import { useProgressStore } from './progress'
import { useBestiaryStore } from './bestiary'
import { useSaveStore } from './save'
import { useGameStore } from './game'
import { getCaseById } from '@/data/cases'

const STORAGE_KEY = 'cthulhu-ngplus-state'

export const GLOBAL_MILESTONES: GlobalMilestone[] = [
  {
    id: 'milestone-first-case',
    name: '初出茅庐',
    description: '完成第一个案件',
    unlocked: false,
    requirement: { type: 'total_cases_completed', targetCount: 1 },
    reward: { sanityBonus: 5 }
  },
  {
    id: 'milestone-deep-truth',
    name: '深渊窥视者',
    description: '解锁任意案件的深层真相分支',
    unlocked: false,
    requirement: { type: 'branch_unlocked', targetIds: ['deep-truth'] },
    reward: { tools: ['tool-magnifier-pro'], unlockEndings: ['ending-true-awakening', 'ending-star-chamber'] }
  },
  {
    id: 'milestone-all-cases',
    name: '真相追寻者',
    description: '完成所有主线案件',
    unlocked: false,
    requirement: { type: 'total_cases_completed', targetCount: 3 },
    reward: { unlockCases: ['case-secret-final'], sanityBonus: 20 }
  },
  {
    id: 'milestone-s-rank',
    name: '完美调查员',
    description: '在任意案件中获得S级评价',
    unlocked: false,
    requirement: { type: 'grade_achieved', minGrade: 'S' },
    reward: { tools: ['tool-uv-light-advanced', 'tool-lockpick'] }
  },
  {
    id: 'milestone-bestiary-half',
    name: '禁忌学者',
    description: '图鉴完成度达到50%',
    unlocked: false,
    requirement: { type: 'bestiary_discovered', targetCount: 8 },
    reward: { unlockEvidence: ['evidence-ngplus-ancient-manuscript'] }
  },
  {
    id: 'milestone-ngplus-2',
    name: '轮回觉醒',
    description: '进入二周目',
    unlocked: false,
    requirement: { type: 'playthrough_count', targetCount: 2 },
    reward: { sanityBonus: 15, unlockEndings: ['ending-eternal-return'] }
  },
  {
    id: 'milestone-ngplus-3',
    name: '宿命超越',
    description: '进入三周目',
    unlocked: false,
    requirement: { type: 'playthrough_count', targetCount: 3 },
    reward: { tools: ['tool-chemical-analyzer'], unlockCases: ['case-secret-origins'] }
  }
]

export const HIDDEN_CASES: HiddenCaseConfig[] = [
  {
    id: 'case-secret-final',
    parentCaseId: 'case-003',
    unlockRequirements: [
      { type: 'total_cases_completed', targetCount: 3 },
      { type: 'branch_unlocked', targetIds: ['deep-truth'] }
    ],
    isUnlocked: false
  },
  {
    id: 'case-secret-origins',
    parentCaseId: 'case-001',
    unlockRequirements: [
      { type: 'playthrough_count', targetCount: 3 }
    ],
    isUnlocked: false
  }
]

export const SPECIAL_EVIDENCE: SpecialEvidenceConfig[] = [
  {
    id: 'evidence-ngplus-ancient-manuscript',
    caseId: 'case-001',
    sceneId: 'scene-lighthouse',
    unlockRequirements: [
      { type: 'bestiary_discovered', targetCount: 8 }
    ],
    ngPlusOnly: true
  },
  {
    id: 'evidence-ngplus-star-chamber-letter',
    caseId: 'case-002',
    sceneId: 'scene-reading-room',
    unlockRequirements: [
      { type: 'specific_case_completed', targetIds: ['case-001'] },
      { type: 'branch_unlocked', targetIds: ['deep-truth'] }
    ],
    ngPlusOnly: true
  },
  {
    id: 'evidence-ngplus-dream-catcher',
    caseId: 'case-003',
    sceneId: 'scene-gallery',
    unlockRequirements: [
      { type: 'specific_case_completed', targetIds: ['case-002'] },
      { type: 'branch_unlocked', targetIds: ['deep-truth'] }
    ],
    ngPlusOnly: true
  }
]

export const NGPLUS_ENDINGS: NewGamePlusEnding[] = [
  {
    id: 'ending-true-awakening',
    caseId: 'case-001',
    name: '真正的觉醒',
    description: '你理解了守望者的选择，并非被强迫，而是主动拥抱了命运。深潜者的血脉在你体内觉醒，但你保留了人类的意志。',
    unlockRequirements: [
      { type: 'branch_unlocked', targetIds: ['deep-truth'] },
      { type: 'grade_achieved', minGrade: 'A' }
    ],
    isNgPlusExclusive: true
  },
  {
    id: 'ending-star-chamber',
    caseId: 'case-002',
    name: '星庭裁决',
    description: '你揭开了星庭裁决所的秘密，守护者以自身为牢封印着最危险的知识，而你选择了继承这份使命。',
    unlockRequirements: [
      { type: 'specific_case_completed', targetIds: ['case-001'] },
      { type: 'branch_unlocked', targetIds: ['deep-truth'] }
    ],
    isNgPlusExclusive: true
  },
  {
    id: 'ending-eternal-return',
    caseId: 'case-003',
    name: '永恒轮回',
    description: '你发现了时间的秘密——这已经不是你第一次经历这些案件了。每一次轮回，你都离真相更近一步。这一次，你选择打破循环。',
    unlockRequirements: [
      { type: 'playthrough_count', targetCount: 2 },
      { type: 'total_cases_completed', targetCount: 3 }
    ],
    isNgPlusExclusive: true
  }
]

export const useNewGamePlusStore = defineStore('newGamePlus', () => {
  const state = ref<NewGamePlusState>({
    playthroughCount: 1,
    isNewGamePlus: false,
    inheritedCaseProgress: {},
    inheritedBestiary: {
      discoveredCreatures: [],
      discoveredItems: [],
      discoveredOrganizations: [],
      totalDiscovered: 0
    },
    unlockedHiddenCases: [],
    unlockedSpecialEvidence: [],
    unlockedEndings: [],
    globalMilestones: JSON.parse(JSON.stringify(GLOBAL_MILESTONES)),
    unlockedRecipes: [],
    carriedSanityBonus: 0
  })

  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const loaded = JSON.parse(data) as NewGamePlusState
        state.value = {
          ...state.value,
          ...loaded,
          globalMilestones: mergeMilestones(loaded.globalMilestones)
        }
      }
    } catch (error) {
      console.error('Failed to load New Game+ state:', error)
    }
  }

  function mergeMilestones(loaded: GlobalMilestone[]): GlobalMilestone[] {
    const base = JSON.parse(JSON.stringify(GLOBAL_MILESTONES)) as GlobalMilestone[]
    return base.map(m => {
      const loadedM = loaded.find(l => l.id === m.id)
      if (loadedM) {
        return { ...m, unlocked: loadedM.unlocked, unlockedAt: loadedM.unlockedAt }
      }
      return m
    })
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.value))
    } catch (error) {
      console.error('Failed to save New Game+ state:', error)
    }
  }

  function checkMilestoneRequirement(req: MilestoneRequirement): boolean {
    const progressStore = useProgressStore()
    const bestiaryStore = useBestiaryStore()

    switch (req.type) {
      case 'total_cases_completed':
        return progressStore.totalCompleted >= (req.targetCount || 0)

      case 'specific_case_completed':
        return (req.targetIds || []).every(id =>
          progressStore.getProgress(id)?.completed
        )

      case 'branch_unlocked':
        return (req.targetIds || []).some(branchId => {
          return Object.values(progressStore.progressMap).some(p =>
            p.unlockedBranches.includes(branchId)
          )
        })

      case 'bestiary_discovered':
        return bestiaryStore.progress.totalDiscovered >= (req.targetCount || 0)

      case 'grade_achieved': {
        const minGrade = req.minGrade || 'F'
        const gradeOrder: ScoreGrade[] = ['F', 'D', 'C', 'B', 'A', 'S']
        const minIndex = gradeOrder.indexOf(minGrade)
        return Object.values(progressStore.progressMap).some(p => {
          if (!p.bestGrade) return false
          return gradeOrder.indexOf(p.bestGrade) >= minIndex
        })
      }

      case 'ending_unlocked':
        return (req.targetIds || []).every(id =>
          state.value.unlockedEndings.includes(id)
        )

      case 'evidence_discovered':
        return (req.targetIds || []).every(id => {
          return Object.values(progressStore.progressMap).some(p =>
            p.discoveredEvidence.includes(id)
          )
        })

      case 'playthrough_count':
        return state.value.playthroughCount >= (req.targetCount || 0)

      default:
        return false
    }
  }

  function checkAndUnlockMilestones(): GlobalMilestone[] {
    const newlyUnlocked: GlobalMilestone[] = []

    state.value.globalMilestones.forEach(milestone => {
      if (milestone.unlocked) return

      const allRequirementsMet = checkMilestoneRequirement(milestone.requirement)

      if (allRequirementsMet) {
        milestone.unlocked = true
        milestone.unlockedAt = Date.now()
        newlyUnlocked.push(milestone)

        if (milestone.reward) {
          applyMilestoneReward(milestone.reward)
        }
      }
    })

    if (newlyUnlocked.length > 0) {
      saveToStorage()
    }

    return newlyUnlocked
  }

  function applyMilestoneReward(reward: {
    tools?: string[]
    sanityBonus?: number
    unlockCases?: string[]
    unlockEvidence?: string[]
    unlockEndings?: string[]
  }) {
    const saveStore = useSaveStore()

    if (reward.tools) {
      reward.tools.forEach(toolId => {
        saveStore.unlockGlobalTool(toolId)
      })
    }

    if (reward.sanityBonus) {
      state.value.carriedSanityBonus += reward.sanityBonus
    }

    if (reward.unlockCases) {
      reward.unlockCases.forEach(caseId => {
        if (!state.value.unlockedHiddenCases.includes(caseId)) {
          state.value.unlockedHiddenCases.push(caseId)
          const caseData = getCaseById(caseId)
          if (caseData) {
            caseData.status = 'available'
          }
        }
      })
    }

    if (reward.unlockEvidence) {
      reward.unlockEvidence.forEach(evidenceId => {
        if (!state.value.unlockedSpecialEvidence.includes(evidenceId)) {
          state.value.unlockedSpecialEvidence.push(evidenceId)
        }
      })
    }

    if (reward.unlockEndings) {
      reward.unlockEndings.forEach(endingId => {
        if (!state.value.unlockedEndings.includes(endingId)) {
          state.value.unlockedEndings.push(endingId)
        }
      })
    }
  }

  function checkHiddenCases(): string[] {
    const newlyUnlocked: string[] = []

    HIDDEN_CASES.forEach(hiddenCase => {
      if (state.value.unlockedHiddenCases.includes(hiddenCase.id)) return

      const allMet = hiddenCase.unlockRequirements.every(req =>
        checkMilestoneRequirement(req)
      )

      if (allMet) {
        hiddenCase.isUnlocked = true
        state.value.unlockedHiddenCases.push(hiddenCase.id)
        newlyUnlocked.push(hiddenCase.id)

        const caseData = getCaseById(hiddenCase.id)
        if (caseData) {
          caseData.status = 'available'
        }
      }
    })

    if (newlyUnlocked.length > 0) {
      saveToStorage()
    }

    return newlyUnlocked
  }

  function checkSpecialEvidence(): string[] {
    const newlyUnlocked: string[] = []

    SPECIAL_EVIDENCE.forEach(special => {
      if (state.value.unlockedSpecialEvidence.includes(special.id)) return
      if (special.ngPlusOnly && !state.value.isNewGamePlus) return

      const allMet = special.unlockRequirements.every(req =>
        checkMilestoneRequirement(req)
      )

      if (allMet) {
        state.value.unlockedSpecialEvidence.push(special.id)
        newlyUnlocked.push(special.id)
      }
    })

    if (newlyUnlocked.length > 0) {
      saveToStorage()
    }

    return newlyUnlocked
  }

  function checkNgPlusEndings(caseId: string): NewGamePlusEnding[] {
    return NGPLUS_ENDINGS.filter(ending => {
      if (ending.caseId !== caseId) return false
      if (state.value.unlockedEndings.includes(ending.id)) return true

      const allMet = ending.unlockRequirements.every(req =>
        checkMilestoneRequirement(req)
      )

      if (allMet && !state.value.unlockedEndings.includes(ending.id)) {
        state.value.unlockedEndings.push(ending.id)
        saveToStorage()
      }

      return state.value.unlockedEndings.includes(ending.id)
    })
  }

  function prepareInheritance() {
    const progressStore = useProgressStore()
    const bestiaryStore = useBestiaryStore()

    const inheritedProgress: Record<string, InheritedCaseData> = {}
    Object.entries(progressStore.progressMap).forEach(([caseId, progress]) => {
      inheritedProgress[caseId] = {
        caseId,
        completed: progress.completed,
        bestGrade: progress.bestGrade,
        bestScore: progress.bestScore?.totalScore,
        unlockedBranches: [...progress.unlockedBranches],
        discoveredEvidence: [...progress.discoveredEvidence],
        discoveredClues: [...progress.discoveredClues],
        playCount: progress.playCount,
        fastestTime: progress.fastestTime,
        endings: progress.playHistory.map(h => h.endingId)
      }
    })

    state.value.inheritedCaseProgress = inheritedProgress
    state.value.inheritedBestiary = {
      discoveredCreatures: [...bestiaryStore.progress.discoveredCreatures],
      discoveredItems: [...bestiaryStore.progress.discoveredItems],
      discoveredOrganizations: [...bestiaryStore.progress.discoveredOrganizations],
      totalDiscovered: bestiaryStore.progress.totalDiscovered
    }
  }

  function startNewGamePlus(caseId: string): boolean {
    const gameStore = useGameStore()
    const saveStore = useSaveStore()

    prepareInheritance()

    state.value.playthroughCount += 1
    state.value.isNewGamePlus = true

    const inheritedTools = saveStore.globalUnlockedTools
    const success = gameStore.startCase(caseId, inheritedTools.length > 0 ? inheritedTools : undefined)

    if (success) {
      gameStore.addLog('discovery', `🔄 二周目开始！这是你第 ${state.value.playthroughCount} 次调查`)

      if (state.value.carriedSanityBonus > 0) {
        gameStore.addLog('discovery', `⚡ 二周目继承：最大理智值 +${state.value.carriedSanityBonus}`)
      }

      if (state.value.inheritedBestiary.totalDiscovered > 0) {
        gameStore.addLog('discovery', `📚 继承图鉴进度：${state.value.inheritedBestiary.totalDiscovered} 项已发现`)
      }

      if (inheritedTools.length > 0) {
        gameStore.addLog('discovery', `🎒 继承工具：${inheritedTools.length} 件`)
      }

      checkAndUnlockMilestones()
      checkHiddenCases()
      checkSpecialEvidence()
    }

    saveToStorage()
    return success
  }

  function isEvidenceUnlocked(evidenceId: string): boolean {
    return state.value.unlockedSpecialEvidence.includes(evidenceId)
  }

  function isCaseUnlocked(caseId: string): boolean {
    return state.value.unlockedHiddenCases.includes(caseId)
  }

  function isEndingUnlocked(endingId: string): boolean {
    return state.value.unlockedEndings.includes(endingId)
  }

  const unlockedMilestones = computed(() =>
    state.value.globalMilestones.filter(m => m.unlocked)
  )

  const totalMilestones = computed(() => state.value.globalMilestones.length)

  const milestoneProgress = computed(() =>
    totalMilestones.value > 0
      ? Math.round((unlockedMilestones.value.length / totalMilestones.value) * 100)
      : 0
  )

  const availableNgPlusEndings = computed(() =>
    NGPLUS_ENDINGS.filter(e => state.value.unlockedEndings.includes(e.id))
  )

  function resetAll() {
    state.value = {
      playthroughCount: 1,
      isNewGamePlus: false,
      inheritedCaseProgress: {},
      inheritedBestiary: {
        discoveredCreatures: [],
        discoveredItems: [],
        discoveredOrganizations: [],
        totalDiscovered: 0
      },
      unlockedHiddenCases: [],
      unlockedSpecialEvidence: [],
      unlockedEndings: [],
      globalMilestones: JSON.parse(JSON.stringify(GLOBAL_MILESTONES)),
      unlockedRecipes: [],
      carriedSanityBonus: 0
    }
    saveToStorage()
  }

  loadFromStorage()

  return {
    state,
    unlockedMilestones,
    totalMilestones,
    milestoneProgress,
    availableNgPlusEndings,
    loadFromStorage,
    saveToStorage,
    checkMilestoneRequirement,
    checkAndUnlockMilestones,
    checkHiddenCases,
    checkSpecialEvidence,
    checkNgPlusEndings,
    prepareInheritance,
    startNewGamePlus,
    isEvidenceUnlocked,
    isCaseUnlocked,
    isEndingUnlocked,
    resetAll
  }
})
