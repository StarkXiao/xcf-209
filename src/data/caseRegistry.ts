import { reactive, readonly } from 'vue'
import type {
  CaseDefinition,
  SceneDefinition,
  EvidenceDefinition,
  ClueDefinition,
  CaseRuntimeState,
  SceneRuntimeState,
  EvidenceRuntimeState,
  ClueRuntimeState,
  CaseRegistryStats,
  CaseBatchImportResult,
  CaseTemplatePreset,
  CaseDefinitionPatch,
  ValidationResult,
  Case,
  Scene,
  Evidence,
  Clue,
  Conclusion
} from '@/types'
import { validateAllCaseDefinitions, validateCaseDefinition, formatValidationResult } from './caseValidator'
import { materials } from './materials'
import { getToolIds } from './tools'

const toolIds = new Set(getToolIds())
const materialIds = new Set(materials.map(m => m.id))

const caseDefinitions = reactive<Map<string, CaseDefinition>>(new Map())
const runtimeStates = reactive<Map<string, CaseRuntimeState>>(new Map())
const templatePresets = reactive<Map<string, CaseTemplatePreset>>(new Map())

function createDefaultRuntimeState(caseDef: CaseDefinition, initialStatus: Case['status'] = 'locked'): CaseRuntimeState {
  const sceneStates: Record<string, SceneRuntimeState> = {}
  caseDef.scenes.forEach(scene => {
    const evidenceStates: Record<string, EvidenceRuntimeState> = {}
    scene.evidence.forEach(e => {
      evidenceStates[e.id] = { discovered: false }
    })
    sceneStates[scene.id] = {
      searched: false,
      locked: (scene as any).locked ?? (scene.sceneOrder && scene.sceneOrder > 1) ?? false,
      evidenceStates
    }
  })

  const clueStates: Record<string, ClueRuntimeState> = {}
  caseDef.clues.forEach(clue => {
    clueStates[clue.id] = { discovered: false, analyzed: false }
  })

  return {
    status: initialStatus,
    sceneStates,
    clueStates
  }
}

export function registerCaseDefinition(caseDef: CaseDefinition, validate: boolean = true): { success: boolean; errors: ValidationResult | null } {
  if (validate) {
    const result = validateCaseDefinition(caseDef, { toolIds, materialIds })
    const errorCount = result.filter(i => i.severity === 'error').length
    const warningCount = result.filter(i => i.severity === 'warning').length
    const infoCount = result.filter(i => i.severity === 'info').length
    const validationResult: ValidationResult = {
      isValid: errorCount === 0,
      issues: result,
      errorCount,
      warningCount,
      infoCount,
      summary: `验证单个案件: ${caseDef.id}, ${errorCount} 个错误, ${warningCount} 个警告`
    }
    if (!validationResult.isValid) {
      console.error(`[CaseRegistry] 案件 ${caseDef.id} 校验失败:\n${formatValidationResult(validationResult)}`)
      return { success: false, errors: validationResult }
    }
  }

  if (caseDefinitions.has(caseDef.id)) {
    console.warn(`[CaseRegistry] 案件ID ${caseDef.id} 已存在，将被覆盖`)
  }

  caseDefinitions.set(caseDef.id, caseDef)

  if (!runtimeStates.has(caseDef.id)) {
    const initialStatus: Case['status'] = caseDef.prerequisites?.length === 0 ? 'available' : 'locked'
    runtimeStates.set(caseDef.id, createDefaultRuntimeState(caseDef, initialStatus))
  }

  return { success: true, errors: null }
}

export function batchRegisterCaseDefinitions(
  caseDefs: CaseDefinition[],
  options: { validate: boolean; stopOnError: boolean } = { validate: true, stopOnError: false }
): CaseBatchImportResult {
  let validation: ValidationResult
  if (options.validate) {
    validation = validateAllCaseDefinitions(caseDefs, { toolIds, materialIds })
  } else {
    validation = {
      isValid: true,
      issues: [],
      errorCount: 0,
      warningCount: 0,
      infoCount: 0,
      summary: '跳过校验'
    }
  }

  const importedIds: string[] = []
  const failedItems: CaseBatchImportResult['failedItems'] = []

  caseDefs.forEach(caseDef => {
    const errorsForCase = validation.issues.filter(i => i.caseId === caseDef.id && i.severity === 'error')
    if (errorsForCase.length > 0 && options.stopOnError) {
      failedItems.push({ caseData: caseDef, errors: errorsForCase })
      return
    }
    const result = registerCaseDefinition(caseDef, false)
    if (result.success) {
      importedIds.push(caseDef.id)
    } else if (result.errors) {
      failedItems.push({ caseData: caseDef, errors: result.errors.issues })
    }
  })

  return {
    successCount: importedIds.length,
    failCount: failedItems.length,
    importedIds,
    failedItems,
    validation
  }
}

