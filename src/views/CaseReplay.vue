<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useReplayStore } from '@/stores/replay'
import { useProgressStore } from '@/stores/progress'
import { useSaveStore } from '@/stores/save'
import { cases } from '@/data/cases'
import ReplayTimeline from '@/components/replay/ReplayTimeline.vue'
import ReplayNodeDetail from '@/components/replay/ReplayNodeDetail.vue'
import ReplayControls from '@/components/replay/ReplayControls.vue'
import type { SaveData, ReplayTimeline as ReplayTimelineType } from '@/types'

const route = useRoute()
const router = useRouter()
const replayStore = useReplayStore()
const progressStore = useProgressStore()
const saveStore = useSaveStore()

const selectedCaseId = ref<string | null>(null)
const showCaseSelector = ref(true)
const showSaveSelector = ref(false)
const selectedSaveId = ref<string | null>(null)

const completedCases = computed(() => {
  return cases.filter(c => {
    const progress = progressStore.getProgress(c.id)
    return progress?.completed || progressStore.completedCases.includes(c.id)
  })
})

const currentCaseSaves = computed((): SaveData[] => {
  if (!selectedCaseId.value) return []
  return saveStore.getSavesByCase(selectedCaseId.value)
})

const timelinesForCase = computed((): ReplayTimelineType[] => {
  if (!selectedCaseId.value) return []
  return replayStore.getTimelinesForCase(selectedCaseId.value)
})

onMounted(() => {
  const caseIdParam = route.params.caseId as string
  if (caseIdParam) {
    selectedCaseId.value = caseIdParam
    const result = replayStore.loadTimelineForCase(caseIdParam)
    if (result) {
      showCaseSelector.value = false
    }
  } else if (completedCases.value.length > 0) {
    selectedCaseId.value = completedCases.value[0].id
  }
})

watch(selectedCaseId, (caseId) => {
  if (caseId) {
    replayStore.loadTimelineForCase(caseId)
  }
})

function selectCase(caseId: string) {
  selectedCaseId.value = caseId
  const result = replayStore.loadTimelineForCase(caseId)
  if (result) {
    showCaseSelector.value = false
    if (route.params.caseId !== caseId) {
      router.push(`/replay/${caseId}`)
    }
  }
}

function loadFromSave(saveId: string) {
  const result = replayStore.loadTimelineFromSave(saveId)
  if (result) {
    showSaveSelector.value = false
    selectedSaveId.value = saveId
  }
}

function loadTimeline(index: number) {
  const timelines = timelinesForCase.value
  if (timelines[index]) {
    replayStore.setActiveTimeline(timelines[index])
  }
}

function deleteTimeline(index: number) {
  if (selectedCaseId.value && confirm('确定删除该回放记录吗？')) {
    replayStore.deleteTimeline(selectedCaseId.value, index)
  }
}

function regenerateTimeline() {
  if (!selectedCaseId.value) return
  if (!confirm('这将重新生成时间轴，所有编辑将丢失。确定继续吗？')) return
  
  replayStore.loadTimelineForCase(selectedCaseId.value)
}

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

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

function goBack() {
  router.back()
}
</script>

