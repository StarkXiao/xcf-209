<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useSaveStore } from '@/stores/save'
import { useGameStore } from '@/stores/game'
import { useCharacterStore } from '@/stores/character'
import { getCaseById } from '@/data/cases'
import type { Case, SaveType, CrossCaseComparison, CaseProgressMetric } from '@/types'
import { getToolById } from '@/data/tools'

const MAX_AUTO_SAVES = 5
const MAX_SNAPSHOTS_PER_CASE = 20

const router = useRouter()
const saveStore = useSaveStore()
const gameStore = useGameStore()
const characterStore = useCharacterStore()

type SaveFilterType = 'all' | SaveType

const activeFilter = ref<SaveFilterType>('all')
const showAutoSaveConfig = ref(false)
const showComparisonPanel = ref(false)
const selectedCasesForComparison = ref<string[]>([])
const currentComparison = ref<CrossCaseComparison | null>(null)
const autoSaveIntervalInput = ref(5)

const saves = computed(() => saveStore.saves)

const filteredSaves = computed(() => {
  let result = [...saves.value]
  if (activeFilter.value !== 'all') {
    result = result.filter(s => s.saveType === activeFilter.value)
  }
  return result.sort((a, b) => b.updatedAt - a.updatedAt)
})

const filterCounts = computed(() => ({
  all: saves.value.length,
  manual: saveStore.manualSaves.length,
  auto: saveStore.autoSaves.length,
  snapshot: saveStore.snapshots.length,
  checkpoint: saveStore.checkpoints.length
}))

const currentSaveRisk = computed(() => {
  if (!gameStore.currentCase) return null
  return saveStore.getCurrentSaveRisk()
})

const canCreateSave = computed(() => {
  return gameStore.currentCase !== null
})

const globalToolNames = computed(() => {
  return saveStore.globalUnlockedTools
    .map(id => getToolById(id)?.name || id)
})

const availableCasesForComparison = computed(() => {
  return saveStore.getAvailableCasesForComparison().map(id => {
    const c = getCaseById(id)
    return { id, title: c?.title || id }
  })
})

onMounted(() => {
  autoSaveIntervalInput.value = saveStore.autoSaveIntervalMinutes
})

function loadSaveData(saveId: string) {
  const save = saves.value.find(s => s.id === saveId)
  if (!save) return

  if (gameStore.currentCase) {
    if (!confirm('当前有未保存的游戏进度，加载存档将丢失当前进度。确定要加载吗？')) {
      return
    }
  }

  const pollution = save.gameState.spiritualPollution
  if (pollution && (pollution.longTermErosion > 50 || save.name.includes('[污染]'))) {
    if (!confirm(`⚠️ 此存档受到精神污染影响（侵蚀：${pollution.longTermErosion}）。\n\n加载此存档可能会对您的调查员造成理智冲击。\n\n是否继续加载？`)) {
      return
    }
  }
  
  const result = saveStore.loadSave(saveId)
  if (result.success) {
    if (result.corruptionWarning) {
      alert(result.corruptionWarning)
    }
    router.push(`/investigation/${gameStore.currentCase?.id}`)
  } else if (result.corruptionWarning) {
    alert(result.corruptionWarning)
  }
}

function deleteSaveData(saveId: string) {
  if (confirm('确定要删除这个存档吗？此操作不可撤销。')) {
    saveStore.deleteSave(saveId)
  }
}

function getCaseName(caseId: string): string {
  const caseData = getCaseById(caseId)
  return caseData?.title || '未知案件'
}

function getCaseStatus(caseId: string): Case['status'] | null {
  const caseData = getCaseById(caseId)
  return caseData?.status || null
}

const caseStatusLabels: Record<string, string> = {
  locked: '🔒 未解锁',
  available: '🔍 可调查',
  in_progress: '⏳ 调查中',
  completed: '✓ 已结案',
  failed: '❌ 调查失败',
  abandoned: '⏸️ 已搁置',
  reopened: '🔄 重新调查'
}

const caseStatusColors: Record<string, string> = {
  locked: '#555',
  available: '#4a90d9',
  in_progress: '#6b4c9a',
  completed: '#3a8b5a',
  failed: '#8b3a3a',
  abandoned: '#8b6b3a',
  reopened: '#d4850a'
}

function getSanityColor(sanity: number): string {
  if (sanity > 60) return '#3a8b5a'
  if (sanity > 30) return '#8b6b3a'
  return '#8b3a3a'
}

function getSanityStatus(sanity: number): string {
  if (sanity > 80) return '精神稳定'
  if (sanity > 60) return '轻微不安'
  if (sanity > 40) return '焦虑不安'
  if (sanity > 20) return '精神恍惚'
  return '濒临崩溃'
}

