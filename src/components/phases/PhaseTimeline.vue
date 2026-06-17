<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { CasePhase, PhaseUnlockCondition } from '@/types'

const gameStore = useGameStore()

const phases = computed(() => {
  return gameStore.allPhases || []
})

const currentPhase = computed(() => {
  return gameStore.currentPhase
})

function getPhaseStatus(phase: CasePhase): 'completed' | 'active' | 'locked' {
  if (phase.isCompleted) return 'completed'
  if (phase.isActive) return 'active'
  return 'locked'
}

function getStatusText(status: string): string {
  const texts: Record<string, string> = {
    completed: '已完成',
    active: '进行中',
    locked: '未解锁'
  }
  return texts[status] || '未知'
}

function getStatusIcon(status: string): string {
  const icons: Record<string, string> = {
    completed: '✅',
    active: '🔍',
    locked: '🔒'
  }
  return icons[status] || '❓'
}

function getUnlockConditionText(condition: PhaseUnlockCondition): string {
  switch (condition.type) {
    case 'manual':
      return '自动解锁'
    case 'evidence_discovered':
      return `发现指定证据 (${condition.count || '全部'})`
    case 'clue_analyzed':
      return `分析指定线索 (${condition.count || '全部'})`
    case 'mail_read':
      return `阅读指定邮件 (${condition.count || '全部'})`
    case 'document_read':
      return `阅读指定文书 (${condition.count || '全部'})`
    case 'intelligence_level':
      return `情报值达到 ${condition.intelligenceLevel}`
    case 'sanity_level':
      return `理智值 ${condition.comparison || '达到'} ${condition.sanityLevel}`
    case 'scene_visited':
      return `访问指定场景 (${condition.count || '全部'})`
    case 'time_elapsed':
      return `游戏时间 ${condition.hours} 小时`
    case 'custom_event':
      return condition.description || '触发特定事件'
    default:
      return '未知条件'
  }
}

function getUnlockConditionIcon(type: string): string {
  const icons: Record<string, string> = {
    manual: '🎯',
    evidence_discovered: '🔍',
    clue_analyzed: '💡',
    mail_read: '📧',
    document_read: '📚',
    intelligence_level: '🧠',
    sanity_level: '❤️',
    scene_visited: '📍',
    time_elapsed: '⏰',
    custom_event: '⭐'
  }
  return icons[type] || '❓'
}

function selectPhase(phase: CasePhase) {
  if (getPhaseStatus(phase) === 'locked') {
    return
  }
  gameStore.setActivePhase(phase.id)
}

function getPhaseContentSummary(phase: CasePhase): { mails: number; docs: number; scenes: number; clues: number; evidence: number } {
  return {
    mails: phase.unlockedMails?.length || 0,
    docs: phase.unlockedDocuments?.length || 0,
    scenes: phase.unlockedScenes?.length || 0,
    clues: phase.unlockedClues?.length || 0,
    evidence: phase.unlockedEvidence?.length || 0
  }
}

function getCompletionEstimate(phase: CasePhase): string {
  const content = getPhaseContentSummary(phase)
  const totalItems = content.mails + content.docs + content.clues + content.evidence
  if (totalItems <= 3) return '~5分钟'
  if (totalItems <= 7) return '~10分钟'
  if (totalItems <= 12) return '~15分钟'
  return '~20分钟+'
}
</script>

