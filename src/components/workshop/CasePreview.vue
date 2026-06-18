<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'
import type { Evidence, Clue, EvidenceType } from '@/types'

const workshopStore = useWorkshopStore()

const previewStage = ref<'intro' | 'investigation' | 'clues' | 'deduction' | 'result'>('intro')
const currentSceneIndex = ref(0)
const sanity = ref(100)
const discoveredEvidence = ref<string[]>([])
const discoveredClues = ref<string[]>([])
const analyzedClues = ref<string[]>([])
const clueConnections = ref<{ clue1Id: string; clue2Id: string }[]>([])
const selectedConclusion = ref<string | null>(null)
const showResult = ref(false)
const isCorrect = ref(false)
const selectedClue = ref<string | null>(null)
const connectingFrom = ref<string | null>(null)
const showEvidenceDetail = ref<Evidence | null>(null)
const resultMessage = ref('')
const endingBranch = ref<string | null>(null)

const caseData = computed(() => workshopStore.currentCase)

const currentScene = computed(() => {
  if (!caseData.value) return null
  return caseData.value.scenes[currentSceneIndex.value] || null
})

const hasEnoughEvidence = computed(() => {
  if (!caseData.value) return false
  const required = caseData.value.conclusion.evidence
  return required.every(e => discoveredEvidence.value.includes(e))
})

const evidenceProgress = computed(() => {
  if (!caseData.value) return 0
  const required = caseData.value.conclusion.evidence
  if (required.length === 0) return 100
  const found = required.filter(e => discoveredEvidence.value.includes(e)).length
  return Math.round((found / required.length) * 100)
})

const discoveredClueList = computed(() => {
  if (!caseData.value) return []
  return caseData.value.clues.filter(c => discoveredClues.value.includes(c.id))
})

const availableOptions = computed(() => {
  if (!caseData.value) return []
  return caseData.value.conclusion.options.filter(opt => {
    if (opt.requiredEvidence && opt.requiredEvidence.length > 0) {
      const hasAll = opt.requiredEvidence.every(e => discoveredEvidence.value.includes(e))
      if (!hasAll) return false
    }
    return true
  })
})

function startPreview() {
  previewStage.value = 'investigation'
  currentSceneIndex.value = 0
  sanity.value = caseData.value?.recommendedSanity || 100
  discoveredEvidence.value = []
  discoveredClues.value = []
  analyzedClues.value = []
  clueConnections.value = []
  selectedConclusion.value = null
  showResult.value = false
  isCorrect.value = false
  resultMessage.value = ''
  endingBranch.value = null
}

function resetPreview() {
  previewStage.value = 'intro'
}

function discoverEvidence(evidence: Evidence) {
  if (discoveredEvidence.value.includes(evidence.id)) {
    showEvidenceDetail.value = evidence
    return
  }
  
  discoveredEvidence.value.push(evidence.id)
  showEvidenceDetail.value = evidence
  
  if (evidence.sanityEffect && evidence.sanityEffect < 0) {
    sanity.value = Math.max(0, sanity.value + evidence.sanityEffect)
  }
  
  if (evidence.hiddenClues) {
    evidence.hiddenClues.forEach(clueId => {
      if (!discoveredClues.value.includes(clueId)) {
        discoveredClues.value.push(clueId)
      }
    })
  }
}

function closeEvidenceDetail() {
  showEvidenceDetail.value = null
}

const EVIDENCE_TYPE_INFO: Record<EvidenceType, { label: string; icon: string }> = {
  document: { label: '文档', icon: '📄' },
  object: { label: '物品', icon: '🔍' },
  trace: { label: '痕迹', icon: '👣' },
  testimony: { label: '证词', icon: '💬' },
  image: { label: '图片', icon: '🖼️' },
  text_fragment: { label: '文本残页', icon: '📜' },
  audio: { label: '音频', icon: '🎙️' }
}

function getEvidenceTypeLabel(type: EvidenceType): string {
  return EVIDENCE_TYPE_INFO[type]?.label || type
}

function getEvidenceTypeIcon(type: EvidenceType): string {
  return EVIDENCE_TYPE_INFO[type]?.icon || '📄'
}

const TEXT_FRAGMENT_STYLES: Record<string, string> = {
  aged_paper: '陈旧纸张',
  burnt_edge: '灼烧边缘',
  torn: '撕裂残片',
  handwritten: '手写字迹',
  typewritten: '打字机字体'
}

function getTextFragmentStyleLabel(style?: string): string {
  if (!style) return '陈旧纸张'
  return TEXT_FRAGMENT_STYLES[style] || style
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = Math.floor(seconds % 60)
  return `${mins}:${secs.toString().padStart(2, '0')}`
}

function goToScene(index: number) {
  currentSceneIndex.value = index
}