<template>
  <div class="replay-page page-container">
    <div v-if="showCaseSelector && !replayStore.activeTimeline" class="case-selector-screen">
      <div class="selector-header">
        <button class="btn-back" @click="goBack">
          ← 返回
        </button>
        <h1 class="selector-title">
          <span class="title-icon">🎬</span>
          案件回放编辑器
        </h1>
        <p class="selector-subtitle">选择一个已完成的案件，复盘你的调查过程</p>
      </div>

      <div v-if="completedCases.length === 0" class="empty-cases">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">暂无已完成的案件</h3>
        <p class="empty-text">先完成一些案件后再来查看回放吧</p>
        <button class="btn-primary" @click="router.push('/cases')">
          去调查案件
        </button>
      </div>

      <div v-else class="case-selector-grid">
        <div 
          v-for="caseItem in completedCases"
          :key="caseItem.id"
          class="selector-card card"
          @click="selectCase(caseItem.id)"
        >
          <div class="card-top">
            <span 
              class="difficulty-badge"
              :style="{ backgroundColor: difficultyColors[caseItem.difficulty] }"
            >
              {{ difficultyLabels[caseItem.difficulty] }}
            </span>
            <span class="grade-badge" v-if="progressStore.getProgress(caseItem.id)?.bestGrade">
              {{ progressStore.getProgress(caseItem.id)?.bestGrade }}
            </span>
          </div>

          <h3 class="case-name">{{ caseItem.title }}</h3>
          <p class="case-desc">{{ caseItem.description.substring(0, 80) }}...</p>

          <div class="case-stats">
            <div class="mini-stat">
              <span class="mini-icon">📊</span>
              <span class="mini-text">分数: {{ progressStore.getProgress(caseItem.id)?.bestScore?.totalScore || 0 }}</span>
            </div>
            <div class="mini-stat">
              <span class="mini-icon">🔄</span>
              <span class="mini-text">{{ progressStore.getProgress(caseItem.id)?.playCount || 0 }}次游玩</span>
            </div>
          </div>

          <div class="timeline-count" v-if="timelinesForCase.length > 0">
            🎬 已有 {{ timelinesForCase.length }} 条回放
          </div>

          <div class="card-actions">
            <button class="btn-action primary" @click.stop="selectCase(caseItem.id)">
              🎬 查看回放
            </button>
            <button 
              class="btn-action secondary"
              v-if="currentCaseSaves.length > 0"
              @click.stop="selectedCaseId = caseItem.id; showSaveSelector = true; showCaseSelector = false"
            >
              💾 从存档生成
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showSaveSelector" class="save-selector-overlay" @click.self="showSaveSelector = false">
      <div class="save-selector-modal card">
        <div class="modal-header">
          <h3 class="modal-title">选择存档生成回放</h3>
          <button class="close-btn" @click="showSaveSelector = false">✕</button>
        </div>
        <div class="save-list">
          <div 
            v-for="save in currentCaseSaves" 
            :key="save.id"
            class="save-item card"
            :class="{ selected: selectedSaveId === save.id }"
            @click="loadFromSave(save.id)"
          >
            <div class="save-header">
              <h4 class="save-name">{{ save.name }}</h4>
              <span class="save-date">{{ formatDate(save.updatedAt) }}</span>
            </div>
            <div class="save-info">
              <span class="save-info-item">
                🧠 理智: {{ save.gameState.sanity }}/{{ save.gameState.maxSanity }}
              </span>
              <span class="save-info-item">
                🔍 证据: {{ save.gameState.discoveredEvidence.length }}
              </span>
              <span class="save-info-item">
                💡 线索: {{ save.gameState.discoveredClues.length }}
              </span>
            </div>
          </div>
          <div v-if="currentCaseSaves.length === 0" class="empty-saves">
            该案件暂无存档
          </div>
        </div>
      </div>
    </div>

    <div v-if="replayStore.activeTimeline" class="replay-workspace">
      <div class="workspace-sidebar" v-if="!showCaseSelector">
        <div class="sidebar-header">
          <button class="btn-back-sm" @click="showCaseSelector = true">
            ←
          </button>
          <h3 class="sidebar-title">案件选择</h3>
        </div>
        <div class="sidebar-list">
          <div
            v-for="caseItem in completedCases"
            :key="caseItem.id"
            class="sidebar-item"
            :class="{ active: selectedCaseId === caseItem.id }"
            @click="selectCase(caseItem.id)"
          >
            <span class="case-icon">📁</span>
            <div class="case-info">
              <span class="case-name-sm">{{ caseItem.title }}</span>
              <span class="case-grade" v-if="progressStore.getProgress(caseItem.id)?.bestGrade">
                {{ progressStore.getProgress(caseItem.id)?.bestGrade }}
              </span>
            </div>
          </div>
        </div>

        <div class="sidebar-section" v-if="selectedCaseId">
          <h4 class="section-title">历史回放</h4>
          <div class="timeline-list">
            <div 
              v-for="(tl, idx) in timelinesForCase" 
              :key="idx"
              class="timeline-history-item"
              :class="{ active: replayStore.activeTimeline?.createdAt === tl.createdAt }"
              @click="loadTimeline(idx)"
            >
              <div class="timeline-history-info">
                <span class="timeline-date">{{ formatDate(tl.createdAt) }}</span>
                <span class="timeline-count">{{ tl.nodes.length }}节点</span>
              </div>
              <button 
                class="delete-timeline-btn"
                @click.stop="deleteTimeline(idx)"
                title="删除"
              >
                🗑️
              </button>
            </div>
            <div v-if="timelinesForCase.length === 0" class="no-timelines">
              暂无历史记录
            </div>
          </div>

          <button class="btn-refresh" @click="regenerateTimeline">
            🔄 重新生成时间轴
          </button>
        </div>
      </div>

      <div class="workspace-main">
        <ReplayControls />
        <div class="main-content">
          <div class="timeline-area">
            <ReplayTimeline />
          </div>
          <div class="detail-area">
            <ReplayNodeDetail />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.replay-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  padding: 0;
}

