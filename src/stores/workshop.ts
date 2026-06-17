import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import type { Case, Scene, Evidence, Clue, Conclusion, ConclusionOption } from '@/types'

export type WorkshopTab = 'basic' | 'evidence' | 'clues' | 'conclusion' | 'preview'

export interface WorkshopState {
  currentCase: Case | null
  activeTab: WorkshopTab
  isDirty: boolean
  previewMode: boolean
}

const createEmptyCase = (): Case => ({
  id: `case-custom-${Date.now()}`,
  title: '新案件',
  description: '请输入案件描述...',
  difficulty: 'normal',
  status: 'available',
  scenes: [
    {
      id: 'scene-1',
      name: '场景一',
      description: '场景描述...',
      background: 'default',
      evidence: [],
      searched: false
    }
  ],
  clues: [],
  conclusion: {
    correctAnswer: '',
    evidence: [],
    sanityThreshold: 30,
    options: [
      {
        id: 'option-1',
        text: '结论选项一',
        isCorrect: false,
        sanityCost: 5,
        feedback: '反馈信息...'
      }
    ]
  },
  sanityCost: 20,
  recommendedSanity: 70,
  startingTools: [],
  chapter: 1,
  prerequisites: [],
  rewards: {
    tools: [],
    unlocksCases: [],
    sanityBonus: 10,
    description: '案件完成奖励'
  },
  branchRewards: {}
})

