<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { cases, resetCaseForReplay } from '@/data/cases'
import { useGameStore } from '@/stores/game'
import { useSaveStore } from '@/stores/save'
import { useProgressStore } from '@/stores/progress'
import { useNewGamePlusStore } from '@/stores/newGamePlus'
import { getToolById } from '@/data/tools'

const router = useRouter()
const gameStore = useGameStore()
const saveStore = useSaveStore()
const progressStore = useProgressStore()
const newGamePlusStore = useNewGamePlusStore()

onMounted(() => {
  newGamePlusStore.checkAndUnlockMilestones()
  newGamePlusStore.checkHiddenCases()
  newGamePlusStore.checkSpecialEvidence()
})

const difficultyColors = {
  easy: '#3a8b5a',
  normal: '#8b6b3a',
  hard: '#8b3a3a'
}

const difficultyLabels = {
  easy: '简单',
  normal: '普通',
  hard: '困难'
}

const statusLabels = {
  locked: '🔒 未解锁',
  available: '🔍 可调查',
  in_progress: '⏳ 调查中',
  completed: '✓ 已结案',
  failed: '❌ 调查失败',
  abandoned: '⏸️ 已搁置',
  reopened: '🔄 重新调查'
}

const statusColors: Record<string, string> = {
  locked: '#555',
  available: '#4a90d9',
  in_progress: '#6b4c9a',
  completed: '#3a8b5a',
  failed: '#8b3a3a',
  abandoned: '#8b6b3a',
  reopened: '#d4850a'
}

const chapterNames: Record<number, string> = {
  1: '第一章：海岸疑云',
  2: '第二章：禁忌知识',
  3: '第三章：深渊回响'
}

const chapterTree = computed(() => progressStore.chapterTree)

const globalToolNames = computed(() => {
  return saveStore.globalUnlockedTools
    .map(id => getToolById(id)?.name || id)
})

const playthroughCount = computed(() => newGamePlusStore.state.playthroughCount)
const carriedSanityBonus = computed(() => newGamePlusStore.state.carriedSanityBonus)
const unlockedMilestones = computed(() => newGamePlusStore.unlockedMilestones)
const milestoneProgress = computed(() => newGamePlusStore.milestoneProgress)
const inheritedBestiaryCount = computed(() => newGamePlusStore.state.inheritedBestiary.totalDiscovered)
const unlockedHiddenCasesCount = computed(() => newGamePlusStore.state.unlockedHiddenCases.length)
const unlockedEndingsCount = computed(() => newGamePlusStore.state.unlockedEndings.length)

const overallProgress = computed(() => {
  const total = cases.length
  const completed = progressStore.totalCompleted
  return Math.round((completed / total) * 100)
})

function selectCase(caseItem: typeof cases[0]) {
  if (caseItem.status === 'locked') return
  
  if (caseItem.status === 'available' || caseItem.status === 'in_progress' || caseItem.status === 'reopened') {
    if (gameStore.currentCase && gameStore.currentCase.id !== caseItem.id) {
      if (!confirm('当前有未完成的案件，确定要切换吗？')) {
        return
      }
    }
    
    gameStore.startCase(caseItem.id)
    router.push(`/investigation/${caseItem.id}`)
  } else if (caseItem.status === 'completed') {
    startNewGamePlus(caseItem)
  } else if (caseItem.status === 'failed') {
    if (confirm('此案件调查失败，是否重新调查？')) {
      retryCase(caseItem)
    }
  } else if (caseItem.status === 'abandoned') {
    if (confirm('此案件已搁置，是否继续调查？')) {
      resumeCase(caseItem)
    }
  }
}

function retryCase(caseItem: typeof cases[0]) {
  const success = progressStore.reopenCaseProgress(caseItem.id)
  if (success) {
    gameStore.startCase(caseItem.id)
    router.push(`/investigation/${caseItem.id}`)
  } else {
    alert('重新调查失败，请重试')
  }
}

function resumeCase(caseItem: typeof cases[0]) {
  const success = progressStore.reopenCaseProgress(caseItem.id)
  if (success) {
    gameStore.startCase(caseItem.id)
    router.push(`/investigation/${caseItem.id}`)
  } else {
    alert('继续调查失败，请重试')
  }
}

