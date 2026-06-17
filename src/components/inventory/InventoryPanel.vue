<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import type { Material } from '@/types'

const inventoryStore = useInventoryStore()

const showMaterialDetail = ref(false)
const selectedMaterial = ref<Material | null>(null)
const filterType = ref<string>('all')
const useMessage = ref('')
const showUseMessage = ref(false)

const filteredItems = computed(() => {
  if (filterType.value === 'all') {
    return inventoryStore.inventoryItems
  }
  return inventoryStore.inventoryItems.filter((item: any) => item.material!.type === filterType.value)
})

const filterOptions = computed(() => {
  const options = [{ value: 'all', label: '全部', color: '#9e9e9e' }]
  for (const [key, val] of Object.entries(inventoryStore.materialCategories)) {
    const typedVal = val as { name: string; color: string }
    options.push({ value: key, label: typedVal.name, color: typedVal.color })
  }
  return options
})

function selectMaterial(item: any) {
  selectedMaterial.value = item.material
  showMaterialDetail.value = true
}

function closeDetail() {
  showMaterialDetail.value = false
  selectedMaterial.value = null
}

function useSelectedMaterial() {
  if (!selectedMaterial.value) return
  const result = inventoryStore.useMaterial(selectedMaterial.value.id)
  useMessage.value = result.message
  showUseMessage.value = true
  setTimeout(() => {
    showUseMessage.value = false
  }, 2500)
  if (result.success) {
    setTimeout(() => {
      if (inventoryStore.getItemQuantity(selectedMaterial.value!.id) <= 0) {
        closeDetail()
      }
    }, 300)
  }
}

function getRarityClass(rarity: string): string {
  return `rarity-${rarity}`
}
</script>

<template>
  <div class="inventory-panel card">
    <div class="panel-header">
      <h3 class="panel-title">🎒 调查背包</h3>
      <div class="inventory-stats">
        <span class="stat-badge">
          {{ inventoryStore.totalItemCount }} / {{ inventoryStore.inventory.capacity }} 格
        </span>
      </div>
    </div>

    <div class="filter-bar">
      <button
        v-for="opt in filterOptions"
        :key="opt.value"
        class="filter-btn"
        :class="{ active: filterType === opt.value }"
        :style="{ '--filter-color': opt.color }"
        @click="filterType = opt.value"
      >
        {{ opt.label }}
      </button>
    </div>

    <div v-if="filteredItems.length === 0" class="empty-inventory">
      <div class="empty-icon">📦</div>
      <p class="empty-text">背包是空的，去调查证据获取材料吧！</p>
    </div>

    <div v-else class="inventory-grid">
      <div
        v-for="item in filteredItems"
        :key="item.materialId + '-' + Math.random()"
        class="item-slot"
        :class="getRarityClass(item.material!.rarity)"
        @click="selectMaterial(item)"
      >
        <span class="item-icon">{{ item.material!.icon }}</span>
        <span class="item-quantity" v-if="item.quantity > 1">
          {{ item.quantity }}
        </span>
        <span class="item-tooltip">
          {{ item.material!.name }}
          <span class="tooltip-rarity" :class="getRarityClass(item.material!.rarity)">
            [{{ item.material!.rarity }}]
          </span>
        </span>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="showMaterialDetail && selectedMaterial" class="material-detail-modal" @click.self="closeDetail">
        <div class="detail-content card" :class="getRarityClass(selectedMaterial.rarity)">
          <button class="close-btn" @click="closeDetail">✕</button>
          
          <div class="detail-header">
            <span class="detail-icon">{{ selectedMaterial.icon }}</span>
            <div class="detail-title-info">
              <h4 class="detail-name">{{ selectedMaterial.name }}</h4>
              <span class="detail-category" :style="{ color: inventoryStore.materialCategories[selectedMaterial.type].color }">
                {{ inventoryStore.materialCategories[selectedMaterial.type].name }}
              </span>
            </div>
            <span class="detail-quantity">
              数量：{{ inventoryStore.getItemQuantity(selectedMaterial.id) }}
            </span>
          </div>

          <p class="detail-description">{{ selectedMaterial.description }}</p>

          <div class="detail-info">
            <div class="info-row">
              <span class="info-label">稀有度</span>
              <span class="info-value rarity-badge" :class="getRarityClass(selectedMaterial.rarity)">
                {{ selectedMaterial.rarity }}
              </span>
            </div>
            <div class="info-row">
              <span class="info-label">交易价值</span>
              <span class="info-value">{{ selectedMaterial.tradeValue }} 点</span>
            </div>
            <div v-if="selectedMaterial.sanityEffect" class="info-row">
              <span class="info-label">理智影响</span>
              <span class="info-value" :class="selectedMaterial.sanityEffect > 0 ? 'positive' : 'negative'">
                {{ selectedMaterial.sanityEffect > 0 ? '+' : '' }}{{ selectedMaterial.sanityEffect }}
              </span>
            </div>
            <div v-if="selectedMaterial.usable && selectedMaterial.usableEffect" class="info-row">
              <span class="info-label">使用效果</span>
              <span class="info-value usable-effect">
                {{ selectedMaterial.usableEffect.type === 'sanity_restore' ? `恢复 ${selectedMaterial.usableEffect.value} 理智` :
                   selectedMaterial.usableEffect.type === 'sanity_max_increase' ? `最大理智 +${selectedMaterial.usableEffect.value}` :
                   selectedMaterial.usableEffect.type === 'tool_repair' ? `修复工具耐久 +${selectedMaterial.usableEffect.value}` :
                   selectedMaterial.usableEffect.type === 'hit_rate_boost' ? `命中 +${selectedMaterial.usableEffect.value}% (${selectedMaterial.usableEffect.duration}秒)` :
                   selectedMaterial.usableEffect.type === 'reveal_hidden' ? `显现隐藏证据` : '' }}
              </span>
            </div>
          </div>

          <div v-if="selectedMaterial.usable" class="detail-actions">
            <button class="use-btn primary" @click="useSelectedMaterial">
              使用物品
            </button>
          </div>

          <Transition name="fade">
            <div v-if="showUseMessage" class="use-message">
              {{ useMessage }}
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.inventory-panel {
  padding: 1.25rem;
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid var(--color-border);
}