.case-selector-screen {
  padding: 2rem 1.5rem;
  max-width: 1400px;
  margin: 0 auto;
  width: 100%;
}

.selector-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.btn-back {
  position: absolute;
  left: 1.5rem;
  top: 1.5rem;
  padding: 0.5rem 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
}

.btn-back:hover {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
}

.selector-title {
  font-size: 2.25rem;
  color: var(--color-accent-light);
  margin: 0 0 0.75rem 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  font-weight: 800;
}

.title-icon {
  font-size: 2rem;
}

.selector-subtitle {
  color: var(--color-text-dim);
  font-size: 1rem;
  margin: 0;
}

.empty-cases {
  text-align: center;
  padding: 5rem 2rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.empty-title {
  font-size: 1.3rem;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.empty-text {
  color: var(--color-text-dim);
  margin-bottom: 1.5rem;
}

.btn-primary {
  padding: 0.75rem 2rem;
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.3s ease;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 25px rgba(107, 76, 154, 0.4);
}

.case-selector-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 1.5rem;
}

.selector-card {
  padding: 1.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.selector-card:hover {
  transform: translateY(-4px);
  border-color: var(--color-accent);
  box-shadow: 0 12px 30px rgba(107, 76, 154, 0.3);
}

.card-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.difficulty-badge {
  padding: 0.25rem 0.65rem;
  border-radius: 12px;
  font-size: 0.7rem;
  color: white;
  font-weight: 700;
}

.grade-badge {
  font-size: 1.3rem;
  font-weight: 900;
  color: #f1c40f;
  text-shadow: 0 0 10px rgba(241, 196, 15, 0.5);
}

.case-name {
  font-size: 1.2rem;
  color: var(--color-text);
  margin: 0;
  font-weight: 700;
}

.case-desc {
  color: var(--color-text-dim);
  font-size: 0.85rem;
  line-height: 1.5;
  margin: 0;
}

.case-stats {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.mini-stat {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0.25rem 0.5rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 6px;
}

.mini-icon {
  font-size: 0.8rem;
}

.mini-text {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.timeline-count {
  padding: 0.4rem 0.75rem;
  background: rgba(107, 76, 154, 0.15);
  border: 1px solid rgba(107, 76, 154, 0.3);
  border-radius: 8px;
  font-size: 0.8rem;
  color: var(--color-accent-light);
  font-weight: 600;
}

.card-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 0.5rem;
}

.btn-action {
  flex: 1;
  padding: 0.55rem 0.75rem;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  transition: all 0.2s ease;
}

.btn-action.primary {
  background: linear-gradient(135deg, var(--color-accent), var(--color-accent-light));
  color: white;
}

.btn-action.primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(107, 76, 154, 0.4);
}

.btn-action.secondary {
  background: rgba(0, 0, 0, 0.3);
  color: var(--color-text);
  border: 1px solid var(--color-border);
}

.btn-action.secondary:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.15);
}

.save-selector-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  z-index: 100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
  backdrop-filter: blur(4px);
}

.save-selector-modal {
  width: 100%;
  max-width: 550px;
  max-height: 80vh;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-title {
  font-size: 1.2rem;
  color: var(--color-accent-light);
  margin: 0;
}

.close-btn {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.3);
  border: none;
  border-radius: 8px;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 1rem;
}