export function unregisterCaseDefinition(caseId: string): boolean {
  if (!caseDefinitions.has(caseId)) return false
  caseDefinitions.delete(caseId)
  runtimeStates.delete(caseId)
  return true
}

export function getCaseDefinition(caseId: string): CaseDefinition | undefined {
  return caseDefinitions.get(caseId)
}

export function hasCaseDefinition(caseId: string): boolean {
  return caseDefinitions.has(caseId)
}

export function getAllCaseDefinitions(): CaseDefinition[] {
  return Array.from(caseDefinitions.values())
}

export function getCaseCount(): number {
  return caseDefinitions.size
}

export function getRuntimeState(caseId: string): CaseRuntimeState | undefined {
  return runtimeStates.get(caseId)
}

export function setCaseStatus(caseId: string, status: Case['status']): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  state.status = status
  return true
}

export function getCaseStatus(caseId: string): Case['status'] | null {
  return runtimeStates.get(caseId)?.status ?? null
}

export function resetRuntimeState(caseId: string): boolean {
  const caseDef = caseDefinitions.get(caseId)
  if (!caseDef) return false
  const currentStatus = runtimeStates.get(caseId)?.status
  runtimeStates.set(caseId, createDefaultRuntimeState(caseDef, currentStatus ?? 'locked'))
  return true
}

export function resetAllRuntimeStates(): void {
  caseDefinitions.forEach((caseDef, caseId) => {
    runtimeStates.set(caseId, createDefaultRuntimeState(caseDef, runtimeStates.get(caseId)?.status ?? 'locked'))
  })
}

export function markEvidenceDiscovered(caseId: string, sceneId: string, evidenceId: string, discovered: boolean = true): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  const sceneState = state.sceneStates[sceneId]
  if (!sceneState) return false
  const evidenceState = sceneState.evidenceStates[evidenceId]
  if (!evidenceState) return false
  evidenceState.discovered = discovered
  return true
}

export function isEvidenceDiscovered(caseId: string, sceneId: string, evidenceId: string): boolean {
  return runtimeStates.get(caseId)?.sceneStates[sceneId]?.evidenceStates[evidenceId]?.discovered ?? false
}

export function markSceneSearched(caseId: string, sceneId: string, searched: boolean = true): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  const sceneState = state.sceneStates[sceneId]
  if (!sceneState) return false
  sceneState.searched = searched
  return true
}

export function isSceneSearched(caseId: string, sceneId: string): boolean {
  return runtimeStates.get(caseId)?.sceneStates[sceneId]?.searched ?? false
}

export function setSceneLocked(caseId: string, sceneId: string, locked: boolean): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  const sceneState = state.sceneStates[sceneId]
  if (!sceneState) return false
  sceneState.locked = locked
  return true
}

export function isSceneLocked(caseId: string, sceneId: string): boolean {
  return runtimeStates.get(caseId)?.sceneStates[sceneId]?.locked ?? false
}

export function markClueDiscovered(caseId: string, clueId: string, discovered: boolean = true): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  const clueState = state.clueStates[clueId]
  if (!clueState) return false
  clueState.discovered = discovered
  return true
}

export function isClueDiscovered(caseId: string, clueId: string): boolean {
  return runtimeStates.get(caseId)?.clueStates[clueId]?.discovered ?? false
}

export function markClueAnalyzed(caseId: string, clueId: string, analyzed: boolean = true): boolean {
  const state = runtimeStates.get(caseId)
  if (!state) return false
  const clueState = state.clueStates[clueId]
  if (!clueState) return false
  clueState.analyzed = analyzed
  return true
}

export function isClueAnalyzed(caseId: string, clueId: string): boolean {
  return runtimeStates.get(caseId)?.clueStates[clueId]?.analyzed ?? false
}

