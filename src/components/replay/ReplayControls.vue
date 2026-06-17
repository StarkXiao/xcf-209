<script setup lang="ts">
import { ref, computed } from 'vue'
import { useReplayStore } from '@/stores/replay'
import type { ReplayNodeType } from '@/types'

const replayStore = useReplayStore()

const timeline = computed(() => replayStore.activeTimeline)
const playback = computed(() => replayStore.state.playback)
const filter = computed(() => replayStore.state.filter)
const stats = computed(() => replayStore.stats)
const selectedNodeIndex = computed(() => replayStore.selectedNodeIndex)
const totalNodes = computed(() => {
  if (filter.value.keyMomentsOnly) {
    return timeline.value?.nodes.filter(n => n.isKeyMoment).length || 0
  }
  return timeline.value?.nodes.length || 0
})

const speedOptions = [0.5, 1, 1.5, 2] as const

const typeOptions: { type: ReplayNodeType; label: string; icon: string }[] = [
  { type: 'scene_visit', label: '场景', icon: '📍' },
  { type: 'evidence_discovery', label: '证据', icon: '🔍' },
  { type: 'clue_discovery', label: '线索', icon: '💡' },
  { type: 'clue_analysis', label: '分析', icon: '🧠' },
  { type: 'clue_connection', label: '关联', icon: '🔗' },
  { type: 'deduction_branch', label: '分支', icon: '🌿' },
  { type: 'conclusion', label: '结案', icon: '🏆' },
  { type: 'sanity_event', label: '理智', icon: '💔' },
  { type: 'tool_use', label: '工具', icon: '🔧' },
  { type: 'phase_unlock', label: '阶段', icon: '🔓' },
  { type: 'mail_read', label: '邮件', icon: '📧' },
  { type: 'document_read', label: '文书', icon: '📚' },
  { type: 'key_moment', label: '关键', icon: '⭐' }
]

const showExportMenu = ref(false)

function handleToggleType(type: ReplayNodeType) {
  replayStore.toggleNodeTypeFilter(type)
}

function isTypeActive(type: ReplayNodeType): boolean {
  return filter.value.nodeTypes.includes(type)
}

function handleImport(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    replayStore.importTimeline(file)
      .then(() => {
        alert('回放记录导入成功！')
      })
      .catch(() => {
        alert('导入失败，请检查文件格式')
      })
    input.value = ''
  }
}

function formatTime(seconds: number): string {
  return replayStore.formatTime(seconds)
}

const gradeColors: Record<string, string> = {
  'S': '#ffd700',
  'A': '#6b4c9a',
  'B': '#3a8b5a',
  'C': '#ff9800',
  'D': '#8b5a2b',
  'F': '#8b3a3a'
}
</script>