.panel-title {
  font-size: 1.25rem;
  color: var(--color-accent-light);
  margin: 0;
}

.stat-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 12px;
  font-size: 0.8rem;
  color: var(--color-accent-light);
}

.filter-bar {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.filter-btn {
  padding: 0.35rem 0.85rem;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  color: var(--color-text-dim);
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-btn:hover {
  border-color: var(--filter-color, var(--color-accent));
  color: var(--color-text);
}

.filter-btn.active {
  background: var(--filter-color, var(--color-accent));
  border-color: var(--filter-color, var(--color-accent));
  color: white;
  font-weight: bold;
}

.empty-inventory {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-dim);
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 0.95rem;
}

.inventory-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(60px, 1fr));
  gap: 0.5rem;
  max-height: 300px;
  overflow-y: auto;
  padding: 0.25rem;
}

.item-slot {
  position: relative;
  aspect-ratio: 1;
  background: rgba(0, 0, 0, 0.35);
  border: 2px solid var(--color-border);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
}

.item-slot:hover {
  transform: translateY(-2px);
  border-color: var(--color-accent);
  box-shadow: 0 4px 12px rgba(107, 76, 154, 0.3);
}

.item-slot.rarity-common { border-color: #616161; }
.item-slot.rarity-uncommon { border-color: #4caf50; box-shadow: inset 0 0 10px rgba(76, 175, 80, 0.1); }
.item-slot.rarity-rare { border-color: #2196f3; box-shadow: inset 0 0 10px rgba(33, 150, 243, 0.15); }
.item-slot.rarity-legendary { 
  border-color: #ff9800; 
  box-shadow: inset 0 0 15px rgba(255, 152, 0, 0.2), 0 0 8px rgba(255, 152, 0, 0.2);
  animation: legendary-glow 2s ease-in-out infinite;
}

@keyframes legendary-glow {
  0%, 100% { box-shadow: inset 0 0 15px rgba(255, 152, 0, 0.2), 0 0 8px rgba(255, 152, 0, 0.2); }
  50% { box-shadow: inset 0 0 20px rgba(255, 152, 0, 0.3), 0 0 15px rgba(255, 152, 0, 0.35); }
}

.item-icon {
  font-size: 1.75rem;
}

.item-quantity {
  position: absolute;
  bottom: 2px;
  right: 4px;
  font-size: 0.7rem;
  font-weight: bold;
  color: white;
  background: rgba(0, 0, 0, 0.7);
  padding: 1px 5px;
  border-radius: 8px;
}

.item-tooltip {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(10, 10, 20, 0.95);
  color: var(--color-text);
  padding: 0.35rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
  white-space: nowrap;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
  margin-bottom: 4px;
  border: 1px solid var(--color-accent);
  z-index: 10;
}

.item-slot:hover .item-tooltip {
  opacity: 1;
}

.tooltip-rarity {
  margin-left: 4px;
  font-size: 0.65rem;
  text-transform: uppercase;
}

.tooltip-rarity.rarity-common { color: #9e9e9e; }
.tooltip-rarity.rarity-uncommon { color: #4caf50; }
.tooltip-rarity.rarity-rare { color: #2196f3; }
.tooltip-rarity.rarity-legendary { color: #ff9800; }

.material-detail-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.detail-content {
  position: relative;
  width: 90%;
  max-width: 420px;
  padding: 1.5rem;
  border-top: 4px solid #616161;
}

.detail-content.rarity-uncommon { border-top-color: #4caf50; }
.detail-content.rarity-rare { border-top-color: #2196f3; }
.detail-content.rarity-legendary { border-top-color: #ff9800; }

.close-btn {
  position: absolute;
  top: 0.75rem;
  right: 0.75rem;
  width: 28px;
  height: 28px;
  border: none;
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-text);
  border-radius: 50%;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.close-btn:hover {
  background: var(--color-danger);
  transform: scale(1.1);
}

.detail-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.detail-icon {
  font-size: 3rem;
}

.detail-title-info {
  flex: 1;
}

.detail-name {
  margin: 0 0 0.25rem 0;
  font-size: 1.25rem;
  color: var(--color-text);
}

.detail-category {
  font-size: 0.8rem;
  font-weight: bold;
}

.detail-quantity {
  padding: 0.4rem 0.8rem;
  background: var(--color-accent);
  color: white;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: bold;
}

.detail-description {
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 1.25rem;
  font-size: 0.95rem;
}

.detail-info {
  background: rgba(0, 0, 0, 0.25);
  padding: 1rem;
  border-radius: 6px;
  margin-bottom: 1rem;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0;
}

.info-row:not(:last-child) {
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.info-label {
  color: var(--color-text-dim);
  font-size: 0.85rem;
}

.info-value {
  color: var(--color-text);
  font-size: 0.85rem;
  font-weight: 500;
}

.info-value.positive { color: var(--color-success); }
.info-value.negative { color: var(--color-danger); }

.info-value.usable-effect {
  color: var(--color-accent-light);
  text-align: right;
  max-width: 60%;
}

.rarity-badge {
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  font-size: 0.75rem;
  text-transform: uppercase;
  font-weight: bold;
}

.rarity-badge.rarity-common { background: #616161; color: white; }
.rarity-badge.rarity-uncommon { background: #4caf50; color: white; }
.rarity-badge.rarity-rare { background: #2196f3; color: white; }
.rarity-badge.rarity-legendary { background: #ff9800; color: white; }

.detail-actions {
  display: flex;
  gap: 0.75rem;
}

.use-btn {
  flex: 1;
  padding: 0.75rem;
  font-size: 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  font-weight: bold;
}

.use-btn.primary {
  background: linear-gradient(135deg, var(--color-accent), #7b5ea7);
  color: white;
}

.use-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 15px rgba(107, 76, 154, 0.4);
}

.use-message {
  margin-top: 1rem;
  padding: 0.75rem;
  background: rgba(107, 76, 154, 0.2);
  border: 1px solid var(--color-accent);
  border-radius: 6px;
  text-align: center;
  color: var(--color-accent-light);
  font-size: 0.9rem;
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .detail-content,
.modal-leave-to .detail-content {
  transform: scale(0.9) translateY(20px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
