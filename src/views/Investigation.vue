<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCaseById } from '@/data/cases'
import { getToolById } from '@/data/tools'
import type { Scene, Evidence, HitRateResult } from '@/types'
import InventoryPanel from '@/components/inventory/InventoryPanel.vue'
import CraftingPanel from '@/components/inventory/CraftingPanel.vue'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const currentScene = ref<Scene | null>(null)
const selectedEvidence = ref<Evidence | null>(null)
const showEvidenceDetail = ref(false)
const showToolPanel = ref(false)
const showInventoryPanel = ref(false)
const showCraftingPanel = ref(false)
const hoveredEvidence = ref<Evidence | null>(null)
const searchResultMessage = ref('')
const showSearchResult = ref(false)
const showGameLog = ref(false)

const caseData = computed(() => {
  const caseId = route.params.caseId as string
  return getCaseById(caseId)
})

const hasHallucinations = computed(() => {
  return gameStore.activeHallucinations.length > 0
})

const hallucinationIntensity = computed(() => {
  if (gameStore.activeHallucinations.length === 0) return 0
  return Math.max(...gameStore.activeHallucinations.map(h => h.intensity))
})

const currentHallucinationMessage = computed(() => {
  if (gameStore.activeHallucinations.length === 0) return ''
  const latest = gameStore.activeHallucinations[gameStore.activeHallucinations.length - 1]
  return latest.message || ''
})

const sceneBackgrounds: Record<string, string> = {
  lighthouse: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  cottage: 'linear-gradient(180deg, #2d132c 0%, #1a1a2e 50%, #0a0a0f 100%)',
  shore: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
}

const tools = computed(() => gameStore.gameState.tools)
const selectedTool = computed(() => gameStore.selectedTool)

const hoveredHitRate = computed<HitRateResult | null>(() => {
  if (!hoveredEvidence.value) return null
  return gameStore.calculateHitRate(hoveredEvidence.value)
})

const visibleEvidence = computed(() => {
  if (!currentScene.value) return []
  return currentScene.value.evidence.filter(e => gameStore.isEvidenceVisible(e))
})

const newlyUnlockedEvidence = ref<Set<string>>(new Set())

function isNewlyUnlocked(evidenceId: string): boolean {
  return newlyUnlockedEvidence.value.has(evidenceId)
}

watch(
  () => gameStore.gameState.unlockedHiddenEvidence.length,
  (newLen, oldLen) => {
    if (newLen > oldLen) {
      const unlocked = gameStore.gameState.unlockedHiddenEvidence.slice(oldLen)
      unlocked.forEach(id => {
        newlyUnlockedEvidence.value.add(id)
        setTimeout(() => {
          newlyUnlockedEvidence.value.delete(id)
        }, 3000)
      })
    }
  }
)

onMounted(() => {
  if (!caseData.value) {
    router.push('/cases')
    return
  }
  
  if (!gameStore.currentCase || gameStore.currentCase.id !== caseData.value?.id) {
    gameStore.startCase(caseData.value!.id)
  }
  
  if (caseData.value.scenes.length > 0) {
    selectScene(caseData.value.scenes[0])
  }
})

function selectScene(scene: Scene) {
  currentScene.value = scene
  gameStore.visitScene(scene.id)
  selectedEvidence.value = null
  showEvidenceDetail.value = false
}

function getEvidencePosition(evidence: Evidence) {
  return {
    left: `${evidence.location.x}%`,
    top: `${evidence.location.y}%`,
    width: `${evidence.size.width}%`,
    height: `${evidence.size.height}%`
  }
}

function isEvidenceDiscovered(evidenceId: string) {
  return gameStore.gameState.discoveredEvidence.includes(evidenceId)
}

function isEvidenceDiscoverable(evidence: Evidence): boolean {
  return gameStore.canDiscoverEvidence(evidence)
}

function hoverEvidence(evidence: Evidence) {
  hoveredEvidence.value = evidence
}

function leaveEvidence() {
  hoveredEvidence.value = null
}

function clickEvidence(evidence: Evidence) {
  if (isEvidenceDiscovered(evidence.id)) {
    selectedEvidence.value = evidence
    showEvidenceDetail.value = true
    return
  }

  if (!isEvidenceDiscoverable(evidence)) {
    searchResultMessage.value = `需要特定工具才能发现这个证据`
    showSearchResult.value = true
    setTimeout(() => { showSearchResult.value = false }, 2000)
    return
  }
  
  const result = gameStore.searchEvidence(evidence)
  
  searchResultMessage.value = result.message
  showSearchResult.value = true
  
  setTimeout(() => {
    showSearchResult.value = false
  }, 2000)
  
  if (result.success) {
    selectedEvidence.value = evidence
    showEvidenceDetail.value = true
  }
}