<template>
  <div class="replay-controls">
    <div class="controls-top">
      <div class="case-info" v-if="timeline">
        <div class="case-title-row">
          <h2 class="case-title">{{ timeline.caseTitle }}</h2>
          <span 
            v-if="timeline.metadata.grade"
            class="grade-badge"
            :style="{ color: gradeColors[timeline.metadata.grade] || '#888' }"
          >
            {{ timeline.metadata.grade }}
          </span>
        </div>
        <div class="case-meta">
          <span class="meta-chip" v-if="timeline.metadata.totalScore">
            📊 {{ timeline.metadata.totalScore }}分
          </span>
          <span class="meta-chip" v-if="timeline.metadata.playCount">
            🔄 第{{ timeline.metadata.playCount }}次
          </span>
          <span class="meta-chip">
            ⏱️ {{ formatTime(timeline.totalDuration) }}
          </span>
          <span class="meta-chip">
            📋 {{ totalNodes }}个节点
          </span>
        </div>
      </div>

      <div class="control-actions">
        <label class="import-btn btn" title="导入回放记录">
          📥 导入
          <input 
            type="file" 
            accept=".json" 
            style="display: none"
            @change="handleImport"
          />
        </label>
        <div class="export-wrapper">
          <button class="btn export-btn" @click="showExportMenu = !showExportMenu">
            📤 导出
            <span class="arrow">▾</span>
          </button>
          <div v-if="showExportMenu" class="export-dropdown">
            <button class="dropdown-item" @click="replayStore.downloadExport(); showExportMenu = false">
              💾 JSON 格式
            </button>
            <button class="dropdown-item" @click="replayStore.downloadTextExport(); showExportMenu = false">
              📄 文本格式
            </button>
            <button class="dropdown-item" @click="replayStore.shareTimeline(); showExportMenu = false">
              🔗 分享
            </button>
          </div>
        </div>
        <button 
          class="btn edit-btn"
          :class="{ active: replayStore.state.isEditing }"
          @click="replayStore.toggleEditMode()"
        >
          ✏️ {{ replayStore.state.isEditing ? '完成编辑' : '编辑' }}
        </button>
      </div>
    </div>

    <div class="stats-bar" v-if="timeline">
      <div class="stat-item">
        <span class="stat-icon">📍</span>
        <div class="stat-texts">
          <span class="stat-value">{{ stats.totalScenesVisited }}</span>
          <span class="stat-label">场景</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🔍</span>
        <div class="stat-texts">
          <span class="stat-value">{{ stats.totalEvidenceDiscovered }}</span>
          <span class="stat-label">证据</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">💡</span>
        <div class="stat-texts">
          <span class="stat-value">{{ stats.totalCluesDiscovered }}</span>
          <span class="stat-label">线索</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🧠</span>
        <div class="stat-texts">
          <span class="stat-value">{{ stats.totalCluesAnalyzed }}</span>
          <span class="stat-label">已分析</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">🔗</span>
        <div class="stat-texts">
          <span class="stat-value">{{ stats.totalConnections }}</span>
          <span class="stat-label">关联</span>
        </div>
      </div>
      <div class="stat-item" v-if="stats.totalSanityLost > 0">
        <span class="stat-icon">💔</span>
        <div class="stat-texts">
          <span class="stat-value danger">{{ stats.totalSanityLost }}</span>
          <span class="stat-label">理智损失</span>
        </div>
      </div>
      <div class="stat-item">
        <span class="stat-icon">⭐</span>
        <div class="stat-texts">
          <span class="stat-value highlight">{{ stats.keyMomentCount }}</span>
          <span class="stat-label">关键节点</span>
        </div>
      </div>
    </div>

    <div class="playback-controls">
      <div class="progress-section">
        <span class="progress-index">
          {{ Math.min(selectedNodeIndex + 1, totalNodes) }} / {{ totalNodes }}
        </span>
        <div class="progress-bar-wrap">
          <div class="progress-bar-bg">
            <div 
              class="progress-bar-fill" 
              :style="{ width: `${totalNodes > 0 ? ((selectedNodeIndex + 1) / totalNodes) * 100 : 0}%` }"
            ></div>
          </div>
        </div>
      </div>

      <div class="play-buttons">
        <button 
          class="play-btn"
          @click="replayStore.stopPlayback()"
          title="回到开始"
          :disabled="totalNodes === 0"
        >
          ⏮
        </button>
        <button 
          class="play-btn"
          @click="replayStore.goToPrevNode()"
          title="上一节点"
          :disabled="selectedNodeIndex <= 0 || totalNodes === 0"
        >
          ◀
        </button>
        <button 
          class="play-btn play-main"
          @click="playback.isPlaying ? replayStore.pausePlayback() : replayStore.startPlayback()"
          :class="{ playing: playback.isPlaying }"
          :disabled="totalNodes === 0"
          :title="playback.isPlaying ? '暂停' : '播放'"
        >
          {{ playback.isPlaying ? '⏸' : '▶' }}
        </button>
        <button 
          class="play-btn"
          @click="replayStore.goToNextNode()"
          title="下一节点"
          :disabled="selectedNodeIndex >= totalNodes - 1 || totalNodes === 0"
        >
          ▶
        </button>
      </div>

      <div class="speed-controls">
        <span class="speed-label">速度</span>
        <div class="speed-buttons">
          <button 
            v-for="speed in speedOptions" 
            :key="speed"
            class="speed-btn"
            :class="{ active: playback.speed === speed }"
            @click="replayStore.setPlaybackSpeed(speed)"
          >
            {{ speed }}x
          </button>
        </div>
      </div>
    </div>

    <div class="filter-section">
      <div class="filter-left">
        <div class="search-box">
          <span class="search-icon">🔍</span>
          <input 
            type="text" 
            class="search-input"
            placeholder="搜索标题、描述或标签..."
            :value="filter.searchQuery"
            @input="replayStore.setFilter({ searchQuery: ($event.target as HTMLInputElement).value })"
          />
          <button 
            v-if="filter.searchQuery" 
            class="clear-search"
            @click="replayStore.setFilter({ searchQuery: '' })"
          >
            ✕
          </button>
        </div>

        <label class="filter-toggle">
          <input 
            type="checkbox" 
            :checked="filter.keyMomentsOnly"
            @change="replayStore.setFilter({ keyMomentsOnly: ($event.target as HTMLInputElement).checked })"
          />
          <span class="toggle-text">⭐ 仅显示关键节点</span>
        </label>
      </div>

      <div class="filter-right">
        <div class="type-filters">
          <button
            v-for="opt in typeOptions"
            :key="opt.type"
            class="type-filter-btn"
            :class="{ active: isTypeActive(opt.type) }"
            :title="`过滤${opt.label}节点`"
            @click="handleToggleType(opt.type)"
          >
            <span class="type-icon">{{ opt.icon }}</span>
            <span class="type-text">{{ opt.label }}</span>
          </button>
        </div>
        <button 
          class="btn btn-link clear-filter-btn"
          @click="replayStore.clearFilter()"
          :disabled="filter.nodeTypes.length === 0 && !filter.keyMomentsOnly && !filter.searchQuery"
        >
          清除筛选
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-controls {
  background: rgba(20, 20, 30, 0.98);
  border-bottom: 1px solid var(--color-border);
  padding: 1rem 1.5rem;
  backdrop-filter: blur(10px);
}