export function hydrateCase(caseId: string): Case | null {
  const caseDef = caseDefinitions.get(caseId)
  const runtimeState = runtimeStates.get(caseId)
  if (!caseDef || !runtimeState) return null

  const scenes: Scene[] = caseDef.scenes.map(sceneDef => {
    const sceneState = runtimeState.sceneStates[sceneDef.id]
    const evidence: Evidence[] = sceneDef.evidence.map(eDef => {
      const eState = sceneState?.evidenceStates[eDef.id]
      return { ...eDef, discovered: eState?.discovered ?? false }
    })
    return {
      ...sceneDef,
      searched: sceneState?.searched ?? false,
      locked: sceneState?.locked ?? (sceneDef as any).locked ?? false,
      evidence
    }
  })

  const clues: Clue[] = caseDef.clues.map(clueDef => {
    const clueState = runtimeState.clueStates[clueDef.id]
    return {
      ...clueDef,
      discovered: clueState?.discovered ?? false,
      analyzed: clueState?.analyzed ?? false
    }
  })

  return {
    ...caseDef,
    status: runtimeState.status,
    scenes,
    clues
  }
}

export function hydrateAllCases(): Case[] {
  return Array.from(caseDefinitions.keys())
    .map(id => hydrateCase(id))
    .filter((c): c is Case => c !== null)
}

export function createEvidence(
  id: string,
  name: string,
  description: string,
  options: Partial<EvidenceDefinition> = {}
): EvidenceDefinition {
  return {
    id,
    name,
    description,
    type: options.type ?? 'document',
    sanityEffect: options.sanityEffect ?? -5,
    location: options.location ?? { x: 50, y: 50 },
    size: options.size ?? { width: 15, height: 15 },
    baseHitRate: options.baseHitRate ?? 60,
    toolBoost: options.toolBoost,
    requiredTool: options.requiredTool,
    isSpecial: options.isSpecial,
    hiddenClues: options.hiddenClues,
    isInitiallyHidden: options.isInitiallyHidden,
    isNgPlusOnly: options.isNgPlusOnly,
    discoveryTrigger: options.discoveryTrigger,
    materialDrops: options.materialDrops,
    processable: options.processable,
    processRecipeId: options.processRecipeId,
    image: options.image,
    imageUrl: options.imageUrl,
    imageAlt: options.imageAlt,
    textContent: options.textContent,
    textFragmentStyle: options.textFragmentStyle,
    audioUrl: options.audioUrl,
    audioDuration: options.audioDuration,
    audioTranscript: options.audioTranscript,
    audioSpeaker: options.audioSpeaker
  }
}

export function createScene(
  id: string,
  name: string,
  description: string,
  evidence: EvidenceDefinition[] = [],
  options: Partial<SceneDefinition> = {}
): SceneDefinition {
  return {
    id,
    name,
    description,
    background: options.background ?? 'default',
    evidence,
    sceneOrder: options.sceneOrder,
    unlockNarrative: options.unlockNarrative,
    unlockConditions: options.unlockConditions,
    lockIcon: options.lockIcon,
    lockedDescription: options.lockedDescription,
    isSecretScene: options.isSecretScene,
    unlockRewardText: options.unlockRewardText,
    unlockBgm: options.unlockBgm,
    unlockCondition: options.unlockCondition
  }
}

export function createClue(
  id: string,
  name: string,
  description: string,
  source: string,
  options: Partial<ClueDefinition> = {}
): ClueDefinition {
  return {
    id,
    name,
    description,
    type: options.type ?? 'deduction',
    source,
    connections: options.connections ?? [],
    importance: options.importance ?? 3,
    analysisResult: options.analysisResult,
    requiredToolForAnalysis: options.requiredToolForAnalysis
  }
}

