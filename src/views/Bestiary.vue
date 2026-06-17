<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useBestiaryStore } from '@/stores/bestiary'
import type { BestiaryCategory, BestiaryEntry } from '@/types'
import { getBestiaryEntryById } from '@/data/bestiary'
import BestiaryDetailCard from '@/components/bestiary/BestiaryDetailCard.vue'

const bestiaryStore = useBestiaryStore()

const activeCategory = ref<BestiaryCategory | 'all'>('all')
const selectedEntry = ref<BestiaryEntry | null>(null)
const showNewDiscoveryToast = ref(false)
const newDiscoveryEntries = ref<BestiaryEntry[]>([])

const categories = [
  { id: 'all' as const, name: '全部', icon: '📚', count: computed(() => bestiaryStore.totalEntries), progress: computed(() => bestiaryStore.overallProgress) },
  { id: 'creature' as const, name: '遭遇生物', icon: '🐾', count: computed(() => bestiaryStore.totalCreatures), progress: computed(() => bestiaryStore.creatureProgress) },
  { id: 'forbidden_item' as const, name: '禁忌物品', icon: '⚠️', count: computed(() => bestiaryStore.totalItems), progress: computed(() => bestiaryStore.itemProgress) },
  { id: 'organization' as const, name: '关键组织', icon: '🏛️', count: computed(() => bestiaryStore.totalOrganizations), progress: computed(() => bestiaryStore.organizationProgress) }
]

const currentEntries = computed(() => {
  const entries = bestiaryStore.getEntriesByCategory(activeCategory.value)
  return [...entries].sort((a, b) => {
    if (a.discovered && !b.discovered) return -1
    if (!a.discovered && b.discovered) return 1
    const rarityOrder = { legendary: 0, epic: 1, rare: 2, uncommon: 3, common: 4 }
    return (rarityOrder[a.rarity as keyof typeof rarityOrder] || 5) - (rarityOrder[b.rarity as keyof typeof rarityOrder] || 5)
  })
})

const discoveredCount = computed(() => {
  switch (activeCategory.value) {
    case 'creature': return bestiaryStore.discoveredCreatureList.length
    case 'forbidden_item': return bestiaryStore.discoveredItemList.length
    case 'organization': return bestiaryStore.discoveredOrganizationList.length
    default: return bestiaryStore.progress.totalDiscovered
  }
})

function openEntryDetail(entry: BestiaryEntry) {
  selectedEntry.value = entry
  if (bestiaryStore.newDiscoveredIds.includes(entry.id)) {
    bestiaryStore.clearNewNotification(entry.id)
  }
}

function closeDetail() {
  selectedEntry.value = null
}

function navigateToEntry(entryId: string) {
  const entry = getBestiaryEntryById(entryId)
  if (entry) {
    selectedEntry.value = entry
    if (bestiaryStore.newDiscoveredIds.includes(entry.id)) {
      bestiaryStore.clearNewNotification(entry.id)
    }
  }
}

function getEntryCardStyle(entry: BestiaryEntry) {
  if (!entry.discovered) return {}
  const color = bestiaryStore.getRarityColor(entry.rarity)
  return {
    borderColor: color,
    boxShadow: `0 4px 15px ${color}22`
  }
}

watch(() => bestiaryStore.newDiscoveredIds.length, (newLen, oldLen) => {
  if (newLen > oldLen) {
    const newIds = bestiaryStore.newDiscoveredIds.slice(oldLen)
    const entries = newIds.map(id => getBestiaryEntryById(id)).filter((e): e is BestiaryEntry => e !== undefined)
    if (entries.length > 0) {
      newDiscoveryEntries.value = entries
      showNewDiscoveryToast.value = true
      setTimeout(() => {
        showNewDiscoveryToast.value = false
      }, 4000)
    }
  }
})
</script>

