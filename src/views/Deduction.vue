<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useSaveStore } from '@/stores/save'
import { getCaseById, unlockNextCase } from '@/data/cases'
import type { ConclusionOption } from '@/types'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const saveStore = useSaveStore()

const selectedConclusion = ref<string | null>(null)
const showResult = ref(false)
const resultMessage = ref('')
const isCorrect = ref(false)
const sanityLost = ref(0)

const caseData = computed(() => {
  const caseId = route.params.caseId as string
  return getCaseById(caseId)
})

const hasEnoughEvidence = computed(() => {
  if (!caseData.value) return false
  const requiredEvidence = caseData.value.conclusion.evidence
  const discovered = gameStore.gameState.discoveredEvidence
  return requiredEvidence.every(e => discovered.includes(e))
})

const canDeduce = computed(() => {
  return hasEnoughEvidence.value && gameStore.gameState.sanity >= caseData.value?.conclusion.sanityThreshold!
})

const evidenceProgress = computed(() => {
  if (!caseData.value) return 0
  const requiredEvidence = caseData.value.conclusion.evidence
  const discovered = gameStore.gameState.discoveredEvidence
  const found = requiredEvidence.filter(e => discovered.includes(e)).length
  return Math.round((found / requiredEvidence.length) * 100)
})

const missingEvidence = computed(() => {
  if (!caseData.value) return []
  const requiredEvidence = caseData.value.conclusion.evidence
  const discovered = gameStore.gameState.discoveredEvidence
  return requiredEvidence.filter(e => !discovered.includes(e))
})

onMounted(() => {
  if (!caseData.value) {
    router.push('/cases')
  }
})

function selectOption(option: ConclusionOption) {
  selectedConclusion.value = option.id
}

function makeDeduction() {
  if (!selectedConclusion.value || !caseData.value) return
  
  const option = caseData.value.conclusion.options.find(o => o.id === selectedConclusion.value)
  if (!option) return
  
  isCorrect.value = option.isCorrect
  resultMessage.value = option.feedback
  sanityLost.value = option.sanityCost
  
  if (option.sanityCost > 0) {
    gameStore.modifySanity(-option.sanityCost, '真相推演')
  }
  
  showResult.value = true
  
  if (option.isCorrect) {
    gameStore.addLog('conclusion', `案件已结案：${caseData.value.title}`, {
      conclusion: option.text,
      sanityLost: option.sanityCost
    })
    
    unlockNextCase(caseData.value.id)
  }
}

function closeResult() {
  showResult.value = false
  
  if (isCorrect.value) {
    router.push('/cases')
  }
}

function goToInvestigation() {
  router.push(`/investigation/${caseData.value?.id}`)
}

function goToClues() {
  router.push(`/clues/${caseData.value?.id}`)
}

function saveProgress() {
  const saveName = `案件进度 - ${new Date().toLocaleString('zh-CN')}`
  if (saveStore.createSave(saveName)) {
    alert('存档成功！')
  }
}
</script>

