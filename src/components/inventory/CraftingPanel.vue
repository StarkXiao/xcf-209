<script setup lang="ts">
import { ref, computed } from 'vue'
import { useInventoryStore } from '@/stores/inventory'
import { useGameStore } from '@/stores/game'
import type { Recipe, RecipeOutput } from '@/types'

const inventoryStore = useInventoryStore()
const gameStore = useGameStore()

const selectedCategory = ref('全部')
const selectedRecipe = ref<Recipe | null>(null)
const showRecipeDetail = ref(false)
const craftMessage = ref('')
const showCraftMessage = ref(false)
const craftSuccess = ref(false)
const lastOutputs = ref<RecipeOutput[]>([])

const categories = computed(() => {
  return ['全部', ...inventoryStore.recipeCategories.filter((cat: string) => 
    inventoryStore.availableRecipes.some((r: Recipe) => r.category === cat)
  )]
})

const displayedRecipes = computed(() => {
  if (selectedCategory.value === '全部') {
    return inventoryStore.availableRecipes
  }
  return inventoryStore.availableRecipes.filter((r: Recipe) => r.category === selectedCategory.value)
})

const lockedRecipesCount = computed(() => {
  return inventoryStore.recipes.length - inventoryStore.availableRecipes.length
})

function selectRecipe(recipe: Recipe) {
  selectedRecipe.value = recipe
  showRecipeDetail.value = true
  craftMessage.value = ''
  showCraftMessage.value = false
}

function closeDetail() {
  showRecipeDetail.value = false
  selectedRecipe.value = null
}

function getCraftCheck(recipe: Recipe) {
  return inventoryStore.canCraftRecipe(recipe)
}

function getMaterial(materialId: string) {
  return inventoryStore.getMaterialById(materialId)
}

function executeRecipe() {
  if (!selectedRecipe.value) return

  const result = inventoryStore.executeCraft(selectedRecipe.value.id)
  
  craftSuccess.value = result.success
  craftMessage.value = result.message
  lastOutputs.value = result.outputs
  showCraftMessage.value = true

  setTimeout(() => {
    showCraftMessage.value = false
  }, 4000)
}

function startEvidenceAnalysis(evidenceId: string, recipeId: string) {
  const result = inventoryStore.startAnalysis(evidenceId, recipeId)
  craftMessage.value = result.message
  craftSuccess.value = result.success
  showCraftMessage.value = true
  setTimeout(() => {
    showCraftMessage.value = false
  }, 3000)
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    process: '证据加工',
    craft: '材料合成',
    analyze: '深度分析',
    upgrade: '工具升级'
  }
  return labels[type] || type
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    process: '#ff9800',
    craft: '#4caf50',
    analyze: '#9c27b0',
    upgrade: '#2196f3'
  }
  return colors[type] || '#9e9e9e'
}

function getOutputLabel(output: RecipeOutput): string {
  switch (output.type) {
    case 'material':
      const mat = getMaterial(output.id || '')
      return `${mat?.icon || '📦'} ${mat?.name || output.id} x${output.quantity}`
    case 'tool':
      return `🛠️ 工具 x${output.quantity}`
    case 'clue':
      return `🔍 发现线索 x${output.quantity}`
    case 'sanity':
      return `${output.quantity > 0 ? '💚' : '💔'} 理智 ${output.quantity > 0 ? '+' : ''}${output.quantity}`
    case 'time_bonus':
      return `⏰ 时间奖励 +${output.quantity}秒`
    case 'branch_unlock':
      return `🌿 解锁推演分支 x${output.quantity}`
    default:
      return `${output.type} x${output.quantity}`
  }
}

const processableEvidence = computed(() => {
  const caseData = gameStore.currentCase
  if (!caseData) return []
  const result: any[] = []
  for (const scene of caseData.scenes) {
    for (const evidence of scene.evidence) {
      if (evidence.processable && gameStore.gameState.discoveredEvidence.includes(evidence.id)) {
        result.push(evidence)
      }
    }
  }
  return result
})
</script>

