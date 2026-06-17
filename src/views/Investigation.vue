<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getCaseById } from '@/data/cases'
import type { Scene, Evidence } from '@/types'

const router = useRouter()
const route = useRoute()
const gameStore = useGameStore()

const currentScene = ref<Scene | null>(null)
const selectedEvidence = ref<Evidence | null>(null)
const showEvidenceDetail = ref(false)

const caseData = computed(() => {
  const caseId = route.params.caseId as string
  return getCaseById(caseId)
})

const sceneBackgrounds: Record<string, string> = {
  lighthouse: 'linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
  cottage: 'linear-gradient(180deg, #2d132c 0%, #1a1a2e 50%, #0a0a0f 100%)',
  shore: 'linear-gradient(180deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)'
}

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

function clickEvidence(evidence: Evidence) {
  if (isEvidenceDiscovered(evidence.id)) {
    selectedEvidence.value = evidence
    showEvidenceDetail.value = true
    return
  }
  
  const result = gameStore.discoverEvidence(evidence.id, evidence.sanityEffect)
  
  if (result) {
    selectedEvidence.value = evidence
    showEvidenceDetail.value = true
    
    if (evidence.hiddenClues) {
      evidence.hiddenClues.forEach(clueId => {
        gameStore.discoverClue(clueId)
      })
    }
  }
}

function closeEvidenceDetail() {
  showEvidenceDetail.value = false
}

function goToClues() {
  router.push(`/clues/${caseData.value?.id}`)
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
        </div>

        <div class="scene-viewer">
          <div v-if="currentScene" class="scene-container">
            <div 
              class="scene-background"
              :style="{ background: sceneBackgrounds[currentScene.background] || sceneBackgrounds.lighthouse }"
            >
              <div class="scene-description">{{ currentScene.description }}</div>
              
              <div class="evidence-layer">
                <div
                  v-for="evidence in currentScene.evidence"
                  :key="evidence.id"
                  class="evidence-marker"
                  :class="{ 
                    discovered: isEvidenceDiscovered(evidence.id),
                    selected: selectedEvidence?.id === evidence.id
                  }"
                  :style="getEvidencePosition(evidence)"
                  @click="clickEvidence(evidence)"
                >
                  <div class="marker-content">
                    <span v-if="!isEvidenceDiscovered(evidence.id)" class="marker-icon">?</span>
                    <span v-else class="marker-icon found">✓</span>
                  </div>
                  <div class="marker-glow"></div>
                </div>
              </div>

              <div class="scene-hint">
                <span class="hint-icon">🔍</span>
                <span>点击问号标记搜查证据</span>
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
            <button class="action-btn" @click="goToDeduction">
              <span class="action-icon">💡</span>
              <span class="action-text">真相推演</span>
            </button>
            <button class="action-btn" @click="router.push('/cases')">
              <span class="action-icon">📋</span>
              <span class="action-text">返回案件</span>
            </button>
          </div>
        </div>
      </div>

      <transition name="fade">
        <div v-if="showEvidenceDetail && selectedEvidence" class="evidence-modal" @click.self="closeEvidenceDetail">
          <div class="evidence-detail card">
            <div class="evidence-header">
              <h3 class="evidence-name">{{ selectedEvidence.name }}</h3>
              <div class="evidence-type">{{ selectedEvidence.type }}</div>
            </div>
            
            <div class="evidence-content">
              <p class="evidence-description">{{ selectedEvidence.description }}</p>
              
              <div v-if="selectedEvidence.sanityEffect !== 0" class="sanity-effect">
                <span class="effect-label">理智影响:</span>
                <span class="effect-value" :class="{ negative: selectedEvidence.sanityEffect < 0 }">
                  {{ selectedEvidence.sanityEffect > 0 ? '+' : '' }}{{ selectedEvidence.sanityEffect }}
                </span>
              </div>
            </div>

            <div class="evidence-footer">
              <button class="close-btn" @click="closeEvidenceDetail">关闭</button>
            </div>
          </div>
        </div>
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

.investigation-content {
  flex: 1;
  display: grid;
  grid-template-columns: 250px 1fr 200px;
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

.scenes-list {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
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

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 0.3; }
  50% { transform: scale(1.2); opacity: 0.5; }
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
}

.evidence-content {
  margin-bottom: 1.5rem;
}

.evidence-description {
  color: var(--color-text);
  line-height: 1.8;
  margin-bottom: 1rem;
}

.sanity-effect {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: rgba(139, 58, 58, 0.1);
  border-radius: 6px;
  border: 1px solid var(--color-danger);
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