function selectTool(toolId: string) {
  gameStore.selectTool(toolId)
  showToolPanel.value = false
}

function repairTool(toolId: string) {
  gameStore.repairTool(toolId)
}

function getDurabilityColor(durability: number, maxDurability: number): string {
  const ratio = durability / maxDurability
  if (ratio >= 0.6) return '#4caf50'
  if (ratio >= 0.3) return '#ff9800'
  return '#f44336'
}

function getHitRateColor(hitRate: number): string {
  if (hitRate >= 70) return '#4caf50'
  if (hitRate >= 40) return '#ff9800'
  return '#f44336'
}

function closeEvidenceDetail() {
  showEvidenceDetail.value = false
}

function goToClues() {
  router.push(`/clues/${caseData.value?.id}`)
}

function goToGraph() {
  router.push(`/graph/${caseData.value?.id}`)
}

function goToDeduction() {
  router.push(`/deduction/${caseData.value?.id}`)
}

function getSceneProgress(scene: Scene): number {
  const discovered = scene.evidence.filter(e => 
    gameStore.gameState.discoveredEvidence.includes(e.id)
  ).length
  return Math.round((discovered / scene.evidence.length) * 100)
}

function getTotalProgress(): number {
  if (!caseData.value) return 0
  const totalEvidence = caseData.value.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
  const discovered = gameStore.gameState.discoveredEvidence.length
  return Math.round((discovered / totalEvidence) * 100)
}

function getSpecialEvidenceCount(): number {
  if (!caseData.value) return 0
  return caseData.value.scenes.reduce((sum, s) => {
    return sum + s.evidence.filter(e => e.isSpecial).length
  }, 0)
}

function getDiscoveredSpecialCount(): number {
  if (!caseData.value) return 0
  return caseData.value.scenes.reduce((sum, s) => {
    return sum + s.evidence.filter(e => e.isSpecial && gameStore.gameState.discoveredEvidence.includes(e.id)).length
  }, 0)
}

function getLogTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    discovery: '🔍 发现',
    analysis: '🧠 分析',
    connection: '🔗 关联',
    sanity_loss: '💔 理智',
    conclusion: '📝 结论',
    tool_use: '🔧 工具',
    tool_repair: '🛠️ 修复',
    tool_break: '⚠️ 损坏',
    timer: '⏱️ 时间',
    scene_switch: '🚪 场景',
    timeout: '⏰ 超时',
    penalty: '❌ 惩罚',
    bonus: '🎁 奖励'
  }
  return labels[type] || type
}

function formatLogTime(timestamp: number): string {
  const date = new Date(timestamp)
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}

function getShadowStyle(index: number) {
  const left = 10 + (index * 18) + Math.random() * 10
  const top = 20 + Math.random() * 60
  const delay = index * 0.5 + Math.random() * 2
  const duration = 3 + Math.random() * 4
  return {
    left: `${left}%`,
    top: `${top}%`,
    animationDelay: `${delay}s`,
    animationDuration: `${duration}s`
  }
}
</script>

