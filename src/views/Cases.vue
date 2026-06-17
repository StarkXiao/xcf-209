<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { cases, resetCaseForReplay } from '@/data/cases'
import { useGameStore } from '@/stores/game'
import { useSaveStore } from '@/stores/save'
import { useProgressStore } from '@/stores/progress'
import { getToolById } from '@/data/tools'

const router = useRouter()
const gameStore = useGameStore()
const saveStore = useSaveStore()
const progressStore = useProgressStore()

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
  completed: '✓ 已结案'
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

const overallProgress = computed(() => {
  const total = cases.length
  const completed = progressStore.totalCompleted
  return Math.round((completed / total) * 100)
})

function selectCase(caseItem: typeof cases[0]) {
  if (caseItem.status === 'locked') return
  
  if (caseItem.status === 'available' || caseItem.status === 'in_progress') {
    if (gameStore.currentCase && gameStore.currentCase.id !== caseItem.id) {
      if (!confirm('当前有未完成的案件，确定要切换吗？')) {
        return
      }
    }
    
    gameStore.startCase(caseItem.id)
    router.push(`/investigation/${caseItem.id}`)
  } else if (caseItem.status === 'completed') {
    startNewGamePlus(caseItem)
  }
}

function startNewGamePlus(caseItem: typeof cases[0]) {
  if (gameStore.currentCase) {
    if (!confirm('当前有未完成的案件，确定要切换吗？')) {
      return
    }
  }

  resetCaseForReplay(caseItem.id)

  const inherited = saveStore.globalUnlockedTools
  gameStore.startCase(caseItem.id, inherited.length > 0 ? inherited : undefined)

  gameStore.modifySanity(20, 'New Game+ 奖励')
  gameStore.addLog('discovery', 'New Game+：继承了全局解锁工具')
  
  router.push(`/investigation/${caseItem.id}`)
}

function getCaseProgress(caseItem: typeof cases[0]): number {
  if (caseItem.status === 'locked') return 0
  if (caseItem.status === 'available') return 0
  if (caseItem.status === 'completed') return 100
  
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

function getPrereqNames(prereqIds: string[]): string[] {
  return prereqIds
    .map(id => cases.find(c => c.id === id)?.title || id)
}
</script>

<template>
  <div class="cases-page page-container">
    <div class="page-header">
      <h1 class="page-title">案件档案</h1>
      <p class="page-subtitle">选择一个案件开始你的调查</p>
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
              active: gameStore.currentCase?.id === caseItem.id
            }"
            @click="selectCase(caseItem)"
          >
            <div class="case-header">
              <div class="case-status">{{ statusLabels[caseItem.status] }}</div>
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
            </div>

            <div v-if="caseItem.status !== 'locked' && caseItem.status !== 'completed'" class="case-progress">
              <div class="progress-bar">
                <div class="progress-fill" :style="{ width: `${getCaseProgress(caseItem)}%` }"></div>
              </div>
              <span class="progress-text">{{ getCaseProgress(caseItem) }}% 完成</span>
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
            
            <div v-if="caseItem.status !== 'locked' && caseItem.status !== 'completed'" class="case-actions">
              <button class="start-btn primary" @click.stop="selectCase(caseItem)">
                {{ caseItem.status === 'in_progress' && gameStore.currentCase?.id === caseItem.id ? '继续调查' : '开始调查' }}
              </button>
            </div>
            
            <div v-if="caseItem.status === 'completed'" class="case-actions">
              <button class="ngplus-btn" @click.stop="startNewGamePlus(caseItem)">
                🔄 重新调查 (New Game+)
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
        <li>理智值是调查员最重要的资源，请谨慎管理</li>
        <li>某些证据会降低理智值，但可能包含关键信息</li>
        <li>线索之间可能存在关联，尝试将它们连接起来</li>
        <li>完成案件后可以解锁新的案件章节</li>
        <li>使用特殊工具发现隐藏证据，可以解锁深层推演分支</li>
        <li>解锁深层真相后，可获得继承工具奖励，在 New Game+ 中使用</li>
        <li>完成案件获得的工具会自动带入后续案件</li>
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
  display: flex;
  gap: 1rem;
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
</style>