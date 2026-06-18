import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type {
  Case,
  CaseDefinition,
  CaseRuntimeState,
  CaseRegistryStats,
  ValidationResult,
  CaseBatchImportResult,
  CaseTemplatePreset,
  CaseDefinitionPatch,
  EvidenceDefinition,
  SceneDefinition,
  ClueDefinition
} from '@/types'
import {
  caseRegistry,
  cases,
  getCaseById,
  getAllCases,
  setCaseStatus,
  completeCase,
  failCase,
  abandonCase,
  reopenCase,
  resetCaseForReplay,
  unlockNextCase,
  getEvidenceById,
  initializeCaseRegistry
} from '@/data/cases'

export const useCaseStateStore = defineStore('caseState', () => {
  const lastValidationResult = ref<ValidationResult | null>(null)

  const allCases = computed<Case[]>(() => getAllCases())

  const availableCases = computed(() =>
    allCases.value.filter(c => c.status === 'available')
  )

  const inProgressCases = computed(() =>
    allCases.value.filter(c => c.status === 'in_progress' || c.status === 'reopened')
  )

  const completedCases = computed(() =>
    allCases.value.filter(c => c.status === 'completed')
  )

  const failedCases = computed(() =>
    allCases.value.filter(c => c.status === 'failed')
  )

  const abandonedCases = computed(() =>
    allCases.value.filter(c => c.status === 'abandoned')
  )

  const lockedCases = computed(() =>
    allCases.value.filter(c => c.status === 'locked')
  )

  const stats = computed<CaseRegistryStats | null>(() => {
    try {
      return caseRegistry.getStats()
    } catch {
      return null
    }
  })

  function getCase(caseId: string): Case | undefined {
    return getCaseById(caseId)
  }

  function getDefinition(caseId: string): CaseDefinition | undefined {
    return caseRegistry.getDefinition(caseId)
  }

  function getRuntimeState(caseId: string): CaseRuntimeState | undefined {
    return caseRegistry.getRuntimeState(caseId)
  }

  function hasCase(caseId: string): boolean {
    return caseRegistry.has(caseId)
  }

  function getCaseStatus(caseId: string): Case['status'] | null {
    return caseRegistry.getStatus(caseId)
  }

  function updateStatus(caseId: string, status: Case['status']): boolean {
    return setCaseStatus(caseId, status)
  }

  function markComplete(caseId: string): boolean {
    return completeCase(caseId)
  }

  function markFailed(caseId: string): boolean {
    return failCase(caseId)
  }

  function markAbandoned(caseId: string): boolean {
    return abandonCase(caseId)
  }

  function reopen(caseId: string): boolean {
    return reopenCase(caseId)
  }

  function resetForReplay(caseId: string): boolean {
    return resetCaseForReplay(caseId)
  }

  function unlockNext(currentCaseId: string): void {
    unlockNextCase(currentCaseId)
  }

  function getEvidence(caseId: string, evidenceId: string) {
    return getEvidenceById(caseId, evidenceId)
  }

  function findEvidenceGlobally(evidenceId: string) {
    return caseRegistry.findEvidence(evidenceId)
  }

  function findClueGlobally(clueId: string) {
    return caseRegistry.findClue(clueId)
  }

  function isEvidenceDiscovered(caseId: string, sceneId: string, evidenceId: string): boolean {
    return caseRegistry.isEvidenceDiscovered(caseId, sceneId, evidenceId)
  }

  function markEvidenceDiscovered(caseId: string, sceneId: string, evidenceId: string, discovered: boolean = true): boolean {
    const result = caseRegistry.markEvidenceDiscovered(caseId, sceneId, evidenceId, discovered)
    if (result) {
      const caseData = casesArrayFind(caseId)
      if (caseData) {
        const scene = caseData.scenes.find(s => s.id === sceneId)
        const evidence = scene?.evidence.find(e => e.id === evidenceId)
        if (evidence) evidence.discovered = discovered
      }
    }
    return result
  }

  function isSceneSearched(caseId: string, sceneId: string): boolean {
    return caseRegistry.isSceneSearched(caseId, sceneId)
  }

  function markSceneSearched(caseId: string, sceneId: string, searched: boolean = true): boolean {
    const result = caseRegistry.markSceneSearched(caseId, sceneId, searched)
    if (result) {
      const caseData = casesArrayFind(caseId)
      if (caseData) {
        const scene = caseData.scenes.find(s => s.id === sceneId)
        if (scene) scene.searched = searched
      }
    }
    return result
  }

  function isSceneLocked(caseId: string, sceneId: string): boolean {
    return caseRegistry.isSceneLocked(caseId, sceneId)
  }

  function setSceneLocked(caseId: string, sceneId: string, locked: boolean): boolean {
    const result = caseRegistry.setSceneLocked(caseId, sceneId, locked)
    if (result) {
      const caseData = casesArrayFind(caseId)
      if (caseData) {
        const scene = caseData.scenes.find(s => s.id === sceneId)
        if (scene) scene.locked = locked
      }
    }
    return result
  }

  function isClueDiscovered(caseId: string, clueId: string): boolean {
    return caseRegistry.isClueDiscovered(caseId, clueId)
  }

  function markClueDiscovered(caseId: string, clueId: string, discovered: boolean = true): boolean {
    const result = caseRegistry.markClueDiscovered(caseId, clueId, discovered)
    if (result) {
      const caseData = casesArrayFind(caseId)
      if (caseData) {
        const clue = caseData.clues.find(c => c.id === clueId)
        if (clue) clue.discovered = discovered
      }
    }
    return result
  }

  function isClueAnalyzed(caseId: string, clueId: string): boolean {
    return caseRegistry.isClueAnalyzed(caseId, clueId)
  }

  function markClueAnalyzed(caseId: string, clueId: string, analyzed: boolean = true): boolean {
    const result = caseRegistry.markClueAnalyzed(caseId, clueId, analyzed)
    if (result) {
      const caseData = casesArrayFind(caseId)
      if (caseData) {
        const clue = caseData.clues.find(c => c.id === clueId)
        if (clue) clue.analyzed = analyzed
      }
    }
    return result
  }

  function resetRuntimeState(caseId: string): boolean {
    return caseRegistry.resetRuntimeState(caseId)
  }

  function resetAllRuntimeStates(): void {
    caseRegistry.resetAllRuntimeStates()
  }

  function registerCase(caseDef: CaseDefinition, validate: boolean = true): { success: boolean; errors: ValidationResult | null } {
    const result = caseRegistry.register(caseDef, validate)
    if (result.success) {
      const hydrated = caseRegistry.hydrateCase(caseDef.id)
      if (hydrated) {
        if (!cases.find((c: Case) => c.id === caseDef.id)) {
          cases.push(hydrated)
        }
      }
    }
    return result
  }

  function batchRegisterCases(
    caseDefs: CaseDefinition[],
    options: { validate: boolean; stopOnError: boolean } = { validate: true, stopOnError: false }
  ): CaseBatchImportResult {
    const result = caseRegistry.batchRegister(caseDefs, options)
    result.importedIds.forEach(id => {
      if (!cases.find((c: Case) => c.id === id)) {
        const hydrated = caseRegistry.hydrateCase(id)
        if (hydrated) cases.push(hydrated)
      }
    })
    return result
  }

  function unregisterCase(caseId: string): boolean {
    const idx = cases.findIndex((c: Case) => c.id === caseId)
    if (idx >= 0) cases.splice(idx, 1)
    return caseRegistry.unregister(caseId)
  }

  function cloneCase(sourceCaseId: string, newCaseId: string, newTitle?: string): CaseDefinition | null {
    return caseRegistry.clone(sourceCaseId, newCaseId, newTitle)
  }

  function createEvidence(
    id: string,
    name: string,
    description: string,
    options: Partial<EvidenceDefinition> = {}
  ): EvidenceDefinition {
    return caseRegistry.createEvidence(id, name, description, options)
  }

  function createScene(
    id: string,
    name: string,
    description: string,
    evidence: EvidenceDefinition[] = [],
    options: Partial<SceneDefinition> = {}
  ): SceneDefinition {
    return caseRegistry.createScene(id, name, description, evidence, options)
  }

  function createClue(
    id: string,
    name: string,
    description: string,
    source: string,
    options: Partial<ClueDefinition> = {}
  ): ClueDefinition {
    return caseRegistry.createClue(id, name, description, source, options)
  }

  function createCase(
    id: string,
    title: string,
    description: string,
    scenes: SceneDefinition[],
    clues: ClueDefinition[],
    conclusion: CaseDefinition['conclusion'],
    options: Partial<Omit<CaseDefinition, 'id' | 'title' | 'description' | 'scenes' | 'clues' | 'conclusion'>> = {}
  ): CaseDefinition {
    return caseRegistry.createCase(id, title, description, scenes, clues, conclusion, options)
  }

  function applyPatch(caseDef: CaseDefinition, patch: CaseDefinitionPatch): CaseDefinition {
    return caseRegistry.applyPatch(caseDef, patch)
  }

  function registerTemplate(preset: CaseTemplatePreset): void {
    caseRegistry.registerTemplate(preset)
  }

  function getTemplate(presetId: string): CaseTemplatePreset | undefined {
    return caseRegistry.getTemplate(presetId)
  }

  function createFromTemplate(
    presetId: string,
    caseId: string,
    title: string,
    description: string,
    overrides: CaseDefinitionPatch = {}
  ): CaseDefinition | null {
    return caseRegistry.createFromTemplate(presetId, caseId, title, description, overrides)
  }

  function validate(printToConsole: boolean = false): ValidationResult {
    const result = caseRegistry.validate()
    lastValidationResult.value = result
    if (printToConsole) {
      console.log(caseRegistry.formatValidation(result))
    }
    return result
  }

  function formatValidation(result: ValidationResult): string {
    return caseRegistry.formatValidation(result)
  }

  function getCasesByChapter(chapter: number): Case[] {
    return allCases.value.filter(c => c.chapter === chapter)
  }

  function getCasesByDifficulty(difficulty: CaseDefinition['difficulty']): Case[] {
    return allCases.value.filter(c => c.difficulty === difficulty)
  }

  function getCasesByPrerequisite(prerequisiteCaseId: string): Case[] {
    return allCases.value.filter(c => c.prerequisites.includes(prerequisiteCaseId))
  }

  function ensureInitialized(): void {
    initializeCaseRegistry()
  }

  function casesArrayFind(caseId: string): Case | undefined {
    return cases.find((c: Case) => c.id === caseId)
  }

  return {
    allCases,
    availableCases,
    inProgressCases,
    completedCases,
    failedCases,
    abandonedCases,
    lockedCases,
    stats,
    lastValidationResult,
    getCase,
    getDefinition,
    getRuntimeState,
    hasCase,
    getCaseStatus,
    updateStatus,
    markComplete,
    markFailed,
    markAbandoned,
    reopen,
    resetForReplay,
    unlockNext,
    getEvidence,
    findEvidenceGlobally,
    findClueGlobally,
    isEvidenceDiscovered,
    markEvidenceDiscovered,
    isSceneSearched,
    markSceneSearched,
    isSceneLocked,
    setSceneLocked,
    isClueDiscovered,
    markClueDiscovered,
    isClueAnalyzed,
    markClueAnalyzed,
    resetRuntimeState,
    resetAllRuntimeStates,
    registerCase,
    batchRegisterCases,
    unregisterCase,
    cloneCase,
    createEvidence,
    createScene,
    createClue,
    createCase,
    applyPatch,
    registerTemplate,
    getTemplate,
    createFromTemplate,
    validate,
    formatValidation,
    getCasesByChapter,
    getCasesByDifficulty,
    getCasesByPrerequisite,
    ensureInitialized
  }
})
