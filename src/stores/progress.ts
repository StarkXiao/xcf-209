import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { CaseProgress, CaseRewards, CaseScoreBreakdown, PlayRecord } from '@/types'
import { cases, getCaseById, setCaseStatus } from '@/data/cases'
import { useGameStore } from './game'
import { useSaveStore } from './save'
import { useBestiaryStore } from './bestiary'
import { useNewGamePlusStore } from './newGamePlus'

const STORAGE_KEY = 'cthulhu-case-progress'

export const useProgressStore = defineStore('progress', () => {
  const progressMap = ref<Record<string, CaseProgress>>({})

  function loadProgressFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        progressMap.value = JSON.parse(data)
      }
    } catch (error) {
      console.error('Failed to load progress:', error)
      progressMap.value = {}
    }
    syncCaseStatuses()
  }

  function saveProgressToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progressMap.value))
    } catch (error) {
      console.error('Failed to save progress:', error)
    }
  }

  function syncCaseStatuses() {
    cases.forEach(c => {
      const progress = progressMap.value[c.id]
      if (progress?.completed) {
        c.status = 'completed'
      } else if (c.prerequisites.length === 0) {
        c.status = 'available'
      } else {
        const allPrereqsCompleted = c.prerequisites.every(
          prereqId => progressMap.value[prereqId]?.completed
        )
        if (allPrereqsCompleted) {
          c.status = 'available'
        } else {
          c.status = 'locked'
        }
      }
    })

    const gameStore = useGameStore()
    const activeCaseId = gameStore.gameState.currentCase
    if (activeCaseId) {
      const activeCase = getCaseById(activeCaseId)
      if (activeCase && activeCase.status !== 'completed') {
        activeCase.status = 'in_progress'
      }
    }
  }

  function getProgress(caseId: string): CaseProgress | undefined {
    return progressMap.value[caseId]
  }

  function initProgress(caseId: string): CaseProgress {
    if (!progressMap.value[caseId]) {
      progressMap.value[caseId] = {
        caseId,
        completed: false,
        playCount: 0,
        unlockedBranches: [],
        discoveredEvidence: [],
        discoveredClues: [],
        totalSanityLost: 0,
        playHistory: []
      }
    }
    return progressMap.value[caseId]
  }

  function isCaseUnlocked(caseId: string): boolean {
    const caseData = getCaseById(caseId)
    if (!caseData) return false
    if (caseData.status !== 'locked') return true

    if (caseData.prerequisites.length === 0) return true

    return caseData.prerequisites.every(
      prereqId => progressMap.value[prereqId]?.completed
    )
  }

  function canUnlockCase(caseId: string): boolean {
    const caseData = getCaseById(caseId)
    if (!caseData) return false
    if (caseData.status !== 'locked') return false

    if (caseData.prerequisites.length === 0) return true

    return caseData.prerequisites.every(
      prereqId => progressMap.value[prereqId]?.completed
    )
  }

  function unlockCase(caseId: string): boolean {
    if (!canUnlockCase(caseId)) return false
    
    const caseData = getCaseById(caseId)
    if (!caseData) return false
    
    setCaseStatus(caseId, 'available')
    return true
  }

  function checkAndUnlockDependentCases() {
    let changed = true
    while (changed) {
      changed = false
      cases.forEach(c => {
        if (c.status === 'locked' && canUnlockCase(c.id)) {
          setCaseStatus(c.id, 'available')
          changed = true
        }
      })
    }
  }

  function recordCaseCompletion(
    caseId: string,
    endingId: string,
    branchId?: string,
    sanityLost: number = 0,
    score?: CaseScoreBreakdown,
    timeUsed?: number
  ): CaseRewards | null {
    const progress = initProgress(caseId)
    const caseData = getCaseById(caseId)
    if (!caseData) return null

    const wasFirstCompletion = !progress.completed

    progress.completed = true
    progress.completedAt = Date.now()
    progress.playCount += 1
    progress.totalSanityLost += sanityLost

    if (branchId && !progress.unlockedBranches.includes(branchId)) {
      progress.unlockedBranches.push(branchId)
    }

    if (wasFirstCompletion || !progress.bestEnding) {
      progress.bestEnding = endingId
    }

    if (score) {
      if (!progress.bestScore || score.totalScore > progress.bestScore.totalScore) {
        progress.bestScore = score
        progress.bestGrade = score.grade
      }
    }

    if (timeUsed !== undefined) {
      if (!progress.fastestTime || timeUsed < progress.fastestTime) {
        progress.fastestTime = timeUsed
      }
    }

    if (score && timeUsed !== undefined) {
      const playRecord: PlayRecord = {
        completedAt: Date.now(),
        endingId,
        branch: branchId,
        score,
        timeUsed,
        sanityLost
      }
      progress.playHistory.push(playRecord)
    }

    setCaseStatus(caseId, 'completed')

    let rewards: CaseRewards | null = null
    if (branchId && caseData.branchRewards?.[branchId]) {
      rewards = caseData.branchRewards[branchId]
    } else if (caseData.rewards) {
      rewards = caseData.rewards
    }

    if (rewards) {
      const saveStore = useSaveStore()
      rewards.tools.forEach(toolId => {
        saveStore.unlockGlobalTool(toolId)
      })
    }

    const bestiaryStore = useBestiaryStore()
    bestiaryStore.checkAndUnlockOnCaseComplete(caseId)

    const newGamePlusStore = useNewGamePlusStore()
    newGamePlusStore.checkAndUnlockMilestones()
    newGamePlusStore.checkHiddenCases()
    newGamePlusStore.checkSpecialEvidence()
    newGamePlusStore.checkNgPlusEndings(caseId)

    checkAndUnlockDependentCases()
    saveProgressToStorage()

    return rewards
  }

  function updateDiscoveredItems(
    caseId: string,
    evidenceIds: string[],
    clueIds: string[]
  ) {
    const progress = initProgress(caseId)
    
    evidenceIds.forEach(eid => {
      if (!progress.discoveredEvidence.includes(eid)) {
        progress.discoveredEvidence.push(eid)
      }
    })
    
    clueIds.forEach(cid => {
      if (!progress.discoveredClues.includes(cid)) {
        progress.discoveredClues.push(cid)
      }
    })
    
    saveProgressToStorage()
  }

  const completedCases = computed(() => {
    return Object.values(progressMap.value).filter(p => p.completed).map(p => p.caseId)
  })

  const totalCompleted = computed(() => completedCases.value.length)

  const totalBranches = computed(() => {
    return Object.values(progressMap.value).reduce(
      (sum, p) => sum + p.unlockedBranches.length, 0
    )
  })

  const chapterTree = computed(() => {
    const chapters: Map<number, typeof cases> = new Map()
    
    cases.forEach(c => {
      const ch = c.chapter || 1
      if (!chapters.has(ch)) {
        chapters.set(ch, [])
      }
      chapters.get(ch)!.push(c)
    })

    return Array.from(chapters.entries())
      .sort(([a], [b]) => a - b)
      .map(([chapter, chapterCases]) => ({
        chapter,
        cases: chapterCases.sort((a, b) => {
          const order = { in_progress: 0, available: 1, completed: 2, locked: 3 }
          return order[a.status] - order[b.status]
        })
      }))
  })

  function resetAllProgress() {
    progressMap.value = {}
    saveProgressToStorage()
    
    cases.forEach((c, i) => {
      c.status = i === 0 ? 'available' : 'locked'
    })
  }

  loadProgressFromStorage()

  return {
    progressMap,
    completedCases,
    totalCompleted,
    totalBranches,
    chapterTree,
    getProgress,
    initProgress,
    isCaseUnlocked,
    canUnlockCase,
    unlockCase,
    checkAndUnlockDependentCases,
    recordCaseCompletion,
    updateDiscoveredItems,
    resetAllProgress,
    loadProgressFromStorage,
    saveProgressToStorage
  }
})
