<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useCommissionHallStore } from '@/stores/commissionHall'
import { useGameStore } from '@/stores/game'
import { getMaterialById } from '@/data/materials'
import { getToolById } from '@/data/tools'
import type { Commission, CommissionDifficulty, CommissionRisk, CommissionCategory } from '@/types'

const router = useRouter()
const commissionHallStore = useCommissionHallStore()
const gameStore = useGameStore()

const activeTab = ref<'available' | 'active' | 'history'>('available')
const selectedCommission = ref<Commission | null>(null)
const showDetailModal = ref(false)
const showRewardModal = ref(false)
const lastReward = ref<any>(null)

const filterDifficulty = ref<CommissionDifficulty | 'all'>('all')
const filterRisk = ref<CommissionRisk | 'all'>('all')
const filterCategory = ref<CommissionCategory | 'all'>('all')
const searchQuery = ref('')

const difficultyOptions = [
  { value: 'all', label: '全部难度', color: '#888' },
  { value: 'trivial', label: '🟢 琐碎', color: '#4a9b6a' },
  { value: 'easy', label: '🟢 简单', color: '#3a8b5a' },
  { value: 'normal', label: '🟡 普通', color: '#8b6b3a' },
  { value: 'hard', label: '🟠 困难', color: '#8b4a3a' },
  { value: 'nightmare', label: '🔴 噩梦', color: '#8b3a3a' }
]

const riskOptions = [
  { value: 'all', label: '全部风险', color: '#888' },
  { value: 'low', label: '🟢 低风险', color: '#3a8b5a' },
  { value: 'medium', label: '🟡 中风险', color: '#8b6b3a' },
  { value: 'high', label: '🟠 高风险', color: '#8b4a3a' },
  { value: 'extreme', label: '🔴 极高风险', color: '#8b3a3a' }
]

const categoryOptions = [
  { value: 'all', label: '全部类型', icon: '📋' },
  { value: 'missing_person', label: '失踪调查', icon: '🔍' },
  { value: 'paranormal', label: '超自然', icon: '👻' },
  { value: 'artifact', label: '物品鉴定', icon: '📦' },
  { value: 'ritual', label: '仪式调查', icon: '🕯️' },
  { value: 'creature', label: '生物追踪', icon: '🦑' },
  { value: 'organization', label: '组织渗透', icon: '🏛️' }
]

const difficultyLabels: Record<string, string> = {
  trivial: '琐碎',
  easy: '简单',
  normal: '普通',
  hard: '困难',
  nightmare: '噩梦'
}

const difficultyColors: Record<string, string> = {
  trivial: '#4a9b6a',
  easy: '#3a8b5a',
  normal: '#8b6b3a',
  hard: '#8b4a3a',
  nightmare: '#8b3a3a'
}

const riskLabels: Record<string, string> = {
  low: '低风险',
  medium: '中风险',
  high: '高风险',
  extreme: '极高风险'
}

const riskColors: Record<string, string> = {
  low: '#3a8b5a',
  medium: '#8b6b3a',
  high: '#8b4a3a',
  extreme: '#8b3a3a'
}

const categoryLabels: Record<string, string> = {
  missing_person: '失踪调查',
  paranormal: '超自然',
  artifact: '物品鉴定',
  ritual: '仪式调查',
  creature: '生物追踪',
  organization: '组织渗透'
}

const categoryIcons: Record<string, string> = {
  missing_person: '🔍',
  paranormal: '👻',
  artifact: '📦',
  ritual: '🕯️',
  creature: '🦑',
  organization: '🏛️'
}

const currentSanity = computed(() => gameStore.gameState.sanity)
const maxSanity = computed(() => gameStore.gameState.maxSanity)

const filteredCommissions = computed(() => {
  return commissionHallStore.getFilteredCommissions(
    filterDifficulty.value,
    filterRisk.value,
    filterCategory.value,
    searchQuery.value
  )
})

const recommendedCommissions = computed(() => {
  return commissionHallStore.getPersonalRecommendations(currentSanity.value)
})

function openDetail(commission: Commission) {
  selectedCommission.value = commission
  showDetailModal.value = true
}

function closeDetail() {
  showDetailModal.value = false
  selectedCommission.value = null
}

function acceptSelectedCommission() {
  if (!selectedCommission.value) return
  const success = commissionHallStore.acceptCommission(selectedCommission.value.id)
  if (success) {
    closeDetail()
    activeTab.value = 'active'
  }
}

function simulateComplete(success: boolean) {
  if (!selectedCommission.value) return
  const rewards = commissionHallStore.completeCommission(selectedCommission.value.id, success, success ? 10 : 30)
  if (success && rewards) {
    lastReward.value = {
      commission: selectedCommission.value,
      rewards
    }
    showRewardModal.value = true
  }
  closeDetail()
}

