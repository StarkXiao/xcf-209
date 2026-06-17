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
  startingTools?: string[]
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
  toolBoost?: string[]
  baseHitRate: number
  isSpecial?: boolean
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
  requiredToolForAnalysis?: string
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
  requiredTools?: string[]
  requiredEvidence?: string[]
  branch?: string
}

export interface Tool {
  id: string
  name: string
  description: string
  icon: string
  type: ToolType
  uses: number
  maxUses: number
  durability: number
  maxDurability: number
  hitRateBonus: number
  effectiveEvidenceTypes: Evidence['type'][]
  tier: number
  repairable: boolean
  repairCost?: number
}

export type ToolType = 'magnifier' | 'fingerprint' | 'uv_light' | 'recorder' | 'analyzer' | 'picklock'

export interface ToolInventory {
  tools: Tool[]
  selectedToolId: string | null
}

export interface HitRateResult {
  baseRate: number
  toolBonus: number
  durabilityPenalty: number
  sanityPenalty: number
  finalRate: number
  isGuaranteed: boolean
  isImpossible: boolean
}

export interface SearchResult {
  success: boolean
  evidenceId: string
  hitRate: number
  toolUsed?: string
  durabilityLost: number
  message: string
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
  tools: Tool[]
  selectedToolId: string | null
  failedSearches: string[]
  deductionBranches: string[]
}

export interface GameLogEntry {
  id: string
  timestamp: number
  type: 'discovery' | 'analysis' | 'connection' | 'sanity_loss' | 'conclusion' | 'tool_use' | 'tool_repair' | 'tool_break'
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
  isNewGamePlus?: boolean
  inheritedTools?: string[]
}

export interface SanityEvent {
  id: string
  name: string
  description: string
  sanityLoss: number
  type: 'horror' | 'knowledge' | 'trauma' | 'revelation'
}

export interface DeductionBranch {
  id: string
  name: string
  description: string
  requiredTools: string[]
  requiredEvidence: string[]
  unlocksOptions: string[]
}
