<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useCharacterStore } from '@/stores/character'
import { useGameStore } from '@/stores/game'
import { getTalentById, talents } from '@/data/talents'
import { statNames, statDescriptions, getDefaultStats } from '@/data/characters'
import type { CharacterProfile, CharacterStats } from '@/types'

const router = useRouter()
const characterStore = useCharacterStore()
const gameStore = useGameStore()

const showCreateForm = ref(false)
const showTalentPanel = ref(false)
const selectedCharacter = ref<CharacterProfile | null>(null)
const newCharacterForm = ref({
  name: '',
  title: '',
  avatar: '👤',
  stats: getDefaultStats(),
  availablePoints: 25,
  selectedTalents: [] as string[]
})

const avatarOptions = ['👤', '🕵️', '👩‍🏫', '🎖️', '📰', '🌙', '👨‍🔬', '👩‍⚕️', '🎭', '🎨', '📚', '⚔️']

const rarityColors = {
  common: '#8b8b8b',
  rare: '#4a90d9',
  legendary: '#ffd700'
}

const rarityLabels = {
  common: '普通',
  rare: '稀有',
  legendary: '传说'
}

const totalStatPoints = computed(() => {
  const stats = newCharacterForm.value.stats
  return stats.courage + stats.wisdom + stats.perception + stats.willpower + stats.luck
})

const remainingPoints = computed(() => {
  return 250 - totalStatPoints.value
})

const availableTalentsForNew = computed(() => {
  return talents.filter(talent => {
    if (!talent.unlocked && talent.prerequisites) return false
    if (talent.requiredStats) {
      for (const [stat, required] of Object.entries(talent.requiredStats)) {
        if (newCharacterForm.value.stats[stat as keyof CharacterStats] < (required || 0)) {
          return false
        }
      }
    }
    return true
  })
})

function selectCharacter(character: CharacterProfile) {
  selectedCharacter.value = character
}

function setActiveCharacter(characterId: string) {
  characterStore.setActiveProfile(characterId)
  selectedCharacter.value = characterStore.activeProfile
}

function adjustStat(stat: keyof CharacterStats, delta: number) {
  const newValue = newCharacterForm.value.stats[stat] + delta
  if (newValue >= 20 && newValue <= 100) {
    if (delta > 0 && remainingPoints.value <= 0) return
    newCharacterForm.value.stats[stat] = newValue
  }
}

function toggleTalent(talentId: string) {
  const index = newCharacterForm.value.selectedTalents.indexOf(talentId)
  if (index === -1) {
    if (newCharacterForm.value.selectedTalents.length < 3) {
      newCharacterForm.value.selectedTalents.push(talentId)
    }
  } else {
    newCharacterForm.value.selectedTalents.splice(index, 1)
  }
}

function createNewChar() {
  if (!newCharacterForm.value.name.trim()) {
    alert('请输入角色名称')
    return
  }
  if (!newCharacterForm.value.title.trim()) {
    alert('请输入角色头衔')
    return
  }
  
  const newChar = characterStore.createProfile(
    newCharacterForm.value.name.trim(),
    newCharacterForm.value.title.trim(),
    { ...newCharacterForm.value.stats },
    [...newCharacterForm.value.selectedTalents],
    newCharacterForm.value.avatar
  )
  
  characterStore.setActiveProfile(newChar.id)
  
  resetForm()
  showCreateForm.value = false
  selectedCharacter.value = newChar
}

function resetForm() {
  newCharacterForm.value = {
    name: '',
    title: '',
    avatar: '👤',
    stats: getDefaultStats(),
    availablePoints: 25,
    selectedTalents: []
  }
}

function deleteCharacter(characterId: string) {
  if (confirm('确定要删除这个角色档案吗？此操作不可撤销。')) {
    if (characterStore.deleteProfile(characterId)) {
      if (selectedCharacter.value?.id === characterId) {
        selectedCharacter.value = characterStore.activeProfile
      }
    }
  }
}