function getRiskLabel(level: string): string {
  const labels: Record<string, string> = {
    safe: '安全',
    caution: '注意',
    danger: '危险',
    critical: '危急',
    corrupted: '侵蚀'
  }
  return labels[level] || '未知'
}

function getRiskColor(level: string): string {
  const colors: Record<string, string> = {
    safe: '#4caf50',
    caution: '#ffc107',
    danger: '#ff9800',
    critical: '#f44336',
    corrupted: '#9c27b0'
  }
  return colors[level] || '#888'
}

function getRiskDescription(level: string): string {
  const descriptions: Record<string, string> = {
    safe: '精神状态稳定，可以安全存档。',
    caution: '轻微不安，存档过程可能伴随轻微幻觉。',
    danger: '精神压力较大，存档可能出现数据偏差。',
    critical: '濒临崩溃，存档有较大概率损坏！',
    corrupted: '深渊凝视着你……强行存档可能造成不可逆的精神侵蚀。'
  }
  return descriptions[level] || ''
}

function createNewSave() {
  if (!gameStore.currentCase) {
    alert('请先开始一个案件才能保存进度')
    return
  }

  const risk = saveStore.getCurrentSaveRisk()
  
  if (risk.level === 'safe' || risk.level === 'caution') {
    doCreateSave(false)
    return
  }
  
  const riskLabel = getRiskLabel(risk.level)
  const riskDesc = getRiskDescription(risk.level)
  
  let confirmMsg = `⚠️ 存档风险等级：${riskLabel}\n\n${riskDesc}\n\n`
  
  if (risk.corruptionChance > 0) {
    confirmMsg += `• 数据损坏概率：${Math.round(risk.corruptionChance * 100)}%\n`
  }
  if (risk.hallucinationChance > 0) {
    confirmMsg += `• 幻觉信息注入概率：${Math.round(risk.hallucinationChance * 100)}%\n`
  }
  if (risk.sanityLossOnLoad > 0) {
    confirmMsg += `• 读取时理智损失：-${risk.sanityLossOnLoad}\n`
  }
  if (risk.pollutionGain > 0) {
    confirmMsg += `• 存档过程额外侵蚀：+${risk.pollutionGain}\n`
  }
  
  if (risk.level === 'critical' || risk.level === 'corrupted') {
    confirmMsg += `\n【警告】高污染状态下存档可能导致严重后果！\n\n是否仍然强制存档？`
  } else {
    confirmMsg += `\n是否继续存档？`
  }
  
  if (confirm(confirmMsg)) {
    doCreateSave(true)
  }
}

function doCreateSave(forceSave: boolean) {
  const saveName = `存档 ${new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`
  
  const result = saveStore.createSave(saveName, forceSave)
  
  if (result.success) {
    let msg = '存档创建成功！'
    if (result.corrupted) {
      msg += '\n\n⚠️ 注意：此存档已受到精神污染影响，数据可能不完全可靠。'
    }
    alert(msg)
  } else {
    let msg = '存档创建失败。'
    if (result.risk) {
      msg += `\n\n风险等级：${getRiskLabel(result.risk.level)}\n${getRiskDescription(result.risk.level)}`
      msg += '\n\n可以通过"强制存档"选项继续，但后果自负。'
    }
    alert(msg)
  }
}

function createCheckpoint() {
  if (!gameStore.currentCase) {
    alert('请先开始一个案件才能创建关键节点')
    return
  }
  const name = prompt('请输入关键节点名称：', `节点 ${new Date().toLocaleString('zh-CN')}`)
  if (name !== null) {
    const result = saveStore.createCheckpoint(name)
    if (result.success) {
      alert('关键节点创建成功！')
    }
  }
}

function triggerManualAutoSave() {
  if (!gameStore.currentCase) {
    alert('请先开始一个案件')
    return
  }
  const result = saveStore.createAutoSave()
  if (result.success) {
    alert('自动存档创建成功！')
  }
}

function toggleAutoSave() {
  saveStore.setAutoSaveEnabled(!saveStore.autoSaveEnabled)
}

function applyAutoSaveInterval() {
  const val = parseInt(autoSaveIntervalInput.value as unknown as string)
  if (!isNaN(val) && val >= 1 && val <= 60) {
    saveStore.setAutoSaveInterval(val)
    alert(`自动存档间隔已设置为 ${val} 分钟`)
  } else {
    alert('请输入 1-60 之间的有效数值')
  }
}

