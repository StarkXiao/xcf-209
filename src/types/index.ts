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
  chapter: number
  prerequisites: string[]
  rewards: CaseRewards
  branchRewards?: Record<string, CaseRewards>
  timeLimit: TimeLimitConfig
}

export interface TimeLimitConfig {
  totalSeconds: number
  sceneSwitchCost: number
  searchAttemptCost: number
  failedSearchPenalty: number
  clueAnalysisCost: number
  specialEventBonus?: number
}

export interface CaseRewards {
  tools: string[]
  unlocksCases: string[]
  sanityBonus: number
  description: string
}

export interface CaseProgress {
  caseId: string
  completed: boolean
  completedAt?: number
  playCount: number
  unlockedBranches: string[]
  bestEnding?: string
  discoveredEvidence: string[]
  discoveredClues: string[]
  totalSanityLost: number
  bestScore?: CaseScoreBreakdown
  bestGrade?: ScoreGrade
  fastestTime?: number
  playHistory: PlayRecord[]
}

export interface PlayRecord {
  completedAt: number
  endingId: string
  branch?: string
  score: CaseScoreBreakdown
  timeUsed: number
  sanityLost: number
}

export interface ChapterNode {
  id: string
  chapter: number
  title: string
  status: 'locked' | 'available' | 'in_progress' | 'completed'
  prerequisites: string[]
  children: string[]
  isLocked: boolean
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
  isInitiallyHidden?: boolean
  discoveryTrigger?: EvidenceDiscoveryTrigger
}

export interface EvidenceDiscoveryTrigger {
  type: 'clue_analyzed' | 'evidence_discovered' | 'scene_visited_count' | 'search_attempt_count' | 'random_after_search'
  requiredClueId?: string
  requiredEvidenceId?: string
  requiredSceneVisitCount?: number
  requiredSearchAttempts?: number
  chance?: number
  sceneId?: string
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
  type: 'discovery' | 'analysis' | 'connection' | 'sanity_loss' | 'conclusion' | 'tool_use' | 'tool_repair' | 'tool_break' | 'timer' | 'scene_switch' | 'timeout' | 'penalty' | 'bonus' | 'evidence_refresh'
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

export interface CharacterStats {
  courage: number
  wisdom: number
  perception: number
  willpower: number
  luck: number
}

export type TalentEffectType = 
  | 'sanity_cost_reduction'
  | 'sanity_recovery_bonus'
  | 'clue_analysis_speed'
  | 'clue_discovery_bonus'
  | 'evidence_hit_rate'
  | 'event_trigger_chance'
  | 'special_event_unlock'
  | 'tool_durability_bonus'
  | 'max_sanity_bonus'
  | 'starting_tools'
  | 'luck_bonus'

export interface TalentEffect {
  type: TalentEffectType
  value: number
  description: string
}

export interface Talent {
  id: string
  name: string
  description: string
  icon: string
  rarity: 'common' | 'rare' | 'legendary'
  effects: TalentEffect[]
  prerequisites?: string[]
  requiredStats?: Partial<CharacterStats>
  unlocked: boolean
}

export interface CharacterProfile {
  id: string
  name: string
  title: string
  avatar: string
  background: string
  stats: CharacterStats
  talents: string[]
  createdAt: number
  updatedAt: number
  playCount: number
  completedCases: string[]
  totalSanityLost: number
  totalEvidenceDiscovered: number
  isActive: boolean
}

export interface SceneEvent {
  id: string
  name: string
  description: string
  type: 'positive' | 'negative' | 'neutral' | 'special'
  triggerCondition: {
    type: 'random' | 'scene_enter' | 'evidence_found' | 'sanity_level' | 'talent_based'
    chance?: number
    sanityThreshold?: number
    requiredTalent?: string
    requiredScene?: string
  }
  effects: {
    sanity?: number
    clueDiscovery?: string[]
    evidenceBonus?: number
    unlockEvent?: string
  }
  triggered: boolean
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
  characterProfileId: string | null
  triggeredEvents: string[]
  unlockedHiddenEvidence: string[]
  timerState: TimerState
}

export interface TimerState {
  remainingSeconds: number
  totalSeconds: number
  isRunning: boolean
  isPaused: boolean
  isExpired: boolean
  timeBonusUsed: number
  lastActionTime: number
  sceneSwitchCount: number
  searchAttemptCount: number
  failedSearchCount: number
  clueAnalysisCount: number
  evidenceRefreshCount: number
}

export interface CaseScoreBreakdown {
  evidenceScore: number
  clueScore: number
  deductionScore: number
  timeScore: number
  sanityScore: number
  bonusScore: number
  penaltyScore: number
  totalScore: number
  grade: ScoreGrade
  gradeDescription: string
}

export type ScoreGrade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F'

export interface CaseScoreConfig {
  evidenceWeight: number
  clueWeight: number
  deductionWeight: number
  timeWeight: number
  sanityWeight: number
  bonusMultiplier: number
  penaltyMultiplier: number
  gradeThresholds: Record<ScoreGrade, number>
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
  characterProfileId?: string
}

export type AnomalyEventType = 'hallucination' | 'misleading_clue' | 'extra_log' | 'deduction_candidate'

export type SanityTier = 'normal' | 'mild' | 'moderate' | 'severe' | 'critical'

export interface AnomalyEvent {
  id: string
  name: string
  description: string
  type: AnomalyEventType
  sanityTier: SanityTier
  triggerChance: number
  cooldown: number
  effects: AnomalyEffect
  triggered: boolean
  lastTriggeredAt?: number
}

export interface AnomalyEffect {
  hallucination?: HallucinationEffect
  misleadingClue?: MisleadingClue
  extraLog?: ExtraLogEntry
  deductionCandidate?: DeductionCandidateChange
}

export interface HallucinationEffect {
  visualType: 'shadow' | 'distortion' | 'phantom' | 'text_corruption'
  intensity: number
  duration: number
  message?: string
}

export interface MisleadingClue {
  fakeClueId: string
  fakeClueName: string
  fakeClueDescription: string
  fakeClueType: Clue['type']
  fakeConnections: string[]
  expiresAt?: number
  isDisproven: boolean
}

export interface ExtraLogEntry {
  logType: GameLogEntry['type']
  description: string
  details?: Record<string, unknown>
  isFake: boolean
}

export interface DeductionCandidateChange {
  fakeOptionId: string
  fakeOptionText: string
  fakeSanityCost: number
  fakeRequiredEvidence?: string[]
  isDisproven: boolean
  expiresAt?: number
}

export interface AnomalyState {
  activeHallucinations: HallucinationEffect[]
  activeMisleadingClues: MisleadingClue[]
  activeFakeLogs: ExtraLogEntry[]
  activeFakeDeductions: DeductionCandidateChange[]
  anomalyEventHistory: string[]
  lastAnomalyCheck: number
  anomalyCooldowns: Record<string, number>
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
  characterProfileId: string | null
  triggeredEvents: string[]
  unlockedHiddenEvidence: string[]
  timerState: TimerState
  anomalyState: AnomalyState
}