function abandonSelectedCommission() {
  if (!selectedCommission.value) return
  if (confirm('确定要放弃这个委托吗？你将损失部分声望。')) {
    commissionHallStore.abandonCommission(selectedCommission.value.id)
    closeDetail()
    activeTab.value = 'available'
  }
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function getMaterialName(id: string): string {
  return getMaterialById(id)?.name || id
}

function getToolName(id: string): string {
  return getToolById(id)?.name || id
}

function getAcceptabilityInfo(commission: Commission) {
  return commissionHallStore.isCommissionAcceptable(commission, currentSanity.value)
}

function goHome() {
  router.push('/')
}

function resetFilters() {
  filterDifficulty.value = 'all'
  filterRisk.value = 'all'
  filterCategory.value = 'all'
  searchQuery.value = ''
}
</script>

<template>
  <div class="commission-hall page-container">
    <div class="page-header">
      <div class="header-top">
        <div class="back-btn" @click="goHome">
          ← 返回
        </div>
        <div class="title-area">
          <h1 class="page-title">📜 调查委托大厅</h1>
          <p class="page-subtitle">接受委托，获取资源，提升声望</p>
        </div>
        <div class="header-spacer"></div>
      </div>

      <div class="investigator-status card">
        <div class="status-item">
          <span class="status-icon">{{ commissionHallStore.reputationRank.title }}</span>
          <div class="status-info">
            <span class="status-label">等级</span>
            <span class="status-value">{{ commissionHallStore.reputationRank.rank }}</span>
          </div>
        </div>
        <div class="status-item reputation-item">
          <span class="status-icon">⭐</span>
          <div class="status-info flex-1">
            <div class="status-header">
              <span class="status-label">声望</span>
              <span class="status-value">{{ commissionHallStore.reputation }}</span>
              <span v-if="commissionHallStore.nextRank" class="next-rank">
                / {{ commissionHallStore.nextRank.min }} ({{ commissionHallStore.nextRank.rank }})
              </span>
            </div>
            <div class="reputation-bar">
              <div class="reputation-fill" :style="{ width: `${commissionHallStore.reputationProgress}%` }"></div>
            </div>
          </div>
        </div>
        <div class="status-item">
          <span class="status-icon">🧠</span>
          <div class="status-info">
            <span class="status-label">理智</span>
            <span class="status-value sanity-value" :class="{ 'sanity-low': currentSanity < 50 }">
              {{ currentSanity }} / {{ maxSanity }}
            </span>
          </div>
        </div>
        <div class="status-item">
          <span class="status-icon">📊</span>
          <div class="status-info">
            <span class="status-label">已完成</span>
            <span class="status-value">{{ commissionHallStore.totalCommissionsCompleted }} 个委托</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="recommendedCommissions.length > 0 && activeTab === 'available'" class="recommendation-section card">
      <div class="section-header">
        <h3 class="section-title">🎯 为你推荐</h3>
        <span class="section-subtitle">根据你的理智值、声望和已完成案件智能推荐</span>
      </div>
      <div class="recommendation-grid">
        <div
          v-for="commission in recommendedCommissions"
          :key="commission.id"
          class="recommendation-card commission-card"
          :class="{ 'recommended': commission.isRecommended }"
          @click="openDetail(commission)"
        >
          <div v-if="commission.isRecommended" class="recommend-badge">⭐ 推荐</div>
          <div class="card-header">
            <span class="category-icon">{{ categoryIcons[commission.category] }}</span>
            <div class="card-tags">
              <span 
                class="tag difficulty-tag" 
                :style="{ backgroundColor: difficultyColors[commission.difficulty] }"
              >
                {{ difficultyLabels[commission.difficulty] }}
              </span>
              <span 
                class="tag risk-tag" 
                :style="{ backgroundColor: riskColors[commission.riskLevel] }"
              >
                {{ riskLabels[commission.riskLevel] }}
              </span>
            </div>
          </div>
          <h4 class="card-title">{{ commission.title }}</h4>
          <p class="card-description">{{ commission.description }}</p>
          <div class="card-meta">
            <span class="client">👤 {{ commission.client }}</span>
            <span class="time">⏱️ {{ commission.timeLimitMinutes }}分钟</span>
          </div>
          <div class="card-rewards">
            <span class="reward-item">+{{ commission.rewards.reputation }} 声望</span>
            <span class="reward-item">+{{ commission.rewards.sanityBonus }} 理智</span>
          </div>
          <div v-if="commission.recommendationReason" class="recommend-reason">
            💡 {{ commission.recommendationReason }}
          </div>
        </div>
      </div>
    </div>

    <div class="tabs-container">
      <div class="tabs">
        <div 
          class="tab" 
          :class="{ active: activeTab === 'available' }"
          @click="activeTab = 'available'"
        >
          <span class="tab-icon">📋</span>
          <span>可接委托</span>
          <span class="tab-count">{{ commissionHallStore.availableCommissions.length }}</span>
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'active' }"
          @click="activeTab = 'active'"
        >
          <span class="tab-icon">⚡</span>
          <span>进行中</span>
          <span class="tab-count" v-if="commissionHallStore.activeCommissions.length > 0">
            {{ commissionHallStore.activeCommissions.length }}
          </span>
        </div>
        <div 
          class="tab" 
          :class="{ active: activeTab === 'history' }"
          @click="activeTab = 'history'"
        >
          <span class="tab-icon">📚</span>
          <span>历史记录</span>
          <span class="tab-count" v-if="commissionHallStore.history.length > 0">
            {{ commissionHallStore.history.length }}
          </span>
        </div>
      </div>
    </div>

    <div v-if="activeTab === 'available'" class="content-section">
      <div class="filters-card card">
        <div class="filters-header">
          <h3 class="filters-title">🔧 筛选条件</h3>
          <button class="reset-btn" @click="resetFilters">重置</button>
        </div>
        <div class="filters-row">
          <div class="filter-group">
            <label class="filter-label">难度</label>
            <div class="filter-options">
              <button
                v-for="opt in difficultyOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: filterDifficulty === opt.value }"
                @click="filterDifficulty = opt.value as any"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="filters-row">
          <div class="filter-group">
            <label class="filter-label">风险等级</label>
            <div class="filter-options">
              <button
                v-for="opt in riskOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: filterRisk === opt.value }"
                @click="filterRisk = opt.value as any"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="filters-row">
          <div class="filter-group">
            <label class="filter-label">委托类型</label>
            <div class="filter-options">
              <button
                v-for="opt in categoryOptions"
                :key="opt.value"
                class="filter-btn"
                :class="{ active: filterCategory === opt.value }"
                @click="filterCategory = opt.value as any"
              >
                {{ opt.icon }} {{ opt.label }}
              </button>
            </div>
          </div>
        </div>
        <div class="filters-row">
          <div class="filter-group search-group">
            <label class="filter-label">搜索</label>
            <input 
              type="text" 
              v-model="searchQuery" 
              placeholder="搜索委托名称、描述、标签..."
              class="search-input"
            />
          </div>
        </div>
      </div>

      <div v-if="filteredCommissions.length > 0" class="commissions-grid">
        <div
          v-for="commission in filteredCommissions"
          :key="commission.id"
          class="commission-card card"
          :class="{ 
            'not-acceptable': !getAcceptabilityInfo(commission).acceptable 
          }"
          @click="openDetail(commission)"
        >
          <div class="card-header">
            <span class="category-icon">{{ categoryIcons[commission.category] }}</span>
            <div class="card-tags">
              <span 
                class="tag difficulty-tag" 
                :style="{ backgroundColor: difficultyColors[commission.difficulty] }"
              >
                {{ difficultyLabels[commission.difficulty] }}
              </span>
              <span 
                class="tag risk-tag" 
                :style="{ backgroundColor: riskColors[commission.riskLevel] }"
              >
                {{ riskLabels[commission.riskLevel] }}
              </span>
            </div>
          </div>

          <h4 class="card-title">{{ commission.title }}</h4>
          <p class="card-description">{{ commission.description }}</p>

          <div class="commission-tags">
            <span v-for="tag in commission.tags" :key="tag" class="commission-tag">
              #{{ tag }}
            </span>
          </div>

          <div class="card-meta">
            <span class="client">👤 {{ commission.client }}</span>
            <span class="time">⏱️ {{ commission.timeLimitMinutes }}分钟</span>
          </div>

          <div class="card-stats">
            <div class="stat-item">
              <span class="stat-label">预计理智消耗</span>
              <span class="stat-value danger">-{{ commission.sanityCost }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">建议理智值</span>
              <span class="stat-value">{{ commission.recommendedSanity }}+</span>
            </div>
          </div>

          <div class="risk-warning-mini" v-if="commission.riskLevel === 'high' || commission.riskLevel === 'extreme'">
            <span v-if="commission.riskLevel === 'extreme'" class="warning-extreme">
              ⚠️ 极高风险
            </span>
            <span v-else class="warning-high">
              ⚠️ 高风险
            </span>
            <span class="warning-count">{{ commission.riskWarnings.length }} 条风险提示</span>
          </div>

          <div class="card-rewards-preview">
            <span class="reward-item reputation">+{{ commission.rewards.reputation }} ⭐</span>
            <span class="reward-item sanity">+{{ commission.rewards.sanityBonus }} 🧠</span>
            <span class="reward-item materials">{{ commission.rewards.materials.length }} 材料</span>
          </div>

          <div v-if="!getAcceptabilityInfo(commission).acceptable" class="acceptability-warning">
            <span class="lock-icon">🔒</span>
            <span>不满足条件</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state card">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">没有找到匹配的委托</h3>
        <p class="empty-desc">尝试调整筛选条件或重置筛选</p>
        <button class="primary" @click="resetFilters">重置筛选</button>
      </div>
    </div>

    <div v-if="activeTab === 'active'" class="content-section">
      <div v-if="commissionHallStore.activeCommissions.length > 0" class="active-list">
        <div
          v-for="commission in commissionHallStore.activeCommissions"
          :key="commission.id"
          class="active-card card"
          @click="openDetail(commission)"
        >
          <div class="active-header">
            <div class="active-title-area">
              <span class="category-icon">{{ categoryIcons[commission.category] }}</span>
              <h3 class="active-title">{{ commission.title }}</h3>
              <span 
                class="tag difficulty-tag" 
                :style="{ backgroundColor: difficultyColors[commission.difficulty] }"
              >
                {{ difficultyLabels[commission.difficulty] }}
              </span>
            </div>
            <div class="active-status in-progress">
              ⚡ 进行中
            </div>
          </div>

          <p class="active-desc">{{ commission.description }}</p>

          <div class="active-details">
            <div class="detail-item">
              <span class="detail-label">委托人</span>
              <span class="detail-value">{{ commission.clientAvatar }} {{ commission.client }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">接受时间</span>
              <span class="detail-value">{{ commission.acceptedAt ? formatDate(commission.acceptedAt) : '-' }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">完成奖励</span>
              <span class="detail-value reward">
                +{{ commission.rewards.reputation }}声望 / +{{ commission.rewards.sanityBonus }}理智
              </span>
            </div>
            <div class="detail-item">
              <span class="detail-label">失败惩罚</span>
              <span class="detail-value penalty">
                -{{ commission.failurePenalty.reputationLoss }}声望 / -{{ commission.failurePenalty.sanityLoss }}理智
              </span>
            </div>
          </div>

          <div class="active-actions">
            <button class="danger" @click.stop="() => { selectedCommission = commission; abandonSelectedCommission() }">
              放弃委托
            </button>
            <button class="primary" @click.stop="openDetail(commission)">
              查看详情
            </button>
          </div>
        </div>
      </div>

      <div v-else class="empty-state card">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">暂无进行中的委托</h3>
        <p class="empty-desc">去可接委托列表选择一个委托开始吧</p>
        <button class="primary" @click="activeTab = 'available'">浏览委托</button>
      </div>
    </div>

    <div v-if="activeTab === 'history'" class="content-section">
      <div v-if="commissionHallStore.history.length > 0" class="history-list">
        <div
          v-for="(entry, index) in commissionHallStore.history"
          :key="index"
          class="history-card card"
          :class="`result-${entry.result}`"
        >
          <div class="history-header">
            <div class="history-result">
              <span v-if="entry.result === 'completed'" class="result-icon success">✓</span>
              <span v-else-if="entry.result === 'failed'" class="result-icon failed">✗</span>
              <span v-else class="result-icon abandoned">⊘</span>
              <span class="result-text">
                {{ entry.result === 'completed' ? '完成' : entry.result === 'failed' ? '失败' : '放弃' }}
              </span>
            </div>
            <h3 class="history-title">{{ entry.title }}</h3>
          </div>

          <div class="history-time">
            <span>接受: {{ formatDate(entry.acceptedAt) }}</span>
            <span v-if="entry.completedAt">完成: {{ formatDate(entry.completedAt) }}</span>
          </div>

          <div class="history-stats">
            <div class="history-stat" :class="{ positive: entry.sanityGained > 0 }">
              <span class="stat-label">理智变化</span>
              <span class="stat-value">
                +{{ entry.sanityGained }} / -{{ entry.sanityLost }}
              </span>
            </div>
            <div class="history-stat" :class="{ positive: entry.reputationGained > 0 }">
              <span class="stat-label">声望变化</span>
              <span class="stat-value">
                {{ entry.reputationGained > 0 ? '+' : '' }}{{ entry.reputationGained }}
              </span>
            </div>
            <div v-if="entry.grade" class="history-stat">
              <span class="stat-label">评级</span>
              <span class="stat-value grade" :class="`grade-${entry.grade.toLowerCase()}`">
                {{ entry.grade }}
              </span>
            </div>
          </div>

          <div v-if="entry.materialsCollected.length > 0 && entry.result === 'completed'" class="history-materials">
            <span class="materials-label">获得材料:</span>
            <span v-for="m in entry.materialsCollected" :key="m.materialId" class="material-tag">
              {{ getMaterialName(m.materialId) }} ×{{ m.quantity }}
            </span>
          </div>

          <div v-if="entry.notes" class="history-notes">
            <span class="notes-label">备注:</span>
            <span class="notes-text">{{ entry.notes }}</span>
          </div>
        </div>
      </div>

      <div v-else class="empty-state card">
        <div class="empty-icon">📚</div>
        <h3 class="empty-title">暂无历史记录</h3>
        <p class="empty-desc">完成或放弃委托后将在此处显示</p>
      </div>
    </div>

    <div v-if="showDetailModal && selectedCommission" class="modal-overlay" @click.self="closeDetail">
      <div class="modal detail-modal">
        <div class="modal-header">
          <div class="modal-title-area">
            <span class="category-icon large">{{ categoryIcons[selectedCommission.category] }}</span>
            <div>
              <h2 class="modal-title">{{ selectedCommission.title }}</h2>
              <p class="modal-subtitle">{{ categoryLabels[selectedCommission.category] }} · 委托人: {{ selectedCommission.clientAvatar }} {{ selectedCommission.client }}</p>
            </div>
          </div>
          <button class="close-btn" @click="closeDetail">✕</button>
        </div>

        <div class="modal-content">
          <div class="detail-section">
            <h4 class="section-label">📋 委托详情</h4>
            <p class="full-details">{{ selectedCommission.fullDetails }}</p>
          </div>

          <div class="detail-tags-row">
            <span 
              class="tag large-tag" 
              :style="{ backgroundColor: difficultyColors[selectedCommission.difficulty] }"
            >
              难度: {{ difficultyLabels[selectedCommission.difficulty] }}
            </span>
            <span 
              class="tag large-tag" 
              :style="{ backgroundColor: riskColors[selectedCommission.riskLevel] }"
            >
              风险: {{ riskLabels[selectedCommission.riskLevel] }}
            </span>
            <span class="tag large-tag info-tag">
              ⏱️ {{ selectedCommission.timeLimitMinutes }} 分钟
            </span>
          </div>

          <div class="detail-columns">
            <div class="detail-column card inner-card">
              <h4 class="section-label success">🎁 完成奖励</h4>
              <div class="reward-list">
                <div class="reward-row">
                  <span class="reward-icon">⭐</span>
                  <span class="reward-name">声望</span>
                  <span class="reward-value success">+{{ selectedCommission.rewards.reputation }}</span>
                </div>
                <div class="reward-row">
                  <span class="reward-icon">🧠</span>
                  <span class="reward-name">理智回复</span>
                  <span class="reward-value success">+{{ selectedCommission.rewards.sanityBonus }}</span>
                </div>
                <div v-for="m in selectedCommission.rewards.materials" :key="m.materialId" class="reward-row">
                  <span class="reward-icon">📦</span>
                  <span class="reward-name">{{ getMaterialName(m.materialId) }}</span>
                  <span class="reward-value">×{{ m.quantity }}</span>
                </div>
                <div v-for="toolId in (selectedCommission.rewards.tools || [])" :key="toolId" class="reward-row special">
                  <span class="reward-icon">🔧</span>
                  <span class="reward-name">{{ getToolName(toolId) }}</span>
                  <span class="reward-value special">解锁工具</span>
                </div>
                <div v-for="unlock in (selectedCommission.rewards.specialUnlocks || [])" :key="unlock" class="reward-row special">
                  <span class="reward-icon">🔓</span>
                  <span class="reward-name">{{ unlock }}</span>
                  <span class="reward-value special">特殊解锁</span>
                </div>
              </div>
            </div>

            <div class="detail-column card inner-card">
              <h4 class="section-label danger">⚠️ 失败惩罚</h4>
              <p class="penalty-desc">{{ selectedCommission.failurePenalty.description }}</p>
              <div class="reward-list">
                <div class="reward-row">
                  <span class="reward-icon">⭐</span>
                  <span class="reward-name">声望损失</span>
                  <span class="reward-value danger">-{{ selectedCommission.failurePenalty.reputationLoss }}</span>
                </div>
                <div class="reward-row">
                  <span class="reward-icon">🧠</span>
                  <span class="reward-name">理智损失</span>
                  <span class="reward-value danger">-{{ selectedCommission.failurePenalty.sanityLoss }}</span>
                </div>
              </div>
            </div>
          </div>

          <div class="detail-section risk-section">
            <h4 class="section-label warning">🚨 风险提示</h4>
            <ul class="risk-list">
              <li v-for="(warning, i) in selectedCommission.riskWarnings" :key="i">
                <span class="risk-bullet">⚠️</span>
                {{ warning }}
              </li>
            </ul>
          </div>

          <div v-if="selectedCommission.prerequisites && Object.keys(selectedCommission.prerequisites).length > 0" class="detail-section prereq-section">
            <h4 class="section-label">📋 前置条件</h4>
            <div class="prereq-list">
              <div v-if="selectedCommission.prerequisites.minReputation" class="prereq-item">
                <span class="prereq-label">最低声望:</span>
                <span class="prereq-value" :class="{ 'met': commissionHallStore.reputation >= selectedCommission.prerequisites.minReputation }">
                  {{ commissionHallStore.reputation >= selectedCommission.prerequisites.minReputation ? '✓' : '✗' }}
                  {{ selectedCommission.prerequisites.minReputation }}
                </span>
              </div>
              <div v-if="selectedCommission.prerequisites.completedCases" class="prereq-item">
                <span class="prereq-label">需完成案件:</span>
                <span class="prereq-value">
                  {{ selectedCommission.prerequisites.completedCases.length }} 个案件
                </span>
              </div>
              <div v-if="selectedCommission.prerequisites.requiredTools" class="prereq-item">
                <span class="prereq-label">所需工具:</span>
                <span class="prereq-value">
                  {{ selectedCommission.prerequisites.requiredTools.map(id => getToolName(id)).join(', ') }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="!getAcceptabilityInfo(selectedCommission).acceptable" class="warning-banner danger">
            <span class="warning-icon">⚠️</span>
            <div class="warning-content">
              <strong>无法接受此委托</strong>
              <ul>
                <li v-for="(reason, i) in getAcceptabilityInfo(selectedCommission).reasons" :key="i">
                  {{ reason }}
                </li>
              </ul>
            </div>
          </div>

          <div class="sanity-check card inner-card">
            <div class="sanity-check-header">
              <span class="sanity-icon">🧠</span>
              <span class="sanity-label">当前理智检查</span>
            </div>
            <div class="sanity-bar-container">
              <div class="sanity-bar-bg">
                <div 
                  class="sanity-bar-fill"
                  :class="{
                    'sanity-high': currentSanity >= selectedCommission.recommendedSanity,
                    'sanity-medium': currentSanity >= selectedCommission.recommendedSanity * 0.6 && currentSanity < selectedCommission.recommendedSanity,
                    'sanity-low': currentSanity < selectedCommission.recommendedSanity * 0.6
                  }"
                  :style="{ width: `${Math.min(100, (currentSanity / maxSanity) * 100)}%` }"
                ></div>
              </div>
              <div class="sanity-values">
                <span>当前: {{ currentSanity }}</span>
                <span>建议: {{ selectedCommission.recommendedSanity }}+</span>
                <span>消耗: -{{ selectedCommission.sanityCost }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button v-if="selectedCommission.status === 'in_progress'" class="danger" @click="abandonSelectedCommission">
            放弃委托
          </button>
          <button v-if="selectedCommission.status === 'in_progress'" class="secondary" @click="() => simulateComplete(false)">
            [模拟] 失败
          </button>
          <button v-if="selectedCommission.status === 'in_progress'" class="success" @click="() => simulateComplete(true)">
            [模拟] 成功完成
          </button>
          <button 
            v-if="selectedCommission.status === 'available'" 
            class="primary"
            :disabled="!getAcceptabilityInfo(selectedCommission).acceptable"
            @click="acceptSelectedCommission"
          >
            接受委托
          </button>
          <button class="secondary" @click="closeDetail">
            关闭
          </button>
        </div>
      </div>
    </div>

    <div v-if="showRewardModal && lastReward" class="modal-overlay" @click.self="showRewardModal = false">
      <div class="modal reward-modal">
        <div class="reward-celebration">
          <div class="celebration-icon">🎉</div>
          <h2 class="celebration-title">委托完成!</h2>
          <p class="celebration-subtitle">{{ lastReward.commission.title }}</p>
        </div>

        <div class="reward-summary card">
          <h3 class="summary-title">获得奖励</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <span class="summary-icon">⭐</span>
              <span class="summary-label">声望</span>
              <span class="summary-value success">+{{ lastReward.rewards.reputation }}</span>
            </div>
            <div class="summary-item">
              <span class="summary-icon">🧠</span>
              <span class="summary-label">理智</span>
              <span class="summary-value success">+{{ lastReward.rewards.sanityBonus }}</span>
            </div>
          </div>

          <div v-if="lastReward.rewards.materials?.length > 0" class="materials-section">
            <h4 class="materials-title">📦 获得材料</h4>
            <div class="materials-grid">
              <div v-for="m in lastReward.rewards.materials" :key="m.materialId" class="material-item">
                <span class="material-name">{{ getMaterialName(m.materialId) }}</span>
                <span class="material-qty">×{{ m.quantity }}</span>
              </div>
            </div>
          </div>

          <div v-if="lastReward.rewards.tools?.length > 0" class="tools-section">
            <h4 class="tools-title">🔧 解锁工具</h4>
            <div class="tools-list">
              <div v-for="toolId in lastReward.rewards.tools" :key="toolId" class="tool-item special">
                <span class="tool-name">{{ getToolName(toolId) }}</span>
                <span class="tool-badge">NEW</span>
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="primary" @click="showRewardModal = false">
            确认收下
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.commission-hall {
  padding-top: 1.5rem;
}

.header-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.back-btn {
  cursor: pointer;
  color: var(--color-text-dim);
  transition: color 0.3s;
  padding: 0.5rem 1rem;
  border-radius: 4px;
}

.back-btn:hover {
  color: var(--color-accent-light);
  background: rgba(107, 76, 154, 0.1);
}

.title-area {
  text-align: center;
  flex: 1;
}

.header-spacer {
  width: 80px;
}

.page-title {
  font-size: 2.2rem;
  color: var(--color-accent-light);
  margin-bottom: 0.25rem;
}

.page-subtitle {
  color: var(--color-text-dim);
  font-size: 1rem;
}

.investigator-status {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1.5rem;
  background: rgba(107, 76, 154, 0.1);
  border-color: var(--color-accent);
}

.status-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.status-item.flex-1 {
  flex: 1;
}

.status-icon {
  font-size: 2rem;
}

.status-info {
  display: flex;
  flex-direction: column;
}

.status-header {
  display: flex;
  align-items: baseline;
  gap: 0.5rem;
}

.status-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.status-value {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-text);
}

.sanity-value.sanity-low {
  color: var(--color-danger);
  animation: pulse 1s infinite;
}

.next-rank {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.reputation-item .status-info {
  width: 100%;
}

.reputation-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-top: 0.25rem;
}

.reputation-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), #ffd700);
  transition: width 0.5s ease;
}

.recommendation-section {
  margin-bottom: 2rem;
  background: linear-gradient(135deg, rgba(107, 76, 154, 0.15), rgba(255, 215, 0, 0.05));
  border-color: #ffd700;
}

.section-header {
  margin-bottom: 1rem;
}

.section-title {
  color: var(--color-accent-light);
  font-size: 1.3rem;
  margin-bottom: 0.25rem;
}

.section-subtitle {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.recommendation-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
}

.recommendation-card.recommended {
  border-color: #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.2);
}

.recommend-badge {
  position: absolute;
  top: -8px;
  right: 12px;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
}

.recommend-reason {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 4px;
  font-size: 0.8rem;
  color: #ffd700;
}

.tabs-container {
  margin-bottom: 1.5rem;
}

.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid var(--color-border);
  padding-bottom: 0;
}