function nextScene() {
  if (!caseData.value) return
  if (currentSceneIndex.value < caseData.value.scenes.length - 1) {
    currentSceneIndex.value++
  }
}

function prevScene() {
  if (currentSceneIndex.value > 0) {
    currentSceneIndex.value--
  }
}

function goToClues() {
  previewStage.value = 'clues'
  selectedClue.value = null
  connectingFrom.value = null
}

function goToInvestigation() {
  previewStage.value = 'investigation'
}

function goToDeduction() {
  previewStage.value = 'deduction'
  selectedConclusion.value = null
  showResult.value = false
}

function selectClue(clueId: string) {
  if (connectingFrom.value) {
    if (connectingFrom.value !== clueId) {
      const exists = clueConnections.value.some(
        c => (c.clue1Id === connectingFrom.value && c.clue2Id === clueId) ||
             (c.clue1Id === clueId && c.clue2Id === connectingFrom.value)
      )
      if (!exists) {
        clueConnections.value.push({
          clue1Id: connectingFrom.value,
          clue2Id: clueId
        })
      }
    }
    connectingFrom.value = null
  }
  selectedClue.value = clueId
}

function startConnection(clueId: string) {
  connectingFrom.value = connectingFrom.value === clueId ? null : clueId
}

function analyzeClue(clueId: string) {
  if (!analyzedClues.value.includes(clueId)) {
    analyzedClues.value.push(clueId)
  }
}

function getSelectedClue(): Clue | null {
  if (!selectedClue.value || !caseData.value) return null
  return caseData.value.clues.find(c => c.id === selectedClue.value) || null
}

function selectConclusion(optionId: string) {
  selectedConclusion.value = optionId
}

function makeDeduction() {
  if (!selectedConclusion.value || !caseData.value) return
  
  const option = caseData.value.conclusion.options.find(o => o.id === selectedConclusion.value)
  if (!option) return
  
  isCorrect.value = option.isCorrect
  resultMessage.value = option.feedback
  endingBranch.value = option.branch || null
  
  if (option.sanityCost) {
    sanity.value = Math.max(0, sanity.value - option.sanityCost)
  }
  
  showResult.value = true
  previewStage.value = 'result'
}

function getImportanceColor(importance: number): string {
  if (importance >= 4) return '#8b3a3a'
  if (importance >= 3) return '#8b6b3a'
  return '#3a8b5a'
}

function getClueById(clueId: string): Clue | undefined {
  return caseData.value?.clues.find(c => c.id === clueId)
}

onMounted(() => {
})
</script>