.controls-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.case-title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.5rem;
}

.case-title {
  font-size: 1.4rem;
  color: var(--color-accent-light);
  margin: 0;
  font-weight: 800;
}

.grade-badge {
  font-size: 1.5rem;
  font-weight: 900;
  text-shadow: 0 0 10px currentColor;
}

.case-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.meta-chip {
  padding: 0.25rem 0.65rem;
  background: rgba(107, 76, 154, 0.15);
  border: 1px solid rgba(107, 76, 154, 0.3);
  border-radius: 12px;
  font-size: 0.75rem;
  color: var(--color-accent-light);
  font-weight: 600;
}

.control-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.btn {
  padding: 0.5rem 1rem;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 600;
  transition: all 0.2s ease;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.btn:hover:not(:disabled) {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
  transform: translateY(-1px);
}

.btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.import-btn {
  cursor: pointer;
}

.export-wrapper {
  position: relative;
}

.export-btn .arrow {
  font-size: 0.7rem;
  margin-left: 0.25rem;
}

.export-dropdown {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 0.5rem;
  background: rgba(30, 30, 45, 0.98);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 0.25rem;
  min-width: 150px;
  z-index: 100;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.dropdown-item {
  display: block;
  width: 100%;
  text-align: left;
  padding: 0.6rem 0.85rem;
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  border-radius: 6px;
  font-size: 0.85rem;
  transition: background 0.15s ease;
}

.dropdown-item:hover {
  background: rgba(107, 76, 154, 0.2);
}

.edit-btn.active {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
  border-color: transparent;
}

.stats-bar {
  display: flex;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  margin-bottom: 1rem;
  overflow-x: auto;
  flex-wrap: wrap;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.25rem 0.75rem;
  border-right: 1px solid rgba(255, 255, 255, 0.05);
}

.stat-item:last-child {
  border-right: none;
}

.stat-icon {
  font-size: 1.1rem;
}

.stat-texts {
  display: flex;
  flex-direction: column;
  line-height: 1.1;
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--color-text);
}

.stat-value.danger {
  color: var(--color-danger);
}

.stat-value.highlight {
  color: #f1c40f;
}

.stat-label {
  font-size: 0.65rem;
  color: var(--color-text-dim);
}

.playback-controls {
  display: flex;
  align-items: center;
  gap: 1.5rem;
  padding: 0.75rem 1rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 10px;
  margin-bottom: 1rem;
}

.progress-section {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: 200px;
}

.progress-index {
  font-family: 'Monaco', 'Menlo', monospace;
  font-size: 0.85rem;
  color: var(--color-accent-light);
  font-weight: 700;
  white-space: nowrap;
}

.progress-bar-wrap {
  flex: 1;
}

.progress-bar-bg {
  height: 8px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 4px;
  overflow: hidden;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-accent), var(--color-accent-light));
  border-radius: 4px;
  transition: width 0.3s ease;
}