.tab {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  cursor: pointer;
  color: var(--color-text-dim);
  border-bottom: 3px solid transparent;
  transition: all 0.3s;
  font-size: 1rem;
  position: relative;
  top: 2px;
}

.tab:hover {
  color: var(--color-text);
  background: rgba(107, 76, 154, 0.1);
}

.tab.active {
  color: var(--color-accent-light);
  border-bottom-color: var(--color-accent);
  font-weight: bold;
}

.tab-icon {
  font-size: 1.1rem;
}

.tab-count {
  background: var(--color-accent);
  color: white;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: bold;
}

.content-section {
  min-height: 400px;
}

.filters-card {
  margin-bottom: 1.5rem;
}

.filters-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.filters-title {
  color: var(--color-accent-light);
  font-size: 1.1rem;
}

.reset-btn {
  padding: 0.4rem 1rem;
  font-size: 0.85rem;
}

.filters-row {
  margin-bottom: 0.75rem;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.filter-label {
  min-width: 60px;
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.filter-options {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}

.filter-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  border-radius: 15px;
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  transition: all 0.3s;
}

.filter-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.filter-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent-light);
  color: white;
}

.search-group {
  flex: 1;
}

.search-input {
  flex: 1;
  max-width: 400px;
  padding: 0.5rem 1rem;
  background: var(--color-bg-dark);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.3s;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.search-input::placeholder {
  color: var(--color-text-dim);
}

.commissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.25rem;
}

