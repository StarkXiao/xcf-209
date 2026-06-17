<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import { useSaveStore } from '@/stores/save'
import { useGameStore } from '@/stores/game'
import { getCaseById } from '@/data/cases'
import { getToolById } from '@/data/tools'

const router = useRouter()
const saveStore = useSaveStore()
const gameStore = useGameStore()

const saves = computed(() => saveStore.saves)

const sortedSaves = computed(() => {
  return [...saves.value].sort((a, b) => b.updatedAt - a.updatedAt)
})

const globalToolNames = computed(() => {
  return saveStore.globalUnlockedTools
    .map(id => getToolById(id)?.name || id)
})

function loadSaveData(saveId: string) {
  if (gameStore.currentCase) {
    if (!confirm('当前有未保存的游戏进度，加载存档将丢失当前进度。确定要加载吗？')) {
      return
    }
  }
  
  if (saveStore.loadSave(saveId)) {
    router.push(`/investigation/${gameStore.currentCase?.id}`)
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

function getInheritedToolNames(save: typeof saves.value[0]): string[] {
  return save.gameState.tools
    .filter(t => t.tier >= 2 || save.gameState.deductionBranches.length > 0)
    .map(t => t.name)
}

function createNewSave() {
  if (!gameStore.currentCase) {
    alert('请先开始一个案件才能保存进度')
    return
  }
  
  const saveName = `存档 ${new Date().toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })}`
  
  if (saveStore.createSave(saveName)) {
    alert('存档创建成功！')
  }
}

function goToCases() {
  router.push('/cases')
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
        <button class="action-btn" @click="createNewSave">
          <span>💾</span> 创建存档
        </button>
        <button class="action-btn" @click="goToCases">
          <span>📋</span> 案件列表
        </button>
      </div>
    </div>

    <div class="saves-content">
      <div v-if="saves.length === 0" class="no-saves card">
        <div class="no-saves-icon">📂</div>
        <h3>暂无存档</h3>
        <p>在调查过程中点击"创建存档"按钮保存你的进度</p>
        <p class="hint">存档会保存你的证据收集、线索分析、理智值等所有进度</p>
      </div>

      <div v-else class="saves-grid">
        <div 
          v-for="save in sortedSaves" 
          :key="save.id"
          class="save-card card"
        >
          <div class="save-header">
            <h3 class="save-name">{{ save.name }}</h3>
            <div class="save-meta">
              <span class="save-case">{{ getCaseName(save.caseId) }}</span>
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

            <div class="stat-row">
              <span class="stat-label">证据</span>
              <span class="stat-value">{{ save.gameState.discoveredEvidence.length }}</span>
            </div>

            <div class="stat-row">
              <span class="stat-label">线索</span>
              <span class="stat-value">{{ save.gameState.discoveredClues.length }}</span>
            </div>

            <div class="stat-row">
              <span class="stat-label">关联</span>
              <span class="stat-value">{{ save.gameState.clueConnections.length }}</span>
            </div>

            <div class="stat-row">
              <span class="stat-label">工具</span>
              <span class="stat-value">{{ save.gameState.tools.length }}</span>
            </div>

            <div v-if="save.gameState.deductionBranches.length > 0" class="stat-row branch-row">
              <span class="stat-label">分支</span>
              <span class="stat-value branch-value">{{ save.gameState.deductionBranches.join('、') }}</span>
            </div>

            <div v-if="getInheritedToolNames(save).length > 0" class="stat-row inherit-row">
              <span class="stat-label">可继承</span>
              <span class="stat-value inherit-value">{{ getInheritedToolNames(save).join('、') }}</span>
            </div>

            <div class="stat-row">
              <span class="stat-label">时长</span>
              <span class="stat-value">{{ saveStore.getPlayDuration(save.gameState.startTime) }}</span>
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
          <strong>自动保存：</strong>案件结算时会自动创建存档
        </li>
        <li>
          <strong>手动保存：</strong>在调查过程中可以随时手动创建存档
        </li>
        <li>
          <strong>存档数量：</strong>最多保存 {{ saveStore.maxSaves }} 个存档，超出后会自动删除最早的存档
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
  margin-bottom: 2rem;
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
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
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
}

.save-name {
  font-size: 1.1rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.save-meta {
  display: flex;
  gap: 0.75rem;
}

.save-case {
  font-size: 0.85rem;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 12px;
  color: var(--color-text-dim);
}

.save-stats {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.stat-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  min-width: 60px;
}

.stat-value {
  font-size: 0.95rem;
  color: var(--color-text);
  font-weight: bold;
}

.branch-row {
  background: rgba(255, 215, 0, 0.08);
}

.branch-value {
  color: #ffd700;
}

.inherit-row {
  background: rgba(107, 76, 154, 0.1);
}

.inherit-value {
  color: var(--color-accent-light);
  font-size: 0.8rem;
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
  max-width: 600px;
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
}

.info-list li {
  padding: 0.5rem 0;
  color: var(--color-text-dim);
  line-height: 1.6;
}

.info-list li strong {
  color: var(--color-text);
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 1rem;
  }
  
  .header-actions {
    width: 100%;
  }
  
  .saves-grid {
    grid-template-columns: 1fr;
  }
}
</style>