import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Commission, CommissionHistoryEntry, CommissionDifficulty, CommissionRisk, CommissionCategory } from '@/types'
import { commissions, getCommissionById, getRecommendedCommissions, setCommissionStatus } from '@/data/commissions'
import { useProgressStore } from './progress'
import { useSaveStore } from './save'
import { useGameStore } from './game'

const STORAGE_KEY = 'cthulhu-commission-hall'

export const useCommissionHallStore = defineStore('commissionHall', () => {
  const reputation = ref(0)
  const activeCommissionId = ref<string | null>(null)
  const history = ref<CommissionHistoryEntry[]>([])
  const lastRefreshTime = ref(0)
  const totalCommissionsCompleted = ref(0)
  const totalReputationEarned = ref(0)

  const reputationRanks = [
    { min: 0, rank: '新手调查员', title: '🔰' },
    { min: 100, rank: '初级调查员', title: '⭐' },
    { min: 300, rank: '中级调查员', title: '⭐⭐' },
    { min: 600, rank: '高级调查员', title: '⭐⭐⭐' },
    { min: 1000, rank: '资深调查员', title: '🏅' },
    { min: 2000, rank: '传奇调查员', title: '👑' }
  ]

  function loadFromStorage() {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      if (data) {
        const parsed = JSON.parse(data)
        reputation.value = parsed.reputation || 0
        activeCommissionId.value = parsed.activeCommissionId || null
        history.value = parsed.history || []
        lastRefreshTime.value = parsed.lastRefreshTime || 0
        totalCommissionsCompleted.value = parsed.totalCommissionsCompleted || 0
        totalReputationEarned.value = parsed.totalReputationEarned || 0
      }
    } catch (error) {
      console.error('Failed to load commission hall data:', error)
    }
  }

  function saveToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        reputation: reputation.value,
        activeCommissionId: activeCommissionId.value,
        history: history.value,
        lastRefreshTime: lastRefreshTime.value,
        totalCommissionsCompleted: totalCommissionsCompleted.value,
        totalReputationEarned: totalReputationEarned.value
      }))
    } catch (error) {
      console.error('Failed to save commission hall data:', error)
    }
  }

  const reputationRank = computed(() => {
    let current = reputationRanks[0]
    for (const rank of reputationRanks) {
      if (reputation.value >= rank.min) {
        current = rank
      }
    }
    return current
  })

  const nextRank = computed(() => {
    const currentIndex = reputationRanks.findIndex(r => r.rank === reputationRank.value.rank)
    if (currentIndex < reputationRanks.length - 1) {
      return reputationRanks[currentIndex + 1]
    }
    return null
  })

  const reputationProgress = computed(() => {
    const next = nextRank.value
    if (!next) return 100
    const currentMin = reputationRank.value.min
    const progress = ((reputation.value - currentMin) / (next.min - currentMin)) * 100
    return Math.min(100, Math.max(0, progress))
  })

  const availableCommissions = computed(() => commissions.filter(c => c.status === 'available'))
  const activeCommissions = computed(() => commissions.filter(c => c.status === 'in_progress'))
  const completedCommissions = computed(() => commissions.filter(c => c.status === 'completed'))
  const activeCommission = computed(() => activeCommissionId.value ? getCommissionById(activeCommissionId.value) : null)

  function getFilteredCommissions(
    difficulty?: CommissionDifficulty | 'all',
    riskLevel?: CommissionRisk | 'all',
    category?: CommissionCategory | 'all',
    searchQuery?: string
  ): Commission[] {
    return commissions.filter(c => {
      if (c.status !== 'available') return false
      if (difficulty && difficulty !== 'all' && c.difficulty !== difficulty) return false
      if (riskLevel && riskLevel !== 'all' && c.riskLevel !== riskLevel) return false
      if (category && category !== 'all' && c.category !== category) return false
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const inTitle = c.title.toLowerCase().includes(query)
        const inDesc = c.description.toLowerCase().includes(query)
        const inTags = c.tags.some(t => t.toLowerCase().includes(query))
        const inClient = c.client.toLowerCase().includes(query)
        if (!inTitle && !inDesc && !inTags && !inClient) return false
      }
      return true
    })
  }

  function getPersonalRecommendations(currentSanity: number): Commission[] {
    const progressStore = useProgressStore()
    return getRecommendedCommissions(currentSanity, reputation.value, progressStore.completedCases)
  }

  function isCommissionAcceptable(commission: Commission, currentSanity: number): { acceptable: boolean; reasons: string[] } {
    const reasons: string[] = []
    const progressStore = useProgressStore()
    const saveStore = useSaveStore()

    if (activeCommissionId.value) {
      reasons.push('已有进行中的委托')
    }

    if (commission.prerequisites?.minReputation && reputation.value < commission.prerequisites.minReputation) {
      reasons.push(`声望不足（需要 ${commission.prerequisites.minReputation}，当前 ${reputation.value}）`)
    }

    if (commission.prerequisites?.completedCases) {
      const missingCases = commission.prerequisites.completedCases.filter(
        id => !progressStore.completedCases.includes(id)
      )
      if (missingCases.length > 0) {
        reasons.push(`需要先完成指定案件`)
      }
    }

    if (commission.prerequisites?.requiredTools) {
      const globalTools = saveStore.globalUnlockedTools
      const missingTools = commission.prerequisites.requiredTools.filter(
        id => !globalTools.includes(id)
      )
      if (missingTools.length > 0) {
        reasons.push(`缺少必要工具`)
      }
    }

    if (currentSanity < commission.recommendedSanity * 0.6) {
      reasons.push(`理智值过低（建议 ${commission.recommendedSanity}+，当前 ${currentSanity}）`)
    }

    return {
      acceptable: reasons.length === 0,
      reasons
    }
  }

  function acceptCommission(commissionId: string): boolean {
    const commission = getCommissionById(commissionId)
    if (!commission) return false
    if (commission.status !== 'available') return false

    const gameStore = useGameStore()
    const check = isCommissionAcceptable(commission, gameStore.gameState.sanity)
    if (!check.acceptable) {
      alert(`无法接受委托：\n${check.reasons.join('\n')}`)
      return false
    }

    setCommissionStatus(commissionId, 'in_progress')
    activeCommissionId.value = commissionId
    saveToStorage()
    return true
  }

  function completeCommission(commissionId: string, success: boolean, sanityLost: number = 0) {
    const commission = getCommissionById(commissionId)
    if (!commission || commission.status !== 'in_progress') return null

    let rewards = null
    if (success) {
      setCommissionStatus(commissionId, 'completed')
      totalCommissionsCompleted.value += 1
      reputation.value += commission.rewards.reputation
      totalReputationEarned.value += commission.rewards.reputation
      rewards = commission.rewards

      const saveStore = useSaveStore()
      if (commission.rewards.tools) {
        commission.rewards.tools.forEach(toolId => {
          saveStore.unlockGlobalTool(toolId)
        })
      }

      const historyEntry: CommissionHistoryEntry = {
        commissionId,
        title: commission.title,
        acceptedAt: commission.acceptedAt || Date.now(),
        completedAt: Date.now(),
        result: 'completed',
        sanityGained: commission.rewards.sanityBonus,
        sanityLost,
        reputationGained: commission.rewards.reputation,
        materialsCollected: commission.rewards.materials
      }
      history.value.unshift(historyEntry)
    } else {
      setCommissionStatus(commissionId, 'failed')
      reputation.value = Math.max(0, reputation.value - commission.failurePenalty.reputationLoss)

      const historyEntry: CommissionHistoryEntry = {
        commissionId,
        title: commission.title,
        acceptedAt: commission.acceptedAt || Date.now(),
        completedAt: Date.now(),
        result: 'failed',
        sanityGained: 0,
        sanityLost: commission.failurePenalty.sanityLoss + sanityLost,
        reputationGained: -commission.failurePenalty.reputationLoss,
        materialsCollected: [],
        notes: commission.failurePenalty.description
      }
      history.value.unshift(historyEntry)
    }

    activeCommissionId.value = null
    saveToStorage()
    return rewards
  }

  function abandonCommission(commissionId: string) {
    const commission = getCommissionById(commissionId)
    if (!commission || commission.status !== 'in_progress') return

    const penalty = Math.floor(commission.failurePenalty.reputationLoss / 2)
    reputation.value = Math.max(0, reputation.value - penalty)

    const historyEntry: CommissionHistoryEntry = {
      commissionId,
      title: commission.title,
      acceptedAt: commission.acceptedAt || Date.now(),
      completedAt: Date.now(),
      result: 'abandoned',
      sanityGained: 0,
      sanityLost: Math.floor(commission.failurePenalty.sanityLoss / 2),
      reputationGained: -penalty,
      materialsCollected: [],
      notes: '委托被放弃'
    }
    history.value.unshift(historyEntry)

    setCommissionStatus(commissionId, 'available')
    activeCommissionId.value = null
    saveToStorage()
  }

  function refreshCommissions(): boolean {
    const now = Date.now()
    const cooldown = 30 * 60 * 1000
    if (now - lastRefreshTime.value < cooldown) {
      return false
    }
    lastRefreshTime.value = now
    saveToStorage()
    return true
  }

  const refreshCooldownRemaining = computed(() => {
    const cooldown = 30 * 60 * 1000
    const remaining = cooldown - (Date.now() - lastRefreshTime.value)
    return Math.max(0, remaining)
  })

  function formatTime(ms: number): string {
    const minutes = Math.floor(ms / 60000)
    const seconds = Math.floor((ms % 60000) / 1000)
    return `${minutes}:${seconds.toString().padStart(2, '0')}`
  }

  function resetAll() {
    reputation.value = 0
    activeCommissionId.value = null
    history.value = []
    lastRefreshTime.value = 0
    totalCommissionsCompleted.value = 0
    totalReputationEarned.value = 0
    commissions.forEach(c => {
      c.status = 'available'
      c.acceptedAt = undefined
      c.completedAt = undefined
      c.deadline = undefined
    })
    saveToStorage()
  }

  loadFromStorage()

  return {
    reputation,
    reputationRank,
    nextRank,
    reputationProgress,
    activeCommissionId,
    activeCommission,
    availableCommissions,
    activeCommissions,
    completedCommissions,
    history,
    totalCommissionsCompleted,
    totalReputationEarned,
    lastRefreshTime,
    refreshCooldownRemaining,
    getFilteredCommissions,
    getPersonalRecommendations,
    isCommissionAcceptable,
    acceptCommission,
    completeCommission,
    abandonCommission,
    refreshCommissions,
    formatTime,
    resetAll,
    loadFromStorage,
    saveToStorage
  }
})
