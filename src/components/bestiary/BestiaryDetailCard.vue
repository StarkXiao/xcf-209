<script setup lang="ts">
import { computed } from 'vue'
import type { BestiaryEntry, Creature, ForbiddenItem, Organization } from '@/types'
import { useBestiaryStore } from '@/stores/bestiary'

const props = defineProps<{
  entry: BestiaryEntry
}>()

const emit = defineEmits<{
  close: []
  navigate: [entryId: string]
}>()

const bestiaryStore = useBestiaryStore()

const isCreature = (e: BestiaryEntry): e is Creature => e.category === 'creature'
const isForbiddenItem = (e: BestiaryEntry): e is ForbiddenItem => e.category === 'forbidden_item'
const isOrganization = (e: BestiaryEntry): e is Organization => e.category === 'organization'

const categoryLabels = {
  creature: '遭遇生物',
  forbidden_item: '禁忌物品',
  organization: '关键组织'
}

const categoryIcons = {
  creature: '🐾',
  forbidden_item: '⚠️',
  organization: '🏛️'
}

const rarityBgStyle = computed(() => {
  const color = bestiaryStore.getRarityColor(props.entry.rarity)
  return {
    borderColor: color,
    boxShadow: `0 0 20px ${color}33`
  }
})

const levelLabel = computed(() => {
  if (isCreature(props.entry)) return '威胁等级'
  if (isForbiddenItem(props.entry)) return '危险等级'
  return '影响力'
})

const levelValue = computed(() => {
  if (isCreature(props.entry)) return props.entry.threatLevel
  if (isForbiddenItem(props.entry)) return props.entry.dangerLevel
  return props.entry.influenceLevel
})

const sanityEffectLabel = computed(() => {
  if (props.entry.category === 'organization') return null
  return (props.entry as Creature | ForbiddenItem).sanityEffect
})

const relatedEntries = computed(() => {
  if (!props.entry.discovered) return []
  return bestiaryStore.getRelatedEntries(props.entry)
})

const discoveryDate = computed(() => {
  const date = bestiaryStore.getDiscoveryDate(props.entry.id)
  if (!date) return null
  return new Date(date).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
})

const discoveryCase = computed(() => {
  return bestiaryStore.getDiscoveryCaseName(props.entry.id)
})

function navigateToRelated(entryId: string) {
  emit('navigate', entryId)
}

function getRelatedBadgeColor(category: string) {
  switch (category) {
    case 'creature': return 'rgba(74, 138, 201, 0.2)'
    case 'forbidden_item': return 'rgba(139, 74, 201, 0.2)'
    case 'organization': return 'rgba(212, 160, 23, 0.2)'
    default: return 'rgba(136, 136, 136, 0.2)'
  }
}
</script>