<template>
  <div class="crafting-panel card">
    <div class="panel-header">
      <h3 class="panel-title">⚗️ 加工工作台</h3>
      <div class="panel-stats">
        <span class="stat-badge unlocked">
          {{ inventoryStore.availableRecipes.length }} 已解锁
        </span>
        <span v-if="lockedRecipesCount > 0" class="stat-badge locked">
          {{ lockedRecipesCount }} 待解锁
        </span>
      </div>
    </div>

    <div v-if="processableEvidence.length > 0" class="quick-process-section">
      <h4 class="section-title">📋 可加工证据</h4>
      <div class="process-list">
        <div 
          v-for="ev in processableEvidence" 
          :key="ev.id"
          class="process-item"
        >
          <span class="ev-name">{{ ev.name }}</span>
          <button 
            class="process-btn small"
            @click="startEvidenceAnalysis(ev.id, ev.processRecipeId)"
          >
            加工
          </button>
        </div>
      </div>
    </div>

    <div class="category-tabs">
      <button
        v-for="cat in categories"
        :key="cat"
        class="tab-btn"
        :class="{ active: selectedCategory === cat }"
        @click="selectedCategory = cat"
      >
        {{ cat }}
      </button>
    </div>

    <div v-if="displayedRecipes.length === 0" class="empty-recipes">
      <div class="empty-icon">🧪</div>
      <p class="empty-text">暂无可用配方，继续调查以解锁更多！</p>
    </div>

    <div v-else class="recipes-list">
      <div
        v-for="recipe in displayedRecipes"
        :key="recipe.id"
        class="recipe-card"
        :class="{ 
          special: recipe.isSpecial,
          craftable: getCraftCheck(recipe).canCraft
        }"
        @click="selectRecipe(recipe)"
      >
        <div class="recipe-icon" :style="{ borderColor: getTypeColor(recipe.type) }">
          {{ recipe.icon }}
        </div>
        <div class="recipe-info">
          <h4 class="recipe-name">
            {{ recipe.name }}
            <span v-if="recipe.isSpecial" class="special-tag">特殊</span>
          </h4>
          <p class="recipe-desc">{{ recipe.description }}</p>
          <div class="recipe-meta">
            <span class="meta-tag type" :style="{ backgroundColor: getTypeColor(recipe.type) }">
              {{ getTypeLabel(recipe.type) }}
            </span>
            <span class="meta-tag success-rate" :class="{ low: recipe.successRate < 60 }">
              成功率 {{ recipe.successRate }}%
            </span>
            <span v-if="recipe.sanityCost > 0" class="meta-tag sanity">
              😰 -{{ recipe.sanityCost }}
            </span>
          </div>
        </div>
        <div class="recipe-status">
          <span v-if="getCraftCheck(recipe).canCraft" class="status-badge ready">✓ 可制作</span>
          <span v-else class="status-badge locked">🔒 条件不足</span>
        </div>
      </div>
    </div>

    <Transition name="modal">
      <div v-if="showRecipeDetail && selectedRecipe" class="recipe-modal" @click.self="closeDetail">
        <div class="modal-content card" :class="{ special: selectedRecipe.isSpecial }">
          <button class="close-btn" @click="closeDetail">✕</button>
          
          <div class="modal-header">
            <span class="modal-icon" :style="{ borderColor: getTypeColor(selectedRecipe.type) }">
              {{ selectedRecipe.icon }}
            </span>
            <div class="modal-title-area">
              <h3 class="modal-title">
                {{ selectedRecipe.name }}
                <span v-if="selectedRecipe.isSpecial" class="special-tag large">特殊</span>
              </h3>
              <span 
                class="modal-type"
                :style="{ backgroundColor: getTypeColor(selectedRecipe.type) }"
              >
                {{ getTypeLabel(selectedRecipe.type) }}
              </span>
            </div>
          </div>

          <p class="modal-description">{{ selectedRecipe.description }}</p>

          <div class="modal-section">
            <h4 class="section-title">📥 所需材料</h4>
            <div class="ingredients-list">
              <div 
                v-for="ing in selectedRecipe.inputs" 
                :key="ing.materialId"
                class="ingredient-row"
                :class="{ insufficient: inventoryStore.getItemQuantity(ing.materialId) < ing.quantity }"
              >
                <span class="ing-icon">{{ getMaterial(ing.materialId)?.icon || '📦' }}</span>
                <span class="ing-name">{{ getMaterial(ing.materialId)?.name || ing.materialId }}</span>
                <span class="ing-qty">
                  {{ inventoryStore.getItemQuantity(ing.materialId) }} / {{ ing.quantity }}
                  <span v-if="!ing.consumed" class="not-consumed">(不消耗)</span>
                </span>
              </div>
            </div>
          </div>

          <div class="modal-section">
            <h4 class="section-title">📤 产出结果</h4>
            <div class="outputs-list">
              <div v-for="(out, idx) in selectedRecipe.outputs" :key="idx" class="output-row">
                {{ getOutputLabel(out) }}
              </div>
            </div>
          </div>

          <div class="modal-section">
            <h4 class="section-title">📊 消耗与条件</h4>
            <div class="conditions-grid">
              <div class="condition-item">
                <span class="cond-label">⏱️ 耗时</span>
                <span class="cond-value">{{ selectedRecipe.timeCost }} 秒</span>
              </div>
              <div class="condition-item">
                <span class="cond-label">💭 理智</span>
                <span class="cond-value" :class="selectedRecipe.sanityCost > gameStore.gameState.sanity ? 'bad' : ''">
                  -{{ selectedRecipe.sanityCost }}
                </span>
              </div>
              <div class="condition-item">
                <span class="cond-label">🎯 成功率</span>
                <span class="cond-value" :class="selectedRecipe.successRate < 60 ? 'bad' : ''">
                  {{ selectedRecipe.successRate }}%
                </span>
              </div>
              <div v-if="selectedRecipe.requiredTool" class="condition-item">
                <span class="cond-label">🛠️ 工具</span>
                <span 
                  class="cond-value"
                  :class="!gameStore.gameState.tools.some((t: any) => t.id === selectedRecipe!.requiredTool && t.uses > 0) ? 'bad' : ''"
                >
                  需要 {{ selectedRecipe.requiredTool }}
                </span>
              </div>
            </div>
          </div>

          <div v-if="!getCraftCheck(selectedRecipe).canCraft" class="cant-craft-reason">
            ❌ {{ getCraftCheck(selectedRecipe).reason }}
          </div>

          <div class="modal-actions">
            <button 
              class="craft-btn"
              :class="{ disabled: !getCraftCheck(selectedRecipe).canCraft }"
              :disabled="!getCraftCheck(selectedRecipe).canCraft"
              @click="executeRecipe"
            >
              {{ selectedRecipe.type === 'analyze' || selectedRecipe.type === 'process' ? '开始分析' : '开始制作' }}
            </button>
          </div>

          <Transition name="fade">
            <div 
              v-if="showCraftMessage" 
              class="craft-result"
              :class="{ success: craftSuccess, failure: !craftSuccess }"
            >
              <p class="result-message">{{ craftMessage }}</p>
              <div v-if="lastOutputs.length > 0 && craftSuccess" class="result-outputs">
                <span v-for="(out, idx) in lastOutputs" :key="idx" class="result-item">
                  {{ getOutputLabel(out) }}
                </span>
              </div>
            </div>
          </Transition>
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.crafting-panel {
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

.panel-stats {
  display: flex;
  gap: 0.5rem;
}

.stat-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 12px;
  font-size: 0.75rem;
  font-weight: bold;
}