<template>
  <div class="case-preview">
    <div class="preview-header">
      <div class="header-left">
        <h2 class="section-title">👁️ 本地预览</h2>
        <p class="section-desc">模拟玩家体验，预览案件效果</p>
      </div>
      <div class="header-actions">
        <button v-if="previewStage !== 'intro'" class="reset-btn" @click="resetPreview">
          🔄 重新开始
        </button>
        <button v-if="previewStage !== 'intro'" class="exit-btn" @click="previewStage = 'intro'">
          ✕ 退出预览
        </button>
      </div>
    </div>

    <div class="preview-content">
      <div v-if="previewStage === 'intro'" class="intro-screen card">
        <div class="intro-content">
          <div class="case-preview-info">
            <h2 class="case-title">{{ caseData?.title || '未命名案件' }}</h2>
            <p class="case-desc">{{ caseData?.description }}</p>
            
            <div class="case-meta-grid">
              <div class="meta-card">
                <span class="meta-label">难度</span>
                <span class="meta-value difficulty">
                  {{ caseData?.difficulty === 'easy' ? '简单' : caseData?.difficulty === 'normal' ? '普通' : '困难' }}
                </span>
              </div>
              <div class="meta-card">
                <span class="meta-label">场景数</span>
                <span class="meta-value">{{ caseData?.scenes.length || 0 }}</span>
              </div>
              <div class="meta-card">
                <span class="meta-label">证据数</span>
                <span class="meta-value">{{ workshopStore.evidenceCount }}</span>
              </div>
              <div class="meta-card">
                <span class="meta-label">结局数</span>
                <span class="meta-value">{{ workshopStore.endingCount }}</span>
              </div>
            </div>

            <div class="sanity-info">
              <span class="sanity-label">建议理智值：</span>
              <span class="sanity-value">{{ caseData?.recommendedSanity || 0 }}+</span>
            </div>
          </div>

          <button class="start-btn primary" @click="startPreview">
            🎮 开始预览
          </button>
        </div>
      </div>

      <div v-else-if="previewStage === 'investigation'" class="investigation-screen">
        <div class="status-bar">
          <div class="sanity-bar">
            <span class="label">🧠 理智</span>
            <div class="bar-container">
              <div class="bar-fill" :style="{ width: `${sanity}%` }"></div>
            </div>
            <span class="value">{{ sanity }}</span>
          </div>
          <div class="progress-info">
            <span>证据进度: {{ evidenceProgress }}%</span>
          </div>
        </div>

        <div class="scene-tabs">
          <button
            v-for="(scene, index) in caseData?.scenes"
            :key="scene.id"
            class="tab-btn"
            :class="{ active: currentSceneIndex === index }"
            @click="goToScene(index)"
          >
            {{ scene.name }}
          </button>
        </div>

        <div class="scene-view card">
          <div class="scene-header">
            <h3>{{ currentScene?.name }}</h3>
            <p class="scene-desc">{{ currentScene?.description }}</p>
          </div>

          <div class="evidence-area">
            <div
              v-for="evidence in currentScene?.evidence"
              :key="evidence.id"
              class="evidence-marker"
              :class="{
                discovered: discoveredEvidence.includes(evidence.id),
                special: evidence.isSpecial
              }"
              :style="{
                left: `${evidence.location.x}%`,
                top: `${evidence.location.y}%`,
                width: `${evidence.size.width}%`,
                height: `${evidence.size.height}%`
              }"
              @click="discoverEvidence(evidence)"
            >
              <span class="marker-icon">
                {{ discoveredEvidence.includes(evidence.id) ? '✓' : '?' }}
              </span>
              <span class="evidence-tooltip">{{ evidence.name }}</span>
            </div>
          </div>

          <div class="scene-nav">
            <button
              class="nav-btn"
              :disabled="currentSceneIndex === 0"
              @click="prevScene"
            >
              ← 上一场景
            </button>
            <button
              class="nav-btn primary"
              :disabled="!hasEnoughEvidence"
              @click="goToClues"
            >
              前往线索分析 →
            </button>
            <button
              class="nav-btn"
              :disabled="!caseData || currentSceneIndex >= caseData.scenes.length - 1"
              @click="nextScene"
            >
              下一场景 →
            </button>
          </div>
        </div>

        <div class="collected-evidence card">
          <h4>已收集证据 ({{ discoveredEvidence.length }})</h4>
          <div class="evidence-list-mini">
            <span
              v-for="evId in discoveredEvidence"
              :key="evId"
              class="evidence-tag"
            >
              {{ getClueById(evId)?.name || evId }}
            </span>
            <span v-if="discoveredEvidence.length === 0" class="empty-text">
              点击场景中的 ? 标记来发现证据
            </span>
          </div>
        </div>
      </div>

      <div v-else-if="previewStage === 'clues'" class="clues-screen">
        <div class="clues-layout">
          <div class="clues-sidebar card">
            <div class="sidebar-header">
              <h3>线索列表</h3>
              <span class="count">{{ discoveredClueList.length }}</span>
            </div>
            <div class="clue-list">
              <div
                v-for="clue in discoveredClueList"
                :key="clue.id"
                class="clue-item"
                :class="{
                  selected: selectedClue === clue.id,
                  analyzed: analyzedClues.includes(clue.id),
                  connecting: connectingFrom === clue.id
                }"
                @click="selectClue(clue.id)"
              >
                <span class="clue-name">{{ clue.name }}</span>
                <span
                  v-if="analyzedClues.includes(clue.id)"
                  class="analyzed-badge"
                >✓</span>
              </div>
            </div>
          </div>

          <div class="clues-main card">
            <div v-if="getSelectedClue()" class="clue-detail">
              <h3>{{ getSelectedClue()?.name }}</h3>
              <div class="clue-meta">
                <span class="importance" :style="{ backgroundColor: getImportanceColor(getSelectedClue()?.importance || 1) }">
                  重要度: {{ getSelectedClue()?.importance }}
                </span>
                <span class="type">{{ getSelectedClue()?.type }}</span>
              </div>
              <p class="clue-description">{{ getSelectedClue()?.description }}</p>
              <p class="clue-source">来源: {{ getSelectedClue()?.source }}</p>
              
              <div class="clue-actions">
                <button
                  v-if="!analyzedClues.includes(getSelectedClue()?.id || '')"
                  class="analyze-btn primary"
                  @click="analyzeClue(getSelectedClue()?.id || '')"
                >
                  🔬 分析线索
                </button>
                <button
                  class="connect-btn"
                  :class="{ active: connectingFrom === getSelectedClue()?.id }"
                  @click="startConnection(getSelectedClue()?.id || '')"
                >
                  {{ connectingFrom === getSelectedClue()?.id ? '取消连接' : '🔗 建立关联' }}
                </button>
              </div>

              <div v-if="getSelectedClue()?.connections && getSelectedClue()!.connections.length > 0" class="connections-section">
                <h4>相关线索</h4>
                <div class="conn-list">
                  <span
                    v-for="connId in getSelectedClue()?.connections"
                    :key="connId"
                    class="conn-tag"
                  >
                    🔗 {{ getClueById(connId)?.name || connId }}
                  </span>
                </div>
              </div>
            </div>
            <div v-else class="empty-state">
              <p>选择一个线索查看详情</p>
            </div>
          </div>
        </div>

        <div class="clues-nav">
          <button class="nav-btn" @click="goToInvestigation">
            ← 返回调查
          </button>
          <button
            class="nav-btn primary"
            :disabled="!hasEnoughEvidence"
            @click="goToDeduction"
          >
            前往真相推演 →
          </button>
        </div>

        <div v-if="connectingFrom" class="connecting-hint">
          <p>点击另一个线索完成连接</p>
          <button @click="connectingFrom = null">取消</button>
        </div>
      </div>

      <div v-else-if="previewStage === 'deduction'" class="deduction-screen">
        <div class="deduction-content card">
          <div class="deduction-header">
            <h3>真相推演</h3>
            <p>根据你收集的证据，做出你的最终判断</p>
          </div>

          <div class="evidence-check">
            <div class="progress-row">
              <span>关键证据收集</span>
              <span :class="{ complete: hasEnoughEvidence }">
                {{ evidenceProgress }}%
              </span>
            </div>
            <div class="progress-bar-small">
              <div class="progress-fill" :style="{ width: `${evidenceProgress}%` }"></div>
            </div>
          </div>

          <div class="sanity-check">
            <span>理智值: {{ sanity }}</span>
            <span>最低要求: {{ caseData?.conclusion.sanityThreshold }}+</span>
          </div>

          <div class="options-section">
            <h4>选择你的结论</h4>
            <div class="options-list">
              <div
                v-for="option in availableOptions"
                :key="option.id"
                class="option-item"
                :class="{ selected: selectedConclusion === option.id }"
                @click="selectConclusion(option.id)"
              >
                <span class="option-number">
                  {{ availableOptions.indexOf(option) + 1 }}
                </span>
                <div class="option-info">
                  <p class="option-text">{{ option.text }}</p>
                  <span class="option-cost">理智消耗: {{ option.sanityCost }}</span>
                  <span v-if="option.branch" class="option-branch">
                    🌿 {{ option.branch }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div class="deduction-actions">
            <button class="nav-btn" @click="goToClues">
              ← 返回线索
            </button>
            <button
              class="deduce-btn primary"
              :disabled="!selectedConclusion || sanity < (caseData?.conclusion.sanityThreshold || 0)"
              @click="makeDeduction"
            >
              🔍 提交推演
            </button>
          </div>
        </div>
      </div>

      <div v-else-if="previewStage === 'result'" class="result-screen">
        <div class="result-card card" :class="{ correct: isCorrect, wrong: !isCorrect }">
          <div class="result-icon">
            {{ isCorrect ? '✓' : '✗' }}
          </div>
          <h2 class="result-title">
            {{ isCorrect ? '推演正确！' : '推演失败...' }}
          </h2>
          <p v-if="endingBranch" class="branch-info">
            🌿 结局分支：{{ endingBranch }}
          </p>
          <p class="result-message">{{ resultMessage }}</p>
          
          <div class="result-stats">
            <div class="stat">
              <span class="stat-label">剩余理智</span>
              <span class="stat-value">{{ sanity }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">发现证据</span>
              <span class="stat-value">{{ discoveredEvidence.length }}</span>
            </div>
            <div class="stat">
              <span class="stat-label">获得线索</span>
              <span class="stat-value">{{ discoveredClues.length }}</span>
            </div>
          </div>

          <div class="result-actions">
            <button class="replay-btn" @click="startPreview">
              🔄 再玩一次
            </button>
            <button class="exit-btn primary" @click="previewStage = 'intro'">
              返回编辑
            </button>
          </div>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div v-if="showEvidenceDetail" class="evidence-modal" @click.self="closeEvidenceDetail">
        <div class="modal-content card">
          <div class="modal-header">
            <h3>{{ showEvidenceDetail.name }}</h3>
            <button class="close-btn" @click="closeEvidenceDetail">✕</button>
          </div>
          <div class="modal-body">
            <div class="evidence-type">
              <span class="type-badge">
                <span class="type-icon">{{ getEvidenceTypeIcon(showEvidenceDetail.type) }}</span>
                {{ getEvidenceTypeLabel(showEvidenceDetail.type) }}
              </span>
              <span v-if="showEvidenceDetail.isSpecial" class="special-badge">⭐ 特殊证据</span>
            </div>

            <div v-if="showEvidenceDetail.type === 'image' && (showEvidenceDetail.imageUrl || showEvidenceDetail.image)" class="evidence-media image-media">
              <div class="image-wrapper">
                <img 
                  :src="showEvidenceDetail.imageUrl || showEvidenceDetail.image" 
                  :alt="showEvidenceDetail.imageAlt || showEvidenceDetail.name"
                  class="evidence-image"
                />
              </div>
              <p v-if="showEvidenceDetail.imageAlt" class="media-caption">{{ showEvidenceDetail.imageAlt }}</p>
            </div>

            <div v-else-if="showEvidenceDetail.type === 'text_fragment'" class="evidence-media text-fragment-media">
              <div class="text-fragment-box" :class="showEvidenceDetail.textFragmentStyle || 'aged_paper'">
                <p class="fragment-text-content">
                  {{ showEvidenceDetail.textContent || showEvidenceDetail.description }}
                </p>
              </div>
              <p class="media-hint">文本残页 · {{ getTextFragmentStyleLabel(showEvidenceDetail.textFragmentStyle) }}</p>
            </div>

            <div v-else-if="showEvidenceDetail.type === 'audio'" class="evidence-media audio-media">
              <div class="audio-box">
                <div class="audio-top">
                  <span class="audio-icon">🎙️</span>
                  <div class="audio-meta">
                    <span class="audio-name">{{ showEvidenceDetail.name }}</span>
                    <span v-if="showEvidenceDetail.audioSpeaker" class="audio-person">讲述人：{{ showEvidenceDetail.audioSpeaker }}</span>
                  </div>
                  <span v-if="showEvidenceDetail.audioDuration" class="audio-length">
                    {{ formatDuration(showEvidenceDetail.audioDuration) }}
                  </span>
                </div>
                <div v-if="showEvidenceDetail.audioUrl" class="audio-controls">
                  <audio controls :src="showEvidenceDetail.audioUrl" class="audio-player">
                    您的浏览器不支持音频播放
                  </audio>
                </div>
                <div v-else class="audio-empty">
                  <span>🔊 暂无音频文件</span>
                </div>
              </div>
              <div v-if="showEvidenceDetail.audioTranscript" class="audio-transcript-box">
                <span class="transcript-title">📝 文字记录</span>
                <p class="transcript-text">{{ showEvidenceDetail.audioTranscript }}</p>
              </div>
            </div>

            <p v-else class="evidence-description">{{ showEvidenceDetail.description }}</p>

            <div v-if="(showEvidenceDetail.type === 'image' || showEvidenceDetail.type === 'audio') && showEvidenceDetail.description" class="evidence-note">
              <span class="note-tag">说明</span>
              <p class="note-content">{{ showEvidenceDetail.description }}</p>
            </div>

            <div class="evidence-effects">
              <div class="effect-item">
                <span class="effect-label">理智影响</span>
                <span class="effect-value" :class="{ negative: showEvidenceDetail.sanityEffect < 0 }">
                  {{ showEvidenceDetail.sanityEffect > 0 ? '+' : '' }}{{ showEvidenceDetail.sanityEffect }}
                </span>
              </div>
              <div class="effect-item">
                <span class="effect-label">基础发现率</span>
                <span class="effect-value">{{ showEvidenceDetail.baseHitRate }}%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.case-preview {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1.5rem;
}

.header-left {
  flex: 1;
}

.section-title {
  font-size: 1.5rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.section-desc {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.reset-btn,
.exit-btn {
  padding: 0.4rem 0.75rem;
  font-size: 0.8rem;
}

.exit-btn {
  background: var(--color-danger);
  border-color: var(--color-danger);
  color: white;
}

.exit-btn:hover {
  background: #a04040;
  border-color: #a04040;
}

.preview-content {
  flex: 1;
  min-height: 0;
}

.intro-screen {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.intro-content {
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.case-preview-info {
  margin-bottom: 2rem;
}

.case-title {
  font-size: 2rem;
  color: var(--color-accent-light);
  margin-bottom: 1rem;
}

.case-desc {
  color: var(--color-text);
  line-height: 1.8;
  margin-bottom: 2rem;
  font-size: 1rem;
}

.case-meta-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.meta-card {
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  text-align: center;
}

.meta-label {
  display: block;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.meta-value {
  font-size: 1.3rem;
  color: var(--color-text);
  font-weight: bold;
}

.meta-value.difficulty {
  color: var(--color-warning);
}

.sanity-info {
  font-size: 0.9rem;
  color: var(--color-text-dim);
}

.sanity-value {
  color: var(--color-accent-light);
  font-weight: bold;
}

.start-btn {
  padding: 1rem 3rem;
  font-size: 1.1rem;
}

.investigation-screen,
.clues-screen,
.deduction-screen {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  height: 100%;
}

.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 1rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 8px;
}

.sanity-bar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.sanity-bar .label {
  font-size: 0.85rem;
  color: var(--color-text);
}

.bar-container {
  width: 150px;
  height: 12px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid var(--color-border);
}

.bar-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-danger), var(--color-accent));
  transition: width 0.3s ease;
}

.sanity-bar .value {
  font-size: 0.85rem;
  color: var(--color-text);
  font-weight: bold;
  min-width: 30px;
}

.progress-info {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.scene-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  color: var(--color-text-dim);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.tab-btn:hover {
  border-color: var(--color-accent);
  color: var(--color-text);
}

.tab-btn.active {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.scene-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
  min-height: 300px;
}

.scene-header {
  margin-bottom: 1rem;
}

.scene-header h3 {
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.scene-desc {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.evidence-area {
  flex: 1;
  position: relative;
  background: rgba(0, 0, 0, 0.3);
  border: 2px dashed var(--color-border);
  border-radius: 8px;
  min-height: 250px;
  margin-bottom: 1rem;
}

.evidence-marker {
  position: absolute;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.evidence-marker:hover .marker-icon {
  transform: scale(1.2);
}

.marker-icon {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-card);
  border: 2px solid var(--color-accent);
  border-radius: 50%;
  color: var(--color-accent-light);
  font-weight: bold;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.evidence-marker.discovered .marker-icon {
  background: var(--color-success);
  border-color: var(--color-success);
  color: white;
}

.evidence-marker.special .marker-icon {
  border-color: #ffd700;
  color: #ffd700;
  animation: pulse-glow 2s infinite;
}

@keyframes pulse-glow {
  0%, 100% { box-shadow: 0 0 5px rgba(255, 215, 0, 0.5); }
  50% { box-shadow: 0 0 20px rgba(255, 215, 0, 0.8); }
}

.evidence-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.25rem 0.5rem;
  background: var(--color-bg-card);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  font-size: 0.75rem;
  color: var(--color-text);
  white-space: nowrap;
  opacity: 0;
  visibility: hidden;
  transition: all 0.2s ease;
  pointer-events: none;
  margin-bottom: 5px;
}

.evidence-marker:hover .evidence-tooltip {
  opacity: 1;
  visibility: visible;
}

.scene-nav {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.nav-btn {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
}

.collected-evidence {
  padding: 1rem;
}

.collected-evidence h4 {
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.evidence-list-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.evidence-tag {
  padding: 0.25rem 0.6rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--color-text);
}

.empty-text {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.clues-layout {
  display: grid;
  grid-template-columns: 250px 1fr;
  gap: 1rem;
  flex: 1;
  min-height: 0;
}

.clues-sidebar {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.sidebar-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.sidebar-header h3 {
  color: var(--color-text);
  font-size: 1rem;
}

.sidebar-header .count {
  background: var(--color-accent);
  color: white;
  padding: 0.15rem 0.5rem;
  border-radius: 10px;
  font-size: 0.75rem;
}

.clue-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.clue-item {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 6px;
  cursor: pointer;
  display: flex;
  justify-content: space-between;
  align-items: center;
  transition: all 0.2s ease;
}

.clue-item:hover {
  border-color: var(--color-accent);
}

.clue-item.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
}

.clue-item.connecting {
  border-color: var(--color-warning);
  box-shadow: 0 0 10px rgba(139, 107, 58, 0.3);
}

.clue-item.analyzed {
  opacity: 0.8;
}

.clue-name {
  color: var(--color-text);
  font-size: 0.9rem;
}

.analyzed-badge {
  color: var(--color-success);
  font-size: 0.9rem;
}

.clues-main {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.clue-detail {
  flex: 1;
  overflow-y: auto;
}

.clue-detail h3 {
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
  font-size: 1.3rem;
}

.clue-meta {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.importance {
  padding: 0.2rem 0.6rem;
  border-radius: 10px;
  font-size: 0.8rem;
  color: white;
}

.clue-meta .type {
  padding: 0.2rem 0.6rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.clue-description {
  color: var(--color-text);
  line-height: 1.7;
  margin-bottom: 1rem;
}

.clue-source {
  color: var(--color-accent-light);
  font-style: italic;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.clue-actions {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.analyze-btn,
.connect-btn {
  flex: 1;
  padding: 0.6rem;
  font-size: 0.9rem;
}

.connect-btn.active {
  background: var(--color-warning);
  border-color: var(--color-warning);
  color: white;
}

.connections-section {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.connections-section h4 {
  color: var(--color-text);
  font-size: 0.9rem;
  margin-bottom: 0.75rem;
}

.conn-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.conn-tag {
  padding: 0.3rem 0.7rem;
  background: rgba(58, 139, 90, 0.2);
  border: 1px solid var(--color-success);
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--color-text);
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-dim);
}

.clues-nav {
  display: flex;
  justify-content: space-between;
}

.connecting-hint {
  position: fixed;
  bottom: 2rem;
  left: 50%;
  transform: translateX(-50%);
  padding: 0.75rem 1.5rem;
  background: var(--color-warning);
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 1rem;
  z-index: 100;
}

.connecting-hint p {
  color: white;
  margin: 0;
  font-size: 0.9rem;
}

.connecting-hint button {
  padding: 0.25rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
  font-size: 0.8rem;
}

.deduction-content {
  max-width: 600px;
  margin: 0 auto;
  width: 100%;
  display: flex;
  flex-direction: column;
}

.deduction-header {
  text-align: center;
  margin-bottom: 1.5rem;
}

.deduction-header h3 {
  color: var(--color-accent-light);
  font-size: 1.5rem;
  margin-bottom: 0.5rem;
}

.deduction-header p {
  color: var(--color-text-dim);
  font-size: 0.9rem;
}

.evidence-check {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
}

.progress-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.progress-row .complete {
  color: var(--color-success);
  font-weight: bold;
}

.progress-bar-small {
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

.sanity-check {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  margin-bottom: 1.5rem;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

.options-section {
  margin-bottom: 1.5rem;
}

.options-section h4 {
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.options-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.option-item {
  display: flex;
  gap: 0.75rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.option-item:hover {
  border-color: var(--color-accent);
}

.option-item.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
  box-shadow: 0 0 10px rgba(107, 76, 154, 0.3);
}

.option-number {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-accent);
  border-radius: 50%;
  color: white;
  font-size: 0.85rem;
  font-weight: bold;
  flex-shrink: 0;
}

.option-info {
  flex: 1;
}

.option-text {
  color: var(--color-text);
  margin-bottom: 0.5rem;
  line-height: 1.4;
}

.option-cost {
  font-size: 0.8rem;
  color: var(--color-warning);
  margin-right: 0.75rem;
}

.option-branch {
  font-size: 0.8rem;
  color: #ffd700;
}

.deduction-actions {
  display: flex;
  justify-content: space-between;
}

.deduce-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
}

.deduce-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.result-screen {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
}

.result-card {
  max-width: 500px;
  width: 100%;
  text-align: center;
  padding: 2rem;
}

.result-card.correct {
  border-color: var(--color-success);
  background: rgba(58, 139, 90, 0.1);
}

.result-card.wrong {
  border-color: var(--color-danger);
  background: rgba(139, 58, 58, 0.1);
}

.result-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
}

.result-card.correct .result-icon {
  color: var(--color-success);
}

.result-card.wrong .result-icon {
  color: var(--color-danger);
}

.result-title {
  font-size: 1.8rem;
  margin-bottom: 0.75rem;
}

.result-card.correct .result-title {
  color: var(--color-success);
}

.result-card.wrong .result-title {
  color: var(--color-danger);
}

.branch-info {
  color: #ffd700;
  font-size: 1rem;
  margin-bottom: 1rem;
}

.result-message {
  color: var(--color-text);
  line-height: 1.7;
  margin-bottom: 1.5rem;
}

.result-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.stat {
  text-align: center;
}

.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.stat-value {
  font-size: 1.3rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.result-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.replay-btn,
.result-screen .exit-btn {
  padding: 0.6rem 1.5rem;
  font-size: 0.9rem;
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

.modal-content {
  max-width: 400px;
  width: 90%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-header h3 {
  color: var(--color-accent-light);
}

.close-btn {
  width: 32px;
  height: 32px;
  padding: 0;
  background: transparent;
  border: none;
  color: var(--color-text-dim);
  cursor: pointer;
  font-size: 1rem;
  border-radius: 6px;
}

.close-btn:hover {
  background: rgba(139, 58, 58, 0.3);
  color: var(--color-danger);
}

.evidence-type {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.type-badge {
  padding: 0.2rem 0.6rem;
  background: rgba(107, 76, 154, 0.3);
  border-radius: 10px;
  font-size: 0.8rem;
  color: var(--color-accent-light);
  text-transform: capitalize;
}

.special-badge {
  padding: 0.2rem 0.6rem;
  background: rgba(255, 215, 0, 0.2);
  border-radius: 10px;
  font-size: 0.8rem;
  color: #ffd700;
}

.evidence-description {
  color: var(--color-text);
  line-height: 1.6;
  margin-bottom: 1rem;
}

.evidence-effects {
  display: flex;
  gap: 1rem;
}

.effect-item {
  flex: 1;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  text-align: center;
}

.effect-label {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-dim);
  margin-bottom: 0.25rem;
}

.effect-value {
  font-size: 1.1rem;
  color: var(--color-text);
  font-weight: bold;
}

.effect-value.negative {
  color: var(--color-danger);
}

.modal-content {
  max-width: 500px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.type-icon {
  margin-right: 0.25rem;
}

.evidence-media {
  margin-bottom: 1rem;
}

.image-media .image-wrapper {
  border-radius: 6px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  justify-content: center;
  align-items: center;
  max-height: 280px;
  margin-bottom: 0.5rem;
}

.image-media .evidence-image {
  max-width: 100%;
  max-height: 280px;
  object-fit: contain;
}

.media-caption {
  font-size: 0.8rem;
  color: var(--color-text-dim);
  text-align: center;
  font-style: italic;
  margin: 0;
}

.text-fragment-media .text-fragment-box {
  border-radius: 6px;
  padding: 1rem 1.25rem;
  margin-bottom: 0.5rem;
}

.text-fragment-box.aged_paper {
  background: linear-gradient(135deg, #d4c4a8 0%, #c4b393 50%, #b8a67e 100%);
  color: #3d3020;
  box-shadow: inset 0 0 20px rgba(139, 90, 43, 0.3);
}

.text-fragment-box.burnt_edge {
  background: linear-gradient(135deg, #c9b896 0%, #b09870 100%);
  color: #2d2416;
  box-shadow: inset 0 0 15px rgba(139, 69, 19, 0.4);
  clip-path: polygon(
    3% 5%, 10% 2%, 20% 4%, 30% 1%, 40% 3%, 50% 0%, 60% 2%, 70% 1%, 80% 4%, 90% 2%, 97% 5%,
    99% 15%, 97% 30%, 100% 45%, 98% 60%, 97% 75%, 99% 85%, 95% 95%, 85% 98%, 70% 96%,
    55% 99%, 40% 97%, 25% 98%, 10% 96%, 3% 92%, 1% 80%, 3% 65%, 0% 50%, 2% 35%, 1% 20%, 2% 10%
  );
}

.text-fragment-box.torn {
  background: #e8dcc8;
  color: #3d3020;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
  clip-path: polygon(
    0% 3%, 5% 0%, 12% 2%, 20% 0%, 30% 3%, 40% 1%, 50% 2%, 60% 0%, 70% 2%, 80% 1%, 90% 3%, 98% 0%, 100% 5%,
    98% 15%, 100% 25%, 97% 35%, 100% 45%, 98% 55%, 100% 65%, 98% 75%, 100% 85%, 97% 95%, 100% 100%,
    90% 98%, 80% 100%, 70% 97%, 60% 99%, 50% 98%, 40% 100%, 30% 97%, 20% 99%, 10% 98%, 0% 100%,
    2% 90%, 0% 80%, 3% 70%, 0% 60%, 2% 50%, 0% 40%, 3% 30%, 0% 20%, 2% 10%
  );
}

.text-fragment-box.handwritten {
  background: #f5eedc;
  color: #2d1810;
  font-family: 'Georgia', serif;
  box-shadow: inset 0 0 10px rgba(139, 90, 43, 0.15);
}

.text-fragment-box.typewritten {
  background: #faf8f0;
  color: #1a1a1a;
  font-family: 'Courier New', monospace;
  box-shadow: inset 0 0 8px rgba(0, 0, 0, 0.05);
}

.fragment-text-content {
  line-height: 1.8;
  margin: 0;
  font-size: 0.9rem;
  white-space: pre-wrap;
}

.media-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  text-align: center;
  margin: 0;
}

.audio-media .audio-box {
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  padding: 0.85rem;
  margin-bottom: 0.5rem;
}

.audio-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
}

.audio-icon {
  font-size: 1.5rem;
}

.audio-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.audio-name {
  font-weight: 600;
  color: var(--color-text);
  font-size: 0.9rem;
}

.audio-person {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.audio-length {
  font-size: 0.75rem;
  color: var(--color-accent-light);
  font-family: monospace;
}

.audio-controls {
  width: 100%;
}

.audio-player {
  width: 100%;
  height: 36px;
}

.audio-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.audio-transcript-box {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 0.6rem 0.75rem;
  border-left: 2px solid var(--color-accent);
}

.transcript-title {
  display: block;
  font-size: 0.75rem;
  color: var(--color-accent-light);
  font-weight: 500;
  margin-bottom: 0.35rem;
}

.transcript-text {
  font-size: 0.8rem;
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
  white-space: pre-wrap;
}

.evidence-note {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 6px;
  padding: 0.6rem 0.85rem;
  margin-bottom: 1rem;
  border-left: 2px solid var(--color-text-dim);
}

.note-tag {
  display: block;
  font-size: 0.7rem;
  color: var(--color-text-dim);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 0.25rem;
}

.note-content {
  color: var(--color-text);
  line-height: 1.6;
  margin: 0;
  font-size: 0.85rem;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .case-meta-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .clues-layout {
    grid-template-columns: 1fr;
    grid-template-rows: auto 1fr;
  }
  
  .result-stats {
    grid-template-columns: 1fr;
  }
}
</style>