function toggleCaseComparison(caseId: string) {
  const idx = selectedCasesForComparison.value.indexOf(caseId)
  if (idx !== -1) {
    selectedCasesForComparison.value.splice(idx, 1)
  } else {
    if (selectedCasesForComparison.value.length >= 5) {
      alert('最多只能选择 5 个案件进行对比')
      return
    }
    selectedCasesForComparison.value.push(caseId)
  }
}

function runComparison() {
  if (selectedCasesForComparison.value.length < 2) {
    alert('请至少选择 2 个案件进行对比')
    return
  }
  currentComparison.value = saveStore.compareCaseProgress(selectedCasesForComparison.value)
}

function getMetricValue(metrics: CaseProgressMetric[], metricId: string): CaseProgressMetric | undefined {
  return metrics.find(m => m.metricId === metricId)
}

function getMetricDisplayValue(metric: CaseProgressMetric): string {
  if (metric.maxValue !== undefined) {
    return `${metric.value} / ${metric.maxValue}${metric.unit || ''}`
  }
  return `${metric.value}${metric.unit || ''}`
}

function goToCases() {
  router.push('/cases')
}

function getCharacterName(characterId: string | undefined): string {
  if (!characterId) return '未选择'
  const character = characterStore.getCharacterById(characterId)
  return character ? `${character.name} - ${character.title}` : '未知角色'
}

function getCharacterAvatar(characterId: string | undefined): string {
  if (!characterId) return '👤'
  const character = characterStore.getCharacterById(characterId)
  return character?.avatar || '👤'
}

function goToCharacter() {
  router.push('/character')
}

const filterLabels: Record<SaveFilterType | 'all', string> = {
  all: '全部',
  manual: '手动',
  auto: '自动',
  snapshot: '快照',
  checkpoint: '节点'
}

function getProgressColor(progress: number): string {
  if (progress >= 80) return '#3a8b5a'
  if (progress >= 50) return '#4a90d9'
  if (progress >= 20) return '#d4850a'
  return '#888'
}

function getMetricProgressWidth(metric: CaseProgressMetric | undefined): string {
  if (!metric || !metric.maxValue) return '0%'
  const pct = Math.min(100, (metric.value / metric.maxValue) * 100)
  return `${pct}%`
}

function getMetricProgressColor(metric: CaseProgressMetric | undefined): string {
  return metric?.color || '#888'
}
</script>