.stat-badge.unlocked {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid #4caf50;
}

.stat-badge.locked {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
  border: 1px solid #9e9e9e;
}

.quick-process-section {
  margin-bottom: 1rem;
  padding: 1rem;
  background: rgba(107, 76, 154, 0.1);
  border-radius: 6px;
  border-left: 3px solid var(--color-accent);
}

.section-title {
  font-size: 0.9rem;
  color: var(--color-text-dim);
  margin: 0 0 0.75rem 0;
}

.process-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.process-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
}

.ev-name {
  font-size: 0.85rem;
  color: var(--color-text);
}

.process-btn {
  padding: 0.35rem 0.85rem;
  background: var(--color-accent);
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.8rem;
  transition: all 0.2s;
}

.process-btn:hover {
  background: #7b5ea7;
}

.process-btn.small {
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
}

.category-tabs {
  display: flex;
  gap: 0.25rem;
  margin-bottom: 1rem;
  overflow-x: auto;
  padding-bottom: 0.5rem;
}

.tab-btn {
  padding: 0.4rem 0.85rem;
  font-size: 0.8rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 16px;
  color: var(--color-text-dim);
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.2s;
}

.tab-btn:hover {
  color: var(--color-text);
  border-color: var(--color-accent);
}

.tab-btn.active {
  background: var(--color-accent);
  color: white;
  border-color: var(--color-accent);
}

.empty-recipes {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--color-text-dim);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 0.75rem;
  opacity: 0.5;
}

.empty-text {
  font-size: 0.9rem;
}

.recipes-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-height: 350px;
  overflow-y: auto;
}

.recipe-card {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: rgba(0, 0, 0, 0.3);
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.25s ease;
}

.recipe-card:hover {
  transform: translateX(4px);
  border-color: var(--color-accent);
  background: rgba(107, 76, 154, 0.15);
}

.recipe-card.special {
  border-color: rgba(255, 152, 0, 0.5);
  background: rgba(255, 152, 0, 0.08);
}

.recipe-card.special:hover {
  border-color: #ff9800;
  box-shadow: 0 4px 15px rgba(255, 152, 0, 0.2);
}

.recipe-card.craftable {
  border-left: 4px solid var(--color-success);
}

.recipe-icon {
  width: 50px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.75rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  border: 2px solid var(--color-border);
  flex-shrink: 0;
}

.recipe-info {
  flex: 1;
  min-width: 0;
}