<template>
  <div class="investigation-page">
    <div v-if="!caseData" class="loading">
      <p>加载案件数据...</p>
    </div>

    <template v-else>
      <div class="investigation-header">
        <div class="case-info">
          <h1 class="case-title">{{ caseData.title }}</h1>
          <p class="case-description">{{ caseData.description }}</p>
        </div>
        <div class="progress-info">
          <div class="progress-label">
            <span>调查进度</span>
            <span class="progress-value">{{ getTotalProgress() }}%</span>
          </div>
          <div class="progress-bar">
            <div class="progress-fill" :style="{ width: `${getTotalProgress()}%` }"></div>
          </div>
          <div class="special-evidence-info">
            <span class="special-label">特殊证据</span>
            <span class="special-value">{{ getDiscoveredSpecialCount() }}/{{ getSpecialEvidenceCount() }}</span>
          </div>
        </div>
        <div class="timer-section">
          <div class="timer-header">
            <span class="timer-icon">⏱️</span>
            <span class="timer-label">搜证时限</span>
          </div>
          <div 
            class="timer-display"
            :class="{ 
              'low-time': gameStore.isLowTime, 
              'critical-time': gameStore.isCriticalTime,
              'expired': gameStore.gameState.timerState.isExpired 
            }"
          >
            {{ gameStore.formattedRemainingTime }}
          </div>
          <div class="timer-bar-container">
            <div 
              class="timer-bar"
              :class="{ 'low': gameStore.isLowTime, 'critical': gameStore.isCriticalTime }"
              :style="{ width: `${gameStore.timerPercentage}%` }"
            ></div>
          </div>
          <div v-if="gameStore.gameState.timerState.isExpired" class="timer-expired-warning">
            ⚠️ 时间已到！
          </div>
        </div>
      </div>

      <div class="investigation-content">
        <div class="scenes-panel">
          <h3 class="panel-title">调查场景</h3>
          <div class="scenes-list">
            <div
              v-for="scene in caseData.scenes"
              :key="scene.id"
              class="scene-item"
              :class="{ active: currentScene?.id === scene.id }"
              @click="selectScene(scene)"
            >
              <div class="scene-name">{{ scene.name }}</div>
              <div class="scene-progress">
                <div class="mini-progress">
                  <div 
                    class="mini-progress-fill"
                    :style="{ width: `${getSceneProgress(scene)}%` }"
                  ></div>
                </div>
                <span class="progress-text">{{ getSceneProgress(scene) }}%</span>
              </div>
            </div>
          </div>

          <div class="tools-section">
            <h3 class="panel-title">调查工具</h3>
            <div 
              v-if="selectedTool" 
              class="current-tool"
              @click="showToolPanel = !showToolPanel"
            >
              <span class="tool-icon">{{ selectedTool.icon }}</span>
              <div class="tool-info">
                <div class="tool-name">{{ selectedTool.name }}</div>
                <div class="tool-durability">
                  <div class="durability-bar">
                    <div 
                      class="durability-fill"
                      :style="{ 
                        width: `${(selectedTool.durability / selectedTool.maxDurability) * 100}%`,
                        backgroundColor: getDurabilityColor(selectedTool.durability, selectedTool.maxDurability)
                      }"
                    ></div>
                  </div>
                  <span class="durability-text">{{ selectedTool.durability }}%</span>
                </div>
              </div>
              <span class="tool-arrow">▼</span>
            </div>

            <transition name="slide">
              <div v-if="showToolPanel" class="tool-dropdown">
                <div
                  v-for="tool in tools"
                  :key="tool.id"
                  class="tool-option"
                  :class="{ 
                    selected: selectedTool?.id === tool.id,
                    disabled: tool.uses <= 0 || tool.durability <= 0
                  }"
                  @click="tool.uses > 0 && tool.durability > 0 && selectTool(tool.id)"
                >
                  <span class="tool-icon">{{ tool.icon }}</span>
                  <div class="tool-details">
                    <div class="tool-name">{{ tool.name }}</div>
                    <div class="tool-stats">
                      <span>使用次数: {{ tool.uses }}/{{ tool.maxUses }}</span>
                      <span>耐久: {{ tool.durability }}%</span>
                    </div>
                  </div>
                  <button 
                    v-if="tool.durability < tool.maxDurability && tool.repairable"
                    class="repair-btn"
                    @click.stop="repairTool(tool.id)"
                  >
                    🔧 修复
                  </button>
                </div>
              </div>
            </transition>
          </div>
        </div>

        <div class="scene-viewer">
          <div v-if="currentScene" class="scene-container">
            <div 
              class="scene-background"
              :style="{ background: sceneBackgrounds[currentScene.background] || sceneBackgrounds.lighthouse }"
              :class="{ 
                'hallucination-distortion': hasHallucinations && hallucinationIntensity >= 3,
                'hallucination-shadow': hasHallucinations && hallucinationIntensity >= 1,
                'hallucination-critical': hasHallucinations && hallucinationIntensity >= 4
              }"
            >
              <div v-if="hasHallucinations" class="hallucination-overlay" :class="`intensity-${hallucinationIntensity}`">
                <div class="hallucination-vignette"></div>
                <div class="hallucination-noise"></div>
                <div v-if="hallucinationIntensity >= 2" class="hallucination-shadows">
                  <div v-for="i in 5" :key="i" class="shadow-figure" :style="getShadowStyle(i)"></div>
                </div>
              </div>
              
              <transition name="fade">
                <div v-if="currentHallucinationMessage" class="hallucination-message">
                  {{ currentHallucinationMessage }}
                </div>
              </transition>
              
              <div class="scene-description" :class="{ 'text-corrupted': hasHallucinations && hallucinationIntensity >= 4 }">{{ currentScene.description }}</div>
              
              <div class="evidence-layer">
                <div
                  v-for="evidence in visibleEvidence"
                  :key="evidence.id"
                  class="evidence-marker"
                  :class="{ 
                    discovered: isEvidenceDiscovered(evidence.id),
                    selected: selectedEvidence?.id === evidence.id,
                    special: evidence.isSpecial && !isEvidenceDiscovered(evidence.id),
                    undiscoverable: !isEvidenceDiscoverable(evidence) && !isEvidenceDiscovered(evidence.id),
                    'newly-unlocked': isNewlyUnlocked(evidence.id)
                  }"
                  :style="getEvidencePosition(evidence)"
                  @click="clickEvidence(evidence)"
                  @mouseenter="hoverEvidence(evidence)"
                  @mouseleave="leaveEvidence()"
                >
                  <div class="marker-content">
                    <span v-if="!isEvidenceDiscovered(evidence.id)" class="marker-icon">
                      {{ evidence.isSpecial ? '★' : '?' }}
                    </span>
                    <span v-else class="marker-icon found">✓</span>
                  </div>
                  <div class="marker-glow"></div>
                  
                  <transition name="fade">
                    <div 
                      v-if="hoveredEvidence?.id === evidence.id && !isEvidenceDiscovered(evidence.id)" 
                      class="evidence-tooltip"
                    >
                      <div class="tooltip-name">
                        {{ evidence.isSpecial ? '★ 特殊证据' : '未知证据' }}
                      </div>
                      <div v-if="hoveredHitRate" class="tooltip-hitrate">
                        <span>成功率:</span>
                        <span 
                          class="hitrate-value"
                          :style="{ color: getHitRateColor(hoveredHitRate.finalRate) }"
                        >
                          {{ hoveredHitRate.finalRate }}%
                        </span>
                      </div>
                      <div v-if="evidence.requiredTool" class="tooltip-required">
                        需要特定工具
                      </div>
                      <div class="tooltip-details">
                        <div>基础: {{ hoveredHitRate?.baseRate }}%</div>
                        <div v-if="hoveredHitRate?.toolBonus" class="bonus">
                          工具加成: +{{ hoveredHitRate?.toolBonus }}%
                        </div>
                        <div v-if="hoveredHitRate?.durabilityPenalty" class="penalty">
                          耐久惩罚: -{{ hoveredHitRate?.durabilityPenalty }}%
                        </div>
                        <div v-if="hoveredHitRate?.sanityPenalty" class="penalty">
                          理智惩罚: -{{ hoveredHitRate?.sanityPenalty }}%
                        </div>
                      </div>
                    </div>
                  </transition>
                </div>
              </div>

              <transition name="fade">
                <div v-if="showSearchResult" class="search-result-toast">
                  {{ searchResultMessage }}
                </div>
              </transition>

              <div class="scene-hint">
                <span class="hint-icon">🔍</span>
                <span>点击标记搜查证据，选择合适的工具提高成功率</span>
              </div>
            </div>
          </div>
        </div>

        <div class="actions-panel">
          <h3 class="panel-title">调查行动</h3>
          <div class="actions-list">
            <button class="action-btn" @click="goToClues">
              <span class="action-icon">🧩</span>
              <span class="action-text">线索拼接</span>
              <span class="action-count">{{ gameStore.gameState.discoveredClues.length }}</span>
            </button>
            <button class="action-btn" @click="goToGraph">
              <span class="action-icon">🕸️</span>
              <span class="action-text">关系图谱</span>
            </button>
            <button class="action-btn" @click="goToDeduction">
              <span class="action-icon">💡</span>
              <span class="action-text">真相推演</span>
            </button>
            <button class="action-btn" @click="showInventoryPanel = true">
              <span class="action-icon">🎒</span>
              <span class="action-text">调查背包</span>
              <span class="action-count">{{ gameStore.gameState.inventory.items.length }}</span>
            </button>
            <button class="action-btn" @click="showCraftingPanel = true">
              <span class="action-icon">⚗️</span>
              <span class="action-text">证据加工</span>
            </button>
            <button class="action-btn" @click="showGameLog = true">
              <span class="action-icon">📜</span>
              <span class="action-text">调查日志</span>
              <span class="action-count">{{ gameStore.gameState.gameLog.length }}</span>
            </button>
            <button class="action-btn" @click="router.push('/cases')">
              <span class="action-icon">📋</span>
              <span class="action-text">返回案件</span>
            </button>
          </div>

          <div class="sanity-panel">
            <h4 class="panel-subtitle">理智状态</h4>
            <div class="sanity-bar-container">
              <div class="sanity-bar">
                <div 
                  class="sanity-fill"
                  :class="{ low: gameStore.isLowSanity, critical: gameStore.isCriticalSanity }"
                  :style="{ width: `${gameStore.sanityPercentage}%` }"
                ></div>
              </div>
              <span class="sanity-value">{{ gameStore.gameState.sanity }}/{{ gameStore.gameState.maxSanity }}</span>
            </div>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showEvidenceDetail && selectedEvidence" class="evidence-modal" @click.self="closeEvidenceDetail">
          <div class="evidence-detail card">
            <div class="evidence-header">
              <h3 class="evidence-name">{{ selectedEvidence.name }}</h3>
              <div class="evidence-type">
                {{ selectedEvidence.type }}
                <span v-if="selectedEvidence.isSpecial" class="special-badge">★ 特殊</span>
              </div>
            </div>
            
            <div class="evidence-content">
              <p class="evidence-description">{{ selectedEvidence.description }}</p>
              
              <div v-if="selectedEvidence.sanityEffect !== 0" class="sanity-effect">
                <span class="effect-label">理智影响:</span>
                <span class="effect-value" :class="{ negative: selectedEvidence.sanityEffect < 0 }">
                  {{ selectedEvidence.sanityEffect > 0 ? '+' : '' }}{{ selectedEvidence.sanityEffect }}
                </span>
              </div>

              <div v-if="selectedEvidence.requiredTool" class="tool-info">
                <span class="effect-label">需要工具:</span>
                <span class="effect-value">
                  {{ getToolById(selectedEvidence.requiredTool)?.name || selectedEvidence.requiredTool }}
                </span>
              </div>
            </div>

            <div class="evidence-footer">
              <button class="close-btn" @click="closeEvidenceDetail">关闭</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="showGameLog" class="evidence-modal" @click.self="showGameLog = false">
          <div class="game-log-panel card">
            <div class="log-header">
              <h3 class="log-title">📜 调查日志</h3>
              <button class="close-btn small" @click="showGameLog = false">✕</button>
            </div>
            
            <div class="log-stats">
              <div class="log-stat-item">
                <span class="stat-label">场景切换</span>
                <span class="stat-value">{{ gameStore.gameState.timerState.sceneSwitchCount }} 次</span>
              </div>
              <div class="log-stat-item">
                <span class="stat-label">搜查次数</span>
                <span class="stat-value">{{ gameStore.gameState.timerState.searchAttemptCount }} 次</span>
              </div>
              <div class="log-stat-item">
                <span class="stat-label">失败次数</span>
                <span class="stat-value fail">{{ gameStore.gameState.timerState.failedSearchCount }} 次</span>
              </div>
            </div>

            <div class="log-list-container">
              <div class="log-list">
                <div 
                  v-for="log in gameStore.gameState.gameLog.slice().reverse()" 
                  :key="log.id"
                  class="log-entry"
                  :class="`log-type-${log.type}`"
                >
                  <div class="log-entry-header">
                    <span class="log-type-badge">{{ getLogTypeLabel(log.type) }}</span>
                    <span class="log-time">{{ formatLogTime(log.timestamp) }}</span>
                  </div>
                  <div class="log-description">{{ log.description }}</div>
                </div>
              </div>
            </div>

            <div class="log-footer">
              <span class="log-count">共 {{ gameStore.gameState.gameLog.length }} 条记录</span>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <div v-if="gameStore.gameState.timerState.isExpired && !showEvidenceDetail" class="timeout-overlay">
          <div class="timeout-content">
            <div class="timeout-icon">⏰</div>
            <h2 class="timeout-title">搜证时间已到！</h2>
            <p class="timeout-message">理智值受到了冲击，但你仍可以尝试进行推演结案。</p>
            <div class="timeout-actions">
              <button class="primary-btn" @click="goToDeduction">前往推演</button>
            </div>
          </div>
        </div>
      </transition>

      <transition name="fade">
        <InventoryPanel 
          v-if="showInventoryPanel" 
          @close="showInventoryPanel = false"
        />
      </transition>

      <transition name="fade">
        <CraftingPanel 
          v-if="showCraftingPanel" 
          @close="showCraftingPanel = false"
        />
      </transition>
    </template>
  </div>
