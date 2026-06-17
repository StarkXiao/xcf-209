import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { BestiaryCategory, BestiaryEntry, BestiaryProgress, BestiaryUnlockCondition } from '@/types'
import {
  creatures,
  forbiddenItems,
  organizations,
  getAllBestiaryEntries,
  getBestiaryEntryById,
  setBestiaryDiscovered,
  resetBestiaryDiscovery
} from '@/data/bestiary'
import { useGameStore } from './game'
import { useProgressStore } from './progress'
import { getCaseById } from '@/data/cases'

const STORAGE_KEY = 'cthulhu-bestiary-progress'

export const useBestiaryStore = defineStore('bestiary', () => {
  const progress = ref<BestiaryProgress>({
    discoveredCreatures: [],
    discoveredItems: [],
    discoveredOrganizations: [],
    totalDiscovered: 0,
    discoveryLog: []
  })

  const newDiscoveredIds = ref<string[]>([])

  function loadProgressFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        progress.value = JSON.parse(data)
        applyDiscoveryToEntries()
      }
    } catch (error) {
      console.error('Failed to load bestiary progress:', error)
    }
  }

  function saveProgressToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress.value))
    } catch (error) {
      console.error('Failed to save bestiary progress:', error)
    }
  }

  function applyDiscoveryToEntries() {
    progress.value.discoveredCreatures.forEach(id => {
      const entry = getBestiaryEntryById(id)
      if (entry) {
        entry.discovered = true
      }
    })
    progress.value.discoveredItems.forEach(id => {
      const entry = getBestiaryEntryById(id)
      if (entry) {
        entry.discovered = true
      }
    })
    progress.value.discoveredOrganizations.forEach(id => {
      const entry = getBestiaryEntryById(id)
      if (entry) {
        entry.discovered = true
      }
    })
  }

  function isConditionMet(condition: BestiaryUnlockCondition): boolean {
    const gameStore = useGameStore()
    const progressStore = useProgressStore()

    switch (condition.type) {
      case 'evidence_discovered':
        return condition.requiredId
          ? gameStore.gameState.discoveredEvidence.includes(condition.requiredId)
          : false

      case 'evidence_special':
        if (!condition.requiredId) return false
        const caseData = gameStore.currentCase
        if (!caseData) {
          const prog = progressStore.progressMap[gameStore.gameState.currentCase || '']
          return prog?.discoveredEvidence.includes(condition.requiredId) || false
        }
        const specialEvidence = caseData.scenes.flatMap(s => s.evidence).find(e => e.id === condition.requiredId)
        if (!specialEvidence?.isSpecial) return false
        return gameStore.gameState.discoveredEvidence.includes(condition.requiredId)

      case 'clue_discovered':
        return condition.requiredId
          ? gameStore.gameState.discoveredClues.includes(condition.requiredId)
          : false

      case 'clue_analyzed':
        return condition.requiredId
          ? gameStore.gameState.analyzedClues.includes(condition.requiredId)
          : false

      case 'case_completed':
        return condition.requiredId
          ? progressStore.progressMap[condition.requiredId]?.completed || false
          : false

      case 'branch_unlocked':
        if (!condition.requiredId) return false
        const currentCaseId = gameStore.gameState.currentCase
        if (!currentCaseId) return false
        const caseProgress = progressStore.getProgress(currentCaseId)
        return caseProgress?.unlockedBranches.includes(condition.requiredId) || false

      case 'sanity_under_threshold':
        return condition.threshold !== undefined
          ? gameStore.gameState.sanity <= condition.threshold
          : false

      default:
        return false
    }
  }

  function checkUnlockConditions(): BestiaryEntry[] {
    const allEntries = getAllBestiaryEntries()
    const newlyDiscovered: BestiaryEntry[] = []

    allEntries.forEach(entry => {
      if (entry.discovered) return

      const allConditionsMet = entry.unlockConditions.every(condition => isConditionMet(condition))

      if (allConditionsMet) {
        const caseId = getCurrentCaseId()
        const success = discoverEntry(entry.id, caseId)
        if (success) {
          newlyDiscovered.push(entry)
        }
      }
    })

    return newlyDiscovered
  }

  function getCurrentCaseId(): string {
    const gameStore = useGameStore()
    return gameStore.gameState.currentCase || 'unknown'
  }

  function discoverEntry(entryId: string, caseId: string): boolean {
    const entry = getBestiaryEntryById(entryId)
    if (!entry || entry.discovered) return false

    const success = setBestiaryDiscovered(entryId, caseId)
    if (!success) return false

    switch (entry.category) {
      case 'creature':
        if (!progress.value.discoveredCreatures.includes(entryId)) {
          progress.value.discoveredCreatures.push(entryId)
        }
        break
      case 'forbidden_item':
        if (!progress.value.discoveredItems.includes(entryId)) {
          progress.value.discoveredItems.push(entryId)
        }
        break
      case 'organization':
        if (!progress.value.discoveredOrganizations.includes(entryId)) {
          progress.value.discoveredOrganizations.push(entryId)
        }
        break
    }

    progress.value.totalDiscovered =
      progress.value.discoveredCreatures.length +
      progress.value.discoveredItems.length +
      progress.value.discoveredOrganizations.length

    const unlockMethod = entry.unlockConditions.map(c => c.description).join(' + ')
    progress.value.discoveryLog.push({
      entryId,
      category: entry.category,
      discoveredAt: Date.now(),
      caseId,
      unlockMethod
    })

    if (!newDiscoveredIds.value.includes(entryId)) {
      newDiscoveredIds.value.push(entryId)
    }

    saveProgressToStorage()
    return true
  }

  function clearNewNotification(entryId: string) {
    const index = newDiscoveredIds.value.indexOf(entryId)
    if (index > -1) {
      newDiscoveredIds.value.splice(index, 1)
    }
  }

  function clearAllNewNotifications() {
    newDiscoveredIds.value = []
  }

  function checkAndUnlockOnEvidence(evidenceId: string) {
    const entries = getAllBestiaryEntries().filter(e => !e.discovered)
    const newlyDiscovered: BestiaryEntry[] = []

    entries.forEach(entry => {
      const hasEvidenceCondition = entry.unlockConditions.some(
        c => (c.type === 'evidence_discovered' || c.type === 'evidence_special') && c.requiredId === evidenceId
      )
      if (!hasEvidenceCondition) return

      const allConditionsMet = entry.unlockConditions.every(condition => isConditionMet(condition))
      if (allConditionsMet) {
        const caseId = getCurrentCaseId()
        const success = discoverEntry(entry.id, caseId)
        if (success) {
          newlyDiscovered.push(entry)
        }
      }
    })

    return newlyDiscovered
  }

  function checkAndUnlockOnClue(clueId: string, analyzed: boolean = false) {
    const entries = getAllBestiaryEntries().filter(e => !e.discovered)
    const newlyDiscovered: BestiaryEntry[] = []

    entries.forEach(entry => {
      const hasClueCondition = entry.unlockConditions.some(
        c => ((c.type === 'clue_discovered' && !analyzed) || (c.type === 'clue_analyzed' && analyzed)) && c.requiredId === clueId
      )
      if (!hasClueCondition) return

      const allConditionsMet = entry.unlockConditions.every(condition => isConditionMet(condition))
      if (allConditionsMet) {
        const caseId = getCurrentCaseId()
        const success = discoverEntry(entry.id, caseId)
        if (success) {
          newlyDiscovered.push(entry)
        }
      }
    })

    return newlyDiscovered
  }

  function checkAndUnlockOnCaseComplete(caseId: string, branchId?: string) {
    const entries = getAllBestiaryEntries().filter(e => !e.discovered)
    const newlyDiscovered: BestiaryEntry[] = []

    entries.forEach(entry => {
      const hasCaseCondition = entry.unlockConditions.some(
        c => (c.type === 'case_completed' && c.requiredId === caseId) ||
             (c.type === 'branch_unlocked' && c.requiredId === branchId)
      )
      if (!hasCaseCondition) return

      const allConditionsMet = entry.unlockConditions.every(condition => isConditionMet(condition))
      if (allConditionsMet) {
        const success = discoverEntry(entry.id, caseId)
        if (success) {
          newlyDiscovered.push(entry)
        }
      }
    })

    return newlyDiscovered
  }

  function checkAndUnlockOnSanityChange(sanity: number) {
    const entries = getAllBestiaryEntries().filter(e => !e.discovered)
    const newlyDiscovered: BestiaryEntry[] = []

    entries.forEach(entry => {
      const hasSanityCondition = entry.unlockConditions.some(
        c => c.type === 'sanity_under_threshold' && c.threshold !== undefined && sanity <= c.threshold
      )
      if (!hasSanityCondition) return

      const allConditionsMet = entry.unlockConditions.every(condition => isConditionMet(condition))
      if (allConditionsMet) {
        const caseId = getCurrentCaseId()
        const success = discoverEntry(entry.id, caseId)
        if (success) {
          newlyDiscovered.push(entry)
        }
      }
    })

    return newlyDiscovered
  }

  const discoveredCreatureList = computed(() =>
    creatures.filter(c => c.discovered)
  )

  const discoveredItemList = computed(() =>
    forbiddenItems.filter(i => i.discovered)
  )

  const discoveredOrganizationList = computed(() =>
    organizations.filter(o => o.discovered)
  )

  const totalCreatures = computed(() => creatures.length)
  const totalItems = computed(() => forbiddenItems.length)
  const totalOrganizations = computed(() => organizations.length)
  const totalEntries = computed(() => creatures.length + forbiddenItems.length + organizations.length)

  const creatureProgress = computed(() =>
    totalCreatures.value > 0 ? Math.round((discoveredCreatureList.value.length / totalCreatures.value) * 100) : 0
  )

  const itemProgress = computed(() =>
    totalItems.value > 0 ? Math.round((discoveredItemList.value.length / totalItems.value) * 100) : 0
  )

  const organizationProgress = computed(() =>
    totalOrganizations.value > 0 ? Math.round((discoveredOrganizationList.value.length / totalOrganizations.value) * 100) : 0
  )

  const overallProgress = computed(() =>
    totalEntries.value > 0 ? Math.round((progress.value.totalDiscovered / totalEntries.value) * 100) : 0
  )

  const hasNewDiscoveries = computed(() => newDiscoveredIds.value.length > 0)

  function getEntriesByCategory(category: BestiaryCategory | 'all') {
    if (category === 'all') {
      return getAllBestiaryEntries()
    }
    switch (category) {
      case 'creature':
        return creatures
      case 'forbidden_item':
        return forbiddenItems
      case 'organization':
        return organizations
      default:
        return []
    }
  }

  function getRelatedEntries(entry: BestiaryEntry): BestiaryEntry[] {
    const related: BestiaryEntry[] = []
    const relatedIds: string[] = []

    if (entry.category === 'creature') {
      relatedIds.push(...(entry.relatedOrganizations || []))
      getAllBestiaryEntries().forEach(e => {
        if (e.category === 'forbidden_item' && (e as any).relatedCreatures?.includes(entry.id)) {
          relatedIds.push(e.id)
        }
        if (e.category === 'organization' && (e as any).relatedCreatures?.includes(entry.id)) {
          if (!relatedIds.includes(e.id)) relatedIds.push(e.id)
        }
      })
    } else if (entry.category === 'forbidden_item') {
      relatedIds.push(...(entry.relatedCreatures || []))
      relatedIds.push(...(entry.relatedOrganizations || []))
    } else if (entry.category === 'organization') {
      relatedIds.push(...(entry.relatedCreatures || []))
      relatedIds.push(...(entry.relatedItems || []))
      relatedIds.push(...(entry.alliedOrganizations || []))
      relatedIds.push(...(entry.opposingOrganizations || []))
    }

    const uniqueIds = [...new Set(relatedIds)]
    uniqueIds.forEach(id => {
      const e = getBestiaryEntryById(id)
      if (e) related.push(e)
    })

    return related
  }

  function getDiscoveryDate(entryId: string): number | undefined {
    const logEntry = progress.value.discoveryLog.find(l => l.entryId === entryId)
    return logEntry?.discoveredAt
  }

  function getDiscoveryCaseName(entryId: string): string {
    const logEntry = progress.value.discoveryLog.find(l => l.entryId === entryId)
    if (!logEntry || logEntry.caseId === 'unknown') return '未知案件'
    const caseData = getCaseById(logEntry.caseId)
    return caseData?.title || logEntry.caseId
  }

  function resetAllProgress() {
    resetBestiaryDiscovery()
    progress.value = {
      discoveredCreatures: [],
      discoveredItems: [],
      discoveredOrganizations: [],
      totalDiscovered: 0,
      discoveryLog: []
    }
    newDiscoveredIds.value = []
    saveProgressToStorage()
  }

  function getRarityColor(rarity: string): string {
    const colors: Record<string, string> = {
      common: '#888',
      uncommon: '#3a8b5a',
      rare: '#4a8ac9',
      epic: '#8b4ac9',
      legendary: '#d4a017'
    }
    return colors[rarity] || '#888'
  }

  function getRarityLabel(rarity: string): string {
    const labels: Record<string, string> = {
      common: '普通',
      uncommon: '罕见',
      rare: '稀有',
      epic: '史诗',
      legendary: '传说'
    }
    return labels[rarity] || rarity
  }

  loadProgressFromStorage()

  return {
    progress,
    newDiscoveredIds,
    discoveredCreatureList,
    discoveredItemList,
    discoveredOrganizationList,
    totalCreatures,
    totalItems,
    totalOrganizations,
    totalEntries,
    creatureProgress,
    itemProgress,
    organizationProgress,
    overallProgress,
    hasNewDiscoveries,
    loadProgressFromStorage,
    saveProgressToStorage,
    isConditionMet,
    checkUnlockConditions,
    discoverEntry,
    clearNewNotification,
    clearAllNewNotifications,
    checkAndUnlockOnEvidence,
    checkAndUnlockOnClue,
    checkAndUnlockOnCaseComplete,
    checkAndUnlockOnSanityChange,
    getEntriesByCategory,
    getRelatedEntries,
    getDiscoveryDate,
    getDiscoveryCaseName,
    resetAllProgress,
    getRarityColor,
    getRarityLabel
  }
})