<template>
  <div class="phase-timeline">
    <div class="timeline-header">
      <h2 class="timeline-title">
        <span class="title-icon">📋</span>
        案件调查阶段
      </h2>
      <div class="overall-progress">
        <span class="progress-label">总进度</span>
        <div class="progress-bar">
          <div
            class="progress-fill"
            :style="{ width: `${gameStore.overallProgress}%` }"
          ></div>
        </div>
        <span class="progress-text">{{ gameStore.overallProgress }}%</span>
      </div>
    </div>

    <div class="timeline-content">
      <div class="phases-list">
        <div
          v-for="(phase, index) in phases"
          :key="phase.id"
          class="phase-item"
          :class="{
            completed: getPhaseStatus(phase) === 'completed',
            active: getPhaseStatus(phase) === 'active',
            locked: getPhaseStatus(phase) === 'locked',
            isCurrent: currentPhase?.id === phase.id
          }"
          @click="selectPhase(phase)"
        >
          <div class="phase-connector">
            <div class="connector-line" v-if="index > 0"></div>
            <div class="phase-node">
              <span class="node-icon">{{ getStatusIcon(getPhaseStatus(phase)) }}</span>
              <span class="node-number">{{ phase.phaseNumber }}</span>
            </div>
            <div class="connector-line" v-if="index < phases.length - 1"></div>
          </div>

          <div class="phase-card">
            <div class="card-header">
              <div class="phase-badge-row">
                <span class="phase-number-badge">阶段 {{ phase.phaseNumber }}</span>
                <span
                  class="status-badge"
                  :class="getPhaseStatus(phase)"
                >
                  {{ getStatusText(getPhaseStatus(phase)) }}
                </span>
              </div>
              <h3 class="phase-name">{{ phase.name }}</h3>
            </div>

            <p class="phase-description">{{ phase.description }}</p>

            <div class="phase-progress-section">
              <div class="progress-header-row">
                <span class="progress-label">阶段情报</span>
                <span class="progress-value">{{ phase.intelligenceLevel }}%</span>
              </div>
              <div class="progress-bar-sm">
                <div
                  class="progress-fill"
                  :style="{ width: `${phase.intelligenceLevel}%` }"
                ></div>
              </div>
            </div>

            <div class="phase-content">
              <h4 class="content-title">📦 阶段内容</h4>
              <div class="content-grid">
                <div class="content-item" v-if="getPhaseContentSummary(phase).scenes > 0">
                  <span class="item-icon">📍</span>
                  <span class="item-count">{{ getPhaseContentSummary(phase).scenes }}</span>
                  <span class="item-label">场景</span>
                </div>
                <div class="content-item" v-if="getPhaseContentSummary(phase).mails > 0">
                  <span class="item-icon">📧</span>
                  <span class="item-count">{{ getPhaseContentSummary(phase).mails }}</span>
                  <span class="item-label">邮件</span>
                </div>
                <div class="content-item" v-if="getPhaseContentSummary(phase).docs > 0">
                  <span class="item-icon">📚</span>
                  <span class="item-count">{{ getPhaseContentSummary(phase).docs }}</span>
                  <span class="item-label">文书</span>
                </div>
                <div class="content-item" v-if="getPhaseContentSummary(phase).clues > 0">
                  <span class="item-icon">💡</span>
                  <span class="item-count">{{ getPhaseContentSummary(phase).clues }}</span>
                  <span class="item-label">线索</span>
                </div>
                <div class="content-item" v-if="getPhaseContentSummary(phase).evidence > 0">
                  <span class="item-icon">🔍</span>
                  <span class="item-count">{{ getPhaseContentSummary(phase).evidence }}</span>
                  <span class="item-label">证据</span>
                </div>
              </div>
            </div>

            <div v-if="getPhaseStatus(phase) !== 'completed'" class="unlock-condition">
              <div class="condition-header">
                <span class="condition-icon">{{ getUnlockConditionIcon(phase.unlockCondition.type) }}</span>
                <span class="condition-label">解锁下一阶段</span>
              </div>
              <p class="condition-text">
                {{ getUnlockConditionText(phase.unlockCondition) }}
              </p>
            </div>

            <div v-if="getPhaseStatus(phase) === 'completed'" class="completion-info">
              <span class="completion-icon">🎉</span>
              <span class="completion-text">本阶段调查已完成</span>
            </div>

            <div class="phase-footer">
              <span class="time-estimate">⏱️ 预计 {{ getCompletionEstimate(phase) }}</span>
              <span v-if="getPhaseStatus(phase) === 'active'" class="current-indicator">
                当前阶段 →
              </span>
            </div>
          </div>
        </div>
      </div>

      <div class="side-panel">
        <div class="intel-card">
          <h3 class="card-title">🧠 情报系统</h3>
          <div class="intel-value">
            <span class="value-number">{{ gameStore.gameState.intelligenceState.totalIntelligence }}</span>
            <span class="value-label">总情报值</span>
          </div>
          <div class="intel-history">
            <h4 class="history-title">最近获取</h4>
            <div class="history-list">
              <div
                v-for="(item, index) in gameStore.gameState.intelligenceState.history.slice(-5).reverse()"
                :key="index"
                class="history-item"
              >
                <span class="history-source">{{ item.source }}</span>
                <span class="history-value">+{{ item.value }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="deduction-card">
          <h3 class="card-title">📊 推演完整度</h3>
          <div class="deduction-value">
            <span class="value-number">{{ gameStore.deductionInfoCompleteness }}%</span>
            <span class="value-label">信息完整度</span>
          </div>
          <div class="deduction-tips">
            <p class="tip-text">💡 收集更多证据、分析线索、阅读邮件和文书以提高推演完整度</p>
          </div>
        </div>

        <div class="unlock-preview-card" v-if="currentPhase && !currentPhase.isCompleted">
          <h3 class="card-title">🔓 即将解锁</h3>
          <div class="preview-content">
            <p class="preview-text">
              完成当前阶段后将解锁新的调查内容
            </p>
            <div v-if="gameStore.nextPhase" class="next-phase-preview">
              <span class="next-phase-name">{{ gameStore.nextPhase.name }}</span>
              <span class="next-phase-hint">{{ gameStore.nextPhase.description.substring(0, 50) }}...</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.phase-timeline {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: rgba(20, 20, 30, 0.95);
  border-radius: 8px;
  border: 1px solid var(--color-border);
  overflow: hidden;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  background: rgba(107, 76, 154, 0.2);
  border-bottom: 1px solid var(--color-border);
  gap: 2rem;
}

.timeline-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  color: var(--color-accent-light);
  margin: 0;
}