<template>
  <div class="deduction-page page-container">
    <div v-if="!caseData" class="loading">
      <p>加载案件数据...</p>
    </div>

    <template v-else>
      <div class="page-header">
        <div class="header-left">
          <h1 class="page-title">真相推演</h1>
          <p class="page-subtitle">根据收集的证据，做出你的最终判断</p>
        </div>
        <div class="header-actions">
          <button class="action-btn" @click="goToInvestigation">
            <span>🔍</span> 继续搜证
          </button>
          <button class="action-btn" @click="goToClues">
            <span>🧩</span> 线索拼接
          </button>
          <button class="action-btn" @click="saveProgress">
            <span>💾</span> 保存进度
          </button>
        </div>
      </div>

      <div class="deduction-content">
        <div class="evidence-check card">
          <h3 class="check-title">证据收集状态</h3>
          
          <div class="progress-section">
            <div class="progress-header">
              <span>关键证据</span>
              <span class="progress-value">{{ evidenceProgress }}%</span>
            </div>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: `${evidenceProgress}%` }"></div>
            </div>
          </div>

          <div v-if="!hasEnoughEvidence" class="missing-evidence">
            <h4>缺失的关键证据:</h4>
            <ul>
              <li v-for="evidenceId in missingEvidence" :key="evidenceId">
                {{ evidenceId }}
              </li>
            </ul>
            <p class="warning-text">⚠️ 你需要收集更多证据才能进行推演</p>
          </div>

          <div v-else class="evidence-complete">
            <p class="success-text">✓ 已收集所有关键证据</p>
          </div>

          <div class="sanity-check">
            <h4>理智值要求</h4>
            <div class="sanity-status">
              <span class="current-sanity">当前: {{ gameStore.gameState.sanity }}</span>
              <span class="required-sanity">需要: {{ caseData.conclusion.sanityThreshold }}+</span>
            </div>
            <div v-if="gameStore.gameState.sanity < caseData.conclusion.sanityThreshold" class="sanity-warning">
              ⚠️ 理智值不足，推演可能失败
            </div>
          </div>
        </div>

        <div class="conclusion-panel card">
          <h3 class="panel-title">推演结论</h3>
          <p class="panel-description">
            根据你收集的所有证据和线索，选择你认为最接近真相的结论。
            <br/>
            <span class="warning">警告：错误的结论可能会进一步侵蚀你的理智。</span>
          </p>

          <div class="options-list">
            <div
              v-for="option in caseData.conclusion.options"
              :key="option.id"
              class="option-item"
              :class="{ 
                selected: selectedConclusion === option.id,
                disabled: !canDeduce
              }"
              @click="canDeduce && selectOption(option)"
            >
              <div class="option-header">
                <span class="option-number">{{ caseData.conclusion.options.indexOf(option) + 1 }}</span>
                <span class="option-text">{{ option.text }}</span>
              </div>
              <div class="option-meta">
                <span class="sanity-cost">理智消耗: {{ option.sanityCost }}</span>
              </div>
            </div>
          </div>

          <div class="deduction-actions">
            <button 
              class="deduce-btn primary"
              :disabled="!selectedConclusion || !canDeduce"
              @click="makeDeduction"
            >
              🔍 提交推演
            </button>
            <p v-if="!canDeduce" class="cannot-deduce">
              {{ !hasEnoughEvidence ? '证据不足，无法推演' : '理智值过低，推演风险极大' }}
            </p>
          </div>
        </div>

        <div class="summary-panel card">
          <h3 class="panel-title">调查总结</h3>
          
          <div class="summary-stats">
            <div class="stat-item">
              <span class="stat-label">发现证据</span>
              <span class="stat-value">{{ gameStore.gameState.discoveredEvidence.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">获得线索</span>
              <span class="stat-value">{{ gameStore.gameState.discoveredClues.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">分析线索</span>
              <span class="stat-value">{{ gameStore.gameState.analyzedClues.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">建立关联</span>
              <span class="stat-value">{{ gameStore.gameState.clueConnections.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前理智</span>
              <span class="stat-value sanity">{{ gameStore.gameState.sanity }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">调查时长</span>
              <span class="stat-value">{{ saveStore.getPlayDuration(gameStore.gameState.startTime) }}</span>
            </div>
          </div>

          <div class="game-log">
            <h4>调查日志</h4>
            <div class="log-list">
              <div 
                v-for="log in gameStore.gameState.gameLog.slice(-10).reverse()" 
                :key="log.id"
                class="log-item"
              >
                <span class="log-time">{{ saveStore.formatDate(log.timestamp) }}</span>
                <span class="log-type">{{ log.type }}</span>
                <span class="log-desc">{{ log.description }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showResult" class="result-modal" @click.self="closeResult">
          <div class="result-content card" :class="{ correct: isCorrect, wrong: !isCorrect }">
            <div class="result-icon">
              {{ isCorrect ? '✓' : '✗' }}
            </div>
            <h2 class="result-title">
              {{ isCorrect ? '推演正确！' : '推演失败...' }}
            </h2>
            <p class="result-message">{{ resultMessage }}</p>
            
            <div v-if="sanityLost > 0" class="result-sanity">
              <span>理智消耗: -{{ sanityLost }}</span>
              <span>剩余理智: {{ gameStore.gameState.sanity }}</span>
            </div>

            <div class="result-actions">
              <button class="close-btn" @click="closeResult">
                {{ isCorrect ? '返回案件列表' : '继续调查' }}
              </button>
            </div>
          </div>
        </div>
      </transition>
    </template>
  </div>
</template>

<style scoped>
.deduction-page {
  display: flex;
  flex-direction: column;
}

.loading {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 2rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--color-text-dim);
}

.header-actions {
  display: flex;
  gap: 0.75rem;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
}

.deduction-content {
  display: grid;
  grid-template-columns: 1fr 1.5fr 1fr;
  gap: 1.5rem;
}

.evidence-check {
  display: flex;
  flex-direction: column;
}

.check-title {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.progress-section {
  margin-bottom: 1.5rem;
}

.progress-header {
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

.missing-evidence {
  padding: 1rem;
  background: rgba(139, 58, 58, 0.1);
  border: 1px solid var(--color-danger);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.missing-evidence h4 {
  color: var(--color-danger);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.missing-evidence ul {
  list-style: none;
  padding: 0;
  margin-bottom: 0.75rem;
}

.missing-evidence li {
  padding: 0.25rem 0;
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.warning-text {
  color: var(--color-warning);
  font-size: 0.85rem;
}

.evidence-complete {
  padding: 1rem;
  background: rgba(58, 139, 90, 0.1);
  border: 1px solid var(--color-success);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.success-text {
  color: var(--color-success);
  font-size: 0.95rem;
}

.sanity-check {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.sanity-check h4 {
  color: var(--color-text);
  margin-bottom: 0.5rem;
  font-size: 0.95rem;
}

.sanity-status {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.current-sanity {
  color: var(--color-text);
}

.required-sanity {
  color: var(--color-text-dim);
}

.sanity-warning {
  padding: 0.5rem;
  background: rgba(139, 58, 58, 0.2);
  border-radius: 4px;
  color: var(--color-danger);
  font-size: 0.85rem;
}

.conclusion-panel {
  display: flex;
  flex-direction: column;
}

.panel-title {
  font-size: 1.3rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.panel-description {
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.panel-description .warning {
  color: var(--color-warning);
  font-size: 0.85rem;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.option-item {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.option-item:hover:not(.disabled) {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.1);
}

.option-item.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
  box-shadow: 0 0 10px rgba(107, 76, 154, 0.3);
}

.option-item.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.option-header {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.option-number {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  background: var(--color-accent);
  border-radius: 50%;
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
}

.option-text {
  color: var(--color-text);
  line-height: 1.5;
}

.option-meta {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.sanity-cost {
  color: var(--color-warning);
}

.deduction-actions {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.deduce-btn {
  padding: 1rem;
  font-size: 1.1rem;
}

.deduce-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.cannot-deduce {
  color: var(--color-danger);
  font-size: 0.85rem;
  text-align: center;
}

.summary-panel {
  display: flex;
  flex-direction: column;
}

.summary-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.stat-label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.stat-value {
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: bold;
}

.stat-value.sanity {
  color: var(--color-accent-light);
}

.game-log {
  flex: 1;
  overflow-y: auto;
}

.game-log h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.log-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.log-item {
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  font-size: 0.8rem;
}

.log-time {
  color: var(--color-text-dim);
  font-size: 0.75rem;
}

.log-type {
  color: var(--color-accent-light);
  text-transform: uppercase;
}

.log-desc {
  color: var(--color-text);
}

.result-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(10px);
}

.result-content {
  max-width: 500px;
  width: 90%;
  text-align: center;
  padding: 2rem;
}

.result-content.correct {
  border-color: var(--color-success);
  background: rgba(58, 139, 90, 0.1);
}

.result-content.wrong {
  border-color: var(--color-danger);
  background: rgba(139, 58, 58, 0.1);
}

.result-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.result-content.correct .result-icon {
  color: var(--color-success);
}

.result-content.wrong .result-icon {
  color: var(--color-danger);
}

.result-title {
  font-size: 1.5rem;
  margin-bottom: 1rem;
}

.result-content.correct .result-title {
  color: var(--color-success);
}

.result-content.wrong .result-title {
  color: var(--color-danger);
}

.result-message {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.result-sanity {
  display: flex;
  justify-content: center;
  gap: 1rem;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.result-sanity span:first-child {
  color: var(--color-danger);
}

.result-sanity span:last-child {
  color: var(--color-text);
}

.result-actions {
  display: flex;
  justify-content: center;
}

.close-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

@media (max-width: 1024px) {
  .deduction-content {
    grid-template-columns: 1fr;
  }
  
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
}
</style>