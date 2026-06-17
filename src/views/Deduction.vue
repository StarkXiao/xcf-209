<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { useSaveStore } from '@/stores/save'
import { useProgressStore } from '@/stores/progress'
import { getCaseById, getEvidenceById } from '@/data/cases'
import { getToolById } from '@/data/tools'
import type { ConclusionOption, CaseRewards, CaseScoreBreakdown } from '@/types'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()
const saveStore = useSaveStore()
const progressStore = useProgressStore()

const selectedConclusion = ref<string | null>(null)
const showResult = ref(false)
const resultMessage = ref('')
const isCorrect = ref(false)
const sanityLost = ref(0)
const unlockedBranch = ref<string | null>(null)
const branchRewards = ref<string[]>([])
const caseRewards = ref<CaseRewards | null>(null)
const isFirstCompletion = ref(false)
const newlyUnlockedCases = ref<string[]>([])
const caseScore = ref<CaseScoreBreakdown | null>(null)
const usedTime = ref(0)

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
  if (!selectedConclusion.value || !caseData.value) return false
  const option = caseData.value.conclusion.options.find(o => o.id === selectedConclusion.value)
  if (!option) return false
  
  if (!hasEnoughEvidence.value) return false
  if (gameStore.gameState.sanity < caseData.value.conclusion.sanityThreshold) return false
  if (!isOptionAvailable(option)) return false
  
  return true
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
  return requiredEvidence
    .filter(e => !discovered.includes(e))
    .map(evId => {
      const ev = getEvidenceById(caseData.value!.id, evId)
      return ev?.name || evId
    })
})



function isOptionAvailable(option: ConclusionOption): boolean {
  if (option.requiredTools && option.requiredTools.length > 0) {
    const hasAllTools = option.requiredTools.every(toolId => 
      gameStore.gameState.tools.some(t => t.id === toolId && t.uses > 0 && t.durability > 0)
    )
    if (!hasAllTools) return false
  }

  if (option.requiredEvidence && option.requiredEvidence.length > 0) {
    const hasAllEvidence = option.requiredEvidence.every(
      evId => gameStore.gameState.discoveredEvidence.includes(evId)
    )
    if (!hasAllEvidence) return false
  }

  return true
}

function getMissingRequirements(option: ConclusionOption): { tools: string[], evidence: string[] } {
  const missingTools: string[] = []
  const missingEvidenceList: string[] = []

  if (option.requiredTools) {
    option.requiredTools.forEach(toolId => {
      const hasTool = gameStore.gameState.tools.some(
        t => t.id === toolId && t.uses > 0 && t.durability > 0
      )
      if (!hasTool) {
        const tool = getToolById(toolId)
        missingTools.push(tool?.name || toolId)
      }
    })
  }

  if (option.requiredEvidence && caseData.value) {
    option.requiredEvidence.forEach(evId => {
      if (!gameStore.gameState.discoveredEvidence.includes(evId)) {
        const ev = getEvidenceById(caseData.value!.id, evId)
        missingEvidenceList.push(ev?.name || evId)
      }
    })
  }

  return { tools: missingTools, evidence: missingEvidenceList }
}

onMounted(() => {
  if (!caseData.value) {
    router.push('/cases')
  }
})

function selectOption(option: ConclusionOption) {
  if (!isOptionAvailable(option)) return
  selectedConclusion.value = option.id
}