<template>
  <div class="saves-page page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">存档回放</h1>
        <p class="page-subtitle">管理你的调查进度存档</p>
      </div>
      <div class="header-actions">
        <button 
          class="action-btn save-btn"
          :class="{ 
            'risk-caution': currentSaveRisk?.level === 'caution',
            'risk-danger': currentSaveRisk?.level === 'danger',
            'risk-critical': currentSaveRisk?.level === 'critical',
            'risk-corrupted': currentSaveRisk?.level === 'corrupted',
            'disabled': !canCreateSave
          }"
          @click="createNewSave"
          :disabled="!canCreateSave"
        >
          <span>💾</span> 
          <span>创建存档</span>
          <span 
            v-if="currentSaveRisk && currentSaveRisk.level !== 'safe'" 
            class="risk-badge"
            :style="{ backgroundColor: getRiskColor(currentSaveRisk.level) }"
          >
            {{ getRiskLabel(currentSaveRisk.level) }}
          </span>
        </button>
        <button 
          class="action-btn checkpoint-btn"
          :class="{ 'disabled': !canCreateSave }"
          @click="createCheckpoint"
          :disabled="!canCreateSave"
          title="创建关键节点存档"
        >
          <span>📍</span> 关键节点
        </button>
        <button 
          class="action-btn autosave-btn"
          :class="{ 'disabled': !canCreateSave }"
          @click="triggerManualAutoSave"
          :disabled="!canCreateSave"
          title="立即执行自动存档"
        >
          <span>⏱️</span> 立即存档
        </button>
        <button 
          class="action-btn"
          @click="showAutoSaveConfig = !showAutoSaveConfig"
          title="自动存档设置"
        >
          <span>⚙️</span> 设置
        </button>
        <button 
          class="action-btn compare-btn"
          @click="showComparisonPanel = !showComparisonPanel"
          title="跨案件进度对比"
        >
          <span>📊</span> 对比
        </button>
        <button class="action-btn" @click="goToCharacter">
          <span>👤</span> 角色
        </button>
        <button class="action-btn" @click="goToCases">
          <span>📋</span> 案件
        </button>
      </div>
    </div>

    <div v-if="showAutoSaveConfig" class="config-panel card">
      <h3 class="config-title">⚙️ 自动存档设置</h3>
      <div class="config-content">
        <div class="config-item">
          <label class="config-label">启用自动存档</label>
          <button 
            class="toggle-btn"
            :class="{ active: saveStore.autoSaveEnabled }"
            @click="toggleAutoSave"
          >
            {{ saveStore.autoSaveEnabled ? '✅ 已启用' : '❌ 已禁用' }}
          </button>
        </div>
        <div class="config-item">
          <label class="config-label">存档间隔（分钟）</label>
          <div class="interval-control">
            <input 
              v-model.number="autoSaveIntervalInput"
              type="number" 
              min="1" 
              max="60"
              class="interval-input"
            />
            <button class="action-btn small" @click="applyAutoSaveInterval">应用</button>
          </div>
        </div>
        <div class="config-item">
          <label class="config-label">当前设置</label>
          <span class="config-value">
            每 {{ saveStore.autoSaveIntervalMinutes }} 分钟自动存档
            <span v-if="saveStore.lastAutoSaveTime > 0">
              （上次：{{ saveStore.formatDate(saveStore.lastAutoSaveTime) }}）
            </span>
          </span>
        </div>
      </div>
      <div class="config-hint">
        💡 提示：自动存档会在案件调查中按设定间隔自动执行，自动存档数量超过 {{ MAX_AUTO_SAVES }} 个时会自动清理最早的。
      </div>
    </div>

    <div v-if="showComparisonPanel" class="comparison-panel card">
      <h3 class="config-title">📊 跨案件进度对比</h3>
      <div class="comparison-content">
        <div class="case-selector">
          <p class="selector-hint">选择要对比的案件（2-5个）：</p>
          <div class="case-checkboxes">
            <label 
              v-for="c in availableCasesForComparison" 
              :key="c.id"
              class="case-checkbox"
              :class="{ selected: selectedCasesForComparison.includes(c.id) }"
            >
              <input 
                type="checkbox" 
                :checked="selectedCasesForComparison.includes(c.id)"
                @change="toggleCaseComparison(c.id)"
              />
              <span>{{ c.title }}</span>
            </label>
          </div>
          <button 
            class="action-btn primary"
            :disabled="selectedCasesForComparison.length < 2"
            @click="runComparison"
          >
            开始对比
          </button>
        </div>

        <div v-if="currentComparison" class="comparison-results">
          <h4>对比结果（{{ saveStore.formatDate(currentComparison.comparisonDate) }}）</h4>
          
          <div class="summary-notes">
            <div v-for="(note, i) in currentComparison.summaryNotes" :key="i" class="summary-note">
              {{ note }}
            </div>
          </div>

          <div class="comparison-table-wrapper">
            <table class="comparison-table">
              <thead>
                <tr>
                  <th>指标</th>
                  <th v-for="rank in currentComparison.overallRanking" :key="rank.caseId">
                    <div class="rank-header">
                      <span class="rank-badge" :class="'rank-' + rank.rank">#{{ rank.rank }}</span>
                      <span class="case-title">{{ getCaseName(rank.caseId) }}</span>
                    </div>
                    <div class="score-display">
                      总分：<strong>{{ rank.score }}</strong>
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="metricId in ['overall_progress', 'evidence_progress', 'clue_progress', 'connections', 'branches', 'sanity', 'best_score', 'fastest_time', 'play_count', 'sanity_lost']" :key="metricId">
                  <td class="metric-name">
                    {{ getMetricValue(Object.values(currentComparison.metrics)[0], metricId)?.metricName || metricId }}
                  </td>
                  <td v-for="rank in currentComparison.overallRanking" :key="rank.caseId + metricId">
                    <template v-if="getMetricValue(currentComparison.metrics[rank.caseId], metricId)">
                      <span 
                        class="metric-value"
                        :style="{ color: getMetricValue(currentComparison.metrics[rank.caseId], metricId)?.color }"
                      >
                        {{ getMetricDisplayValue(getMetricValue(currentComparison.metrics[rank.caseId], metricId)!) }}
                      </span>
                      <div 
                        v-if="getMetricValue(currentComparison.metrics[rank.caseId], metricId)?.maxValue"
                        class="mini-progress"
                      >
                        <div 
                          class="mini-progress-fill"
                          :style="{
                            width: getMetricProgressWidth(getMetricValue(currentComparison.metrics[rank.caseId], metricId)),
                            backgroundColor: getMetricProgressColor(getMetricValue(currentComparison.metrics[rank.caseId], metricId))
                          }"
                        ></div>
                      </div>
                    </template>
                    <span v-else class="metric-na">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <div class="filter-bar">
      <button 
        v-for="(label, key) in filterLabels" 
        :key="key"
        class="filter-btn"
        :class="{ active: activeFilter === key }"
        @click="activeFilter = key as SaveFilterType"
      >
        {{ label }}
        <span class="filter-count" v-if="filterCounts[key as keyof typeof filterCounts] > 0">
          {{ filterCounts[key as keyof typeof filterCounts] }}
        </span>
      </button>
    </div>

    <div class="saves-content">
      <div v-if="filteredSaves.length === 0" class="no-saves card">
        <div class="no-saves-icon">📂</div>
        <h3>暂无{{ activeFilter === 'all' ? '' : filterLabels[activeFilter] }}存档</h3>
        <p>在调查过程中点击"创建存档"按钮保存你的进度</p>
        <p class="hint">存档会保存你的证据收集、线索分析、理智值等所有进度</p>
      </div>

      <div v-else class="saves-grid">
        <div 
          v-for="save in filteredSaves" 
          :key="save.id"
          class="save-card card"
        >
          <div class="save-header">
            <div class="save-header-main">
              <div class="save-title-row">
                <h3 class="save-name" :class="{ 'corrupted-name': save.name.includes('[污染]') }">
                  {{ save.name }}
                  <span v-if="save.name.includes('[污染]')" class="corrupted-badge">☠️ 受污染</span>
                </h3>
                <span 
                  class="save-type-badge"
                  :style="{ backgroundColor: saveStore.getSaveTypeColor(save.saveType) }"
                >
                  {{ saveStore.getSaveTypeLabel(save.saveType) }}
                </span>
              </div>
              <div class="save-meta">
                <span class="save-case">{{ getCaseName(save.caseId) }}</span>
                <span v-if="getCaseStatus(save.caseId)" class="save-case-status" :style="{ color: caseStatusColors[getCaseStatus(save.caseId)!] }">
                  {{ caseStatusLabels[getCaseStatus(save.caseId)!] }}
                </span>
              </div>

              <div v-if="save.coverSummary" class="cover-summary">
                <div class="progress-row">
                  <span class="progress-label">进度</span>
                  <div class="progress-bar-wrapper">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill"
                        :style="{ 
                          width: `${save.coverSummary.progressPercentage}%`,
                          backgroundColor: getProgressColor(save.coverSummary.progressPercentage)
                        }"
                      ></div>
                    </div>
                    <span class="progress-value">{{ save.coverSummary.progressPercentage }}%</span>
                  </div>
                </div>
                <div class="mood-row">
                  <span class="mood-emoji">{{ saveStore.getMoodTagEmoji(save.coverSummary.moodTag) }}</span>
                  <span class="mood-label">{{ saveStore.getMoodTagLabel(save.coverSummary.moodTag) }}</span>
                  <span class="phase-name">{{ save.coverSummary.phaseName }}</span>
                </div>
                <div v-if="save.coverSummary.keyHighlights.length > 0" class="highlights-row">
                  <span 
                    v-for="(h, i) in save.coverSummary.keyHighlights" 
                    :key="i" 
                    class="highlight-tag"
                  >
                    {{ h }}
                  </span>
                </div>
                <div v-if="save.coverSummary.endingHint" class="ending-hint">
                  💡 {{ save.coverSummary.endingHint }}
                </div>
              </div>
            </div>
            <div class="save-character">
              <span class="save-char-avatar">{{ getCharacterAvatar(save.characterProfileId) }}</span>
              <span class="save-char-name">{{ getCharacterName(save.characterProfileId) }}</span>
            </div>
          </div>

          <div v-if="save.snapshotMetadata" class="snapshot-info">
            <div class="snapshot-meta-row">
              <span 
                class="significance-badge"
                :style="{ backgroundColor: saveStore.getSignificanceColor(save.snapshotMetadata.significance) }"
              >
                {{ saveStore.getSignificanceLabel(save.snapshotMetadata.significance) }}
              </span>
              <span class="snapshot-desc">{{ save.snapshotMetadata.triggerDescription }}</span>
            </div>
          </div>

          <div class="save-stats">
            <div class="stat-row">
              <span class="stat-label">理智值</span>
              <div class="sanity-display">
                <div class="sanity-bar-mini">
                  <div 
                    class="sanity-fill-mini"
                    :style="{ 
                      width: `${save.gameState.sanity}%`,
                      backgroundColor: getSanityColor(save.gameState.sanity)
                    }"
                  ></div>
                </div>
                <span class="sanity-value">{{ save.gameState.sanity }}</span>
                <span class="sanity-status">{{ getSanityStatus(save.gameState.sanity) }}</span>
              </div>
            </div>

            <div v-if="save.gameState.spiritualPollution" class="stat-row pollution-row">
              <span class="stat-label">精神污染</span>
              <div class="pollution-display">
                <div class="pollution-mini">
                  <span class="shock-mini-icon" title="短期惊吓">⚡</span>
                  <span class="pollution-mini-value">{{ save.gameState.spiritualPollution.shortTermShock }}</span>
                </div>
                <div class="pollution-mini">
                  <span class="erosion-mini-icon" title="长期侵蚀">🕳️</span>
                  <span class="pollution-mini-value erosion-value">{{ save.gameState.spiritualPollution.longTermErosion }}</span>
                </div>
              </div>
            </div>

            <div class="stats-grid">
              <div class="stat-item">
                <span class="stat-icon">🔍</span>
                <span class="stat-num">{{ save.gameState.discoveredEvidence.length }}</span>
                <span class="stat-text">证据</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🧩</span>
                <span class="stat-num">{{ save.gameState.discoveredClues.length }}</span>
                <span class="stat-text">线索</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🔗</span>
                <span class="stat-num">{{ save.gameState.clueConnections.length }}</span>
                <span class="stat-text">关联</span>
              </div>
              <div class="stat-item">
                <span class="stat-icon">🛠️</span>
                <span class="stat-num">{{ save.gameState.tools.length }}</span>
                <span class="stat-text">工具</span>
              </div>
            </div>

            <div v-if="save.playTimeSeconds > 0" class="stat-row">
              <span class="stat-label">游戏时长</span>
              <span class="stat-value">{{ saveStore.formatDurationSeconds(save.playTimeSeconds) }}</span>
            </div>

            <div v-if="save.coverSummary" class="stat-row">
              <span class="stat-label">当前场景</span>
              <span class="stat-value">{{ save.coverSummary.currentSceneName }}</span>
            </div>
          </div>

          <div class="save-timestamps">
            <div class="timestamp">
              <span class="label">创建时间</span>
              <span class="value">{{ saveStore.formatDate(save.createdAt) }}</span>
            </div>
            <div class="timestamp">
              <span class="label">更新时间</span>
              <span class="value">{{ saveStore.formatDate(save.updatedAt) }}</span>
            </div>
          </div>

          <div class="save-actions">
            <button class="load-btn primary" @click="loadSaveData(save.id)">
              📂 加载存档
            </button>
            <button class="delete-btn danger" @click="deleteSaveData(save.id)">
              🗑️ 删除
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="saves-info card">
      <h3 class="info-title">存档说明</h3>
      <ul class="info-list">
        <li>
          <strong>📋 自动存档：</strong>每 {{ saveStore.autoSaveIntervalMinutes }} 分钟自动保存进度，可在设置中调整
        </li>
        <li>
          <strong>💾 手动保存：</strong>在调查过程中可以随时手动创建存档
        </li>
        <li>
          <strong>📸 快照系统：</strong>发现证据、分析线索、阶段推进等关键节点会自动创建快照（每案件最多 {{ MAX_SNAPSHOTS_PER_CASE }} 个）
        </li>
        <li>
          <strong>📍 关键节点：</strong>手动标记的重要进度点，不会被自动清理
        </li>
        <li>
          <strong>🎨 封面摘要：</strong>每个存档自动生成调查进度摘要，包含情绪标签和关键亮点
        </li>
        <li>
          <strong>📊 案件对比：</strong>支持跨案件多维度进度对比，查看综合表现排名
        </li>
        <li>
          <strong>存档数量：</strong>最多保存 {{ saveStore.maxSaves }} 个存档，超出后会自动清理最早的自动存档
        </li>
        <li>
          <strong>本地存储：</strong>存档保存在浏览器本地，清除浏览器数据会丢失存档
        </li>
        <li v-if="globalToolNames.length > 0">
          <strong>继承工具：</strong>{{ globalToolNames.join('、') }} — 这些工具会在 New Game+ 中自动携带
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.saves-page {
  display: flex;
  flex-direction: column;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
  gap: 1rem;
  flex-wrap: wrap;
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
  gap: 0.5rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 0.8rem;
  font-size: 0.85rem;
  white-space: nowrap;
}