export const useWorkshopStore = defineStore('workshop', () => {
  const currentCase = ref<Case | null>(null)
  const activeTab = ref<WorkshopTab>('basic')
  const isDirty = ref(false)
  const previewMode = ref(false)
  const savedCases = ref<Case[]>([])

  const sceneCount = computed(() => currentCase.value?.scenes.length || 0)
  const evidenceCount = computed(() => {
    if (!currentCase.value) return 0
    return currentCase.value.scenes.reduce((sum, s) => sum + s.evidence.length, 0)
  })
  const clueCount = computed(() => currentCase.value?.clues.length || 0)
  const endingCount = computed(() => currentCase.value?.conclusion.options.length || 0)
  const correctEndingCount = computed(() => {
    return currentCase.value?.conclusion.options.filter(o => o.isCorrect).length || 0
  })

  function createNewCase() {
    currentCase.value = createEmptyCase()
    isDirty.value = false
    activeTab.value = 'basic'
    previewMode.value = false
  }

  function loadCase(caseData: Case) {
    currentCase.value = JSON.parse(JSON.stringify(caseData))
    isDirty.value = false
    activeTab.value = 'basic'
    previewMode.value = false
  }

  function setActiveTab(tab: WorkshopTab) {
    activeTab.value = tab
  }

  function markDirty() {
    isDirty.value = true
  }

  function setPreviewMode(enabled: boolean) {
    previewMode.value = enabled
  }

  function updateBasicInfo(info: Partial<Case>) {
    if (!currentCase.value) return
    Object.assign(currentCase.value, info)
    markDirty()
  }

  function addScene() {
    if (!currentCase.value) return
    const newScene: Scene = {
      id: `scene-${Date.now()}`,
      name: `场景${currentCase.value.scenes.length + 1}`,
      description: '',
      background: 'default',
      evidence: [],
      searched: false
    }
    currentCase.value.scenes.push(newScene)
    markDirty()
    return newScene
  }

  function updateScene(sceneId: string, updates: Partial<Scene>) {
    if (!currentCase.value) return
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (scene) {
      Object.assign(scene, updates)
      markDirty()
    }
  }

  function deleteScene(sceneId: string) {
    if (!currentCase.value || currentCase.value.scenes.length <= 1) return
    const index = currentCase.value.scenes.findIndex(s => s.id === sceneId)
    if (index > -1) {
      currentCase.value.scenes.splice(index, 1)
      markDirty()
    }
  }

  function addEvidence(sceneId: string) {
    if (!currentCase.value) return
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (!scene) return

    const newEvidence: Evidence = {
      id: `evidence-${Date.now()}`,
      name: '新证据',
      description: '',
      type: 'document',
      sanityEffect: 0,
      discovered: false,
      location: { x: 50, y: 50 },
      size: { width: 15, height: 20 },
      baseHitRate: 70,
      toolBoost: []
    }
    scene.evidence.push(newEvidence)
    markDirty()
    return newEvidence
  }

  function updateEvidence(sceneId: string, evidenceId: string, updates: Partial<Evidence>) {
    if (!currentCase.value) return
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (!scene) return
    const evidence = scene.evidence.find(e => e.id === evidenceId)
    if (evidence) {
      Object.assign(evidence, updates)
      markDirty()
    }
  }

  function deleteEvidence(sceneId: string, evidenceId: string) {
    if (!currentCase.value) return
    const scene = currentCase.value.scenes.find(s => s.id === sceneId)
    if (!scene) return
    const index = scene.evidence.findIndex(e => e.id === evidenceId)
    if (index > -1) {
      scene.evidence.splice(index, 1)
      markDirty()
    }
  }

  function addClue() {
    if (!currentCase.value) return
    const newClue: Clue = {
      id: `clue-${Date.now()}`,
      name: '新线索',
      description: '',
      type: 'physical',
      source: '',
      connections: [],
      importance: 1,
      discovered: false,
      analyzed: false
    }
    currentCase.value.clues.push(newClue)
    markDirty()
    return newClue
  }

  function updateClue(clueId: string, updates: Partial<Clue>) {
    if (!currentCase.value) return
    const clue = currentCase.value.clues.find(c => c.id === clueId)
    if (clue) {
      Object.assign(clue, updates)
      markDirty()
    }
  }

  function deleteClue(clueId: string) {
    if (!currentCase.value) return
    const index = currentCase.value.clues.findIndex(c => c.id === clueId)
    if (index > -1) {
      currentCase.value.clues.splice(index, 1)
      currentCase.value.clues.forEach(clue => {
        clue.connections = clue.connections.filter(c => c !== clueId)
      })
      markDirty()
    }
  }

  function addClueConnection(clue1Id: string, clue2Id: string) {
    if (!currentCase.value) return
    const clue1 = currentCase.value.clues.find(c => c.id === clue1Id)
    const clue2 = currentCase.value.clues.find(c => c.id === clue2Id)
    if (!clue1 || !clue2 || clue1Id === clue2Id) return

    if (!clue1.connections.includes(clue2Id)) {
      clue1.connections.push(clue2Id)
    }
    if (!clue2.connections.includes(clue1Id)) {
      clue2.connections.push(clue1Id)
    }
    markDirty()
  }

  function removeClueConnection(clue1Id: string, clue2Id: string) {
    if (!currentCase.value) return
    const clue1 = currentCase.value.clues.find(c => c.id === clue1Id)
    const clue2 = currentCase.value.clues.find(c => c.id === clue2Id)
    if (!clue1 || !clue2) return

    clue1.connections = clue1.connections.filter(c => c !== clue2Id)
    clue2.connections = clue2.connections.filter(c => c !== clue1Id)
    markDirty()
  }

  function addConclusionOption() {
    if (!currentCase.value) return
    const newOption: ConclusionOption = {
      id: `option-${Date.now()}`,
      text: '新结论选项',
      isCorrect: false,
      sanityCost: 5,
      feedback: ''
    }
    currentCase.value.conclusion.options.push(newOption)
    markDirty()
    return newOption
  }

  function updateConclusionOption(optionId: string, updates: Partial<ConclusionOption>) {
    if (!currentCase.value) return
    const option = currentCase.value.conclusion.options.find(o => o.id === optionId)
    if (option) {
      Object.assign(option, updates)
      if (updates.isCorrect && !currentCase.value.conclusion.correctAnswer) {
        currentCase.value.conclusion.correctAnswer = optionId
      }
      markDirty()
    }
  }

  function deleteConclusionOption(optionId: string) {
    if (!currentCase.value || currentCase.value.conclusion.options.length <= 1) return
    const index = currentCase.value.conclusion.options.findIndex(o => o.id === optionId)
    if (index > -1) {
      currentCase.value.conclusion.options.splice(index, 1)
      if (currentCase.value.conclusion.correctAnswer === optionId) {
        const firstCorrect = currentCase.value.conclusion.options.find(o => o.isCorrect)
        currentCase.value.conclusion.correctAnswer = firstCorrect?.id || ''
      }
      markDirty()
    }
  }

  function updateConclusion(config: Partial<Conclusion>) {
    if (!currentCase.value) return
    Object.assign(currentCase.value.conclusion, config)
    markDirty()
  }

  function saveCase(): boolean {
    if (!currentCase.value) return false
    
    const existingIndex = savedCases.value.findIndex(c => c.id === currentCase.value!.id)
    const caseData = JSON.parse(JSON.stringify(currentCase.value))
    
    if (existingIndex > -1) {
      savedCases.value[existingIndex] = caseData
    } else {
      savedCases.value.push(caseData)
    }
    
    localStorage.setItem('workshop-cases', JSON.stringify(savedCases.value))
    isDirty.value = false
    return true
  }

  function loadSavedCases() {
    const stored = localStorage.getItem('workshop-cases')
    if (stored) {
      try {
        savedCases.value = JSON.parse(stored)
      } catch (e) {
        savedCases.value = []
      }
    }
  }

  function deleteSavedCase(caseId: string) {
    const index = savedCases.value.findIndex(c => c.id === caseId)
    if (index > -1) {
      savedCases.value.splice(index, 1)
      localStorage.setItem('workshop-cases', JSON.stringify(savedCases.value))
    }
    if (currentCase.value?.id === caseId) {
      currentCase.value = null
    }
  }

  function exportCase(): string {
    if (!currentCase.value) return ''
    return JSON.stringify(currentCase.value, null, 2)
  }

  function importCase(jsonString: string): boolean {
    try {
      const caseData = JSON.parse(jsonString) as Case
      if (!caseData.id || !caseData.title || !caseData.scenes) {
        return false
      }
      currentCase.value = caseData
      isDirty.value = true
      return true
    } catch (e) {
      return false
    }
  }

  function getAllEvidence(): { scene: Scene; evidence: Evidence }[] {
    if (!currentCase.value) return []
    const result: { scene: Scene; evidence: Evidence }[] = []
    currentCase.value.scenes.forEach(scene => {
      scene.evidence.forEach(evidence => {
        result.push({ scene, evidence })
      })
    })
    return result
  }

  return {
    currentCase,
    activeTab,
    isDirty,
    previewMode,
    savedCases,
    sceneCount,
    evidenceCount,
    clueCount,
    endingCount,
    correctEndingCount,
    createNewCase,
    loadCase,
    setActiveTab,
    markDirty,
    setPreviewMode,
    updateBasicInfo,
    addScene,
    updateScene,
    deleteScene,
    addEvidence,
    updateEvidence,
    deleteEvidence,
    addClue,
    updateClue,
    deleteClue,
    addClueConnection,
    removeClueConnection,
    addConclusionOption,
    updateConclusionOption,
    deleteConclusionOption,
    updateConclusion,
    saveCase,
    loadSavedCases,
    deleteSavedCase,
    exportCase,
    importCase,
    getAllEvidence
  }
})