export function createCase(
  id: string,
  title: string,
  description: string,
  scenes: SceneDefinition[],
  clues: ClueDefinition[],
  conclusion: Conclusion,
  options: Partial<Omit<CaseDefinition, 'id' | 'title' | 'description' | 'scenes' | 'clues' | 'conclusion'>> = {}
): CaseDefinition {
  return {
    id,
    title,
    description,
    difficulty: options.difficulty ?? 'normal',
    sanityCost: options.sanityCost ?? 20,
    recommendedSanity: options.recommendedSanity ?? 70,
    startingTools: options.startingTools,
    chapter: options.chapter ?? 1,
    prerequisites: options.prerequisites ?? [],
    rewards: options.rewards ?? { tools: [], unlocksCases: [], sanityBonus: 10, description: '' },
    branchRewards: options.branchRewards,
    timeLimit: options.timeLimit ?? {
      totalSeconds: 900,
      sceneSwitchCost: 10,
      searchAttemptCost: 5,
      failedSearchPenalty: 15,
      clueAnalysisCost: 8,
      specialEventBonus: 30
    },
    scenes,
    clues,
    conclusion,
    sideClueGroups: options.sideClueGroups
  }
}

export function applyCasePatch(caseDef: CaseDefinition, patch: CaseDefinitionPatch): CaseDefinition {
  const patchedScenes = patch.scenes
    ? caseDef.scenes.map((scene, index) => ({
        ...scene,
        ...(patch.scenes![index] ?? {})
      }))
    : caseDef.scenes

  const patchedClues = patch.clues
    ? caseDef.clues.map((clue, index) => ({
        ...clue,
        ...(patch.clues![index] ?? {})
      }))
    : caseDef.clues

  const { scenes: _s, clues: _c, ...restPatch } = patch

  return {
    ...caseDef,
    ...restPatch,
    scenes: patchedScenes as SceneDefinition[],
    clues: patchedClues as ClueDefinition[]
  }
}

export function registerTemplatePreset(preset: CaseTemplatePreset): void {
  templatePresets.set(preset.id, preset)
}

export function getTemplatePreset(presetId: string): CaseTemplatePreset | undefined {
  return templatePresets.get(presetId)
}

export function createCaseFromTemplate(
  presetId: string,
  caseId: string,
  title: string,
  description: string,
  overrides: CaseDefinitionPatch = {}
): CaseDefinition | null {
  const preset = templatePresets.get(presetId)
  if (!preset) return null

  const baseEvidence = preset.baseEvidence.map(e => ({ ...e, id: `${caseId}-${e.id}` }))
  const baseClues = preset.baseClues.map(c => ({
    ...c,
    id: `${caseId}-${c.id}`,
    connections: c.connections.map(conn => `${caseId}-${conn}`)
  }))

  const defaultScene = createScene(
    `${caseId}-scene-1`,
    '默认场景',
    '请修改此场景的名称和描述',
    baseEvidence,
    { sceneOrder: 1 }
  )

  const baseCase = createCase(
    caseId,
    title,
    description,
    [defaultScene],
    baseClues,
    {
      correctAnswer: '',
      evidence: [],
      sanityThreshold: 30,
      options: []
    },
    {
      timeLimit: { ...preset.defaultTimeLimit },
      sanityCost: preset.defaultSanityCost,
      recommendedSanity: preset.defaultRecommendedSanity
    }
  )

  return applyCasePatch(baseCase, overrides)
}

