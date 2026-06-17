import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { 
  InventoryItem, InventoryState, Recipe, RecipeOutput, 
  CraftingResult, ActiveAnalysis, AnalysisResult,
  RecipeIngredient
} from '@/types'
import { 
  materials, getMaterialById, recipes, getRecipeById, 
  rarityColors, materialCategories, recipeCategories
} from '@/data/materials'
import { useGameStore } from './game'
import { useCharacterStore } from './character'
import { useProgressStore } from './progress'

const RECIPE_UNLOCKS_KEY = 'cthulhu-recipe-unlocks'

export const useInventoryStore = defineStore('inventory', () => {
  const getGameStore = () => useGameStore()
  const characterStore = useCharacterStore()

  const talentEffects = computed(() => ({
    craftingSpeedBonus: characterStore.getTalentEffect('clue_analysis_speed'),
    materialYieldBonus: characterStore.getTalentEffect('luck_bonus'),
    sanityCostReduction: characterStore.getTalentEffect('sanity_cost_reduction')
  }))

  const inventory = computed<InventoryState>(() => getGameStore().gameState.inventory)
  const activeAnalyses = computed<ActiveAnalysis[]>(() => getGameStore().gameState.activeAnalyses)
  const unlockedRecipes = computed<string[]>(() => getGameStore().gameState.unlockedRecipes)
  const craftingHistory = computed<string[]>(() => getGameStore().gameState.craftingHistory)

  const globalUnlockedRecipes = ref<string[]>([])

  const inventoryItems = computed(() => {
    return inventory.value.items
      .map(item => ({
        ...item,
        material: getMaterialById(item.materialId)
      }))
      .filter(item => item.material !== undefined)
      .sort((a, b) => {
        const rarityOrder = { legendary: 0, rare: 1, uncommon: 2, common: 3 }
        const aRarity = rarityOrder[a.material!.rarity] ?? 99
        const bRarity = rarityOrder[b.material!.rarity] ?? 99
        if (aRarity !== bRarity) return aRarity - bRarity
        return a.material!.name.localeCompare(b.material!.name)
      })
  })

  const totalItemCount = computed(() => {
    return inventory.value.items.reduce((sum, item) => sum + item.quantity, 0)
  })

  const availableRecipes = computed(() => {
    return recipes.filter(r => unlockedRecipes.value.includes(r.id))
  })

  const completedAnalyses = computed(() => {
    return activeAnalyses.value.filter(a => a.completed)
  })

  const pendingAnalyses = computed(() => {
    return activeAnalyses.value.filter(a => !a.completed)
  })

  function loadGlobalData() {
    try {
      const recipeData = localStorage.getItem(RECIPE_UNLOCKS_KEY)
      if (recipeData) {
        globalUnlockedRecipes.value = JSON.parse(recipeData)
      }
    } catch (error) {
      console.error('Failed to load global inventory data:', error)
    }
  }

  function saveGlobalData() {
    try {
      localStorage.setItem(RECIPE_UNLOCKS_KEY, JSON.stringify(globalUnlockedRecipes.value))
    } catch (error) {
      console.error('Failed to save global inventory data:', error)
    }
  }

  function createInitialInventoryState(): InventoryState {
    return {
      items: [],
      capacity: 500,
      unlocked: true
    }
  }

  function getItemQuantity(materialId: string): number {
    const item = inventory.value.items.find(i => i.materialId === materialId)
    return item ? item.quantity : 0
  }

  function hasItems(ingredients: RecipeIngredient[]): boolean {
    return ingredients.every(ing => getItemQuantity(ing.materialId) >= ing.quantity)
  }

  function addItem(materialId: string, quantity: number): boolean {
    const material = getMaterialById(materialId)
    if (!material) return false

    const existingItem = inventory.value.items.find(i => i.materialId === materialId)
    
    if (existingItem) {
      if (material.stackable) {
        const maxAdd = Math.min(quantity, material.maxStack - existingItem.quantity)
        existingItem.quantity += maxAdd
        const remaining = quantity - maxAdd
        if (remaining > 0) {
          const newItem: InventoryItem = {
            materialId,
            quantity: remaining
          }
          if (totalItemCount.value < inventory.value.capacity) {
            inventory.value.items.push(newItem)
          } else {
            return false
          }
        }
      } else {
        for (let i = 0; i < quantity; i++) {
          if (totalItemCount.value < inventory.value.capacity) {
            inventory.value.items.push({ materialId, quantity: 1 })
          } else {
            return false
          }
        }
      }
    } else {
      if (totalItemCount.value + 1 <= inventory.value.capacity) {
        const qty = material.stackable ? Math.min(quantity, material.maxStack) : 1
        inventory.value.items.push({ materialId, quantity: qty })
        if (material.stackable && quantity > qty) {
          return addItem(materialId, quantity - qty)
        }
      } else {
        return false
      }
    }

    getGameStore().addLog('inventory', `获得物品：${material.icon} ${material.name} x${quantity}`, {
      materialId,
      quantity
    })

    getGameStore().gameState.lastSaveTime = Date.now()
    return true
  }

  function removeItem(materialId: string, quantity: number): boolean {
    const material = getMaterialById(materialId)
    if (!material) return false

    let remaining = quantity
    const itemsToRemove: number[] = []

    for (let i = inventory.value.items.length - 1; i >= 0 && remaining > 0; i--) {
      const item = inventory.value.items[i]
      if (item.materialId === materialId) {
        const toRemove = Math.min(item.quantity, remaining)
        item.quantity -= toRemove
        remaining -= toRemove
        if (item.quantity <= 0) {
          itemsToRemove.push(i)
        }
      }
    }

    itemsToRemove.forEach(index => {
      inventory.value.items.splice(index, 1)
    })

    if (remaining === 0) {
      getGameStore().addLog('inventory', `消耗物品：${material.icon} ${material.name} x${quantity}`, {
        materialId,
        quantity
      })
      getGameStore().gameState.lastSaveTime = Date.now()
      return true
    }

    return false
  }

  function dropMaterialsFromEvidence(evidenceId: string, drops: { materialId: string; minQuantity: number; maxQuantity: number; chance: number }[]): { materialId: string; quantity: number }[] {
    const dropped: { materialId: string; quantity: number }[] = []

    for (const drop of drops) {
      const roll = Math.random() * 100
      if (roll < drop.chance) {
        const yieldBonus = talentEffects.value.materialYieldBonus
        const baseQty = Math.floor(Math.random() * (drop.maxQuantity - drop.minQuantity + 1)) + drop.minQuantity
        const bonusQty = yieldBonus > 0 ? Math.floor(baseQty * (yieldBonus / 100)) : 0
        const quantity = baseQty + bonusQty

        if (addItem(drop.materialId, quantity)) {
          dropped.push({ materialId: drop.materialId, quantity })
          const material = getMaterialById(drop.materialId)
          getGameStore().addLog('material_drop', 
            `从证据中掉落：${material?.icon || '📦'} ${material?.name || drop.materialId} x${quantity}`,
            { evidenceId, materialId: drop.materialId, quantity }
          )
        }
      }
    }

    return dropped
  }

  function useMaterial(materialId: string): { success: boolean; message: string } {
    const material = getMaterialById(materialId)
    if (!material) {
      return { success: false, message: '物品不存在' }
    }

    if (!material.usable || !material.usableEffect) {
      return { success: false, message: '该物品无法使用' }
    }

    if (getItemQuantity(materialId) <= 0) {
      return { success: false, message: '物品数量不足' }
    }

    const effect = material.usableEffect

    switch (effect.type) {
      case 'sanity_restore':
        const sanityResult = getGameStore().modifySanity(effect.value, `使用${material.name}`)
        removeItem(materialId, 1)
        return { 
          success: true, 
          message: sanityResult === 'insane' ? '使用成功，但...' : `成功恢复 ${effect.value} 点理智值` 
        }

      case 'sanity_max_increase':
        getGameStore().gameState.maxSanity += effect.value
        getGameStore().modifySanity(effect.value, `使用${material.name}提升最大理智`)
        removeItem(materialId, 1)
        return { success: true, message: `最大理智值提升 ${effect.value} 点` }

      case 'tool_repair':
        const toolsToRepair = getGameStore().gameState.tools.filter(t => t.durability < t.maxDurability)
        if (toolsToRepair.length === 0) {
          return { success: false, message: '没有需要修复的工具' }
        }
        toolsToRepair.forEach(t => {
          const repairAmount = Math.min(effect.value, t.maxDurability - t.durability)
          t.durability += repairAmount
          t.uses = Math.min(t.maxUses, t.uses + Math.floor(effect.value / 10))
        })
        removeItem(materialId, 1)
        getGameStore().addLog('tool_repair', `使用 ${material.name} 修复了所有工具`)
        return { success: true, message: `已修复所有工具（耐久度 +${effect.value}）` }

      case 'hit_rate_boost':
        removeItem(materialId, 1)
        getGameStore().addLog('bonus', `使用 ${material.name}，证据发现率临时提升 ${effect.value}%`)
        return { success: true, message: `证据发现率临时提升 ${effect.value}%（持续 ${effect.duration}秒）` }

      case 'reveal_hidden':
        const caseData = getGameStore().currentCase
        if (!caseData) {
          return { success: false, message: '当前不在调查中' }
        }
        let revealed = 0
        for (const scene of caseData.scenes) {
          for (const evidence of scene.evidence) {
            if (evidence.isInitiallyHidden && !getGameStore().gameState.unlockedHiddenEvidence.includes(evidence.id)) {
              const trigger = evidence.discoveryTrigger
              if (!trigger || trigger.type === 'random_after_search') {
                getGameStore().unlockHiddenEvidence(evidence.id, `使用 ${material.name}`)
                revealed++
              }
            }
          }
        }
        removeItem(materialId, 1)
        return { 
          success: true, 
          message: revealed > 0 ? `成功显现 ${revealed} 个隐藏调查点` : '周围没有可显现的隐藏内容'
        }

      default:
        return { success: false, message: '未知的使用效果' }
    }
  }

  function canCraftRecipe(recipe: Recipe): { canCraft: boolean; reason?: string } {
    if (!unlockedRecipes.value.includes(recipe.id)) {
      return { canCraft: false, reason: '配方未解锁' }
    }

    if (!hasItems(recipe.inputs)) {
      return { canCraft: false, reason: '材料不足' }
    }

    if (recipe.requiredTool) {
      const hasTool = getGameStore().gameState.tools.some(
        t => t.id === recipe.requiredTool && t.uses > 0 && t.durability > 0
      )
      if (!hasTool) {
        return { canCraft: false, reason: '缺少所需工具' }
      }
    }

    if (recipe.requiredClues && recipe.requiredClues.length > 0) {
      const hasAllClues = recipe.requiredClues.every(
        c => getGameStore().gameState.discoveredClues.includes(c)
      )
      if (!hasAllClues) {
        return { canCraft: false, reason: '缺少所需线索' }
      }
    }

    if (recipe.requiredEvidence && recipe.requiredEvidence.length > 0) {
      const hasAllEvidence = recipe.requiredEvidence.every(
        e => getGameStore().gameState.discoveredEvidence.includes(e)
      )
      if (!hasAllEvidence) {
        return { canCraft: false, reason: '缺少所需证据' }
      }
    }

    if (getGameStore().gameState.sanity < recipe.sanityCost) {
      return { canCraft: false, reason: '理智值不足' }
    }

    if (getGameStore().gameState.timerState.isExpired && recipe.timeCost > 0) {
      return { canCraft: false, reason: '搜证时间已到' }
    }

    return { canCraft: true }
  }

  function executeCraft(recipeId: string): CraftingResult {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      return { success: false, outputs: [], message: '配方不存在' }
    }

    const check = canCraftRecipe(recipe)
    if (!check.canCraft) {
      return { success: false, outputs: [], message: check.reason || '无法执行合成' }
    }

    const speedBonus = talentEffects.value.craftingSpeedBonus
    const effectiveTimeCost = Math.max(1, Math.floor(recipe.timeCost * (1 - speedBonus / 200)))
    const effectiveSanityCost = recipe.sanityCost > 0 
      ? Math.max(0, recipe.sanityCost - talentEffects.value.sanityCostReduction)
      : 0

    recipe.inputs.forEach(input => {
      if (input.consumed) {
        removeItem(input.materialId, input.quantity)
      }
    })

    if (effectiveTimeCost > 0) {
      getGameStore().consumeTime(effectiveTimeCost, `执行配方：${recipe.name}`)
    }

    if (effectiveSanityCost > 0) {
      getGameStore().modifySanity(-effectiveSanityCost, `合成配方消耗：${recipe.name}`)
    }

    if (recipe.requiredTool) {
      getGameStore().consumeToolDurability(recipe.requiredTool, 1, 5)
    }

    const roll = Math.random() * 100
    const luckBonus = talentEffects.value.materialYieldBonus / 2
    const effectiveSuccessRate = Math.min(98, recipe.successRate + luckBonus)
    const success = roll < effectiveSuccessRate
    const isCriticalSuccess = success && roll < effectiveSuccessRate * 0.15
    const isCriticalFailure = !success && roll > 99

    let outputs: RecipeOutput[] = []
    let message = ''

    if (success) {
      const yieldMultiplier = isCriticalSuccess ? 2 : 1
      
      outputs = recipe.outputs.map(output => ({
        ...output,
        quantity: Math.ceil(output.quantity * yieldMultiplier)
      }))

      outputs.forEach(output => {
        applyOutput(output, recipe)
      })

      if (isCriticalSuccess) {
        message = `✨ 大成功！${recipe.name} 效果翻倍！`
      } else {
        message = `成功完成：${recipe.name}`
      }

      if (!craftingHistory.value.includes(recipeId)) {
        getGameStore().gameState.craftingHistory.push(recipeId)
      }
    } else {
      if (isCriticalFailure) {
        const penalty = Math.min(15, Math.floor(recipe.sanityCost * 0.5))
        if (penalty > 0) {
          getGameStore().modifySanity(-penalty, `合成失败反噬：${recipe.name}`)
        }
        message = `💥 合成失败并发生反噬！损失了额外的理智值。`
      } else {
        message = `合成失败：${recipe.name}。材料已消耗。`
      }
    }

    getGameStore().addLog('crafting', message, {
      recipeId,
      success,
      criticalSuccess: isCriticalSuccess,
      criticalFailure: isCriticalFailure,
      outputs
    })

    checkAndUnlockRecipes()

    return {
      success,
      outputs,
      message,
      criticalSuccess: isCriticalSuccess,
      criticalFailure: isCriticalFailure
    }
  }

  function applyOutput(output: RecipeOutput, recipe: Recipe): void {
    switch (output.type) {
      case 'material':
        if (output.id) {
          addItem(output.id, output.quantity)
        }
        break

      case 'tool':
        if (output.id) {
          getGameStore().addTool(output.id)
        }
        break

      case 'clue':
        const caseData = getGameStore().currentCase
        if (caseData) {
          const undiscoveredClues = caseData.clues.filter(
            c => !getGameStore().gameState.discoveredClues.includes(c.id)
          )
          const count = Math.min(output.quantity, undiscoveredClues.length)
          for (let i = 0; i < count; i++) {
            const idx = Math.floor(Math.random() * undiscoveredClues.length)
            const clue = undiscoveredClues.splice(idx, 1)[0]
            getGameStore().discoverClue(clue.id)
          }
        }
        break

      case 'sanity':
        if (output.quantity !== 0) {
          const reason = output.quantity > 0 ? '合成奖励' : '合成消耗'
          getGameStore().modifySanity(output.quantity, reason)
        }
        break

      case 'time_bonus':
        if (output.quantity > 0) {
          getGameStore().addTimeBonus(output.quantity, `合成奖励：${recipe.name}`)
        }
        break

      case 'branch_unlock':
        const branches = ['deep-truth', 'alternate-ending', 'hidden-path']
        const unlockedCount = Math.min(output.quantity, branches.length)
        for (let i = 0; i < unlockedCount; i++) {
          const branchId = branches[i]
          if (!getGameStore().hasDeductionBranch(branchId)) {
            getGameStore().unlockDeductionBranch(branchId)
            getGameStore().addLog('conclusion', `特殊分析解锁推演分支：${branchId}`)
          }
        }
        break
    }
  }

  function startAnalysis(evidenceId: string, recipeId: string): { success: boolean; analysisId?: string; message: string } {
    const recipe = getRecipeById(recipeId)
    if (!recipe) {
      return { success: false, message: '分析配方不存在' }
    }

    if (recipe.type !== 'analyze' && recipe.type !== 'process') {
      return { success: false, message: '该配方不是分析类型' }
    }

    const check = canCraftRecipe(recipe)
    if (!check.canCraft) {
      return { success: false, message: check.reason || '无法开始分析' }
    }

    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const speedBonus = talentEffects.value.craftingSpeedBonus
    const duration = Math.max(5, Math.floor(recipe.timeCost * (1 - speedBonus / 150)))

    const analysis: ActiveAnalysis = {
      analysisId,
      evidenceId,
      startTime: Date.now(),
      duration: duration * 1000,
      completed: false
    }

    getGameStore().gameState.activeAnalyses.push(analysis)

    getGameStore().addLog('analysis_start', `开始分析证据 ${evidenceId}，预计耗时 ${duration} 秒`, {
      analysisId,
      evidenceId,
      recipeId,
      duration
    })

    setTimeout(() => {
      completeAnalysis(analysisId, recipeId)
    }, duration * 1000)

    return { success: true, analysisId, message: `分析已开始，需要 ${duration} 秒完成` }
  }

  function completeAnalysis(analysisId: string, recipeId: string): AnalysisResult | null {
    const analysisIndex = getGameStore().gameState.activeAnalyses.findIndex(
      a => a.analysisId === analysisId
    )

    if (analysisIndex === -1) return null

    const analysis = getGameStore().gameState.activeAnalyses[analysisIndex]
    if (analysis.completed) return null

    analysis.completed = true

    const craftResult = executeCraft(recipeId)
    const findings: string[] = []

    if (craftResult.success) {
      findings.push(`分析成功完成，获得了有价值的信息。`)
      if (craftResult.criticalSuccess) {
        findings.push(`异常顺利的分析过程，额外发现了隐藏信息！`)
      }
    } else {
      findings.push(`分析过程中出现干扰，结果不甚理想。`)
    }

    const result: AnalysisResult = {
      analysisId,
      evidenceId: analysis.evidenceId,
      findings,
      specialReward: craftResult.outputs.find(o => o.type === 'branch_unlock')
    }

    getGameStore().addLog('analysis_complete', `分析完成：${findings.join(' ')}`, {
      analysisId,
      evidenceId: analysis.evidenceId,
      success: craftResult.success
    })

    return result
  }

  function unlockRecipe(recipeId: string): boolean {
    const recipe = getRecipeById(recipeId)
    if (!recipe) return false

    if (unlockedRecipes.value.includes(recipeId)) return false

    getGameStore().gameState.unlockedRecipes.push(recipeId)

    if (!globalUnlockedRecipes.value.includes(recipeId)) {
      globalUnlockedRecipes.value.push(recipeId)
      saveGlobalData()
    }

    getGameStore().addLog('recipe_unlock', `解锁新配方：${recipe.icon} ${recipe.name}`, {
      recipeId
    })

    return true
  }

  function checkAndUnlockRecipes(): number {
    let unlockedCount = 0

    for (const recipe of recipes) {
      if (unlockedRecipes.value.includes(recipe.id)) continue
      if (!recipe.unlockCondition) {
        if (unlockRecipe(recipe.id)) unlockedCount++
        continue
      }

      const condition = recipe.unlockCondition
      let shouldUnlock = false

      switch (condition.type) {
        case 'evidence_discovered':
          if (condition.requiredId) {
            shouldUnlock = getGameStore().gameState.discoveredEvidence.includes(condition.requiredId)
          } else if (condition.requiredCount) {
            shouldUnlock = getGameStore().gameState.discoveredEvidence.length >= condition.requiredCount
          }
          break

        case 'clue_discovered':
          if (condition.requiredId) {
            shouldUnlock = getGameStore().gameState.discoveredClues.includes(condition.requiredId)
          } else if (condition.requiredCount) {
            shouldUnlock = getGameStore().gameState.discoveredClues.length >= condition.requiredCount
          }
          break

        case 'tool_owned':
          if (condition.requiredId) {
            shouldUnlock = getGameStore().gameState.tools.some(t => t.id === condition.requiredId)
          }
          break

        case 'chapter_completed':
          if (condition.requiredId) {
            const progressStore = useProgressStore()
            shouldUnlock = progressStore.chapterTree.some(
              (ch: any) => String(ch.chapter) === condition.requiredId &&
                ch.cases.every((c: any) => c.status === 'completed')
            )
          }
          break

        case 'talent_unlocked':
          if (condition.requiredId) {
            shouldUnlock = characterStore.activeTalentIds.includes(condition.requiredId)
          }
          break
      }

      if (shouldUnlock && unlockRecipe(recipe.id)) {
        unlockedCount++
      }
    }

    return unlockedCount
  }

  function applyGlobalRecipeUnlocks() {
    globalUnlockedRecipes.value.forEach(id => {
      if (!unlockedRecipes.value.includes(id)) {
        getGameStore().gameState.unlockedRecipes.push(id)
      }
    })
  }

  function resetInventory() {
    getGameStore().gameState.inventory = createInitialInventoryState()
    getGameStore().gameState.activeAnalyses = []
    getGameStore().gameState.unlockedRecipes = []
    getGameStore().gameState.craftingHistory = []
    applyGlobalRecipeUnlocks()
  }

  loadGlobalData()

  return {
    inventory,
    inventoryItems,
    totalItemCount,
    activeAnalyses,
    completedAnalyses,
    pendingAnalyses,
    availableRecipes,
    unlockedRecipes,
    craftingHistory,
    globalUnlockedRecipes,
    createInitialInventoryState,
    getItemQuantity,
    hasItems,
    addItem,
    removeItem,
    dropMaterialsFromEvidence,
    useMaterial,
    canCraftRecipe,
    executeCraft,
    startAnalysis,
    completeAnalysis,
    unlockRecipe,
    checkAndUnlockRecipes,
    applyGlobalRecipeUnlocks,
    resetInventory,
    getMaterialById,
    getRecipeById,
    materials,
    recipes,
    rarityColors,
    materialCategories,
    recipeCategories
  }
})