.commission-card {
  cursor: pointer;
  position: relative;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.commission-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 25px rgba(107, 76, 154, 0.3);
}

.commission-card.not-acceptable {
  opacity: 0.7;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.category-icon {
  font-size: 1.75rem;
}

.category-icon.large {
  font-size: 2.5rem;
}

.card-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.tag {
  font-size: 0.7rem;
  padding: 0.2rem 0.55rem;
  border-radius: 10px;
  color: white;
  font-weight: bold;
}

.tag.large-tag {
  font-size: 0.85rem;
  padding: 0.35rem 0.8rem;
  border-radius: 12px;
}

.tag.info-tag {
  background: var(--color-border);
  color: var(--color-text);
}

.card-title {
  font-size: 1.2rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.card-description {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  line-height: 1.5;
  flex: 1;
  margin-bottom: 0.75rem;
}

.commission-tags {
  display: flex;
  gap: 0.35rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.commission-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-accent-light);
}

.card-meta {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.card-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-label {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.stat-value {
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--color-text);
}

.stat-value.danger {
  color: var(--color-danger);
}

.risk-warning-mini {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.6rem;
  background: rgba(139, 58, 58, 0.15);
  border: 1px solid var(--color-danger);
  border-radius: 4px;
  margin-bottom: 0.75rem;
  font-size: 0.8rem;
}

.warning-extreme {
  color: #ff4444;
  font-weight: bold;
  animation: pulse 1s infinite;
}

.warning-high {
  color: #ff8844;
  font-weight: bold;
}

.warning-count {
  color: var(--color-text-dim);
  margin-left: auto;
}

.card-rewards-preview {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.reward-item {
  font-size: 0.8rem;
  padding: 0.25rem 0.5rem;
  background: rgba(58, 139, 90, 0.15);
  border-radius: 6px;
  color: var(--color-success);
}

.reward-item.reputation {
  background: rgba(255, 215, 0, 0.1);
  color: #ffd700;
}

.acceptability-warning {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  background: rgba(0, 0, 0, 0.85);
  border-radius: 8px;
  color: var(--color-text-dim);
  font-weight: bold;
  backdrop-filter: blur(4px);
}

.lock-icon {
  font-size: 1.2rem;
}

.empty-state {
  text-align: center;
  padding: 3rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-title {
  color: var(--color-text);
  font-size: 1.3rem;
  margin-bottom: 0.5rem;
}

.empty-desc {
  color: var(--color-text-dim);
  margin-bottom: 1.5rem;
}

.active-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.active-card {
  cursor: pointer;
  transition: all 0.3s;
}

.active-card:hover {
  border-color: var(--color-accent);
}

.active-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.active-title-area {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.active-title {
  font-size: 1.3rem;
  color: var(--color-text);
  margin: 0;
}

.active-status {
  padding: 0.35rem 0.85rem;
  border-radius: 15px;
  font-size: 0.85rem;
  font-weight: bold;
}

.active-status.in-progress {
  background: rgba(107, 76, 154, 0.2);
  color: var(--color-accent-light);
  border: 1px solid var(--color-accent);
}

.active-desc {
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.active-details {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.detail-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.detail-value {
  font-size: 0.95rem;
  color: var(--color-text);
}

.detail-value.reward {
  color: var(--color-success);
}

.detail-value.penalty {
  color: var(--color-danger);
}

.active-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-card {
  transition: all 0.3s;
}

.history-card.result-completed {
  border-left: 4px solid var(--color-success);
}

.history-card.result-failed {
  border-left: 4px solid var(--color-danger);
}

.history-card.result-abandoned {
  border-left: 4px solid var(--color-warning);
}

.history-header {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.history-result {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.result-icon {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 0.9rem;
}

.result-icon.success {
  background: rgba(58, 139, 90, 0.3);
  color: var(--color-success);
}

.result-icon.failed {
  background: rgba(139, 58, 58, 0.3);
  color: var(--color-danger);
}

.result-icon.abandoned {
  background: rgba(139, 107, 58, 0.3);
  color: var(--color-warning);
}

.result-text {
  font-weight: bold;
}

.history-title {
  font-size: 1.15rem;
  color: var(--color-text);
  margin: 0;
}

.history-time {
  display: flex;
  gap: 1.5rem;
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
}

.history-stats {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.history-stat {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.history-stat.positive .stat-value {
  color: var(--color-success);
}

.history-stat .stat-value.grade.grade-s { color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
.history-stat .stat-value.grade.grade-a { color: var(--color-accent-light); }
.history-stat .stat-value.grade.grade-b { color: var(--color-success); }
.history-stat .stat-value.grade.grade-c { color: #ff9800; }
.history-stat .stat-value.grade.grade-d { color: #8b5a2b; }
.history-stat .stat-value.grade.grade-f { color: var(--color-danger); }

.history-materials {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.materials-label,
.notes-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.material-tag {
  font-size: 0.8rem;
  padding: 0.2rem 0.5rem;
  background: rgba(58, 139, 90, 0.15);
  border-radius: 6px;
  color: var(--color-success);
}

.history-notes {
  padding: 0.5rem 0.75rem;
  background: rgba(139, 58, 58, 0.1);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  backdrop-filter: blur(4px);
}

.modal {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 12px;
  max-width: 800px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.6);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title-area {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-title {
  font-size: 1.5rem;
  color: var(--color-text);
  margin: 0 0 0.25rem 0;
}

.modal-subtitle {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  font-size: 1.3rem;
  color: var(--color-text-dim);
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.3s;
}

.close-btn:hover {
  background: rgba(139, 58, 58, 0.2);
  color: var(--color-danger);
}

.modal-content {
  padding: 1.5rem;
  flex: 1;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.section-label {
  font-size: 1.05rem;
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
}

.section-label.success {
  color: var(--color-success);
}

.section-label.danger {
  color: var(--color-danger);
}

.section-label.warning {
  color: var(--color-warning);
}

.full-details {
  color: var(--color-text);
  line-height: 1.7;
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 6px;
  border-left: 3px solid var(--color-accent);
}

.detail-tags-row {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 1.5rem;
}

.detail-columns {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.detail-column {
  padding: 1rem;
}

.inner-card {
  background: rgba(0, 0, 0, 0.2);
}

.penalty-desc {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin-bottom: 0.75rem;
  padding: 0.5rem;
  background: rgba(139, 58, 58, 0.1);
  border-radius: 4px;
}

.reward-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.reward-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.reward-row.special {
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid rgba(255, 215, 0, 0.3);
}

.reward-icon {
  font-size: 1.1rem;
}

.reward-name {
  flex: 1;
  color: var(--color-text);
  font-size: 0.9rem;
}

.reward-value {
  font-weight: bold;
  color: var(--color-text);
}

.reward-value.success {
  color: var(--color-success);
}

.reward-value.danger {
  color: var(--color-danger);
}

.reward-value.special {
  color: #ffd700;
  font-size: 0.8rem;
}

.risk-list {
  list-style: none;
  padding: 0;
  margin: 0;
}

.risk-list li {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  padding: 0.5rem 0;
  color: var(--color-text);
  border-bottom: 1px solid rgba(139, 107, 58, 0.2);
}

.risk-list li:last-child {
  border-bottom: none;
}

.risk-bullet {
  flex-shrink: 0;
}

.prereq-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.prereq-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.prereq-label {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.prereq-value {
  color: var(--color-text);
  font-weight: bold;
}

.prereq-value.met {
  color: var(--color-success);
}

.warning-banner {
  padding: 1rem;
  border-radius: 8px;
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.warning-banner.danger {
  background: rgba(139, 58, 58, 0.15);
  border: 1px solid var(--color-danger);
}

.warning-icon {
  font-size: 1.5rem;
  flex-shrink: 0;
}

.warning-content strong {
  color: var(--color-danger);
  display: block;
  margin-bottom: 0.25rem;
}

.warning-content ul {
  margin: 0;
  padding-left: 1.25rem;
  color: var(--color-text);
  font-size: 0.9rem;
}

.sanity-check {
  padding: 1rem;
}

.sanity-check-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
}

.sanity-icon {
  font-size: 1.3rem;
}

.sanity-label {
  font-weight: bold;
  color: var(--color-text);
}

.sanity-bar-container {
  width: 100%;
}

.sanity-bar-bg {
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.sanity-bar-fill {
  height: 100%;
  transition: all 0.5s ease;
  border-radius: 6px;
}

.sanity-bar-fill.sanity-high {
  background: var(--color-success);
}

.sanity-bar-fill.sanity-medium {
  background: var(--color-warning);
}

.sanity-bar-fill.sanity-low {
  background: var(--color-danger);
  animation: pulse 1s infinite;
}

.sanity-values {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border);
  flex-wrap: wrap;
}

.modal-footer .secondary {
  background: transparent;
}

.modal-footer .success {
  background: var(--color-success);
  border-color: #4a9b6a;
}

.modal-footer .success:hover {
  background: #4a9b6a;
}

.reward-modal {
  max-width: 500px;
}

.reward-celebration {
  text-align: center;
  padding: 2rem 1.5rem 1rem;
  background: linear-gradient(180deg, rgba(255, 215, 0, 0.1), transparent);
}

.celebration-icon {
  font-size: 4rem;
  margin-bottom: 0.5rem;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.celebration-title {
  font-size: 1.8rem;
  color: #ffd700;
  margin-bottom: 0.25rem;
  text-shadow: 0 0 20px rgba(255, 215, 0, 0.4);
}

.celebration-subtitle {
  color: var(--color-text-dim);
  margin: 0;
}

.reward-summary {
  margin: 1rem 1.5rem;
}

.summary-title {
  color: var(--color-accent-light);
  font-size: 1.1rem;
  margin-bottom: 1rem;
  text-align: center;
}

.summary-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1rem;
}

.summary-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.summary-icon {
  font-size: 1.5rem;
}

.summary-label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.summary-value {
  font-size: 1.4rem;
  font-weight: bold;
}

.summary-value.success {
  color: var(--color-success);
}

.materials-section,
.tools-section {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.materials-title,
.tools-title {
  color: var(--color-text);
  font-size: 0.95rem;
  margin-bottom: 0.75rem;
}

.materials-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.5rem;
}

.material-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(58, 139, 90, 0.1);
  border-radius: 4px;
  font-size: 0.85rem;
}

.material-qty {
  color: var(--color-success);
  font-weight: bold;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.tool-item.special {
  background: linear-gradient(90deg, rgba(255, 215, 0, 0.1), rgba(107, 76, 154, 0.1));
  border: 1px solid #ffd700;
}

.tool-name {
  color: var(--color-text);
  font-weight: bold;
}

.tool-badge {
  background: #ffd700;
  color: #1a1a2e;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
}

.card-rewards {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

@media (max-width: 768px) {
  .page-title {
    font-size: 1.5rem;
  }

  .investigator-status {
    grid-template-columns: 1fr 1fr;
    gap: 1rem;
  }

  .tabs {
    overflow-x: auto;
  }

  .tab {
    padding: 0.5rem 1rem;
    font-size: 0.9rem;
    white-space: nowrap;
  }

  .detail-columns {
    grid-template-columns: 1fr;
  }

  .commissions-grid {
    grid-template-columns: 1fr;
  }

  .recommendation-grid {
    grid-template-columns: 1fr;
  }

  .modal {
    max-height: 95vh;
    margin: 0.5rem;
  }

  .modal-header,
  .modal-content,
  .modal-footer {
    padding: 1rem;
  }
}
</style>