</template>

<style scoped>
.investigation-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 1.5rem;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
}

.investigation-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 2rem;
}

.case-info {
  flex: 1;
}

.case-title {
  font-size: 1.8rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.case-description {
  color: var(--color-text-dim);
  font-size: 0.95rem;
  line-height: 1.6;
}

.progress-info {
  min-width: 200px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
  color: var(--color-text-dim);
}

.progress-value {
  color: var(--color-accent-light);
  font-weight: bold;
}

.progress-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.special-evidence-info {
  display: flex;
  justify-content: space-between;
  margin-top: 0.5rem;
  font-size: 0.85rem;
}

.special-label {
  color: var(--color-text-dim);
}

.special-value {
  color: #ffd700;
  font-weight: bold;
}

.investigation-content {
  flex: 1;
  display: grid;
  grid-template-columns: 280px 1fr 220px;
  gap: 1.5rem;
  min-height: 0;
}

.scenes-panel,
.actions-panel {
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 1rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-subtitle {
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.scenes-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
}

.scene-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.scene-item:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.scene-item.active {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.scene-name {
  font-size: 0.95rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.scene-progress {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.mini-progress {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: var(--color-accent-light);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.tools-section {
  margin-top: auto;
}

.current-tool {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.current-tool:hover {
  background: rgba(107, 76, 154, 0.2);
}

.tool-icon {
  font-size: 1.5rem;
}

.tool-info {
  flex: 1;
}

.tool-name {
  font-size: 0.9rem;
  color: var(--color-text);
  margin-bottom: 0.25rem;
}

.tool-durability {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.durability-bar {
  flex: 1;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  overflow: hidden;
}

.durability-fill {
  height: 100%;
  transition: width 0.3s ease;
}

.durability-text {
  font-size: 0.7rem;
  color: var(--color-text-dim);
  min-width: 35px;
  text-align: right;
}

.tool-arrow {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.tool-dropdown {
  margin-top: 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  overflow: hidden;
}

.tool-option {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border-bottom: 1px solid var(--color-border);
}

.tool-option:last-child {
  border-bottom: none;
}

.tool-option:hover:not(.disabled) {
  background: rgba(107, 76, 154, 0.15);
}

.tool-option.selected {
  background: rgba(107, 76, 154, 0.25);
  border-left: 3px solid var(--color-accent);
}

.tool-option.disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.tool-details {
  flex: 1;
}

.tool-stats {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.repair-btn {
  padding: 0.35rem 0.6rem;
  font-size: 0.75rem;
  background: var(--color-success);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.repair-btn:hover {
  background: #3d8b5a;
}

.scene-viewer {
  display: flex;
  flex-direction: column;
}

.scene-container {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.scene-background {
  flex: 1;
  position: relative;
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
  min-height: 400px;
}

.scene-description {
  position: absolute;
  top: 1rem;
  left: 1rem;
  right: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 6px;
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.6;
  backdrop-filter: blur(5px);
  z-index: 10;
}

.evidence-layer {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.evidence-marker {
  position: absolute;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
}

.marker-content {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(107, 76, 154, 0.8);
  border: 2px solid var(--color-accent-light);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  color: white;
  transition: all 0.3s ease;
  position: relative;
  z-index: 2;
}

.evidence-marker:hover .marker-content {
  transform: scale(1.2);
  background: var(--color-accent);
}

.evidence-marker.discovered .marker-content {
  background: rgba(58, 139, 90, 0.8);
  border-color: #4caf50;
}

.evidence-marker.special .marker-content {
  background: rgba(255, 215, 0, 0.8);
  border-color: #ffd700;
  color: #1a1a2e;
}

.evidence-marker.undiscoverable .marker-content {
  background: rgba(100, 100, 100, 0.5);
  border-color: #666;
}

.evidence-marker.newly-unlocked .marker-content {
  animation: newlyUnlockedPulse 0.6s ease-out 5;
  border-color: var(--color-success);
  box-shadow: 0 0 15px var(--color-success);
}

@keyframes newlyUnlockedPulse {
  0%, 100% { transform: scale(1); box-shadow: 0 0 15px var(--color-success); }
  50% { transform: scale(1.2); box-shadow: 0 0 25px var(--color-success); }
}

.evidence-marker.selected .marker-content {
  transform: scale(1.3);
  box-shadow: 0 0 20px var(--color-accent);
}

.marker-icon.found {
  color: white;
}

.marker-glow {
  position: absolute;
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: radial-gradient(circle, var(--color-accent) 0%, transparent 70%);
  opacity: 0.3;
  animation: pulse 2s infinite;
}

.evidence-marker.special .marker-glow {
  background: radial-gradient(circle, #ffd700 0%, transparent 70%);
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.5; }
}

.evidence-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  margin-bottom: 10px;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.95);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  min-width: 180px;
  z-index: 100;
  pointer-events: none;
}

.tooltip-name {
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.tooltip-hitrate {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
}

.hitrate-value {
  font-weight: bold;
}

.tooltip-required {
  font-size: 0.8rem;
  color: #ffd700;
  margin-bottom: 0.5rem;
}

.tooltip-details {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  border-top: 1px solid var(--color-border);
  padding-top: 0.5rem;
}

.tooltip-details div {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.25rem;
}

.tooltip-details .bonus {
  color: var(--color-success);
}

.tooltip-details .penalty {
  color: var(--color-danger);
}

.search-result-toast {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.9);
  border: 2px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 1.1rem;
  z-index: 100;
  pointer-events: none;
}

.scene-hint {
  position: absolute;
  bottom: 1rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.7);
  border-radius: 20px;
  color: var(--color-text-dim);
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.hint-icon {
  font-size: 1rem;
}

.actions-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  transition: all 0.3s ease;
  text-align: left;
}

.action-btn:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.action-icon {
  font-size: 1.2rem;
}

.action-text {
  flex: 1;
  font-size: 0.95rem;
}

.action-count {
  background: var(--color-accent);
  color: white;
  padding: 0.2rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
  min-width: 24px;
  text-align: center;
}

.sanity-panel {
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.sanity-bar-container {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sanity-bar {
  height: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.sanity-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.sanity-fill.low {
  background: #ff9800;
}

.sanity-fill.critical {
  background: #f44336;
  animation: sanity-pulse 1s infinite;
}

@keyframes sanity-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.sanity-value {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  text-align: center;
}

.evidence-modal {
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
  backdrop-filter: blur(5px);
}

.evidence-detail {
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.evidence-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.evidence-name {
  font-size: 1.3rem;
  color: var(--color-accent-light);
}

.evidence-type {
  font-size: 0.8rem;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 12px;
  color: var(--color-accent-light);
  text-transform: uppercase;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.special-badge {
  background: #ffd700;
  color: #1a1a2e;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
}

.evidence-content {
  margin-bottom: 1.5rem;
}

.evidence-description {
  color: var(--color-text);
  line-height: 1.8;
  margin-bottom: 1rem;
}

.sanity-effect,
.tool-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(139, 58, 58, 0.1);
  border-radius: 6px;
  border: 1px solid var(--color-danger);
  margin-bottom: 0.5rem;
}

.tool-info {
  background: rgba(107, 76, 154, 0.1);
  border-color: var(--color-accent);
}

.effect-label {
  color: var(--color-text-dim);
}

.effect-value {
  font-weight: bold;
  color: var(--color-success);
}

.effect-value.negative {
  color: var(--color-danger);
}

.evidence-footer {
  display: flex;
  justify-content: flex-end;
}

.close-btn {
  padding: 0.5rem 1.5rem;
  background: var(--color-accent);
  border: none;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
}

.close-btn:hover {
  background: var(--color-accent-light);
}

.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.timer-section {
  min-width: 180px;
  text-align: center;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.timer-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.timer-icon {
  font-size: 1rem;
}

.timer-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.timer-display {
  font-size: 2rem;
  font-weight: bold;
  font-family: 'Courier New', monospace;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
  transition: all 0.3s ease;
}

.timer-display.low-time {
  color: #ff9800;
  animation: timer-pulse 1s infinite;
}

.timer-display.critical-time {
  color: #f44336;
  animation: timer-pulse 0.5s infinite;
}

.timer-display.expired {
  color: #f44336;
  opacity: 0.7;
}

@keyframes timer-pulse {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.timer-bar-container {
  height: 4px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 2px;
  overflow: hidden;
  margin-bottom: 0.25rem;
}

.timer-bar {
  height: 100%;
  background: var(--color-accent);
  transition: all 0.3s ease;
}

.timer-bar.low {
  background: #ff9800;
}

.timer-bar.critical {
  background: #f44336;
}

.timer-expired-warning {
  font-size: 0.8rem;
  color: #f44336;
  font-weight: bold;
  margin-top: 0.25rem;
}

.game-log-panel {
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.log-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.log-title {
  font-size: 1.3rem;
  color: var(--color-accent-light);
}

.close-btn.small {
  padding: 0.25rem 0.75rem;
  font-size: 0.9rem;
}

.log-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.log-stat-item {
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.log-stat-item .stat-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.log-stat-item .stat-value {
  font-size: 1.1rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.log-stat-item .stat-value.fail {
  color: var(--color-danger);
}

.log-list-container {
  flex: 1;
  overflow-y: auto;
  max-height: 400px;
  border: 1px solid var(--color-border);
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.15);
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: 0.75rem;
}

.log-entry {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  border-left: 3px solid var(--color-border);
}

.log-entry-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.25rem;
}

.log-type-badge {
  font-size: 0.75rem;
  font-weight: bold;
}

.log-time {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.log-description {
  font-size: 0.85rem;
  color: var(--color-text);
  line-height: 1.4;
}

.log-entry.log-type-discovery { border-left-color: var(--color-accent); }
.log-entry.log-type-deduction { border-left-color: #ff9800; }
.log-entry.log-type-sanity_loss { border-left-color: var(--color-danger); }
.log-entry.log-type-tool_use { border-left-color: #4caf50; }
.log-entry.log-type-timer { border-left-color: #9c27b0; }
.log-entry.log-type-scene_switch { border-left-color: #2196f3; }
.log-entry.log-type-timeout { border-left-color: #f44336; }
.log-entry.log-type-penalty { border-left-color: #e91e63; }
.log-entry.log-type-bonus { border-left-color: #ffd700; }
.log-entry.log-type-evidence_refresh { border-left-color: #00bcd4; }

.log-footer {
  padding-top: 0.75rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.timeout-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(139, 58, 58, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
  backdrop-filter: blur(5px);
}

.timeout-content {
  text-align: center;
  padding: 3rem;
  background: var(--color-bg-card);
  border: 2px solid var(--color-danger);
  border-radius: 12px;
  max-width: 450px;
}

.timeout-icon {
  font-size: 5rem;
  margin-bottom: 1rem;
  animation: bounce 1s infinite;
}

@keyframes bounce {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

.timeout-title {
  font-size: 2rem;
  color: var(--color-danger);
  margin-bottom: 1rem;
}

.timeout-message {
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.timeout-actions {
  display: flex;
  justify-content: center;
}

.primary-btn {
  padding: 0.75rem 2rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.primary-btn:hover {
  background: var(--color-accent-light);
  transform: translateY(-2px);
}

.hallucination-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  z-index: 50;
  overflow: hidden;
}

.hallucination-vignette {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: radial-gradient(ellipse at center, transparent 30%, rgba(0, 0, 0, 0.6) 100%);
  animation: vignettePulse 4s ease-in-out infinite;
}

.intensity-1 .hallucination-vignette { opacity: 0.3; }
.intensity-2 .hallucination-vignette { opacity: 0.5; }
.intensity-3 .hallucination-vignette { opacity: 0.7; }
.intensity-4 .hallucination-vignette { opacity: 0.85; }

@keyframes vignettePulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.hallucination-noise {
  position: absolute;
  top: -50%;
  left: -50%;
  right: -50%;
  bottom: -50%;
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E");
  opacity: 0.08;
  animation: noiseMove 0.5s steps(10) infinite;
}

.intensity-1 .hallucination-noise { opacity: 0.05; }
.intensity-2 .hallucination-noise { opacity: 0.1; }
.intensity-3 .hallucination-noise { opacity: 0.15; }
.intensity-4 .hallucination-noise { opacity: 0.25; }

@keyframes noiseMove {
  0% { transform: translate(0, 0); }
  10% { transform: translate(-5%, -5%); }
  20% { transform: translate(-10%, 5%); }
  30% { transform: translate(5%, -10%); }
  40% { transform: translate(-5%, 15%); }
  50% { transform: translate(-10%, 5%); }
  60% { transform: translate(15%, 0); }
  70% { transform: translate(0, 10%); }
  80% { transform: translate(-15%, 0); }
  90% { transform: translate(10%, 5%); }
  100% { transform: translate(5%, 0); }
}

.hallucination-shadows {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.shadow-figure {
  position: absolute;
  width: 40px;
  height: 80px;
  background: radial-gradient(ellipse at center, rgba(0, 0, 0, 0.6) 0%, transparent 70%);
  filter: blur(8px);
  animation: shadowFloat 5s ease-in-out infinite;
  opacity: 0;
}

@keyframes shadowFloat {
  0% { opacity: 0; transform: translateY(0) scale(1); }
  20% { opacity: 0.7; }
  50% { opacity: 0.4; transform: translateY(-20px) scale(1.1); }
  80% { opacity: 0.6; }
  100% { opacity: 0; transform: translateY(0) scale(1); }
}

.hallucination-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1rem 2rem;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  color: var(--color-accent-light);
  font-style: italic;
  font-size: 1.1rem;
  text-align: center;
  z-index: 60;
  text-shadow: 0 0 10px var(--color-accent);
  animation: messageFlicker 0.1s ease-in-out infinite alternate;
}

@keyframes messageFlicker {
  from { opacity: 0.8; }
  to { opacity: 1; }
}

.scene-background.hallucination-distortion {
  animation: sceneDistort 8s ease-in-out infinite;
}

@keyframes sceneDistort {
  0%, 100% { filter: none; transform: scale(1); }
  25% { filter: hue-rotate(10deg) saturate(1.2); }
  50% { filter: hue-rotate(-5deg) saturate(0.8) blur(1px); transform: scale(1.02); }
  75% { filter: hue-rotate(5deg) saturate(1.1); }
}

.scene-background.hallucination-shadow {
  box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.5);
}

.scene-background.hallucination-critical {
  animation: criticalShake 0.3s ease-in-out infinite;
}

@keyframes criticalShake {
  0%, 100% { transform: translate(0, 0); }
  25% { transform: translate(-2px, 1px); }
  50% { transform: translate(2px, -1px); }
  75% { transform: translate(-1px, 2px); }
}

.text-corrupted {
  animation: textCorrupt 0.5s ease-in-out infinite alternate;
  filter: blur(0.5px);
}

@keyframes textCorrupt {
  0% { letter-spacing: 0; opacity: 0.9; }
  100% { letter-spacing: 1px; opacity: 0.7; }
}

@media (max-width: 1024px) {
  .investigation-content {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr auto;
  }
  
  .scenes-panel {
    order: 1;
  }
  
  .scene-viewer {
    order: 0;
  }
  
  .actions-panel {
    order: 2;
  }
}
</style>