.close-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  color: var(--color-danger);
}

.save-list {
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.save-item {
  padding: 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.save-item:hover {
  border-color: var(--color-accent);
  transform: translateX(4px);
}

.save-item.selected {
  border-color: var(--color-accent-light);
  background: rgba(107, 76, 154, 0.15);
}

.save-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.save-name {
  font-size: 1rem;
  color: var(--color-text);
  margin: 0;
  font-weight: 600;
}

.save-date {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.save-info {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.save-info-item {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
  color: var(--color-text-dim);
}

.empty-saves {
  text-align: center;
  padding: 3rem;
  color: var(--color-text-dim);
}

.replay-workspace {
  flex: 1;
  display: flex;
  min-height: 0;
  height: calc(100vh - 60px);
}

.workspace-sidebar {
  width: 260px;
  background: rgba(15, 15, 25, 0.95);
  border-right: 1px solid var(--color-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.sidebar-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.btn-back-sm {
  width: 32px;
  height: 32px;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.9rem;
  flex-shrink: 0;
}

.btn-back-sm:hover {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
}

.sidebar-title {
  font-size: 0.95rem;
  color: var(--color-accent-light);
  margin: 0;
  font-weight: 700;
}

.sidebar-list {
  overflow-y: auto;
  max-height: 40%;
  padding: 0.5rem;
}

.sidebar-item {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s ease;
  margin-bottom: 0.25rem;
}

.sidebar-item:hover {
  background: rgba(107, 76, 154, 0.15);
}

.sidebar-item.active {
  background: rgba(107, 76, 154, 0.25);
  border: 1px solid rgba(107, 76, 154, 0.5);
}

.case-icon {
  font-size: 1.1rem;
}

.case-info {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
}

.case-name-sm {
  font-size: 0.85rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 150px;
}

.case-grade {
  font-size: 0.9rem;
  font-weight: 800;
  color: #f1c40f;
}

.sidebar-section {
  padding: 1rem;
  border-top: 1px solid var(--color-border);
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-title {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin: 0 0 0.75rem 0;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-transform: uppercase;
}

.timeline-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  margin-bottom: 0.75rem;
}

.timeline-history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.65rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.15s ease;
}

.timeline-history-item:hover {
  border-color: var(--color-accent);
}

.timeline-history-item.active {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent);
}

.timeline-history-info {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.timeline-date {
  font-size: 0.75rem;
  color: var(--color-text);
}

.timeline-count {
  font-size: 0.65rem;
  color: var(--color-text-dim);
}

.delete-timeline-btn {
  width: 26px;
  height: 26px;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 0.75rem;
  border-radius: 4px;
  transition: all 0.15s ease;
}

.delete-timeline-btn:hover {
  background: rgba(231, 76, 60, 0.2);
  color: var(--color-danger);
}

.no-timelines {
  padding: 1rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  opacity: 0.6;
}

.btn-refresh {
  padding: 0.6rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text);
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.15);
}

.workspace-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
}

.main-content {
  flex: 1;
  display: flex;
  min-height: 0;
  overflow: hidden;
}

.timeline-area {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.detail-area {
  width: 360px;
  flex-shrink: 0;
  overflow: hidden;
}

@media (max-width: 1024px) {
  .workspace-sidebar {
    width: 60px;
  }

  .sidebar-title,
  .case-info,
  .sidebar-section,
  .section-title {
    display: none;
  }

  .sidebar-header {
    justify-content: center;
    padding: 0.75rem 0.5rem;
  }

  .case-name-sm,
  .case-grade {
    display: none;
  }

  .sidebar-item {
    justify-content: center;
    padding: 0.65rem 0;
  }

  .detail-area {
    position: fixed;
    bottom: 0;
    left: 60px;
    right: 0;
    height: 45%;
    border-top: 1px solid var(--color-border);
    border-left: none;
    z-index: 10;
  }

  .timeline-area {
    height: 55%;
  }

  .main-content {
    flex-direction: column;
  }
}

@media (max-width: 640px) {
  .workspace-sidebar {
    display: none;
  }

  .detail-area {
    left: 0;
  }

  .case-selector-grid {
    grid-template-columns: 1fr;
  }
}
</style>