.title-icon {
  font-size: 1.5rem;
}

.overall-progress {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  max-width: 400px;
}

.progress-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  white-space: nowrap;
}

.progress-bar {
  flex: 1;
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  transition: width 0.5s ease;
}

.progress-text {
  color: var(--color-accent-light);
  font-weight: bold;
  font-size: 0.9rem;
  min-width: 45px;
  text-align: right;
}

.timeline-content {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.phases-list {
  flex: 1;
  overflow-y: auto;
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.phase-item {
  display: flex;
  gap: 2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.phase-item:hover:not(.locked) {
  transform: translateX(5px);
}

.phase-item.locked {
  opacity: 0.5;
  cursor: not-allowed;
}

.phase-connector {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 60px;
  flex-shrink: 0;
}

.connector-line {
  width: 2px;
  flex: 1;
  background: rgba(107, 76, 154, 0.3);
}

.phase-node {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  background: rgba(107, 76, 154, 0.2);
  border: 2px solid rgba(107, 76, 154, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  flex-shrink: 0;
}

.phase-item.completed .phase-node {
  background: rgba(76, 175, 80, 0.2);
  border-color: #4caf50;
}

.phase-item.active .phase-node {
  background: rgba(107, 76, 154, 0.4);
  border-color: var(--color-accent);
  box-shadow: 0 0 15px rgba(107, 76, 154, 0.5);
}

.phase-item.locked .phase-node {
  background: rgba(0, 0, 0, 0.3);
  border-color: var(--color-border);
}

.node-icon {
  font-size: 1.25rem;
}

.node-number {
  position: absolute;
  bottom: -8px;
  right: -8px;
  background: var(--color-accent);
  color: white;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: bold;
}

.phase-card {
  flex: 1;
  background: rgba(30, 30, 45, 0.8);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.5rem;
  transition: all 0.3s ease;
}

.phase-item:hover:not(.locked) .phase-card {
  border-color: var(--color-accent);
  box-shadow: 0 5px 20px rgba(107, 76, 154, 0.2);
}

.phase-item.isCurrent .phase-card {
  border-color: var(--color-accent-light);
  box-shadow: 0 0 20px rgba(107, 76, 154, 0.3);
}

.phase-item.completed .phase-card {
  border-color: rgba(76, 175, 80, 0.3);
}

.card-header {
  margin-bottom: 1rem;
}

.phase-badge-row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.phase-number-badge {
  background: rgba(107, 76, 154, 0.3);
  color: var(--color-accent-light);
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  font-size: 0.75rem;
  font-weight: bold;
}

.status-badge {
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: bold;
}

.status-badge.completed {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.status-badge.active {
  background: rgba(107, 76, 154, 0.3);
  color: var(--color-accent-light);
}

.status-badge.locked {
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-text-dim);
}

.phase-name {
  color: var(--color-text);
  font-size: 1.25rem;
  margin: 0;
}

.phase-description {
  color: var(--color-text-dim);
  font-size: 0.9rem;
  line-height: 1.6;
  margin: 0 0 1rem 0;
}

.phase-progress-section {
  margin-bottom: 1rem;
}

.progress-header-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.progress-header-row .progress-label {
  font-size: 0.8rem;
}

.progress-value {
  color: var(--color-accent-light);
  font-size: 0.8rem;
  font-weight: bold;
}

.progress-bar-sm {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.progress-bar-sm .progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  transition: width 0.5s ease;
}

.phase-content {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.content-title {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin: 0 0 0.75rem 0;
}

.content-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.content-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  min-width: 50px;
}

.item-icon {
  font-size: 1.25rem;
}

.item-count {
  color: var(--color-accent-light);
  font-weight: bold;
  font-size: 1.1rem;
}

.item-label {
  color: var(--color-text-dim);
  font-size: 0.7rem;
}

.unlock-condition {
  padding: 1rem;
  background: rgba(255, 193, 7, 0.05);
  border: 1px solid rgba(255, 193, 7, 0.2);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.condition-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
}

.condition-icon {
  font-size: 1.1rem;
}

.condition-label {
  color: #ffc107;
  font-size: 0.85rem;
  font-weight: bold;
}

.condition-text {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin: 0;
  padding-left: 1.85rem;
}

.completion-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  background: rgba(76, 175, 80, 0.1);
  border: 1px solid rgba(76, 175, 80, 0.3);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.completion-icon {
  font-size: 1.25rem;
}

.completion-text {
  color: #4caf50;
  font-size: 0.9rem;
  font-weight: 500;
}

.phase-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
}

.time-estimate {
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.current-indicator {
  color: var(--color-accent-light);
  font-size: 0.8rem;
  font-weight: bold;
}

.side-panel {
  width: 320px;
  flex-shrink: 0;
  padding: 1.5rem;
  border-left: 1px solid var(--color-border);
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.intel-card,
.deduction-card,
.unlock-preview-card {
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 1.25rem;
}

.card-title {
  color: var(--color-accent-light);
  font-size: 1rem;
  margin: 0 0 1rem 0;
}

.intel-value,
.deduction-value {
  text-align: center;
  margin-bottom: 1rem;
}

.value-number {
  display: block;
  font-size: 2.5rem;
  font-weight: bold;
  color: var(--color-accent-light);
  margin-bottom: 0.25rem;
}

.value-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.intel-history {
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  padding-top: 1rem;
}

.history-title {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin: 0 0 0.75rem 0;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 4px;
  font-size: 0.8rem;
}

.history-source {
  color: var(--color-text-dim);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.history-value {
  color: var(--color-accent-light);
  font-weight: bold;
  margin-left: 0.5rem;
}

.deduction-tips {
  padding: 0.75rem;
  background: rgba(255, 193, 7, 0.05);
  border-radius: 4px;
}

.tip-text {
  color: var(--color-text-dim);
  font-size: 0.8rem;
  margin: 0;
  line-height: 1.5;
}

.preview-content {
  text-align: center;
}

.preview-text {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  margin: 0 0 1rem 0;
}

.next-phase-preview {
  padding: 0.75rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 6px;
  border: 1px dashed rgba(107, 76, 154, 0.3);
}

.next-phase-name {
  display: block;
  color: var(--color-accent-light);
  font-weight: bold;
  font-size: 0.9rem;
  margin-bottom: 0.25rem;
}

.next-phase-hint {
  color: var(--color-text-dim);
  font-size: 0.75rem;
}

@media (max-width: 1024px) {
  .timeline-content {
    flex-direction: column;
  }

  .side-panel {
    width: 100%;
    border-left: none;
    border-top: 1px solid var(--color-border);
    flex-direction: row;
    flex-wrap: wrap;
  }

  .intel-card,
  .deduction-card,
  .unlock-preview-card {
    flex: 1;
    min-width: 250px;
  }
}

@media (max-width: 768px) {
  .timeline-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }

  .overall-progress {
    width: 100%;
    max-width: none;
  }

  .phases-list {
    padding: 1rem;
    gap: 1.5rem;
  }

  .phase-item {
    flex-direction: column;
    gap: 1rem;
  }

  .phase-connector {
    flex-direction: row;
    width: 100%;
  }

  .connector-line {
    width: auto;
    height: 2px;
    flex: 1;
  }

  .content-grid {
    gap: 0.75rem;
  }

  .side-panel {
    flex-direction: column;
  }
}
</style>