function makeDeduction() {
  if (!selectedConclusion.value || !caseData.value) return
  
  const option = caseData.value.conclusion.options.find(o => o.id === selectedConclusion.value)
  if (!option) return
  
  gameStore.stopTimer()
  usedTime.value = gameStore.getUsedTime()
  
  isCorrect.value = option.isCorrect
  resultMessage.value = option.feedback
  sanityLost.value = option.sanityCost
  branchRewards.value = []
  caseRewards.value = null
  isFirstCompletion.value = false
  newlyUnlockedCases.value = []
  caseScore.value = null
  
  if (option.branch) {
    unlockedBranch.value = option.branch
    gameStore.unlockDeductionBranch(option.branch)
  }
  
  if (option.sanityCost > 0) {
    gameStore.modifySanity(-option.sanityCost, '真相推演')
  }
  
  caseScore.value = gameStore.calculateScore(option.isCorrect, option.id, option.branch)
  
  if (option.isCorrect) {
    gameStore.addLog('conclusion', `案件已结案：${caseData.value.title}`, {
      conclusion: option.text,
      sanityLost: option.sanityCost,
      branch: option.branch,
      score: caseScore.value.totalScore,
      grade: caseScore.value.grade
    })

    const prevCompleted = progressStore.getProgress(caseData.value.id)?.completed
    isFirstCompletion.value = !prevCompleted

    const rewards = progressStore.recordCaseCompletion(
      caseData.value.id,
      option.id,
      option.branch,
      option.sanityCost,
      caseScore.value,
      usedTime.value
    )
    caseRewards.value = rewards

    if (rewards) {
      const rewardToolNames = rewards.tools
        .map(id => getToolById(id)?.name || id)
      branchRewards.value = rewardToolNames

      newlyUnlockedCases.value = rewards.unlocksCases
        .map(id => getCaseById(id)?.title || id)

      if (rewards.sanityBonus > 0) {
        gameStore.modifySanity(rewards.sanityBonus, '案件完成奖励')
      }

      gameStore.addLog('discovery', `案件奖励：${rewards.description}`)
    }

    progressStore.updateDiscoveredItems(
      caseData.value.id,
      gameStore.gameState.discoveredEvidence,
      gameStore.gameState.discoveredClues
    )

    const saveName = `[结算] ${caseData.value.title} - ${new Date().toLocaleString('zh-CN')}`
    saveStore.createSave(saveName)
  }

  showResult.value = true
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

function getBranchInfo(branch: string): { name: string; description: string } {
  const branches: Record<string, { name: string; description: string }> = {
    'standard': {
      name: '标准结局',
      description: '基于常规调查得出的结论'
    },
    'deep-truth': {
      name: '深渊真相',
      description: '使用特殊工具发现隐藏证据，揭示更深层的真相'
    }
  }
  return branches[branch] || { name: branch, description: '' }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}分${secs}秒`
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

          <div class="tools-check">
            <h4>可用工具</h4>
            <div class="tools-list">
              <div 
                v-for="tool in gameStore.gameState.tools" 
                :key="tool.id"
                class="tool-item"
                :class="{ disabled: tool.uses <= 0 || tool.durability <= 0 }"
              >
                <span class="tool-icon">{{ tool.icon }}</span>
                <span class="tool-name">{{ tool.name }}</span>
                <span class="tool-status">
                  {{ tool.uses > 0 && tool.durability > 0 ? '可用' : '已耗尽' }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="gameStore.gameState.deductionBranches.length > 0" class="branches-section">
            <h4>已解锁分支</h4>
            <div class="branches-list">
              <div 
                v-for="branchId in gameStore.gameState.deductionBranches" 
                :key="branchId"
                class="branch-item"
              >
                <span class="branch-icon">🌿</span>
                <div class="branch-info">
                  <span class="branch-name">{{ getBranchInfo(branchId).name }}</span>
                  <span class="branch-desc">{{ getBranchInfo(branchId).description }}</span>
                </div>
              </div>
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
                disabled: !isOptionAvailable(option),
                'branch-option': option.branch
              }"
              @click="selectOption(option)"
            >
              <div class="option-header">
                <span class="option-number">{{ caseData.conclusion.options.indexOf(option) + 1 }}</span>
                <div class="option-text-wrapper">
                  <span class="option-text">{{ option.text }}</span>
                  <span v-if="option.branch" class="branch-tag">
                    {{ getBranchInfo(option.branch).name }}
                  </span>
                </div>
              </div>
              <div class="option-meta">
                <span class="sanity-cost">理智消耗: {{ option.sanityCost }}</span>
              </div>

              <div v-if="!isOptionAvailable(option)" class="locked-reason">
                <p class="locked-title">🔒 需要满足以下条件:</p>
                <ul v-if="getMissingRequirements(option).tools.length > 0">
                  <li>工具: {{ getMissingRequirements(option).tools.join('、') }}</li>
                </ul>
                <ul v-if="getMissingRequirements(option).evidence.length > 0">
                  <li>特殊证据: {{ getMissingRequirements(option).evidence.join('、') }}</li>
                </ul>
              </div>
            </div>
          </div>

          <div class="deduction-actions">
            <button 
              class="deduce-btn primary"
              :disabled="!canDeduce"
              @click="makeDeduction"
            >
              🔍 提交推演
            </button>
            <p v-if="!canDeduce" class="cannot-deduce">
              {{ !hasEnoughEvidence ? '证据不足，无法推演' : 
                 selectedConclusion ? '条件不足，无法选择此结论' : 
                 '请选择一个推演结论' }}
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
              <span class="stat-label">携带工具</span>
              <span class="stat-value">{{ gameStore.gameState.tools.length }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">当前理智</span>
              <span class="stat-value sanity">{{ gameStore.gameState.sanity }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">调查时长</span>
              <span class="stat-value">{{ saveStore.getPlayDuration(gameStore.gameState.startTime) }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">推演分支</span>
              <span class="stat-value">{{ gameStore.gameState.deductionBranches.length }}</span>
            </div>
            <div class="stat-item timer-stat">
              <span class="stat-label">剩余时间</span>
              <span 
                class="stat-value" 
                :class="{ 
                  'low': gameStore.isLowTime, 
                  'critical': gameStore.isCriticalTime,
                  'expired': gameStore.gameState.timerState.isExpired 
                }"
              >
                {{ gameStore.formattedRemainingTime }}
              </span>
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
            <p v-if="isFirstCompletion" class="first-clear-badge">🏆 首次通关！</p>

            <div v-if="caseScore" class="score-section">
              <div 
                class="grade-display"
                :class="`grade-${caseScore.grade.toLowerCase()}`"
              >
                <div class="grade-letter">{{ caseScore.grade }}</div>
                <div class="grade-score">{{ caseScore.totalScore }} 分</div>
              </div>
              <p class="grade-desc">{{ caseScore.gradeDescription }}</p>
              
              <div class="score-breakdown">
                <h4>评分明细</h4>
                <div class="score-item">
                  <span class="score-label">证据收集</span>
                  <span class="score-value positive">+{{ caseScore.evidenceScore }}</span>
                </div>
                <div class="score-item">
                  <span class="score-label">线索获取</span>
                  <span class="score-value positive">+{{ caseScore.clueScore }}</span>
                </div>
                <div class="score-item">
                  <span class="score-label">推演分析</span>
                  <span class="score-value positive">+{{ caseScore.deductionScore }}</span>
                </div>
                <div class="score-item">
                  <span class="score-label">时间效率</span>
                  <span class="score-value positive">+{{ caseScore.timeScore }}</span>
                </div>
                <div class="score-item">
                  <span class="score-label">理智保持</span>
                  <span class="score-value positive">+{{ caseScore.sanityScore }}</span>
                </div>
                <div v-if="caseScore.bonusScore > 0" class="score-item">
                  <span class="score-label bonus">额外奖励</span>
                  <span class="score-value bonus">+{{ caseScore.bonusScore }}</span>
                </div>
                <div v-if="caseScore.penaltyScore > 0" class="score-item">
                  <span class="score-label penalty">扣分惩罚</span>
                  <span class="score-value penalty">-{{ caseScore.penaltyScore }}</span>
                </div>
              </div>

              <div class="time-summary">
                <span>用时: {{ formatTime(usedTime) }}</span>
                <span>剩余: {{ gameStore.formattedRemainingTime }}</span>
              </div>
            </div>

            <p class="result-message">{{ resultMessage }}</p>

            <div v-if="unlockedBranch" class="branch-unlock">
              <span class="branch-icon">🌿</span>
              <span>解锁推演分支：{{ getBranchInfo(unlockedBranch).name }}</span>
            </div>

            <div v-if="branchRewards.length > 0" class="branch-rewards">
              <p class="rewards-title">🎁 案件奖励</p>
              <p class="rewards-desc">{{ caseRewards?.description }}</p>
              <div v-if="branchRewards.length > 0" class="rewards-list">
                <span v-for="name in branchRewards" :key="name" class="reward-tag">
                  🔧 {{ name }}
                </span>
              </div>
            </div>

            <div v-if="newlyUnlockedCases.length > 0" class="new-cases-unlock">
              <p class="unlock-title">🔓 新案件解锁</p>
              <div class="unlocked-cases-list">
                <span v-for="name in newlyUnlockedCases" :key="name" class="case-tag">
                  📁 {{ name }}
                </span>
              </div>
            </div>

            <div v-if="caseRewards?.sanityBonus && caseRewards.sanityBonus > 0" class="sanity-bonus">
              <span class="bonus-icon">💚</span>
              <span>理智恢复：+{{ caseRewards.sanityBonus }}</span>
            </div>
            
            <div v-if="sanityLost > 0 || gameStore.gameState.timerState.isExpired" class="result-sanity">
              <span v-if="sanityLost > 0">推演消耗: -{{ sanityLost }}</span>
              <span v-if="gameStore.gameState.timerState.isExpired" class="timeout-penalty">⏰ 超时惩罚: -20</span>
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
  margin-bottom: 1rem;
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

.tools-check {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
  margin-bottom: 1rem;
}

.tools-check h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.tools-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.tool-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
  font-size: 0.85rem;
}

.tool-item.disabled {
  opacity: 0.4;
}

.tool-icon {
  font-size: 1.1rem;
}

.tool-name {
  flex: 1;
  color: var(--color-text);
}

.tool-status {
  font-size: 0.75rem;
  color: var(--color-success);
}

.tool-item.disabled .tool-status {
  color: var(--color-danger);
}

.branches-section {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.branches-section h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
  font-size: 0.95rem;
}

.branches-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.branch-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.15);
  border: 1px solid var(--color-accent);
  border-radius: 4px;
}

.branch-icon {
  font-size: 1.1rem;
}

.branch-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.branch-name {
  font-size: 0.85rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.branch-desc {
  font-size: 0.75rem;
  color: var(--color-text-dim);
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

.option-item.branch-option {
  border-left: 4px solid #ffd700;
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
  flex-shrink: 0;
}

.option-text-wrapper {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.option-text {
  color: var(--color-text);
  line-height: 1.5;
}

.branch-tag {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  width: fit-content;
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

.locked-reason {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border);
}

.locked-title {
  font-size: 0.8rem;
  color: var(--color-warning);
  margin-bottom: 0.5rem;
}

.locked-reason ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.locked-reason li {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  padding: 0.15rem 0;
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

.first-clear-badge {
  color: #ffd700;
  font-size: 1.1rem;
  font-weight: bold;
  margin-bottom: 1rem;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.6; }
}

.result-message {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 1.5rem;
}

.branch-unlock {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(255, 215, 0, 0.1);
  border: 1px solid #ffd700;
  border-radius: 6px;
  margin-bottom: 1rem;
  color: #ffd700;
  font-size: 0.9rem;
}

.branch-rewards {
  padding: 0.75rem;
  background: rgba(58, 139, 90, 0.15);
  border: 1px solid var(--color-success);
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
}

.rewards-title {
  color: #ffd700;
  font-weight: bold;
  font-size: 0.95rem;
  margin-bottom: 0.25rem;
}

.rewards-desc {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin-bottom: 0.5rem;
}

.rewards-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.reward-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.3);
  border: 1px solid var(--color-accent);
  border-radius: 12px;
  color: var(--color-accent-light);
  font-size: 0.8rem;
  font-weight: bold;
}

.new-cases-unlock {
  padding: 0.75rem;
  background: rgba(58, 139, 90, 0.15);
  border: 1px solid var(--color-success);
  border-radius: 6px;
  margin-bottom: 1rem;
  text-align: center;
}

.unlock-title {
  color: var(--color-success);
  font-weight: bold;
  font-size: 0.95rem;
  margin-bottom: 0.5rem;
}

.unlocked-cases-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.case-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  color: var(--color-success);
  font-size: 0.8rem;
  font-weight: bold;
}

.sanity-bonus {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.5rem;
  background: rgba(58, 139, 90, 0.1);
  border-radius: 6px;
  margin-bottom: 1rem;
  color: var(--color-success);
  font-size: 0.9rem;
  font-weight: bold;
}

.bonus-icon {
  font-size: 1.1rem;
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

.timer-stat .stat-value.low {
  color: #ff9800;
}

.timer-stat .stat-value.critical {
  color: #f44336;
  animation: pulse 1s infinite;
}

.timer-stat .stat-value.expired {
  color: #f44336;
  opacity: 0.6;
}

.score-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.grade-display {
  text-align: center;
  margin-bottom: 1rem;
  padding: 1rem;
  border-radius: 8px;
  border: 2px solid var(--color-border);
}

.grade-display.grade-s {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.2), rgba(255, 140, 0, 0.2));
  border-color: #ffd700;
}

.grade-display.grade-a {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
}

.grade-display.grade-b {
  background: rgba(58, 139, 90, 0.2);
  border-color: var(--color-success);
}

.grade-display.grade-c {
  background: rgba(255, 152, 0, 0.2);
  border-color: #ff9800;
}

.grade-display.grade-d {
  background: rgba(139, 90, 43, 0.2);
  border-color: #8b5a2b;
}

.grade-display.grade-f {
  background: rgba(139, 58, 58, 0.2);
  border-color: var(--color-danger);
}

.grade-letter {
  font-size: 3.5rem;
  font-weight: bold;
  line-height: 1;
  margin-bottom: 0.25rem;
}

.grade-s .grade-letter { color: #ffd700; text-shadow: 0 0 20px rgba(255, 215, 0, 0.5); }
.grade-a .grade-letter { color: var(--color-accent-light); }
.grade-b .grade-letter { color: var(--color-success); }
.grade-c .grade-letter { color: #ff9800; }
.grade-d .grade-letter { color: #8b5a2b; }
.grade-f .grade-letter { color: var(--color-danger); }

.grade-score {
  font-size: 1.2rem;
  color: var(--color-text-dim);
}

.grade-desc {
  text-align: center;
  color: var(--color-text);
  font-size: 0.95rem;
  line-height: 1.5;
  margin-bottom: 1rem;
}

.score-breakdown {
  padding-top: 1rem;
  border-top: 1px dashed var(--color-border);
}

.score-breakdown h4 {
  font-size: 0.9rem;
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
  text-align: center;
}

.score-item {
  display: flex;
  justify-content: space-between;
  padding: 0.35rem 0.5rem;
  font-size: 0.85rem;
  border-radius: 4px;
}

.score-item:nth-child(odd) {
  background: rgba(0, 0, 0, 0.15);
}

.score-label {
  color: var(--color-text-dim);
}

.score-label.bonus {
  color: #ffd700;
  font-weight: bold;
}

.score-label.penalty {
  color: var(--color-danger);
  font-weight: bold;
}

.score-value.positive {
  color: var(--color-success);
  font-weight: bold;
}

.score-value.bonus {
  color: #ffd700;
  font-weight: bold;
}

.score-value.penalty {
  color: var(--color-danger);
  font-weight: bold;
}

.time-summary {
  display: flex;
  justify-content: space-around;
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px dashed var(--color-border);
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.timeout-penalty {
  color: var(--color-danger) !important;
  font-weight: bold;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
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