<template>
  <div class="bestiary-page page-container">
    <div class="page-header">
      <h1 class="page-title">📖 调查员图鉴</h1>
      <p class="page-subtitle">记录你在调查中遭遇的所有超自然存在</p>
      <div class="overall-progress-card card">
        <div class="progress-header">
          <span class="progress-label">图鉴总进度</span>
          <span class="progress-value">{{ bestiaryStore.progress.totalDiscovered }} / {{ bestiaryStore.totalEntries }} 条目</span>
        </div>
        <div class="progress-bar-large">
          <div 
            class="progress-fill" 
            :style="{ 
              width: `${bestiaryStore.overallProgress}%`,
              background: 'linear-gradient(90deg, var(--color-accent), var(--color-accent-light))'
            }"
          ></div>
        </div>
        <span class="progress-percent">{{ bestiaryStore.overallProgress }}%</span>
      </div>
    </div>

    <div class="category-tabs">
      <div
        v-for="cat in categories"
        :key="cat.id"
        class="category-tab card"
        :class="{ active: activeCategory === cat.id }"
        @click="activeCategory = cat.id"
      >
        <div class="tab-icon">{{ cat.icon }}</div>
        <div class="tab-info">
          <span class="tab-name">{{ cat.name }}</span>
          <span class="tab-count">{{ discoveredCount }} / {{ cat.count }}</span>
        </div>
        <div class="tab-progress">
          <div class="mini-progress-bar">
            <div 
              class="mini-progress-fill" 
              :style="{ width: `${cat.progress.value}%` }"
            ></div>
          </div>
        </div>
      </div>
    </div>

    <div class="content-header">
      <div class="filter-info">
        <h2 class="section-title">
          {{ categories.find(c => c.id === activeCategory)?.name }}
          <span class="filter-count">({{ discoveredCount }} 已解锁)</span>
        </h2>
      </div>
      <button 
        v-if="bestiaryStore.hasNewDiscoveries" 
        class="clear-new-btn"
        @click="bestiaryStore.clearAllNewNotifications()"
      >
        清除新标记 ({{ bestiaryStore.newDiscoveredIds.length }})
      </button>
    </div>

    <div class="entries-grid">
      <div
        v-for="entry in currentEntries"
        :key="entry.id"
        class="entry-card card"
        :class="{ 
          discovered: entry.discovered, 
          undiscovered: !entry.discovered,
          'new-entry': bestiaryStore.newDiscoveredIds.includes(entry.id)
        }"
        :style="getEntryCardStyle(entry)"
        @click="openEntryDetail(entry)"
      >
        <div v-if="bestiaryStore.newDiscoveredIds.includes(entry.id)" class="new-badge">NEW</div>
        
        <div class="entry-icon-wrapper">
          <span class="entry-icon">{{ entry.discovered ? entry.icon : '❓' }}</span>
          <span 
            v-if="entry.discovered" 
            class="rarity-dot"
            :style="{ backgroundColor: bestiaryStore.getRarityColor(entry.rarity) }"
          ></span>
        </div>

        <div class="entry-body">
          <h3 class="entry-name">
            {{ entry.discovered ? entry.name : '???' }}
          </h3>
          <p class="entry-desc">
            {{ entry.discovered ? entry.description.slice(0, 50) + (entry.description.length > 50 ? '...' : '') : '此条目尚未解锁，继续调查以揭示真相' }}
          </p>
          
          <div class="entry-meta">
            <span 
              v-if="entry.discovered"
              class="rarity-tag"
              :style="{ 
                backgroundColor: bestiaryStore.getRarityColor(entry.rarity) + '22',
                color: bestiaryStore.getRarityColor(entry.rarity)
              }"
            >
              {{ bestiaryStore.getRarityLabel(entry.rarity) }}
            </span>
            <span 
              class="level-stars"
              :title="entry.category === 'creature' ? '威胁等级' : entry.category === 'forbidden_item' ? '危险等级' : '影响力'"
            >
              <template v-if="entry.discovered">
                {{ '★'.repeat(
                  entry.category === 'creature' ? (entry as any).threatLevel :
                  entry.category === 'forbidden_item' ? (entry as any).dangerLevel :
                  (entry as any).influenceLevel
                ) }}
                {{ '☆'.repeat(5 - (
                  entry.category === 'creature' ? (entry as any).threatLevel :
                  entry.category === 'forbidden_item' ? (entry as any).dangerLevel :
                  (entry as any).influenceLevel
                )) }}
              </template>
              <template v-else>
                ☆☆☆☆☆
              </template>
            </span>
          </div>

          <div v-if="!entry.discovered" class="unlock-hint">
            <span class="hint-text">🔒 解锁条件: {{ entry.unlockConditions.length }} 项</span>
          </div>

          <div v-if="entry.discovered" class="discovery-meta">
            <span class="discovery-case">
              📁 {{ bestiaryStore.getDiscoveryCaseName(entry.id) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="currentEntries.length === 0" class="empty-state card">
      <div class="empty-icon">📭</div>
      <h3>暂无条目</h3>
      <p>此分类下暂无数据</p>
    </div>

    <div class="tips-section card">
      <h3 class="tips-title">💡 图鉴说明</h3>
      <ul class="tips-list">
        <li><strong>遭遇生物</strong>：调查中遇到的超自然生物，记录其特征、能力与弱点</li>
        <li><strong>禁忌物品</strong>：发现的危险物品，包含效应描述与安全收容协议</li>
        <li><strong>关键组织</strong>：涉及的神秘组织，记录其历史、目标与成员</li>
        <li>通过收集证据、分析线索、完成案件来解锁更多图鉴条目</li>
        <li>某些稀有条目需要发现特殊证据或解锁深层分支</li>
        <li>理智值过低时可能会感知到...本不该感知到的存在</li>
      </ul>
    </div>

    <Teleport to="body">
      <BestiaryDetailCard
        v-if="selectedEntry"
        :entry="selectedEntry"
        @close="closeDetail"
        @navigate="navigateToEntry"
      />
    </Teleport>

    <Teleport to="body">
      <Transition name="toast">
        <div v-if="showNewDiscoveryToast" class="discovery-toast">
          <div class="toast-header">
            <span class="toast-icon">🎉</span>
            <span class="toast-title">图鉴更新！</span>
          </div>
          <div class="toast-entries">
            <div 
              v-for="entry in newDiscoveryEntries" 
              :key="entry.id" 
              class="toast-entry"
              :style="{ borderLeftColor: bestiaryStore.getRarityColor(entry.rarity) }"
            >
              <span class="toast-entry-icon">{{ entry.icon }}</span>
              <div class="toast-entry-info">
                <span class="toast-entry-name">{{ entry.name }}</span>
                <span 
                  class="toast-entry-rarity"
                  :style="{ color: bestiaryStore.getRarityColor(entry.rarity) }"
                >
                  {{ bestiaryStore.getRarityLabel(entry.rarity) }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.bestiary-page {
  padding-top: 2rem;
}

.page-header {
  text-align: center;
  margin-bottom: 2.5rem;
}

.page-title {
  font-size: 2.5rem;
  color: var(--color-accent-light);
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: var(--color-text-dim);
  font-size: 1.1rem;
  margin-bottom: 2rem;
}

.overall-progress-card {
  max-width: 500px;
  margin: 0 auto;
  background: rgba(107, 76, 154, 0.1);
  border-color: var(--color-accent);
}

.progress-header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 0.75rem;
}

.progress-label {
  color: var(--color-accent-light);
  font-weight: bold;
}

.progress-value {
  color: var(--color-text);
  font-size: 0.9rem;
}

.progress-bar-large {
  width: 100%;
  height: 14px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 7px;
  overflow: hidden;
  border: 1px solid var(--color-border);
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  transition: width 0.5s ease;
  border-radius: 7px;
}

.progress-percent {
  display: block;
  text-align: right;
  color: var(--color-accent-light);
  font-size: 0.9rem;
  font-weight: bold;
}

.category-tabs {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.category-tab {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  cursor: pointer;
  transition: all 0.3s ease;
  background: rgba(21, 21, 31, 0.8);
}

.category-tab:hover {
  transform: translateY(-3px);
  border-color: var(--color-accent);
}

.category-tab.active {
  background: rgba(107, 76, 154, 0.2);
  border-color: var(--color-accent-light);
  box-shadow: 0 0 20px rgba(107, 76, 154, 0.2);
}

.tab-icon {
  font-size: 2rem;
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  flex-shrink: 0;
}

.tab-info {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-width: 0;
}

.tab-name {
  font-size: 1rem;
  color: var(--color-text);
  font-weight: bold;
}

.tab-count {
  font-size: 0.8rem;
  color: var(--color-text-dim);
}

.tab-progress {
  width: 60px;
  flex-shrink: 0;
}

.mini-progress-bar {
  height: 6px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 3px;
  overflow: hidden;
}

.mini-progress-fill {
  height: 100%;
  background: var(--color-accent);
  transition: width 0.3s ease;
  border-radius: 3px;
}

.content-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.section-title {
  font-size: 1.4rem;
  color: var(--color-accent-light);
}

.filter-count {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  font-weight: normal;
}

.clear-new-btn {
  padding: 0.5rem 1rem;
  font-size: 0.85rem;
  background: rgba(139, 107, 58, 0.2);
  border-color: var(--color-warning);
  color: var(--color-warning);
}

.entries-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.entry-card {
  position: relative;
  display: flex;
  gap: 1rem;
  padding: 1.25rem;
  cursor: pointer;
  transition: all 0.3s ease;
  overflow: hidden;
}

.entry-card.discovered:hover {
  transform: translateY(-5px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.4);
}

.entry-card.undiscovered {
  opacity: 0.7;
  background: rgba(10, 10, 15, 0.6);
}

.entry-card.undiscovered:hover {
  opacity: 0.9;
  border-color: var(--color-border);
}

.entry-card.new-entry::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, var(--color-warning), var(--color-accent));
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

.new-badge {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  background: linear-gradient(135deg, #ff6b6b, #ee5a6f);
  color: white;
  font-size: 0.65rem;
  font-weight: bold;
  padding: 0.2rem 0.5rem;
  border-radius: 8px;
  letter-spacing: 0.05em;
  z-index: 2;
}

.entry-icon-wrapper {
  position: relative;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 12px;
  flex-shrink: 0;
}

.entry-icon {
  font-size: 2rem;
}

.rarity-dot {
  position: absolute;
  bottom: 2px;
  right: 2px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  border: 2px solid var(--color-bg-card);
}

.entry-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 0;
}

.entry-name {
  font-size: 1.1rem;
  color: var(--color-text);
  margin: 0;
}

.entry-card.undiscovered .entry-name {
  color: var(--color-text-dim);
}

.entry-desc {
  font-size: 0.85rem;
  color: var(--color-text-dim);
  line-height: 1.5;
  margin: 0;
  flex: 1;
}

.entry-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.rarity-tag {
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.7rem;
  font-weight: bold;
}

.level-stars {
  font-size: 0.8rem;
  color: var(--color-warning);
}

.entry-card.undiscovered .level-stars {
  color: var(--color-text-dim);
  opacity: 0.5;
}

.unlock-hint {
  margin-top: 0.25rem;
}

.hint-text {
  font-size: 0.75rem;
  color: var(--color-text-dim);
  font-style: italic;
}

.discovery-meta {
  margin-top: 0.25rem;
}

.discovery-case {
  font-size: 0.75rem;
  color: var(--color-accent);
}

.empty-state {
  text-align: center;
  padding: 4rem 2rem;
  margin-bottom: 3rem;
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.empty-state p {
  color: var(--color-text-dim);
  opacity: 0.8;
}

.tips-section {
  max-width: 700px;
  margin: 0 auto;
  background: rgba(107, 76, 154, 0.08);
}

.tips-title {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
  font-size: 1.1rem;
}

.tips-list {
  list-style: none;
  padding: 0;
}

.tips-list li {
  padding: 0.4rem 0;
  padding-left: 1.5rem;
  position: relative;
  color: var(--color-text-dim);
  font-size: 0.9rem;
  line-height: 1.6;
}

.tips-list li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: var(--color-accent);
  font-weight: bold;
}

.tips-list strong {
  color: var(--color-text);
}

.discovery-toast {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: var(--color-bg-card);
  border: 2px solid var(--color-accent);
  border-radius: 12px;
  padding: 1rem 1.25rem;
  z-index: 2000;
  min-width: 280px;
  max-width: 360px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.5);
}

.toast-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--color-border);
}

.toast-icon {
  font-size: 1.5rem;
}

.toast-title {
  font-size: 1rem;
  font-weight: bold;
  color: var(--color-accent-light);
}

.toast-entries {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.toast-entry {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border-left: 3px solid;
}

.toast-entry-icon {
  font-size: 1.5rem;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
  flex-shrink: 0;
}

.toast-entry-info {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
}

.toast-entry-name {
  font-size: 0.9rem;
  color: var(--color-text);
  font-weight: bold;
}

.toast-entry-rarity {
  font-size: 0.75rem;
  font-weight: bold;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.4s ease;
}

.toast-enter-from {
  transform: translateX(100%);
  opacity: 0;
}

.toast-leave-to {
  transform: translateX(100%);
  opacity: 0;
}

@media (max-width: 768px) {
  .page-title {
    font-size: 2rem;
  }

  .category-tabs {
    grid-template-columns: repeat(2, 1fr);
  }

  .entries-grid {
    grid-template-columns: 1fr;
  }

  .discovery-toast {
    left: 1rem;
    right: 1rem;
    bottom: 1rem;
    min-width: auto;
    max-width: none;
  }
}
</style>