function startNewGamePlus(caseItem: typeof cases[0]) {
  if (gameStore.currentCase) {
    if (!confirm('当前有未完成的案件，确定要切换吗？')) {
      return
    }
  }

  resetCaseForReplay(caseItem.id)

  const success = newGamePlusStore.startNewGamePlus(caseItem.id)
  if (success) {
    router.push(`/investigation/${caseItem.id}`)
  } else {
    alert('启动二周目失败，请重试')
  }
}

function getCaseProgress(caseItem: typeof cases[0]): number {
  if (caseItem.status === 'locked') return 0
  if (caseItem.status === 'available') return 0
  if (caseItem.status === 'completed') return 100
  if (caseItem.status === 'failed') return 0
  if (caseItem.status === 'reopened') return 0
  
  if (gameStore.currentCase && gameStore.currentCase.id === caseItem.id) {
    const totalEvidence = caseItem.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
    const discovered = gameStore.gameState.discoveredEvidence.length
    return totalEvidence > 0 ? Math.round((discovered / totalEvidence) * 100) : 0
  }
  
  const progress = progressStore.getProgress(caseItem.id)
  if (progress?.discoveredEvidence.length && caseItem.scenes.length > 0) {
    const totalEvidence = caseItem.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
    return totalEvidence > 0 ? Math.round((progress.discoveredEvidence.length / totalEvidence) * 100) : 0
  }
  
  return 0
}

function getBranchesCount(caseId: string): number {
  return progressStore.getProgress(caseId)?.unlockedBranches.length || 0
}

function getPlayCount(caseId: string): number {
  return progressStore.getProgress(caseId)?.playCount || 0
}

function getFailedCount(caseId: string): number {
  return progressStore.getProgress(caseId)?.failedCount || 0
}

function getAbandonedCount(caseId: string): number {
  return progressStore.getProgress(caseId)?.abandonedCount || 0
}

function getPrereqNames(prereqIds: string[]): string[] {
  return prereqIds
    .map(id => cases.find(c => c.id === id)?.title || id)
}

function getBestGrade(caseId: string): string | undefined {
  return progressStore.getProgress(caseId)?.bestGrade
}

function getBestScore(caseId: string): number | undefined {
  return progressStore.getProgress(caseId)?.bestScore?.totalScore
}

function getFastestTime(caseId: string): number | undefined {
  return progressStore.getProgress(caseId)?.fastestTime
}

function formatCaseTime(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins > 0) {
    return `${mins}分${secs}秒`
  }
  return `${secs}秒`
}

function isHiddenCase(caseId: string): boolean {
  return newGamePlusStore.state.unlockedHiddenCases.includes(caseId) || caseId.startsWith('case-secret')
}

function isNewGamePlusCase(caseId: string): boolean {
  return caseId.startsWith('case-secret')
}
</script>