<template>
  <div class="detail-overlay" @click.self="emit('close')">
    <div class="detail-card card" :style="rarityBgStyle">
      <button class="close-btn" @click="emit('close')">✕</button>

      <div v-if="!entry.discovered" class="undiscovered-content">
        <div class="undiscovered-icon">❓</div>
        <h2 class="undiscovered-title">未知条目</h2>
        <p class="undiscovered-desc">此条目尚未解锁</p>
        <div class="unlock-hints card">
          <h4>解锁条件：</h4>
          <ul>
            <li v-for="(cond, idx) in entry.unlockConditions" :key="idx">
              <span :class="{ met: bestiaryStore.isConditionMet(cond) }">
                {{ bestiaryStore.isConditionMet(cond) ? '✓' : '○' }} {{ cond.description }}
              </span>
            </li>
          </ul>
        </div>
      </div>

      <div v-else class="discovered-content">
        <div class="detail-header">
          <div class="entry-icon">{{ entry.icon }}</div>
          <div class="entry-meta">
            <div class="category-tag">
              {{ categoryIcons[entry.category] }} {{ categoryLabels[entry.category] }}
            </div>
            <h2 class="entry-name">{{ entry.name }}</h2>
            <div class="meta-tags">
              <span 
                class="rarity-tag" 
                :style="{ backgroundColor: bestiaryStore.getRarityColor(entry.rarity) + '33', color: bestiaryStore.getRarityColor(entry.rarity) }"
              >
                {{ bestiaryStore.getRarityLabel(entry.rarity) }}
              </span>
              <span class="level-tag">
                {{ levelLabel }}: {{ '★'.repeat(levelValue) }}{{ '☆'.repeat(5 - levelValue) }}
              </span>
              <span v-if="sanityEffectLabel !== null" class="sanity-tag danger">
                理智影响: {{ sanityEffectLabel }}
              </span>
            </div>
          </div>
        </div>

        <div class="detail-body">
          <section class="detail-section">
            <h3 class="section-title">概述</h3>
            <p class="section-content">{{ entry.description }}</p>
          </section>

          <template v-if="isCreature(entry)">
            <section class="detail-section">
              <h3 class="section-title">外观特征</h3>
              <p class="section-content">{{ entry.appearance }}</p>
            </section>

            <section class="detail-section">
              <h3 class="section-title">行为习性</h3>
              <p class="section-content">{{ entry.behavior }}</p>
            </section>

            <div class="grid-2">
              <section class="detail-section">
                <h3 class="section-title">已知能力</h3>
                <ul class="ability-list">
                  <li v-for="(ability, idx) in entry.abilities" :key="idx">{{ ability }}</li>
                </ul>
              </section>

              <section class="detail-section">
                <h3 class="section-title">弱点</h3>
                <ul class="weakness-list">
                  <li v-for="(weakness, idx) in entry.weaknesses" :key="idx">{{ weakness }}</li>
                </ul>
              </section>
            </div>

            <section class="detail-section">
              <h3 class="section-title">目击记录</h3>
              <ul class="sighting-list">
                <li v-for="(sighting, idx) in entry.sightings" :key="idx">{{ sighting }}</li>
              </ul>
            </section>
          </template>

          <template v-if="isForbiddenItem(entry)">
            <section class="detail-section">
              <h3 class="section-title">物理特征</h3>
              <p class="section-content">{{ entry.physicalTraits }}</p>
            </section>

            <section class="detail-section danger-section">
              <h3 class="section-title">⚠️ 已知效应</h3>
              <ul class="effect-list">
                <li v-for="(effect, idx) in entry.effects" :key="idx">{{ effect }}</li>
              </ul>
            </section>

            <section class="detail-section safe-section">
              <h3 class="section-title">🛡️ 收容协议</h3>
              <ul class="protocol-list">
                <li v-for="(protocol, idx) in entry.containmentProtocols" :key="idx">{{ protocol }}</li>
              </ul>
            </section>

            <section class="detail-section">
              <h3 class="section-title">已知来源</h3>
              <ul class="origin-list">
                <li v-for="(origin, idx) in entry.knownOrigins" :key="idx">{{ origin }}</li>
              </ul>
            </section>
          </template>

          <template v-if="isOrganization(entry)">
            <section class="detail-section">
              <h3 class="section-title">历史</h3>
              <p class="section-content">{{ entry.history }}</p>
            </section>

            <section class="detail-section">
              <h3 class="section-title">目标</h3>
              <ul class="goal-list">
                <li v-for="(goal, idx) in entry.goals" :key="idx">{{ goal }}</li>
              </ul>
            </section>

            <div class="grid-2">
              <section class="detail-section">
                <h3 class="section-title">已知成员</h3>
                <ul class="member-list">
                  <li v-for="(member, idx) in entry.knownMembers" :key="idx">{{ member }}</li>
                </ul>
              </section>

              <section class="detail-section">
                <h3 class="section-title">总部位置</h3>
                <p class="section-content">{{ entry.headquarters }}</p>
              </section>
            </div>

            <section class="detail-section">
              <h3 class="section-title">拥有资源</h3>
              <ul class="resource-list">
                <li v-for="(resource, idx) in entry.resources" :key="idx">{{ resource }}</li>
              </ul>
            </section>

            <div v-if="entry.alliedOrganizations.length > 0 || entry.opposingOrganizations.length > 0" class="grid-2">
              <section v-if="entry.alliedOrganizations.length > 0" class="detail-section ally-section">
                <h3 class="section-title">🤝 同盟组织</h3>
                <div class="relation-tags">
                  <span 
                    v-for="orgId in entry.alliedOrganizations" 
                    :key="orgId"
                    class="relation-tag ally"
                  >
                    {{ orgId }}
                  </span>
                </div>
              </section>

              <section v-if="entry.opposingOrganizations.length > 0" class="detail-section enemy-section">
                <h3 class="section-title">⚔️ 敌对组织</h3>
                <div class="relation-tags">
                  <span 
                    v-for="orgId in entry.opposingOrganizations" 
                    :key="orgId"
                    class="relation-tag enemy"
                  >
                    {{ orgId }}
                  </span>
                </div>
              </section>
            </div>
          </template>

          <section v-if="entry.loreNotes.length > 0" class="detail-section lore-section">
            <h3 class="section-title">📜 调查员笔记</h3>
            <ul class="lore-list">
              <li v-for="(note, idx) in entry.loreNotes" :key="idx">
                <span class="lore-number">#{{ idx + 1 }}</span>
                {{ note }}
              </li>
            </ul>
          </section>

          <div v-if="relatedEntries.length > 0" class="detail-section related-section">
            <h3 class="section-title">🔗 关联条目</h3>
            <div class="related-grid">
              <div
                v-for="related in relatedEntries"
                :key="related.id"
                class="related-card card"
                :class="{ undiscovered: !related.discovered }"
                :style="related.discovered ? { borderColor: bestiaryStore.getRarityColor(related.rarity) } : {}"
                @click="related.discovered && navigateToRelated(related.id)"
              >
                <span class="related-icon">{{ related.discovered ? related.icon : '❓' }}</span>
                <div class="related-info">
                  <span class="related-name">{{ related.discovered ? related.name : '???' }}</span>
                  <span 
                    class="related-cat"
                    :style="{ backgroundColor: getRelatedBadgeColor(related.category) }"
                  >
                    {{ categoryLabels[related.category] }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="detail-footer">
          <div class="discovery-info">
            <span>📅 发现时间: {{ discoveryDate || '未知' }}</span>
            <span>📁 发现案件: {{ discoveryCase }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.detail-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 2rem;
  backdrop-filter: blur(4px);
}

.detail-card {
  max-width: 800px;
  width: 100%;
  max-height: 85vh;
  overflow-y: auto;
  position: relative;
  padding: 2rem;
  animation: slideIn 0.3s ease;
}

@keyframes slideIn {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.close-btn {
  position: absolute;
  top: 1rem;
  right: 1rem;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.1rem;
  z-index: 10;
}

.undiscovered-content {
  text-align: center;
  padding: 3rem 1rem;
}

.undiscovered-icon {
  font-size: 5rem;
  margin-bottom: 1.5rem;
  opacity: 0.5;
}

.undiscovered-title {
  font-size: 2rem;
  color: var(--color-text-dim);
  margin-bottom: 0.5rem;
}

.undiscovered-desc {
  color: var(--color-text-dim);
  margin-bottom: 2rem;
}

.unlock-hints {
  max-width: 400px;
  margin: 0 auto;
  text-align: left;
  background: rgba(107, 76, 154, 0.1);
}

.unlock-hints h4 {
  color: var(--color-accent-light);
  margin-bottom: 1rem;
}

.unlock-hints ul {
  list-style: none;
  padding: 0;
}

.unlock-hints li {
  padding: 0.5rem 0;
  color: var(--color-text-dim);
}

.unlock-hints li.met {
  color: var(--color-success);
}

.discovered-content {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.detail-header {
  display: flex;
  gap: 1.5rem;
  align-items: center;
  padding-bottom: 1.5rem;
  border-bottom: 2px solid var(--color-border);
}

.entry-icon {
  font-size: 4rem;
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(107, 76, 154, 0.15);
  border-radius: 16px;
  border: 2px solid var(--color-accent);
}

.entry-meta {
  flex: 1;
}

.category-tag {
  display: inline-block;
  font-size: 0.8rem;
  color: var(--color-accent-light);
  background: rgba(107, 76, 154, 0.2);
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  margin-bottom: 0.5rem;
}

.entry-name {
  font-size: 1.8rem;
  color: var(--color-text);
  margin-bottom: 0.75rem;
}

.meta-tags {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.rarity-tag,
.level-tag,
.sanity-tag {
  padding: 0.3rem 0.75rem;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: bold;
}

.level-tag {
  background: rgba(139, 107, 58, 0.2);
  color: var(--color-warning);
}

.sanity-tag.danger {
  background: rgba(139, 58, 58, 0.2);
  color: var(--color-danger);
}

.detail-body {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-section {
  padding: 1rem 1.25rem;
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  border-left: 3px solid var(--color-accent);
}

.danger-section {
  border-left-color: var(--color-danger);
  background: rgba(139, 58, 58, 0.1);
}

.safe-section {
  border-left-color: var(--color-success);
  background: rgba(58, 139, 90, 0.1);
}

.lore-section {
  border-left-color: var(--color-warning);
  background: rgba(139, 107, 58, 0.1);
}

.ally-section {
  border-left-color: var(--color-success);
}

.enemy-section {
  border-left-color: var(--color-danger);
}

.section-title {
  font-size: 1.05rem;
  color: var(--color-accent-light);
  margin-bottom: 0.75rem;
  font-weight: bold;
}

.section-content {
  color: var(--color-text);
  line-height: 1.7;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.ability-list,
.weakness-list,
.effect-list,
.protocol-list,
.goal-list,
.member-list,
.resource-list,
.sighting-list,
.origin-list {
  list-style: none;
  padding: 0;
}

.ability-list li,
.effect-list li,
.goal-list li,
.resource-list li {
  padding: 0.35rem 0;
  padding-left: 1.25rem;
  position: relative;
  color: var(--color-text);
}

.ability-list li::before {
  content: '⚡';
  position: absolute;
  left: 0;
}

.effect-list li::before {
  content: '⚠';
  position: absolute;
  left: 0;
  color: var(--color-danger);
}

.protocol-list li::before {
  content: '🛡';
  position: absolute;
  left: 0;
  color: var(--color-success);
}

.weakness-list li,
.origin-list li,
.sighting-list li {
  padding: 0.35rem 0;
  padding-left: 1.25rem;
  position: relative;
  color: var(--color-text-dim);
}

.weakness-list li::before {
  content: '💀';
  position: absolute;
  left: 0;
  font-size: 0.8rem;
}

.goal-list li::before {
  content: '🎯';
  position: absolute;
  left: 0;
  font-size: 0.8rem;
}

.member-list li {
  padding: 0.35rem 0;
  padding-left: 1rem;
  position: relative;
  color: var(--color-text-dim);
}

.member-list li::before {
  content: '👤';
  position: absolute;
  left: 0;
  font-size: 0.8rem;
}

.resource-list li::before {
  content: '💎';
  position: absolute;
  left: 0;
  font-size: 0.8rem;
}

.sighting-list li::before {
  content: '👁';
  position: absolute;
  left: 0;
}

.origin-list li::before {
  content: '📍';
  position: absolute;
  left: 0;
}

.relation-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.relation-tag {
  padding: 0.25rem 0.6rem;
  border-radius: 6px;
  font-size: 0.75rem;
}

.relation-tag.ally {
  background: rgba(58, 139, 90, 0.2);
  color: var(--color-success);
}

.relation-tag.enemy {
  background: rgba(139, 58, 58, 0.2);
  color: var(--color-danger);
}

.lore-list {
  list-style: none;
  padding: 0;
}

.lore-list li {
  padding: 0.6rem 0;
  padding-left: 2.5rem;
  position: relative;
  color: var(--color-text-dim);
  font-style: italic;
  line-height: 1.6;
  border-bottom: 1px dashed var(--color-border);
}

.lore-list li:last-child {
  border-bottom: none;
}

.lore-number {
  position: absolute;
  left: 0;
  top: 0.6rem;
  color: var(--color-warning);
  font-weight: bold;
  font-style: normal;
}

.related-section {
  border-left-color: var(--color-accent-light);
}

.related-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.75rem;
}

.related-card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  cursor: pointer;
  transition: all 0.2s ease;
}

.related-card:hover:not(.undiscovered) {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
}

.related-card.undiscovered {
  opacity: 0.5;
  cursor: not-allowed;
}

.related-icon {
  font-size: 1.8rem;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.related-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.related-name {
  font-size: 0.9rem;
  color: var(--color-text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.related-cat {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  color: var(--color-text-dim);
  width: fit-content;
}

.detail-footer {
  padding-top: 1rem;
  border-top: 1px solid var(--color-border);
}

.discovery-info {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  font-size: 0.85rem;
  color: var(--color-text-dim);
}

@media (max-width: 768px) {
  .detail-overlay {
    padding: 0.5rem;
    padding-top: 3rem;
  }

  .detail-card {
    padding: 1.25rem;
    max-height: 92vh;
  }

  .detail-header {
    flex-direction: column;
    text-align: center;
  }

  .entry-meta {
    width: 100%;
  }

  .meta-tags {
    justify-content: center;
  }

  .grid-2 {
    grid-template-columns: 1fr;
  }

  .discovery-info {
    flex-direction: column;
  }
}

.detail-card::-webkit-scrollbar {
  width: 8px;
}

.detail-card::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 4px;
}

.detail-card::-webkit-scrollbar-thumb {
  background: var(--color-accent);
  border-radius: 4px;
}
</style>