export function cloneCaseDefinition(sourceCaseId: string, newCaseId: string, newTitle?: string): CaseDefinition | null {
  const source = caseDefinitions.get(sourceCaseId)
  if (!source) return null

  const prefixMap = new Map<string, string>()
  source.scenes.forEach((s, i) => prefixMap.set(s.id, `${newCaseId}-scene-${i + 1}`))
  source.clues.forEach((c, i) => prefixMap.set(c.id, `${newCaseId}-clue-${i + 1}`))
  source.scenes.forEach(scene => {
    scene.evidence.forEach((e, i) => {
      prefixMap.set(e.id, `${newCaseId}-evidence-${scene.sceneOrder ?? 1}-${i + 1}`)
    })
  })

  const replaceIds = (id: string): string => prefixMap.get(id) ?? id

  const scenes: SceneDefinition[] = source.scenes.map(scene => ({
    ...scene,
    id: replaceIds(scene.id),
    evidence: scene.evidence.map(e => ({
      ...e,
      id: replaceIds(e.id),
      hiddenClues: e.hiddenClues?.map(replaceIds),
      discoveryTrigger: e.discoveryTrigger
        ? {
            ...e.discoveryTrigger,
            requiredClueId: e.discoveryTrigger.requiredClueId ? replaceIds(e.discoveryTrigger.requiredClueId) : undefined,
            requiredEvidenceId: e.discoveryTrigger.requiredEvidenceId ? replaceIds(e.discoveryTrigger.requiredEvidenceId) : undefined,
            requiredEvidenceIds: e.discoveryTrigger.requiredEvidenceIds?.map(replaceIds),
            requiredClueIds: e.discoveryTrigger.requiredClueIds?.map(replaceIds),
            sceneId: e.discoveryTrigger.sceneId ? replaceIds(e.discoveryTrigger.sceneId) : undefined
          }
        : undefined
    })),
    unlockConditions: scene.unlockConditions?.map(cond => ({
      ...cond,
      requiredEvidenceIds: cond.requiredEvidenceIds?.map(replaceIds),
      requiredClueIds: cond.requiredClueIds?.map(replaceIds),
      requiredSceneIds: cond.requiredSceneIds?.map(replaceIds)
    }))
  }))

  const clues: ClueDefinition[] = source.clues.map(clue => ({
    ...clue,
    id: replaceIds(clue.id),
    connections: clue.connections.map(replaceIds)
  }))

  const conclusion = source.conclusion
    ? {
        ...source.conclusion,
        correctAnswer: replaceIds(source.conclusion.correctAnswer),
        evidence: source.conclusion.evidence.map(replaceIds),
        options: source.conclusion.options.map(opt => ({
          ...opt,
          id: opt.id.startsWith('conclusion-') ? `${newCaseId}-${opt.id}` : opt.id,
          requiredEvidence: opt.requiredEvidence?.map(replaceIds)
        }))
      }
    : { correctAnswer: '', evidence: [], sanityThreshold: 30, options: [] }

  return {
    ...source,
    id: newCaseId,
    title: newTitle ?? `${source.title} (副本)`,
    scenes,
    clues,
    conclusion,
    prerequisites: source.prerequisites.includes(sourceCaseId)
      ? source.prerequisites.filter(p => p !== sourceCaseId)
      : source.prerequisites,
    rewards: source.rewards
      ? { ...source.rewards, unlocksCases: source.rewards.unlocksCases.map(replaceIds) }
      : source.rewards,
    branchRewards: source.branchRewards
      ? Object.fromEntries(
          Object.entries(source.branchRewards).map(([k, v]) => [
            k,
            { ...v, unlocksCases: v.unlocksCases.map(replaceIds) }
          ])
        )
      : source.branchRewards
  }
}

export function getRegistryStats(): CaseRegistryStats {
  const casesByDifficulty: Record<string, number> = {}
  const casesByChapter: Record<string, number> = {}
  let totalScenes = 0
  let totalEvidence = 0
  let totalClues = 0

  caseDefinitions.forEach(c => {
    casesByDifficulty[c.difficulty] = (casesByDifficulty[c.difficulty] ?? 0) + 1
    casesByChapter[String(c.chapter)] = (casesByChapter[String(c.chapter)] ?? 0) + 1
    totalScenes += c.scenes.length
    c.scenes.forEach(s => (totalEvidence += s.evidence.length))
    totalClues += c.clues.length
  })

  return {
    totalCases: caseDefinitions.size,
    totalScenes,
    totalEvidence,
    totalClues,
    casesByDifficulty,
    casesByChapter
  }
}

export function findEvidenceByIdGlobally(evidenceId: string): { caseId: string; sceneId: string; evidence: EvidenceDefinition } | null {
  for (const [caseId, caseDef] of caseDefinitions) {
    for (const scene of caseDef.scenes) {
      const found = scene.evidence.find(e => e.id === evidenceId)
      if (found) {
        return { caseId, sceneId: scene.id, evidence: found }
      }
    }
  }
  return null
}

export function findClueByIdGlobally(clueId: string): { caseId: string; clue: ClueDefinition } | null {
  for (const [caseId, caseDef] of caseDefinitions) {
    const found = caseDef.clues.find(c => c.id === clueId)
    if (found) {
      return { caseId, clue: found }
    }
  }
  return null
}

export function validateRegistry(): ValidationResult {
  return validateAllCaseDefinitions(getAllCaseDefinitions(), { toolIds, materialIds })
}

export const readonlyCaseDefinitions = readonly(caseDefinitions)
export const readonlyRuntimeStates = readonly(runtimeStates)
