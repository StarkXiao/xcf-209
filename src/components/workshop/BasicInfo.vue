<script setup lang="ts">
import { computed } from 'vue'
import { useWorkshopStore } from '@/stores/workshop'

const workshopStore = useWorkshopStore()

const caseData = computed(() => workshopStore.currentCase)

const difficultyOptions = [
  { value: 'easy', label: '简单' },
  { value: 'normal', label: '普通' },
  { value: 'hard', label: '困难' }
]

function updateField(field: string, value: string | number | string[]) {
  workshopStore.updateBasicInfo({ [field]: value })
}

function updateRewardsField(field: string, value: string | number | string[]) {
  if (!caseData.value) return
  const rewards = { ...caseData.value.rewards, [field]: value }
  workshopStore.updateBasicInfo({ rewards })
}
</script>

<template>
  <div class="basic-info">
    <div class="config-header">
      <h2 class="section-title">📋 基本信息</h2>
      <p class="section-desc">设置案件的基本信息</p>
    </div>

    <div v-if="caseData" class="info-content">
      <div class="form-section card">
        <h3 class="section-subtitle">案件信息</h3>
        
        <div class="form-group">
          <label>案件标题</label>
          <input
            type="text"
            :value="caseData.title"
            @input="updateField('title', ($event.target as HTMLInputElement).value)"
            placeholder="输入案件标题"
          />
        </div>

        <div class="form-group">
          <label>案件描述</label>
          <textarea
            :value="caseData.description"
            @input="updateField('description', ($event.target as HTMLTextAreaElement).value)"
            placeholder="输入案件的详细描述"
            rows="5"
          ></textarea>
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>难度</label>
            <select
              :value="caseData.difficulty"
              @change="updateField('difficulty', ($event.target as HTMLSelectElement).value)"
            >
              <option v-for="opt in difficultyOptions" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>章节</label>
            <input
              type="number"
              :value="caseData.chapter"
              @input="updateField('chapter', Number(($event.target as HTMLInputElement).value))"
              min="1"
            />
          </div>
        </div>
      </div>

      <div class="form-section card">
        <h3 class="section-subtitle">理智设置</h3>
        
        <div class="form-row">
          <div class="form-group">
          <label>预计理智消耗</label>
          <input
            type="number"
            :value="caseData.sanityCost"
            @input="updateField('sanityCost', Number(($event.target as HTMLInputElement).value))"
            min="0"
          />
          <span class="field-hint">完成案件预计消耗的理智值</span>
        </div>
        <div class="form-group">
          <label>建议理智值</label>
          <input
            type="number"
            :value="caseData.recommendedSanity"
            @input="updateField('recommendedSanity', Number(($event.target as HTMLInputElement).value))"
            min="0"
            max="100"
          />
          <span class="field-hint">推荐玩家开始游戏时建议的理智值</span>
        </div>
        </div>
      </div>

      <div class="form-section card">
        <h3 class="section-subtitle">奖励设置</h3>
        
        <div class="form-group">
          <label>奖励描述</label>
          <input
            type="text"
            :value="caseData.rewards.description"
            @input="updateRewardsField('description', ($event.target as HTMLInputElement).value)"
            placeholder="描述完成案件的奖励描述"
          />
        </div>

        <div class="form-row">
          <div class="form-group">
            <label>理智奖励</label>
            <input
              type="number"
              :value="caseData.rewards.sanityBonus"
              @input="updateRewardsField('sanityBonus', Number(($event.target as HTMLInputElement).value))"
              min="0"
            />
            <span class="field-hint">完成案件恢复的理智值</span>
          </div>
          <div class="form-group">
            <label>解锁工具 (逗号分隔)</label>
            <input
              type="text"
              :value="caseData.rewards.tools.join(', ')"
              @input="updateRewardsField('tools', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
              placeholder="tool-id-1, tool-id-2"
            />
            <span class="field-hint">完成案件解锁的工具ID</span>
          </div>
        </div>

        <div class="form-group">
          <label>解锁案件 (逗号分隔)</label>
          <input
            type="text"
            :value="caseData.rewards.unlocksCases.join(', ')"
            @input="updateRewardsField('unlocksCases', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
            placeholder="case-id-1, case-id-2"
          />
          <span class="field-hint">完成此案件后解锁的案件ID</span>
        </div>
      </div>

      <div class="form-section card">
        <h3 class="section-subtitle">其他设置</h3>
        
        <div class="form-group">
          <label>起始工具 (逗号分隔)</label>
          <input
            type="text"
            :value="(caseData.startingTools || []).join(', ')"
            @input="updateField('startingTools', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
            placeholder="tool-id-1, tool-id-2"
          />
          <span class="field-hint">玩家开始案件时携带的工具</span>
        </div>

        <div class="form-group">
          <label>前置案件 (逗号分隔)</label>
          <input
            type="text"
            :value="caseData.prerequisites.join(', ')"
            @input="updateField('prerequisites', ($event.target as HTMLInputElement).value.split(',').map(s => s.trim()).filter(Boolean))"
            placeholder="case-id-1, case-id-2"
          />
          <span class="field-hint">需要先完成这些案件才能解锁</span>
        </div>
      </div>

      <div class="form-section card stats-overview">
        <h3 class="section-subtitle">内容概览</h3>
        <div class="stats-grid">
          <div class="stat-card">
            <span class="stat-icon">🏞️</span>
            <span class="stat-value">{{ workshopStore.sceneCount }}</span>
            <span class="stat-label">场景</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🔍</span>
            <span class="stat-value">{{ workshopStore.evidenceCount }}</span>
            <span class="stat-label">证据</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">🧩</span>
            <span class="stat-value">{{ workshopStore.clueCount }}</span>
            <span class="stat-label">线索</span>
          </div>
          <div class="stat-card">
            <span class="stat-icon">💡</span>
            <span class="stat-value">{{ workshopStore.endingCount }}</span>
            <span class="stat-label">结局</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.basic-info {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow-y: auto;
}

.config-header {
  margin-bottom: 1.5rem;
  flex-shrink: 0;
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

.info-content {
  flex: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  align-content: start;
}

.form-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-subtitle {
  color: var(--color-text);
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-group label {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
}

.form-group input[type="text"],
.form-group input[type="number"],
.form-group select,
.form-group textarea {
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 4px;
  color: var(--color-text);
  font-family: inherit;
  font-size: 0.9rem;
  transition: border-color 0.2s ease;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.field-hint {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.stats-overview {
  grid-column: span 2;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1rem;
}

.stat-card {
  padding: 1.5rem;
  background: rgba(107, 76, 154, 0.1);
  border: 1px solid var(--color-accent);
  border-radius: 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
}

.stat-icon {
  font-size: 2rem;
}

.stat-value {
  font-size: 2rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.stat-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

@media (max-width: 768px) {
  .info-content {
    grid-template-columns: 1fr;
  }
  
  .stats-overview {
    grid-column: span 1;
  }
  
  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}
</style>