<template>
  <div class="cases-page page-container">
    <div class="page-header">
      <h1 class="page-title">案件档案</h1>
      <p class="page-subtitle">选择一个案件开始你的调查</p>
      
      <div v-if="playthroughCount > 1" class="ngplus-header">
        <div class="ngplus-badge">
          🔄 第 {{ playthroughCount }} 周目
        </div>
        <div v-if="carriedSanityBonus > 0" class="ngplus-bonus">
          ⚡ 继承理智加成: +{{ carriedSanityBonus }}
        </div>
        <div v-if="inheritedBestiaryCount > 0" class="ngplus-bonus">
          📚 继承图鉴: {{ inheritedBestiaryCount }} 项
        </div>
      </div>

      <div class="milestone-progress">
        <span class="milestone-label">🏆 成就进度</span>
        <div class="progress-bar-large">
          <div class="progress-fill milestone-fill" :style="{ width: `${milestoneProgress}%` }"></div>
        </div>
        <span class="milestone-value">{{ unlockedMilestones.length }} / {{ newGamePlusStore.totalMilestones }}</span>
      </div>

      <div class="ngplus-stats">
        <span v-if="unlockedHiddenCasesCount > 0" class="stat-chip">
          🔮 隐藏案件: {{ unlockedHiddenCasesCount }}
        </span>
        <span v-if="unlockedEndingsCount > 0" class="stat-chip">
          🌟 特殊结局: {{ unlockedEndingsCount }}
        </span>
        <span class="stat-chip">
          🎒 继承工具: {{ globalToolNames.length }}
        </span>
      </div>

      <div class="overall-progress">
        <span class="progress-label">总进度</span>
        <div class="progress-bar-large">
          <div class="progress-fill" :style="{ width: `${overallProgress}%` }"></div>
        </div>
        <span class="progress-value">{{ progressStore.totalCompleted }} / {{ cases.length }} 案件</span>
        <span v-if="progressStore.totalBranches > 0" class="branches-badge">
          🌿 {{ progressStore.totalBranches }} 分支
        </span>
      </div>

      <div class="quick-actions">
        <button 
          v-if="progressStore.totalCompleted > 0"
          class="quick-replay-btn"
          @click="router.push('/replay')"
        >
          🎬 案件回放编辑器
        </button>
      </div>
    </div>

    <div class="chapters-section">
      <div v-for="chapter in chapterTree" :key="chapter.chapter" class="chapter-group">
        <div class="chapter-header">
          <h2 class="chapter-title">{{ chapterNames[chapter.chapter] || `第${chapter.chapter}章` }}</h2>
          <span class="chapter-count">{{ chapter.cases.length }} 个案件</span>
        </div>

        <div class="cases-grid">
          <div 
              v-for="caseItem in chapter.cases" 
              :key="caseItem.id"
              class="case-card card"
              :class="{ 
                locked: caseItem.status === 'locked',
                available: caseItem.status === 'available',
                completed: caseItem.status === 'completed',
                failed: caseItem.status === 'failed',
                abandoned: caseItem.status === 'abandoned',
                reopened: caseItem.status === 'reopened',
                active: gameStore.currentCase?.id === caseItem.id,
                'hidden-case': isHiddenCase(caseItem.id),
                'ngplus-case': isNewGamePlusCase(caseItem.id)
              }"
              @click="selectCase(caseItem)"
            >
              <div class="case-header">
                <div class="case-status" :style="{ color: statusColors[caseItem.status] }">
                  <span v-if="isHiddenCase(caseItem.id)" class="hidden-badge">🔮 隐藏</span>
                  <span v-else-if="isNewGamePlusCase(caseItem.id)" class="ngplus-case-badge">🌟 NG+</span>
                  {{ statusLabels[caseItem.status] }}
                </div>
                <div 
                  class="case-difficulty"
                  :style="{ backgroundColor: difficultyColors[caseItem.difficulty] }"
                >
                  {{ difficultyLabels[caseItem.difficulty] }}
                </div>
              </div>

            <h2 class="case-title">{{ caseItem.title }}</h2>
            <p class="case-description">{{ caseItem.description }}</p>

            <div class="case-meta">
              <div class="meta-item">
                <span class="meta-label">场景数量</span>
                <span class="meta-value">{{ caseItem.scenes.length }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">预计理智消耗</span>
                <span class="meta-value sanity-cost">-{{ caseItem.sanityCost }}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">建议理智值</span>
                <span class="meta-value">{{ caseItem.recommendedSanity }}+</span>
              </div>
            </div>

            <div v-if="caseItem.status === 'completed'" class="case-stats">
              <div class="stat-item">
                <span class="stat-label">游玩次数</span>
                <span class="stat-value">{{ getPlayCount(caseItem.id) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">解锁分支</span>
                <span class="stat-value branch-value">{{ getBranchesCount(caseItem.id) }}</span>
              </div>
              <div v-if="getBestGrade(caseItem.id)" class="stat-item grade-stat">
                <span class="stat-label">最佳评级</span>
                <span 
                  class="stat-value"
                  :class="`grade-${getBestGrade(caseItem.id)?.toLowerCase()}`"
                >
                  {{ getBestGrade(caseItem.id) }}
                </span>
              </div>
              <div v-if="getFastestTime(caseItem.id)" class="stat-item">
                <span class="stat-label">最快通关</span>
                <span class="stat-value">{{ formatCaseTime(getFastestTime(caseItem.id)!) }}</span>
              </div>
              <div v-if="getBestScore(caseItem.id) !== undefined" class="stat-item">
                <span class="stat-label">最高分数</span>
                <span class="stat-value">{{ getBestScore(caseItem.id) }}</span>
              </div>
            </div>

            <div v-if="caseItem.status === 'failed'" class="case-stats failed-stats">
              <div class="stat-item">
                <span class="stat-label">失败次数</span>
                <span class="stat-value failed-value">{{ getFailedCount(caseItem.id) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">游玩次数</span>
                <span class="stat-value">{{ getPlayCount(caseItem.id) }}</span>
              </div>
            </div>

            <div v-if="caseItem.status === 'abandoned'" class="case-stats abandoned-stats">
              <div class="stat-item">
                <span class="stat-label">搁置次数</span>
                <span class="stat-value abandoned-value">{{ getAbandonedCount(caseItem.id) }}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">游玩次数</span>
                <span class="stat-value">{{ getPlayCount(caseItem.id) }}</span>
              </div>
            </div>

            <div v-if="caseItem.status !== 'locked' && caseItem.status !== 'completed' && caseItem.status !== 'failed' && caseItem.status !== 'abandoned'" class="case-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${getCaseProgress(caseItem)}%` }"></div>
              </div>
              <span class="progress-text">{{ getCaseProgress(caseItem) }}% 完成</span>
            </div>

            <div v-if="caseItem.status === 'failed' || caseItem.status === 'abandoned'" class="case-progress">
              <div class="progress-bar">
                <div class="progress-fill" :class="{ 'failed-fill': caseItem.status === 'failed', 'abandoned-fill': caseItem.status === 'abandoned' }" :style="{ width: `${getCaseProgress(caseItem)}%` }"></div>
              </div>
              <span class="progress-text">{{ caseItem.status === 'failed' ? '调查失败' : '已搁置' }}</span>
            </div>

            <div v-if="caseItem.status === 'locked'" class="locked-overlay">
              <div class="locked-icon">🔐</div>
              <p class="locked-text">完成前置案件以解锁</p>
              <div class="prereq-list">
                <span v-for="prereq in getPrereqNames(caseItem.prerequisites)" :key="prereq" class="prereq-tag">
                  🔒 {{ prereq }}
                </span>
              </div>
            </div>
            
            <div v-if="caseItem.status !== 'locked' && caseItem.status !== 'completed' && caseItem.status !== 'failed' && caseItem.status !== 'abandoned'" class="case-actions">
              <button class="start-btn primary" @click.stop="selectCase(caseItem)">
                {{ caseItem.status === 'in_progress' && gameStore.currentCase?.id === caseItem.id ? '继续调查' : '开始调查' }}
              </button>
            </div>
            
            <div v-if="caseItem.status === 'failed'" class="case-actions">
              <button class="retry-btn danger" @click.stop="retryCase(caseItem)">
                🔄 重新调查
              </button>
            </div>

            <div v-if="caseItem.status === 'abandoned'" class="case-actions">
              <button class="resume-btn warning" @click.stop="resumeCase(caseItem)">
                ▶️ 继续调查
              </button>
            </div>
            
            <div v-if="caseItem.status === 'completed'" class="case-actions">
              <button class="ngplus-btn" @click.stop="startNewGamePlus(caseItem)">
                🔄 重新调查 (New Game+)
              </button>
              <button class="replay-btn" @click.stop="router.push(`/replay/${caseItem.id}`)">
                🎬 案件回放
              </button>
              <div v-if="globalToolNames.length > 0" class="inherit-info">
                <span class="inherit-label">继承工具:</span>
                <span class="inherit-tools">{{ globalToolNames.length }} 件</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="investigator-tips card">
      <h3 class="tips-title">📋 调查员提示</h3>
      <ul class="tips-list">
        <li><strong>⚡ 短期惊吓</strong>：突然的恐怖冲击，随时间会自然平复</li>
        <li><strong>🕳️ 长期侵蚀</strong>：禁忌知识在灵魂上刻下的印记，极难消除，会永久降低能力</li>
        <li>理智值是调查员最重要的资源，请谨慎管理</li>
        <li>某些证据会降低理智值，但可能包含关键信息</li>
        <li>侵蚀达到阈值会触发<strong>精神污染里程碑</strong>，带来持续性负面影响</li>
        <li><strong>⚠️ 存档风险</strong>：高污染状态下存档可能导致数据损坏或精神干扰</li>
        <li>污染程度会影响最终<strong>结局走向</strong>——追寻真相或堕入深渊？</li>
        <li>线索之间可能存在关联，尝试将它们连接起来</li>
        <li>完成案件后可以解锁新的案件章节</li>
        <li>使用特殊工具发现隐藏证据，可以解锁深层推演分支</li>
        <li>解锁深层真相后，可获得继承工具奖励，在 New Game+ 中使用</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.cases-page {
  padding-top: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2rem;
}

.overall-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 1rem;
  flex-wrap: wrap;
}

.progress-label {
  font-size: 0.9rem;
  color: var(--color-text-dim);
}

.progress-bar-large {
  width: 200px;
  height: 10px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 5px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.progress-value {
  font-size: 0.9rem;
  color: var(--color-text);
}

.branches-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 12px;
  color: var(--color-accent-light);
  font-size: 0.8rem;
  font-weight: bold;
}

.page-title {
  font-size: 2.5rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--color-text-dim);
  font-size: 1.1rem;
}

.chapters-section {
  margin-bottom: 3rem;
}

.chapter-group {
  margin-bottom: 2.5rem;
}

.chapter-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 2px solid var(--color-accent);
}

.chapter-title {
  font-size: 1.5rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.chapter-count {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  background: rgba(107, 76, 154, 0.15);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
}

.cases-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 2rem;
}

.case-card {
  position: relative;
  cursor: pointer;
  transition: all 0.3s ease;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.case-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.case-card.locked:hover {
  transform: none;
  border-color: var(--color-border);
}

.case-card.available:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(107, 76, 154, 0.3);
}

.case-card.completed:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(58, 139, 90, 0.25);
}

.case-card.failed {
  border-color: var(--color-danger);
}

.case-card.failed:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(139, 58, 58, 0.25);
}