.action-btn.small {
  padding: 0.3rem 0.6rem;
  font-size: 0.8rem;
}

.action-btn.primary {
  background: var(--color-accent);
  color: white;
}

.config-panel,
.comparison-panel {
  margin-bottom: 1.5rem;
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid rgba(107, 76, 154, 0.3);
}

.config-title {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.config-content {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 1rem;
}

.config-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.config-label {
  min-width: 140px;
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.config-value {
  color: var(--color-text);
  font-size: 0.9rem;
}

.toggle-btn {
  padding: 0.4rem 0.8rem;
  border: 1px solid var(--color-border);
  background: rgba(0, 0, 0, 0.2);
  color: var(--color-text);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.toggle-btn.active {
  border-color: #3a8b5a;
  background: rgba(58, 139, 90, 0.2);
}

.interval-control {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.interval-input {
  width: 80px;
  padding: 0.4rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
}

.config-hint {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.comparison-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.case-selector {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.selector-hint {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.case-checkboxes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 0.5rem;
}

.case-checkbox {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.case-checkbox.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.case-checkbox input {
  margin: 0;
}

.comparison-results {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.comparison-results h4 {
  color: var(--color-accent-light);
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.summary-notes {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.summary-note {
  padding: 0.75rem 1rem;
  background: rgba(255, 215, 0, 0.08);
  border: 1px solid rgba(255, 215, 0, 0.2);
  border-radius: 6px;
  color: var(--color-text);
}

.comparison-table-wrapper {
  overflow-x: auto;
}

.comparison-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 600px;
}

.comparison-table th,
.comparison-table td {
  padding: 0.75rem 1rem;
  text-align: left;
  border-bottom: 1px solid var(--color-border);
}

.comparison-table th {
  background: rgba(0, 0, 0, 0.2);
  color: var(--color-text-dim);
  font-weight: normal;
  font-size: 0.85rem;
}

.rank-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.rank-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
}

.rank-badge.rank-1 { background: #ffd700; color: #333; }
.rank-badge.rank-2 { background: #c0c0c0; color: #333; }
.rank-badge.rank-3 { background: #cd7f32; color: white; }
.rank-badge:not(.rank-1):not(.rank-2):not(.rank-3) { background: #555; }

.case-title {
  color: var(--color-accent-light);
  font-weight: bold;
}

.score-display {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.score-display strong {
  color: var(--color-accent-light);
  font-size: 1rem;
}

.metric-name {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.metric-value {
  font-weight: bold;
}

.metric-na {
  color: #555;
}

.mini-progress {
  width: 100%;
  height: 4px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 2px;
  margin-top: 0.25rem;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  transition: width 0.3s;
  border-radius: 2px;
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.filter-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.2s;
  font-size: 0.9rem;
}

.filter-btn:hover {
  background: rgba(107, 76, 154, 0.2);
}

.filter-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.filter-count {
  background: rgba(0, 0, 0, 0.3);
  padding: 0.1rem 0.4rem;
  border-radius: 10px;
  font-size: 0.75rem;
}

.filter-btn.active .filter-count {
  background: rgba(255, 255, 255, 0.2);
}

.saves-content {
  flex: 1;
  margin-bottom: 2rem;
}

.no-saves {
  text-align: center;
  padding: 3rem;
  max-width: 500px;
  margin: 0 auto;
}

.no-saves-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.no-saves h3 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.no-saves p {
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.no-saves .hint {
  font-size: 0.85rem;
  opacity: 0.7;
}

.saves-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.5rem;
}

.save-card {
  display: flex;
  flex-direction: column;
}

.save-header {
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
}

.save-header-main {
  flex: 1;
  min-width: 220px;
}

.save-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.save-type-badge {
  display: inline-block;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.save-meta {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}

.save-case {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 12px;
  color: var(--color-text-dim);
}

.save-case-status {
  font-size: 0.8rem;
  font-weight: bold;
}

.cover-summary {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.progress-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.progress-label {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  min-width: 40px;
}

.progress-bar-wrapper {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.5rem;
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
  transition: width 0.5s ease;
  border-radius: 4px;
}

.progress-value {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text);
  min-width: 40px;
  text-align: right;
}

.mood-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
}

.mood-emoji {
  font-size: 1.1rem;
}

.mood-label {
  color: var(--color-accent-light);
  font-weight: bold;
}

.phase-name {
  margin-left: auto;
  color: var(--color-text-dim);
  font-size: 0.8rem;
}

.highlights-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.highlight-tag {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  background: rgba(74, 144, 217, 0.15);
  border: 1px solid rgba(74, 144, 217, 0.3);
  border-radius: 10px;
  font-size: 0.75rem;
  color: #7fb3e8;
}

.ending-hint {
  padding: 0.4rem 0.6rem;
  background: rgba(255, 215, 0, 0.1);
  border-radius: 4px;
  font-size: 0.8rem;
  color: #ffd700;
}

.snapshot-info {
  padding: 0.75rem;
  background: rgba(212, 133, 10, 0.08);
  border: 1px solid rgba(212, 133, 10, 0.2);
  border-radius: 6px;
  margin-bottom: 1rem;
}

.snapshot-meta-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.significance-badge {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  flex-shrink: 0;
}

.snapshot-desc {
  color: var(--color-text);
  font-size: 0.9rem;
  flex: 1;
}

.save-character {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: rgba(107, 76, 154, 0.15);
  border-radius: 6px;
  border: 1px solid rgba(107, 76, 154, 0.3);
  align-self: flex-start;
}

.save-char-avatar {
  font-size: 1.5rem;
}

.save-char-name {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.save-name {
  font-size: 1.1rem;
  color: var(--color-accent-light);
  margin: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  flex: 1;
}

.save-stats {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.stat-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  flex-shrink: 0;
}

.stat-value {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: bold;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 0.5rem;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 0.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  gap: 0.15rem;
}

.stat-icon {
  font-size: 1.1rem;
}

.stat-num {
  font-size: 1.1rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.stat-text {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.sanity-display {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.sanity-bar-mini {
  width: 60px;
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.sanity-fill-mini {
  height: 100%;
  transition: all 0.3s ease;
}

.sanity-value {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: bold;
}

.sanity-status {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.pollution-row {
  background: rgba(139, 0, 139, 0.08);
}

.pollution-display {
  display: flex;
  gap: 1rem;
  flex: 1;
  justify-content: flex-end;
}

.pollution-mini {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.shock-mini-icon {
  color: #ffd700;
  font-size: 0.8rem;
}

.erosion-mini-icon {
  color: #9c27b0;
  font-size: 0.8rem;
}

.pollution-mini-value {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: bold;
}

.pollution-mini-value.erosion-value {
  color: #e040fb;
}

.save-timestamps {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.timestamp {
  display: flex;
  justify-content: space-between;
  font-size: 0.85rem;
}

.timestamp .label {
  color: var(--color-text-dim);
}

.timestamp .value {
  color: var(--color-text);
}

.save-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: auto;
}

.load-btn,
.delete-btn {
  flex: 1;
  padding: 0.75rem;
  font-size: 0.95rem;
}

.saves-info {
  max-width: 800px;
  margin: 0 auto;
  background: rgba(107, 76, 154, 0.1);
}

.info-title {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
}

.info-list {
  list-style: none;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.info-list li {
  padding: 0.5rem 0;
  color: var(--color-text-dim);
  line-height: 1.6;
  font-size: 0.9rem;
}

.info-list li strong {
  color: var(--color-text);
}

.save-btn {
  position: relative;
}

.save-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.risk-badge {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 10px;
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}

.save-btn.risk-caution {
  border-color: #ffc107;
  box-shadow: 0 0 10px rgba(255, 193, 7, 0.3);
}

.save-btn.risk-danger {
  border-color: #ff9800;
  box-shadow: 0 0 12px rgba(255, 152, 0, 0.4);
}

.save-btn.risk-critical {
  border-color: #f44336;
  box-shadow: 0 0 15px rgba(244, 67, 54, 0.5);
  animation: critical-pulse 1.5s infinite;
}

.save-btn.risk-corrupted {
  border-color: #9c27b0;
  box-shadow: 0 0 20px rgba(156, 39, 176, 0.6);
  animation: corrupted-pulse 2s infinite;
}

@keyframes critical-pulse {
  0%, 100% { box-shadow: 0 0 15px rgba(244, 67, 54, 0.5); }
  50% { box-shadow: 0 0 25px rgba(244, 67, 54, 0.8); }
}

@keyframes corrupted-pulse {
  0%, 100% { 
    box-shadow: 0 0 20px rgba(156, 39, 176, 0.6);
    filter: hue-rotate(0deg);
  }
  50% { 
    box-shadow: 0 0 30px rgba(156, 39, 176, 0.9);
    filter: hue-rotate(20deg);
  }
}

.corrupted-name {
  color: #9c27b0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.corrupted-badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  background: rgba(156, 39, 176, 0.3);
  border: 1px solid rgba(156, 39, 176, 0.5);
  border-radius: 8px;
  color: #e040fb;
}

.compare-btn {
  background: rgba(58, 139, 90, 0.2);
  border-color: rgba(58, 139, 90, 0.5);
}

.checkpoint-btn {
  background: rgba(212, 133, 10, 0.15);
  border-color: rgba(212, 133, 10, 0.4);
}

.autosave-btn {
  background: rgba(107, 76, 154, 0.15);
  border-color: rgba(107, 76, 154, 0.4);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
    flex-wrap: wrap;
  }
  
  .saves-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .comparison-table th,
  .comparison-table td {
    padding: 0.5rem;
    font-size: 0.85rem;
  }
}
</style>