.play-buttons {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.play-btn {
  width: 40px;
  height: 40px;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.4);
  color: var(--color-text);
  cursor: pointer;
  font-size: 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.play-btn:hover:not(:disabled) {
  background: rgba(107, 76, 154, 0.4);
  transform: scale(1.08);
}

.play-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.play-btn.play-main {
  width: 48px;
  height: 48px;
  font-size: 1.2rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
}

.play-btn.play-main:hover:not(:disabled) {
  box-shadow: 0 4px 20px rgba(107, 76, 154, 0.5);
}

.play-btn.play-main.playing {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(107, 76, 154, 0.5); }
  50% { box-shadow: 0 0 0 10px rgba(107, 76, 154, 0); }
}

.speed-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.speed-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-weight: 600;
}

.speed-buttons {
  display: flex;
  gap: 0.25rem;
  background: rgba(0, 0, 0, 0.3);
  padding: 0.2rem;
  border-radius: 8px;
}

.speed-btn {
  padding: 0.3rem 0.65rem;
  border: none;
  background: none;
  color: var(--color-text-dim);
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 700;
  transition: all 0.15s ease;
}

.speed-btn:hover {
  color: var(--color-text);
}

.speed-btn.active {
  background: var(--color-accent);
  color: white;
}

.filter-section {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.filter-left {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.search-box {
  position: relative;
  display: flex;
  align-items: center;
  width: 280px;
}

.search-icon {
  position: absolute;
  left: 0.75rem;
  font-size: 0.85rem;
  opacity: 0.5;
}

.search-input {
  width: 100%;
  padding: 0.5rem 2.5rem 0.5rem 2.25rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  font-size: 0.85rem;
}

.search-input:focus {
  outline: none;
  border-color: var(--color-accent);
}

.clear-search {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 0.25rem;
}

.filter-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  user-select: none;
}

.filter-toggle input {
  width: 18px;
  height: 18px;
  cursor: pointer;
}

.toggle-text {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: 600;
}

.filter-right {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.type-filters {
  display: flex;
  gap: 0.25rem;
  flex-wrap: wrap;
}

.type-filter-btn {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.3rem 0.6rem;
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  cursor: pointer;
  color: var(--color-text-dim);
  font-size: 0.7rem;
  font-weight: 600;
  transition: all 0.15s ease;
}

.type-filter-btn:hover {
  border-color: rgba(107, 76, 154, 0.5);
  color: var(--color-text);
}

.type-filter-btn.active {
  background: rgba(107, 76, 154, 0.3);
  border-color: var(--color-accent);
  color: var(--color-accent-light);
}

.type-icon {
  font-size: 0.85rem;
}

.btn-link {
  background: none;
  border: none;
  padding: 0.4rem 0.75rem;
  color: var(--color-accent-light);
  cursor: pointer;
  font-size: 0.8rem;
  text-decoration: underline;
}

.btn-link:hover:not(:disabled) {
  background: rgba(107, 76, 154, 0.1);
  transform: none;
}

@media (max-width: 1024px) {
  .replay-controls {
    padding: 1rem;
  }

  .controls-top {
    flex-direction: column;
    align-items: stretch;
  }

  .control-actions {
    flex-wrap: wrap;
  }

  .playback-controls {
    flex-direction: column;
    gap: 1rem;
  }

  .filter-section {
    flex-direction: column;
    align-items: stretch;
  }

  .search-box {
    width: 100%;
    max-width: 100%;
  }
}
</style>