.case-card.abandoned {
  border-color: #8b6b3a;
  opacity: 0.85;
}

.case-card.abandoned:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 25px rgba(139, 107, 58, 0.25);
  opacity: 1;
}

.case-card.reopened {
  border-color: #d4850a;
  box-shadow: 0 0 15px rgba(212, 133, 10, 0.2);
}

.case-card.reopened:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(212, 133, 10, 0.3);
}

.case-card.active {
  border-color: var(--color-accent);
  box-shadow: 0 0 20px rgba(107, 76, 154, 0.3);
}

.case-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.case-status {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.case-difficulty {
  font-size: 0.75rem;
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  color: white;
  font-weight: bold;
}

.case-title {
  font-size: 1.4rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.case-description {
  color: var(--color-text-dim);
  font-size: 0.95rem;
  line-height: 1.6;
  flex: 1;
  margin-bottom: 1rem;
}

.case-meta {
  display: flex;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.meta-item {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.meta-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.meta-value {
  font-size: 0.95rem;
  color: var(--color-text);
}

.meta-value.sanity-cost {
  color: var(--color-danger);
}

.case-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1px solid var(--color-border);
}

.case-stats .stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  text-align: center;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.case-stats .stat-label {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.case-stats .stat-value {
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: bold;
}

.case-stats .branch-value {
  color: #ffd700;
}

.grade-stat .stat-value.grade-s { color: #ffd700; text-shadow: 0 0 8px rgba(255, 215, 0, 0.4); }
.grade-stat .stat-value.grade-a { color: var(--color-accent-light); }
.grade-stat .stat-value.grade-b { color: var(--color-success); }
.grade-stat .stat-value.grade-c { color: #ff9800; }
.grade-stat .stat-value.grade-d { color: #8b5a2b; }
.grade-stat .stat-value.grade-f { color: var(--color-danger); }

.case-progress {
  margin-top: auto;
}

.progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.progress-text {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.locked-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(10, 10, 15, 0.85);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  backdrop-filter: blur(3px);
}

.locked-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.locked-text {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  margin-bottom: 1rem;
}

.prereq-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  align-items: center;
}

.prereq-tag {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(139, 58, 58, 0.2);
  border: 1px solid var(--color-danger);
  border-radius: 12px;
  color: var(--color-danger);
  font-size: 0.75rem;
}

.case-actions {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.start-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
}

.completed-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  opacity: 0.7;
  cursor: not-allowed;
}

.ngplus-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.ngplus-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(255, 215, 0, 0.4);
}

.inherit-info {
  margin-top: 0.5rem;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 4px;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.inherit-label {
  color: var(--color-text-dim);
  white-space: nowrap;
}

.inherit-tools {
  color: var(--color-accent-light);
  font-weight: bold;
}

.investigator-tips {
  max-width: 600px;
  margin: 0 auto;
  background: rgba(107, 76, 154, 0.1);
}

.tips-title {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
}

.tips-list {
  list-style: none;
  padding: 0;
}

.tips-list li {
  padding: 0.5rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--color-text-dim);
}

.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}

@media (max-width: 768px) {
  .cases-grid {
    grid-template-columns: 1fr;
  }
  
  .page-title {
    font-size: 2rem;
  }
}

.ngplus-header {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.ngplus-badge {
  display: inline-block;
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, #ffd700, #ff8c00);
  color: #1a1a2e;
  border-radius: 20px;
  font-weight: bold;
  font-size: 1rem;
  box-shadow: 0 0 15px rgba(255, 215, 0, 0.4);
}

.ngplus-bonus {
  display: inline-block;
  padding: 0.4rem 1rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid var(--color-success);
  border-radius: 16px;
  color: var(--color-success);
  font-size: 0.9rem;
}

.milestone-progress {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 0.75rem;
  flex-wrap: wrap;
}

.milestone-label {
  font-size: 0.9rem;
  color: var(--color-text-dim);
}

.milestone-fill {
  background: linear-gradient(90deg, #ffd700, #ff8c00);
}

.milestone-value {
  font-size: 0.9rem;
  color: #ffd700;
  font-weight: bold;
}

.ngplus-stats {
  display: flex;
  justify-content: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.stat-chip {
  display: inline-block;
  padding: 0.35rem 0.85rem;
  background: rgba(107, 76, 154, 0.15);
  border: 1px solid var(--color-accent);
  border-radius: 12px;
  color: var(--color-accent-light);
  font-size: 0.8rem;
}

.hidden-badge,
.ngplus-case-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  font-size: 0.7rem;
  font-weight: bold;
  margin-right: 0.5rem;
}

.hidden-badge {
  background: rgba(139, 74, 201, 0.3);
  color: #c9a0ff;
  border: 1px solid #8b4ac9;
}

.ngplus-case-badge {
  background: rgba(255, 215, 0, 0.2);
  color: #ffd700;
  border: 1px solid #ffd700;
}

.case-card.hidden-case {
  border: 2px solid #8b4ac9;
  box-shadow: 0 0 20px rgba(139, 74, 201, 0.25);
}

.case-card.hidden-case .case-title {
  color: #c9a0ff;
}

.case-card.ngplus-case {
  border: 2px solid #ffd700;
  box-shadow: 0 0 20px rgba(255, 215, 0, 0.25);
}

.case-card.ngplus-case .case-title {
  color: #ffd700;
}

.inherit-info.ngplus-info {
  background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 140, 0, 0.1));
  border: 1px solid #ffd700;
}

.quick-actions {
  margin-top: 1.5rem;
  display: flex;
  justify-content: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.quick-replay-btn {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, rgba(107, 76, 154, 0.3), rgba(107, 76, 154, 0.15));
  border: 2px solid var(--color-accent);
  border-radius: 12px;
  color: var(--color-accent-light);
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 0 0 rgba(107, 76, 154, 0);
}

.quick-replay-btn:hover {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(107, 76, 154, 0.4);
}

.replay-btn {
  width: 100%;
  padding: 0.7rem;
  font-size: 0.95rem;
  background: linear-gradient(135deg, rgba(74, 144, 217, 0.2), rgba(107, 76, 154, 0.2));
  color: var(--color-accent-light);
  border: 1px solid rgba(107, 76, 154, 0.5);
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.3s ease;
  margin-top: 0.5rem;
}

.replay-btn:hover {
  background: linear-gradient(135deg, rgba(74, 144, 217, 0.35), rgba(107, 76, 154, 0.35));
  border-color: var(--color-accent);
  transform: translateY(-1px);
  box-shadow: 0 4px 15px rgba(107, 76, 154, 0.25);
}

.case-actions {
  display: flex;
  flex-direction: column;
}

.retry-btn,
.resume-btn {
  width: 100%;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
}

.retry-btn.danger {
  background: linear-gradient(135deg, #8b3a3a, #a04040);
  color: white;
}

.retry-btn.danger:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(139, 58, 58, 0.4);
}

.resume-btn.warning {
  background: linear-gradient(135deg, #8b6b3a, #a07840);
  color: white;
}

.resume-btn.warning:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(139, 107, 58, 0.4);
}

.failed-fill {
  background: #8b3a3a !important;
}

.abandoned-fill {
  background: #8b6b3a !important;
}

.failed-value {
  color: #8b3a3a;
}

.abandoned-value {
  color: #8b6b3a;
}

.failed-stats {
  border-top: 1px solid rgba(139, 58, 58, 0.3);
}

.abandoned-stats {
  border-top: 1px solid rgba(139, 107, 58, 0.3);
}
</style>