export interface Case {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'normal' | 'hard'
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  scenes: Scene[]
  clues: Clue[]
  conclusion: Conclusion
  sanityCost: number
  recommendedSanity: number
}

export interface Scene {
  id: string
  name: string
  description: string
  background: string
  evidence: Evidence[]
  searched: boolean
  locked?: boolean
  unlockCondition?: string
}

export interface Evidence {
  id: string
  name: string
  description: string
  type: 'document' | 'object' | 'trace' | 'testimony'
  image?: string
  sanityEffect: number
  discovered: boolean
  location: { x: number; y: number }
  size: { width: number; height: number }
  requiredTool?: string
  hiddenClues?: string[]
}

export interface Clue {
  id: string
  name: string
  description: string
  type: 'physical' | 'testimonial' | 'documentary' | 'deduction'
  source: string
  connections: string[]
  importance: number
  discovered: boolean
  analyzed: boolean
  analysisResult?: string
}

export interface ClueConnection {
  clue1Id: string
  clue2Id: string
  relationship: string
  confirmed: boolean
}

export interface Conclusion {
  correctAnswer: string
  options: ConclusionOption[]
  evidence: string[]
  sanityThreshold: number
}

export interface ConclusionOption {
  id: string
  text: string
  isCorrect: boolean
  sanityCost: number
  feedback: string
}

export interface GameState {
  currentCase: string | null
  sanity: number
  maxSanity: number
  discoveredEvidence: string[]
  discoveredClues: string[]
  analyzedClues: string[]
  clueConnections: ClueConnection[]
  visitedScenes: string[]
  gameLog: GameLogEntry[]
  startTime: number
  lastSaveTime: number
}

export interface GameLogEntry {
  id: string
  timestamp: number
  type: 'discovery' | 'analysis' | 'connection' | 'sanity_loss' | 'conclusion'
  description: string
  details?: Record<string, unknown>
}

export interface SaveData {
  id: string
  name: string
  caseId: string
  gameState: GameState
  createdAt: number
  updatedAt: number
  screenshot?: string
}

export interface SanityEvent {
  id: string
  name: string
  description: string
  sanityLoss: number
  type: 'horror' | 'knowledge' | 'trauma' | 'revelation'
}

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  uses: number
  maxUses: number
}