function getTalentName(talentId: string): string {
  return getTalentById(talentId)?.name || talentId
}

function getTalentIcon(talentId: string): string {
  return getTalentById(talentId)?.icon || '❓'
}

function goToCases() {
  if (gameStore.currentCase) {
    if (!confirm('当前有未完成的案件，确定要返回案件列表吗？')) {
      return
    }
  }
  router.push('/cases')
}

function goToHome() {
  router.push('/')
}

onMounted(() => {
  if (characterStore.activeProfile) {
    selectedCharacter.value = characterStore.activeProfile
  }
})
</script>

<template>
  <div class="character-page page-container">
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">调查员档案</h1>
        <p class="page-subtitle">管理你的调查员角色与天赋</p>
      </div>
      <div class="header-actions">
        <button v-if="!showCreateForm" class="action-btn primary" @click="showCreateForm = true">
          <span>➕</span> 创建新角色
        </button>
        <button v-else class="action-btn" @click="showCreateForm = false; resetForm()">
          <span>✕</span> 取消
        </button>
        <button class="action-btn" @click="goToHome">
          <span>🏠</span> 首页
        </button>
        <button class="action-btn" @click="goToCases">
          <span>📋</span> 案件列表
        </button>
      </div>
    </div>

    <div v-if="showCreateForm" class="create-form card">
      <h2 class="form-title">创建新调查员</h2>
      
      <div class="form-section">
        <label class="form-label">头像</label>
        <div class="avatar-selection">
          <button 
            v-for="avatar in avatarOptions" 
            :key="avatar"
            class="avatar-btn"
            :class="{ active: newCharacterForm.avatar === avatar }"
            @click="newCharacterForm.avatar = avatar"
          >
            {{ avatar }}
          </button>
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">姓名</label>
          <input 
            v-model="newCharacterForm.name" 
            type="text" 
            class="form-input"
            placeholder="输入调查员姓名"
            maxlength="20"
          />
        </div>
        <div class="form-group">
          <label class="form-label">头衔</label>
          <input 
            v-model="newCharacterForm.title" 
            type="text" 
            class="form-input"
            placeholder="如：私家侦探、教授等"
            maxlength="20"
          />
        </div>
      </div>

      <div class="form-section">
        <div class="stats-header">
          <label class="form-label">属性分配</label>
          <span class="points-remaining">剩余点数：{{ remainingPoints }}</span>
        </div>
        <div class="stats-grid">
          <div v-for="(statName, statKey) in statNames" :key="statKey" class="stat-item">
            <div class="stat-info">
              <span class="stat-name">{{ statName }}</span>
              <span class="stat-desc">{{ statDescriptions[statKey as keyof typeof statDescriptions] }}</span>
            </div>
            <div class="stat-controls">
              <button 
                class="stat-btn" 
                @click="adjustStat(statKey as keyof CharacterStats, -5)"
                :disabled="newCharacterForm.stats[statKey as keyof CharacterStats] <= 20"
              >-</button>
              <span class="stat-value">{{ newCharacterForm.stats[statKey as keyof CharacterStats] }}</span>
              <button 
                class="stat-btn" 
                @click="adjustStat(statKey as keyof CharacterStats, 5)"
                :disabled="newCharacterForm.stats[statKey as keyof CharacterStats] >= 100 || remainingPoints <= 0"
              >+</button>
            </div>
            <div class="stat-bar">
              <div 
                class="stat-bar-fill" 
                :style="{ width: `${newCharacterForm.stats[statKey as keyof CharacterStats]}%` }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-section">
        <div class="stats-header">
          <label class="form-label">选择天赋 (最多3个)</label>
          <span class="points-remaining">已选：{{ newCharacterForm.selectedTalents.length }}/3</span>
        </div>
        <div class="talents-grid">
          <div 
            v-for="talent in availableTalentsForNew" 
            :key="talent.id"
            class="talent-select-card"
            :class="{ 
              selected: newCharacterForm.selectedTalents.includes(talent.id),
              disabled: !newCharacterForm.selectedTalents.includes(talent.id) && newCharacterForm.selectedTalents.length >= 3
            }"
            @click="toggleTalent(talent.id)"
          >
            <div class="talent-icon">{{ talent.icon }}</div>
            <div class="talent-info">
              <div class="talent-name-row">
                <span class="talent-name">{{ talent.name }}</span>
                <span 
                  class="talent-rarity" 
                  :style="{ color: rarityColors[talent.rarity] }"
                >{{ rarityLabels[talent.rarity] }}</span>
              </div>
              <p class="talent-desc">{{ talent.description }}</p>
              <div class="talent-effects">
                <span v-for="effect in talent.effects" :key="effect.type" class="effect-tag">
                  {{ effect.description }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div class="form-actions">
        <button class="cancel-btn" @click="showCreateForm = false; resetForm()">取消</button>
        <button class="confirm-btn primary" @click="createNewChar">创建角色</button>
      </div>
    </div>

    <div v-else class="character-content">
      <div class="character-list-section">
        <h3 class="section-title">角色列表</h3>
        <div class="character-list">
          <div 
            v-for="char in characterStore.profiles" 
            :key="char.id"
            class="character-card card"
            :class="{ active: char.isActive, selected: selectedCharacter?.id === char.id }"
            @click="selectCharacter(char)"
          >
            <div class="char-avatar">{{ char.avatar }}</div>
            <div class="char-info">
              <div class="char-name-row">
                <span class="char-name">{{ char.name }}</span>
                <span v-if="char.isActive" class="active-badge">当前</span>
              </div>
              <span class="char-title">{{ char.title }}</span>
              <div class="char-stats-mini">
                <span v-for="(statName, statKey) in statNames" :key="statKey" class="stat-mini">
                  {{ statName }}: {{ char.stats[statKey as keyof CharacterStats] }}
                </span>
              </div>
            </div>
            <div class="char-actions">
              <button 
                v-if="!char.isActive"
                class="select-btn" 
                @click.stop="setActiveCharacter(char.id)"
              >选择</button>
              <button 
                v-if="characterStore.profiles.length > 1"
                class="delete-btn" 
                @click.stop="deleteCharacter(char.id)"
              >删除</button>
            </div>
          </div>
        </div>
      </div>

      <div v-if="selectedCharacter" class="character-detail card">
        <div class="detail-header">
          <div class="detail-avatar">{{ selectedCharacter.avatar }}</div>
          <div class="detail-info">
            <h2 class="detail-name">{{ selectedCharacter.name }}</h2>
            <p class="detail-title">{{ selectedCharacter.title }}</p>
            <p class="detail-background">{{ selectedCharacter.background }}</p>
          </div>
        </div>

        <div class="detail-stats-section">
          <h3 class="detail-section-title">属性</h3>
          <div class="detail-stats-grid">
            <div v-for="(statName, statKey) in statNames" :key="statKey" class="detail-stat-item">
              <div class="detail-stat-header">
                <span class="detail-stat-name">{{ statName }}</span>
                <span class="detail-stat-value">{{ selectedCharacter.stats[statKey as keyof CharacterStats] }}</span>
              </div>
              <div class="detail-stat-bar">
                <div 
                  class="detail-stat-fill" 
                  :style="{ width: `${selectedCharacter.stats[statKey as keyof CharacterStats]}%` }"
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-talents-section">
          <div class="detail-section-header">
            <h3 class="detail-section-title">天赋</h3>
            <button 
              class="edit-talent-btn" 
              @click="showTalentPanel = !showTalentPanel"
            >
              {{ showTalentPanel ? '收起' : '管理天赋' }}
            </button>
          </div>
          
          <div class="detail-talents-list">
            <div 
              v-for="talentId in selectedCharacter.talents" 
              :key="talentId"
              class="talent-display-card"
            >
              <div class="talent-display-icon">{{ getTalentIcon(talentId) }}</div>
              <div class="talent-display-info">
                <div class="talent-display-name">{{ getTalentName(talentId) }}</div>
                <div v-if="getTalentById(talentId)" class="talent-display-effects">
                  <span 
                    v-for="effect in getTalentById(talentId)!.effects" 
                    :key="effect.type" 
                    class="effect-tag"
                  >
                    {{ effect.description }}
                  </span>
                </div>
              </div>
            </div>
            <div v-if="selectedCharacter.talents.length === 0" class="no-talents">
              暂无天赋
            </div>
          </div>

          <div v-if="showTalentPanel" class="talent-management">
            <h4 class="talent-manage-title">可解锁天赋</h4>
            <div class="talents-grid">
              <div 
                v-for="talent in talents" 
                :key="talent.id"
                class="talent-select-card"
                :class="{ 
                  selected: selectedCharacter?.talents.includes(talent.id),
                  locked: !characterStore.canUnlockTalent(selectedCharacter!, talent.id) && !selectedCharacter!.talents.includes(talent.id)
                }"
                @click="() => {
                  if (!selectedCharacter) return
                  if (selectedCharacter.talents.includes(talent.id)) {
                    characterStore.removeTalentFromProfile(selectedCharacter.id, talent.id)
                  } else if (characterStore.canUnlockTalent(selectedCharacter, talent.id)) {
                    characterStore.addTalentToProfile(selectedCharacter.id, talent.id)
                  }
                }"
              >
                <div class="talent-icon">{{ talent.icon }}</div>
                <div class="talent-info">
                  <div class="talent-name-row">
                    <span class="talent-name">{{ talent.name }}</span>
                    <span 
                      class="talent-rarity" 
                      :style="{ color: rarityColors[talent.rarity] }"
                    >{{ rarityLabels[talent.rarity] }}</span>
                  </div>
                  <p class="talent-desc">{{ talent.description }}</p>
                  <div class="talent-effects">
                    <span v-for="effect in talent.effects" :key="effect.type" class="effect-tag">
                      {{ effect.description }}
                    </span>
                  </div>
                  <div v-if="talent.requiredStats" class="talent-req">
                    <span v-for="(val, key) in talent.requiredStats" :key="key" class="req-tag">
                      {{ statNames[key as keyof typeof statNames] }} ≥ {{ val }}
                    </span>
                  </div>
                  <div v-if="talent.prerequisites" class="talent-req">
                    <span v-for="pre in talent.prerequisites" :key="pre" class="req-tag">
                      前置：{{ getTalentName(pre) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-stats-section">
          <h3 class="detail-section-title">调查记录</h3>
          <div class="record-stats">
            <div class="record-item">
              <span class="record-label">游玩次数</span>
              <span class="record-value">{{ selectedCharacter.playCount }}</span>
            </div>
            <div class="record-item">
              <span class="record-label">完成案件</span>
              <span class="record-value">{{ selectedCharacter.completedCases.length }}</span>
            </div>
            <div class="record-item">
              <span class="record-label">累计失智</span>
              <span class="record-value danger">{{ selectedCharacter.totalSanityLost }}</span>
            </div>
            <div class="record-item">
              <span class="record-label">发现证据</span>
              <span class="record-value">{{ selectedCharacter.totalEvidenceDiscovered }}</span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="no-selection card">
        <div class="no-selection-icon">👤</div>
        <p>选择一个角色查看详情</p>
      </div>
    </div>

    <div class="character-tips card">
      <h3 class="tips-title">📋 角色系统说明</h3>
      <ul class="tips-list">
        <li><strong>理智消耗减免：</strong>降低接触恐怖内容时的理智损失</li>
        <li><strong>线索分析效率：</strong>提升分析线索时的效率，部分天赋可解锁特殊线索</li>
        <li><strong>证据发现率：</strong>提升发现隐藏证据的概率</li>
        <li><strong>事件触发：</strong>特定天赋可触发独特的场景事件，获得额外奖励</li>
        <li><strong>天赋解锁：</strong>完成案件后可以解锁新的天赋，提升角色能力</li>
        <li><strong>多角色：</strong>可以创建多个角色，每个角色有独立的进度和天赋</li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.character-page {
  padding-top: 2rem;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 2rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.header-actions {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.25rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 0.95rem;
}

.action-btn:hover {
  background: rgba(107, 76, 154, 0.4);
  border-color: var(--color-accent);
}

.action-btn.primary {
  background: var(--color-accent);
  border-color: var(--color-accent);
  color: white;
}

.action-btn.primary:hover {
  background: var(--color-accent-light);
}

.create-form {
  margin-bottom: 2rem;
  padding: 2rem;
}

.form-title {
  color: var(--color-accent-light);
  margin-bottom: 1.5rem;
  font-size: 1.5rem;
}

.form-section {
  margin-bottom: 1.5rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.form-label {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  font-weight: bold;
}

.form-input {
  padding: 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  font-size: 1rem;
}

.avatar-selection {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: 0.5rem;
}

.avatar-btn {
  width: 48px;
  height: 48px;
  font-size: 1.5rem;
  background: rgba(0, 0, 0, 0.3);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.avatar-btn:hover {
  border-color: var(--color-accent);
}

.avatar-btn.active {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.3);
  box-shadow: 0 0 10px rgba(107, 76, 154, 0.5);
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.points-remaining {
  font-size: 0.9rem;
  color: var(--color-accent-light);
  font-weight: bold;
}

.stats-grid {
  display: grid;
  gap: 1rem;
}

.stat-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 4px;
}

.stat-info {
  margin-bottom: 0.5rem;
}

.stat-name {
  font-weight: bold;
  color: var(--color-text);
  display: block;
  margin-bottom: 0.25rem;
}

.stat-desc {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.stat-controls {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 0.5rem;
}

.stat-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--color-accent);
  border: none;
  color: white;
  font-size: 1.2rem;
  cursor: pointer;
  transition: all 0.3s ease;
}

.stat-btn:hover:not(:disabled) {
  background: var(--color-accent-light);
}

.stat-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.stat-value {
  min-width: 40px;
  text-align: center;
  font-weight: bold;
  font-size: 1.1rem;
}

.stat-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.talents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.talent-select-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.talent-select-card:hover:not(.disabled) {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.15);
}

.talent-select-card.selected {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.3);
  box-shadow: 0 0 15px rgba(107, 76, 154, 0.3);
}

.talent-select-card.disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.talent-select-card.locked {
  opacity: 0.6;
  cursor: not-allowed;
}

.talent-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.talent-info {
  flex: 1;
  min-width: 0;
}

.talent-name-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.talent-name {
  font-weight: bold;
  color: var(--color-text);
}

.talent-rarity {
  font-size: 0.75rem;
  padding: 0.125rem 0.5rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 10px;
  font-weight: bold;
}

.talent-desc {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
  line-height: 1.5;
}

.talent-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.effect-tag {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  background: rgba(107, 76, 154, 0.2);
  border-radius: 4px;
  color: var(--color-accent-light);
}

.talent-req {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem;
}

.req-tag {
  font-size: 0.7rem;
  padding: 0.125rem 0.375rem;
  background: rgba(139, 107, 58, 0.2);
  border-radius: 4px;
  color: var(--color-warning);
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  margin-top: 2rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.cancel-btn,
.confirm-btn {
  padding: 0.75rem 2rem;
  font-size: 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
}

.cancel-btn {
  background: transparent;
  border: 1px solid var(--color-border);
  color: var(--color-text);
}

.cancel-btn:hover {
  background: rgba(0, 0, 0, 0.3);
}

.confirm-btn.primary {
  background: var(--color-accent);
  border: none;
  color: white;
}

.confirm-btn.primary:hover {
  background: var(--color-accent-light);
}

.character-content {
  display: grid;
  grid-template-columns: 350px 1fr;
  gap: 2rem;
  margin-bottom: 2rem;
}

.character-list-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.section-title {
  color: var(--color-accent-light);
  font-size: 1.2rem;
}

.character-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.character-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.character-card:hover:not(.active) {
  border-color: var(--color-accent);
}

.character-card.active {
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.2);
  box-shadow: 0 0 15px rgba(107, 76, 154, 0.2);
}

.character-card.selected {
  border-color: var(--color-accent-light);
}

.char-avatar {
  font-size: 2.5rem;
  flex-shrink: 0;
}

.char-info {
  flex: 1;
  min-width: 0;
}

.char-name-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.char-name {
  font-weight: bold;
  color: var(--color-text);
}

.active-badge {
  font-size: 0.7rem;
  padding: 0.125rem 0.5rem;
  background: var(--color-accent);
  color: white;
  border-radius: 10px;
}

.char-title {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  display: block;
  margin-bottom: 0.5rem;
}

.char-stats-mini {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.stat-mini {
  font-size: 0.7rem;
  color: var(--color-text-dim);
}

.char-actions {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.select-btn,
.delete-btn {
  padding: 0.5rem 1rem;
  font-size: 0.8rem;
  border-radius: 4px;
  cursor: pointer;
  transition: all 0.3s ease;
  border: none;
}

.select-btn {
  background: var(--color-accent);
  color: white;
}

.select-btn:hover {
  background: var(--color-accent-light);
}

.delete-btn {
  background: rgba(139, 58, 58, 0.3);
  color: var(--color-danger);
  border: 1px solid var(--color-danger);
}

.delete-btn:hover {
  background: rgba(139, 58, 58, 0.5);
}

.character-detail {
  padding: 2rem;
}

.detail-header {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  padding-bottom: 2rem;
  border-bottom: 1px solid var(--color-border);
}

.detail-avatar {
  font-size: 5rem;
  flex-shrink: 0;
}

.detail-info {
  flex: 1;
}

.detail-name {
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
  font-size: 1.8rem;
}

.detail-title {
  font-size: 1.1rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.detail-background {
  color: var(--color-text-dim);
  line-height: 1.6;
}

.detail-section-title {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
  font-size: 1.2rem;
}

.detail-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.edit-talent-btn {
  padding: 0.5rem 1rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-border);
  color: var(--color-text);
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  transition: all 0.3s ease;
}

.edit-talent-btn:hover {
  background: rgba(107, 76, 154, 0.4);
  border-color: var(--color-accent);
}

.detail-stats-section,
.detail-talents-section {
  margin-bottom: 2rem;
}

.detail-stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-stat-item {
  background: rgba(0, 0, 0, 0.2);
  padding: 1rem;
  border-radius: 4px;
}

.detail-stat-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.detail-stat-name {
  color: var(--color-text-dim);
}

.detail-stat-value {
  font-weight: bold;
  color: var(--color-accent-light);
}

.detail-stat-bar {
  height: 8px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  overflow: hidden;
}

.detail-stat-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
}

.detail-talents-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.talent-display-card {
  display: flex;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border: 1px solid var(--color-border);
}

.talent-display-icon {
  font-size: 2rem;
  flex-shrink: 0;
}

.talent-display-info {
  flex: 1;
}

.talent-display-name {
  font-weight: bold;
  color: var(--color-text);
  margin-bottom: 0.5rem;
}

.talent-display-effects {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.no-talents {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-dim);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.talent-management {
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 1px solid var(--color-border);
}

.talent-manage-title {
  color: var(--color-text);
  margin-bottom: 1rem;
  font-size: 1rem;
}

.record-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.record-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1.5rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
}

.record-label {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.record-value {
  font-size: 1.5rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.record-value.danger {
  color: var(--color-danger);
}

.no-selection {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  color: var(--color-text-dim);
  min-height: 400px;
}

.no-selection-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.character-tips {
  max-width: 800px;
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
  line-height: 1.6;
}

.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
}

.tips-list strong {
  color: var(--color-text);
}

@media (max-width: 1024px) {
  .character-content {
    grid-template-columns: 1fr;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
  }
  
  .detail-header {
    flex-direction: column;
    text-align: center;
  }
}
</style>