.recipe-name {
  margin: 0 0 0.25rem 0;
  font-size: 1rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.special-tag {
  font-size: 0.65rem;
  padding: 0.1rem 0.4rem;
  background: linear-gradient(135deg, #ff9800, #f44336);
  color: white;
  border-radius: 8px;
  font-weight: bold;
}

.special-tag.large {
  font-size: 0.75rem;
  padding: 0.2rem 0.5rem;
}

.recipe-desc {
  margin: 0 0 0.5rem 0;
  font-size: 0.8rem;
  color: var(--color-text-dim);
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.recipe-meta {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.meta-tag {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
  font-weight: 500;
}

.meta-tag.type {
  color: white;
}

.meta-tag.success-rate {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
}

.meta-tag.success-rate.low {
  background: rgba(244, 67, 54, 0.2);
  color: #f44336;
}

.meta-tag.sanity {
  background: rgba(139, 58, 58, 0.2);
  color: #ff6b6b;
}

.recipe-status {
  flex-shrink: 0;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  font-weight: bold;
}

.status-badge.ready {
  background: rgba(76, 175, 80, 0.2);
  color: #4caf50;
  border: 1px solid #4caf50;
}

.status-badge.locked {
  background: rgba(158, 158, 158, 0.2);
  color: #9e9e9e;
}

.recipe-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
  padding: 1rem;
}

.modal-content {
  width: 90%;
  max-width: 520px;
  max-height: 90vh;
  overflow-y: auto;
  padding: 1.5rem;
  position: relative;
  border-top: 4px solid var(--color-accent);
}

.modal-content.special {
  border-top-color: #ff9800;
  background: linear-gradient(180deg, rgba(255, 152, 0, 0.05) 0%, rgba(26, 26, 46, 0.95) 100%);
}

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

.modal-header {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid var(--color-border);
}

.modal-icon {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.25rem;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 10px;
  border: 3px solid var(--color-border);
  flex-shrink: 0;
}

.modal-title-area {
  flex: 1;
}

.modal-title {
  margin: 0 0 0.4rem 0;
  font-size: 1.35rem;
  color: var(--color-text);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-type {
  display: inline-block;
  padding: 0.2rem 0.6rem;
  color: white;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: bold;
}

.modal-description {
  color: var(--color-text-dim);
  line-height: 1.6;
  margin-bottom: 1.25rem;
  font-size: 0.95rem;
}

.modal-section {
  margin-bottom: 1.25rem;
}

.modal-section .section-title {
  font-size: 0.85rem;
  color: var(--color-accent-light);
  margin: 0 0 0.6rem 0;
  font-weight: bold;
}

.ingredients-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.ingredient-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.75rem;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 4px;
  border-left: 3px solid var(--color-success);
}

.ingredient-row.insufficient {
  border-left-color: var(--color-danger);
  opacity: 0.7;
}

.ing-icon {
  font-size: 1.25rem;
}

.ing-name {
  flex: 1;
  font-size: 0.85rem;
  color: var(--color-text);
}

.ing-qty {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text);
}

.ingredient-row.insufficient .ing-qty {
  color: var(--color-danger);
}

.not-consumed {
  font-size: 0.7rem;
  color: #4caf50;
  font-weight: normal;
  margin-left: 0.25rem;
}

.outputs-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.output-row {
  padding: 0.4rem 0.75rem;
  background: rgba(107, 76, 154, 0.15);
  border-radius: 4px;
  font-size: 0.85rem;
  color: var(--color-accent-light);
}

.conditions-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
}

.condition-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.4rem 0.6rem;
  background: rgba(0, 0, 0, 0.25);
  border-radius: 4px;
}

.cond-label {
  font-size: 0.75rem;
  color: var(--color-text-dim);
}

.cond-value {
  font-size: 0.85rem;
  font-weight: bold;
  color: var(--color-text);
}

.cond-value.bad {
  color: var(--color-danger);
}

.cant-craft-reason {
  padding: 0.6rem 0.85rem;
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid var(--color-danger);
  border-radius: 6px;
  color: var(--color-danger);
  font-size: 0.85rem;
  margin-bottom: 1rem;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
}

.craft-btn {
  flex: 1;
  padding: 0.85rem;
  font-size: 1rem;
  background: linear-gradient(135deg, var(--color-accent), #7b5ea7);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.25s ease;
}

.craft-btn:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(107, 76, 154, 0.4);
}

.craft-btn.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #555;
}

.craft-result {
  margin-top: 1rem;
  padding: 1rem;
  border-radius: 8px;
  text-align: center;
}

.craft-result.success {
  background: rgba(76, 175, 80, 0.15);
  border: 1px solid #4caf50;
}

.craft-result.failure {
  background: rgba(244, 67, 54, 0.15);
  border: 1px solid #f44336;
}

.result-message {
  margin: 0 0 0.5rem 0;
  font-size: 0.95rem;
  font-weight: bold;
  color: var(--color-text);
}

.result-outputs {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  margin-top: 0.5rem;
}

.result-item {
  font-size: 0.85rem;
  color: var(--color-success);
}

.modal-enter-active,
.modal-leave-active {
  transition: all 0.3s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .modal-content,
.modal-leave-to .modal-content {
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
