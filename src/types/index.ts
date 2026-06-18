export interface Case {
  id: string
  title: string
  description: string
  difficulty: 'easy' | 'normal' | 'hard'
  status: 'locked' | 'available' | 'in_progress' | 'completed' | 'reopened' | 'failed' | 'abandoned'
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
  lastStatus?: Case['status']
  failedCount: number
  abandonedCount: number
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

export type SceneUnlockConditionType = 
  | 'evidence_combo' 
  | 'clue_combo' 
  | 'any_evidence' 
  | 'any_clue'
  | 'scene_visited'
  | 'clue_analyzed'
  | 'phase_unlocked'
  | 'tool_owned'
  | 'sanity_under'
  | 'sanity_over'
  | 'evidence_discovered_count'
  | 'clue_discovered_count'
  | 'clue_analyzed_count'
  | 'deduction_branch'
  | 'custom_event'

export interface SceneUnlockCondition {
  type: SceneUnlockConditionType
  requiredEvidenceIds?: string[]
  requiredClueIds?: string[]
  requiredSceneIds?: string[]
  requiredPhaseIds?: string[]
  requiredToolIds?: string[]
  requiredBranchIds?: string[]
  requiredEventIds?: string[]
  requiredCount?: number
  sanityThreshold?: number
  description?: string
  narrativeHint?: string
}

export interface SceneLockState {
  isLocked: boolean
  unlockedAt?: number
  unlockAnimationShown?: boolean
}

export interface SceneUnlockConditionProgressDetail {
  satisfied: boolean
  description: string
  progressText?: string
}

export interface SceneUnlockConditionProgress {
  total: number
  satisfied: number
  description: string
  conditions: SceneUnlockConditionProgressDetail[]
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
  unlockConditions?: SceneUnlockCondition[]
  lockIcon?: string
  lockedDescription?: string
  unlockNarrative?: string
  sceneOrder?: number
  isSecretScene?: boolean
  unlockRewardText?: string
  unlockBgm?: string
}

export type EvidenceType = 'document' | 'object' | 'trace' | 'testimony' | 'image' | 'text_fragment' | 'audio'

export interface Evidence {
  id: string
  name: string
  description: string
  type: EvidenceType
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
  isNgPlusOnly?: boolean
  discoveryTrigger?: EvidenceDiscoveryTrigger
  materialDrops?: MaterialDrop[]
  processable?: boolean
  processRecipeId?: string
  imageUrl?: string
  imageAlt?: string
  textContent?: string
  textFragmentStyle?: 'aged_paper' | 'burnt_edge' | 'torn' | 'handwritten' | 'typewritten'
  audioUrl?: string
  audioDuration?: number
  audioTranscript?: string
  audioSpeaker?: string
}

export interface EvidenceDiscoveryTrigger {
  type: 'clue_analyzed' | 'evidence_discovered' | 'scene_visited_count' | 'search_attempt_count' | 'random_after_search' | 'evidence_combo'
  requiredClueId?: string
  requiredEvidenceId?: string
  requiredSceneVisitCount?: number
  requiredSearchAttempts?: number
  chance?: number
  sceneId?: string
  requiredEvidenceIds?: string[]
  requiredClueIds?: string[]
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
  confidence?: number
  supportedBy?: string[]
  createdAt?: number
}

export type AnnotationType = 'note' | 'question' | 'hypothesis' | 'important' | 'contradiction'

export interface ClueAnnotation {
  id: string
  clueId: string
  content: string
  type: AnnotationType
  createdAt: number
  updatedAt: number
  author?: string
}

export interface ClueConfidence {
  clueId: string
  confidence: number
  reasoning: string
  taggedAt: number
  tags: string[]
  evidenceSupporting: string[]
  evidenceContradicting: string[]
}

export interface ClueComparison {
  id: string
  clue1Id: string
  clue2Id: string
  similarities: string[]
  differences: string[]
  conclusion: string
  supportsConnection: boolean
  connectionConfidence: number
  createdAt: number
  updatedAt: number
}

export interface DeductionHint {
  id: string
  type: 'suggestion' | 'warning' | 'insight' | 'contradiction'
  content: string
  relatedClues: string[]
  relatedConnections?: string[]
  priority: number
  source: 'annotation' | 'comparison' | 'confidence' | 'pattern'
  createdAt: number
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
  isNgPlusExclusive?: boolean
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

export interface MaterialDrop {
  materialId: string
  minQuantity: number
  maxQuantity: number
  chance: number
}

export type MaterialType = 'organic' | 'inorganic' | 'arcane' | 'document' | 'tool_part' | 'rare'

export interface Material {
  id: string
  name: string
  description: string
  icon: string
  type: MaterialType
  rarity: 'common' | 'uncommon' | 'rare' | 'legendary'
  stackable: boolean
  maxStack: number
  sanityEffect?: number
  usable: boolean
  usableEffect?: MaterialUsableEffect
  tradeValue: number
}

export interface MaterialUsableEffect {
  type: 'sanity_restore' | 'sanity_max_increase' | 'tool_repair' | 'hit_rate_boost' | 'reveal_hidden'
  value: number
  duration?: number
}

export interface InventoryItem {
  materialId: string
  quantity: number
}

export interface InventoryState {
  items: InventoryItem[]
  capacity: number
  unlocked: boolean
}

export type RecipeType = 'process' | 'craft' | 'analyze' | 'upgrade'

export interface Recipe {
  id: string
  name: string
  description: string
  type: RecipeType
  icon: string
  inputs: RecipeIngredient[]
  outputs: RecipeOutput[]
  requiredTool?: string
  requiredClues?: string[]
  requiredEvidence?: string[]
  unlockCondition?: RecipeUnlockCondition
  sanityCost: number
  timeCost: number
  successRate: number
  isSpecial?: boolean
  category: string
}

export interface RecipeIngredient {
  materialId: string
  quantity: number
  consumed: boolean
}

export interface RecipeOutput {
  type: 'material' | 'tool' | 'clue' | 'sanity' | 'time_bonus' | 'branch_unlock'
  id?: string
  quantity: number
}

export interface RecipeUnlockCondition {
  type: 'clue_discovered' | 'evidence_discovered' | 'tool_owned' | 'chapter_completed' | 'talent_unlocked'
  requiredId?: string
  requiredCount?: number
}

export interface CraftingResult {
  success: boolean
  outputs: RecipeOutput[]
  message: string
  criticalSuccess?: boolean
  criticalFailure?: boolean
}

export interface AnalysisResult {
  analysisId: string
  evidenceId: string
  findings: string[]
  unlockedClues?: string[]
  unlockedBranches?: string[]
  sanityGain?: number
  specialReward?: RecipeOutput
}

export interface ActiveAnalysis {
  analysisId: string
  evidenceId: string
  startTime: number
  duration: number
  completed: boolean
}

export interface GameLogEntry {
  id: string
  timestamp: number
  type: 'discovery' | 'analysis' | 'connection' | 'sanity_loss' | 'conclusion' | 'tool_use' | 'tool_repair' | 'tool_break' | 'timer' | 'scene_switch' | 'timeout' | 'penalty' | 'bonus' | 'evidence_refresh' | 'material_drop' | 'crafting' | 'analysis_start' | 'analysis_complete' | 'inventory' | 'recipe_unlock'
  description: string
  details?: Record<string, unknown>
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
  inventory: InventoryState
  activeAnalyses: ActiveAnalysis[]
  unlockedRecipes: string[]
  craftingHistory: string[]
  intelligenceState: IntelligenceState
  mailDeliveryEvents: MailDeliveryEvent[]
  clueAnnotations: ClueAnnotation[]
  clueConfidences: ClueConfidence[]
  clueComparisons: ClueComparison[]
  deductionHints: DeductionHint[]
  comparisonMode: boolean
  comparisonSelectedClues: string[]
}

export type SaveType = 'manual' | 'auto' | 'snapshot' | 'checkpoint'

export type KeySnapshotTriggerType = 
  | 'evidence_discovered' 
  | 'clue_analyzed' 
  | 'phase_unlocked' 
  | 'deduction_branch'
  | 'scene_entered'
  | 'sanity_threshold'
  | 'mail_read'
  | 'document_read'
  | 'tool_acquired'
  | 'conclusion_reached'

export interface KeySnapshotMetadata {
  triggerType: KeySnapshotTriggerType
  triggerDescription: string
  relatedIds?: string[]
  phaseId?: string
  sceneId?: string
  significance: 'minor' | 'moderate' | 'major' | 'critical'
}

export interface SaveCoverSummary {
  caseTitle: string
  caseDifficulty: string
  progressPercentage: number
  phaseName: string
  currentSceneName: string
  keyHighlights: string[]
  moodTag: 'hopeful' | 'tense' | 'dangerous' | 'corrupted' | 'mysterious' | 'victorious'
  sanityStatus: string
  timeElapsed: string
  discoveredCount: {
    evidence: number
    clues: number
    connections: number
  }
  endingHint?: string
}

export interface CaseProgressMetric {
  metricId: string
  metricName: string
  value: number
  maxValue?: number
  unit?: string
  color?: string
}

export interface CrossCaseComparison {
  caseIds: string[]
  comparisonDate: number
  metrics: Record<string, CaseProgressMetric[]>
  overallRanking: { caseId: string; score: number; rank: number }[]
  summaryNotes: string[]
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
  saveType: SaveType
  snapshotMetadata?: KeySnapshotMetadata
  coverSummary: SaveCoverSummary
  playTimeSeconds: number
  autoSaveConfig?: { intervalMinutes: number; enabled: boolean }
  tags: string[]
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

export type BestiaryCategory = 'creature' | 'forbidden_item' | 'organization'

export type RarityLevel = 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary'

export interface BestiaryUnlockCondition {
  type: 'evidence_discovered' | 'clue_discovered' | 'clue_analyzed' | 'case_completed' | 'branch_unlocked' | 'evidence_special' | 'sanity_under_threshold'
  requiredId?: string
  requiredCount?: number
  threshold?: number
  description: string
}

export interface Creature {
  id: string
  name: string
  category: 'creature'
  icon: string
  rarity: RarityLevel
  threatLevel: 1 | 2 | 3 | 4 | 5
  description: string
  appearance: string
  behavior: string
  abilities: string[]
  weaknesses: string[]
  sightings: string[]
  sanityEffect: number
  firstSightedCaseId?: string
  relatedOrganizations: string[]
  unlockConditions: BestiaryUnlockCondition[]
  discovered: boolean
  discoveredAt?: number
  discoveryCaseId?: string
  loreNotes: string[]
}

export interface ForbiddenItem {
  id: string
  name: string
  category: 'forbidden_item'
  icon: string
  rarity: RarityLevel
  dangerLevel: 1 | 2 | 3 | 4 | 5
  description: string
  physicalTraits: string
  effects: string[]
  containmentProtocols: string[]
  knownOrigins: string[]
  sanityEffect: number
  firstDiscoveredCaseId?: string
  relatedCreatures: string[]
  relatedOrganizations: string[]
  unlockConditions: BestiaryUnlockCondition[]
  discovered: boolean
  discoveredAt?: number
  discoveryCaseId?: string
  loreNotes: string[]
}

export interface Organization {
  id: string
  name: string
  category: 'organization'
  icon: string
  rarity: RarityLevel
  influenceLevel: 1 | 2 | 3 | 4 | 5
  description: string
  history: string
  goals: string[]
  knownMembers: string[]
  headquarters: string
  resources: string[]
  alliedOrganizations: string[]
  opposingOrganizations: string[]
  firstEncounteredCaseId?: string
  relatedCreatures: string[]
  relatedItems: string[]
  unlockConditions: BestiaryUnlockCondition[]
  discovered: boolean
  discoveredAt?: number
  discoveryCaseId?: string
  loreNotes: string[]
}

export type BestiaryEntry = Creature | ForbiddenItem | Organization

export interface BestiaryProgress {
  discoveredCreatures: string[]
  discoveredItems: string[]
  discoveredOrganizations: string[]
  totalDiscovered: number
  discoveryLog: {
    entryId: string
    category: BestiaryCategory
    discoveredAt: number
    caseId: string
    unlockMethod: string
  }[]
}

export interface GraphNode {
  id: string
  type: 'clue' | 'evidence' | 'character' | 'location'
  label: string
  description?: string
  x: number
  y: number
  width: number
  height: number
  importance?: number
  color?: string
  isSelected?: boolean
  isHighlighted?: boolean
  isDimmed?: boolean
  metadata?: Record<string, unknown>
}

export type RelationshipStrengthLevel = 'weak' | 'moderate' | 'strong' | 'very_strong'

export interface RelationshipStrength {
  level: RelationshipStrengthLevel
  score: number
  factors: {
    type: 'evidence' | 'annotation' | 'comparison' | 'confidence' | 'type_match' | 'canonical'
    description: string
    contribution: number
  }[]
}

export interface ConflictInfo {
  hasConflict: boolean
  conflictType?: 'direct_contradiction' | 'mutual_exclusive' | 'transitive_conflict' | 'evidence_conflict'
  conflictingEdgeId?: string
  conflictingEdgeLabel?: string
  description: string
  severity: 'low' | 'medium' | 'high'
}

export interface ConnectionPreview {
  sourceId: string
  targetId: string
  estimatedStrength: RelationshipStrength
  estimatedConfidence: number
  potentialConflicts: ConflictInfo[]
  suggestedRelationships: {
    type: RelationshipType
    label: string
    confidence: number
  }[]
  warnings: string[]
  suggestions: string[]
}

export interface GraphEdge {
  id: string
  sourceId: string
  targetId: string
  relationship: string
  confidence: number
  confirmed: boolean
  isError?: boolean
  errorMessage?: string
  createdAt: number
  createdBy?: string
  strength?: RelationshipStrength
  conflicts?: ConflictInfo[]
  feedbackMessage?: string
  improvementTips?: string[]
}

export interface GraphValidationResult {
  isValid: boolean
  errors: GraphValidationError[]
  warnings: GraphValidationWarning[]
}

export interface GraphValidationError {
  edgeId: string
  sourceId: string
  targetId: string
  message: string
  type: 'invalid_connection' | 'circular_reference' | 'conflicting_relationship' | 'missing_data'
}

export interface GraphValidationWarning {
  edgeId?: string
  nodeId?: string
  message: string
  type: 'unconfirmed' | 'low_confidence' | 'isolated_node' | 'potential_connection' | 'relationship_conflict' | 'weak_connection' | 'strength_increase' | 'conflict_resolved'
  severity?: 'low' | 'medium' | 'high'
}

export interface GraphAction {
  type: 'node_add' | 'node_move' | 'node_remove' | 'edge_add' | 'edge_remove' | 'edge_update' | 'layout_reset'
  timestamp: number
  data: Record<string, unknown>
  beforeState?: Record<string, unknown>
  afterState?: Record<string, unknown>
}

export interface GraphState {
  caseId: string
  nodes: GraphNode[]
  edges: GraphEdge[]
  actionHistory: GraphAction[]
  currentHistoryIndex: number
  zoom: number
  pan: { x: number; y: number }
  lastSavedAt: number
  lastAutoSavedAt: number
}

export interface GraphPlaybackState {
  isPlaying: boolean
  currentStep: number
  totalSteps: number
  speed: number
  isPaused: boolean
  intervalId: number | null
}

export const RELATIONSHIP_TYPES = [
  'causes',
  'implies',
  'supports',
  'contradicts',
  'related_to',
  'provides_evidence_for',
  'leads_to',
  'is_part_of',
  'is_member_of',
  'is_located_at'
] as const

export type RelationshipType = typeof RELATIONSHIP_TYPES[number]

export interface CasePhase {
  id: string
  name: string
  description: string
  phaseNumber: number
  unlockCondition: PhaseUnlockCondition
  unlockedScenes: string[]
  unlockedClues: string[]
  unlockedEvidence: string[]
  unlockedMails: string[]
  unlockedDocuments: string[]
  isActive: boolean
  isCompleted: boolean
  intelligenceLevel: number
}

export interface PhaseUnlockCondition {
  type: 'evidence_discovered' | 'clue_analyzed' | 'mail_read' | 'document_read' | 'phase_completed' | 'time_elapsed' | 'manual' | 'intelligence_level' | 'sanity_level' | 'scene_visited' | 'custom_event'
  requiredIds?: string[]
  count?: number
  requiredCount?: number
  requiredPhaseId?: string
  requiredTimeSeconds?: number
  intelligenceLevel?: number
  sanityLevel?: number
  comparison?: string
  hours?: number
  description?: string
}

export interface Mail {
  id: string
  caseId: string
  subject: string
  sender: string
  senderTitle: string
  senderAvatar?: string
  recipient: string
  content: string
  attachments?: MailAttachment[]
  sentAt: number
  isRead: boolean
  isImportant: boolean
  sanityEffect?: number
  phaseId: string
  intelligenceValue: number
  hiddenClues?: string[]
  hiddenEvidence?: string[]
  unlocksScenes?: string[]
  unlocksPhases?: string[]
  replyOptions?: MailReplyOption[]
  tags: string[]
}

export interface MailAttachment {
  id: string
  name: string
  type: 'document' | 'image' | 'audio' | 'evidence'
  referenceId: string
  description: string
}

export interface MailReplyOption {
  id: string
  text: string
  nextMailId?: string
  effect?: {
    sanity?: number
    unlockClues?: string[]
    unlockEvidence?: string[]
    unlockScenes?: string[]
    intelligenceBonus?: number
  }
}

export interface Document {
  id: string
  caseId: string
  title: string
  type: 'report' | 'newspaper' | 'diary' | 'letter' | 'official' | 'research'
  author: string
  date: string
  content: string
  source?: string
  keywords?: string[]
  relatedCases?: string[]
  pages: DocumentPage[]
  isRead: boolean
  isClassified: boolean
  classificationLevel?: number
  phaseId: string
  intelligenceValue: number
  sanityEffect?: number
  hiddenClues?: string[]
  hiddenEvidence?: string[]
  unlocksScenes?: string[]
  unlocksPhases?: string[]
  requiredEvidenceToRead?: string[]
  requiredCluesToRead?: string[]
  tags: string[]
}

export interface DocumentPage {
  id: string
  pageNumber: number
  title?: string
  content: string
  isUnlocked: boolean
  requiredEvidence?: string[]
  requiredClues?: string[]
  requiredIntelligence?: number
  notes?: string[]
  clueReferences?: string[]
  unlockCondition?: {
    type: 'evidence' | 'clue' | 'previous_page'
    requiredIds?: string[]
  }
  annotations?: string[]
}

export interface IntelligenceState {
  currentPhaseId: string | null
  completedPhases: string[]
  readMails: string[]
  readDocuments: string[]
  totalIntelligence: number
  phaseIntelligence: Record<string, number>
  sceneUnlockProgress: Record<string, number>
  sceneLockStates: Record<string, SceneLockState>
  unlockedSceneHistory: Array<{ sceneId: string; unlockedAt: number; unlockedBy: string }>
  deductionInfoCompleteness: number
  mailNotifications: string[]
  documentNotifications: string[]
  history: { source: string; value: number; timestamp: number }[]
}

export interface CaseMailSystem {
  caseId: string
  phases: CasePhase[]
  mails: Mail[]
  documents: Document[]
}

export interface MailDeliveryEvent {
  mailId: string
  deliveredAt: number
  delaySeconds: number
  triggerCondition: {
    type: 'evidence_discovered' | 'clue_analyzed' | 'scene_visited' | 'phase_started' | 'manual'
    requiredId?: string
  }
  delivered: boolean
}

export type PollutionType = 'short_term_shock' | 'long_term_erosion'

export type PollutionSource = 
  | 'evidence_sanity_loss' 
  | 'clue_analysis' 
  | 'scene_event' 
  | 'anomaly_event' 
  | 'time_out' 
  | 'wrong_conclusion'
  | 'repeated_low_sanity'
  | 'dark_knowledge'
  | 'save_ritual'
  | 'ending_choice'
  | 'sanity_recovery'

export interface PollutionEvent {
  id: string
  type: PollutionType
  amount: number
  source: PollutionSource
  description: string
  timestamp: number
}

export type SaveRiskLevel = 'safe' | 'caution' | 'danger' | 'critical' | 'corrupted'

export interface SaveRiskAssessment {
  level: SaveRiskLevel
  corruptionChance: number
  dataLossChance: number
  hallucinationChance: number
  sanityLossOnLoad: number
  pollutionGain: number
  warningMessage: string
}

export type EndingAlignment = 
  | 'truth_seeker'
  | 'survivor' 
  | 'forgetful'
  | 'corrupted'
  | 'fully_insane'
  | 'martyr'

export interface EndingPollutionRequirement {
  maxShortTermShock?: number
  minLongTermErosion?: number
  maxLongTermErosion?: number
  minTotalPollution?: number
  maxTotalPollution?: number
}

export interface EndingDescriptor {
  id: EndingAlignment
  name: string
  description: string
  pollutionRequirement: EndingPollutionRequirement
  sanityRequirement: { min?: number; max?: number }
  scoreModifier: number
  unlocksBranches?: string[]
}

export interface SpiritualPollutionState {
  shortTermShock: number
  longTermErosion: number
  maxShortTermShock: number
  maxLongTermErosion: number
  pollutionEvents: PollutionEvent[]
  lastDecayTime: number
  lowSanityStreak: number
  consecutiveDarkChoices: number
  unlockedCorruptionMilestones: string[]
}

export interface CorruptionMilestone {
  id: string
  name: string
  description: string
  erosionThreshold: number
  shockThreshold?: number
  effects: {
    maxSanityReduction?: number
    sanityRecoveryPenalty?: number
    hitRatePenalty?: number
    anomalyEventBonus?: number
    unlockEnding?: EndingAlignment
  }
  triggered: boolean
}

declare module './index' {
  interface GameState {
    spiritualPollution: SpiritualPollutionState
  }
}

export interface NewGamePlusState {
  playthroughCount: number
  isNewGamePlus: boolean
  inheritedCaseProgress: Record<string, InheritedCaseData>
  inheritedBestiary: InheritedBestiaryData
  unlockedHiddenCases: string[]
  unlockedSpecialEvidence: string[]
  unlockedEndings: string[]
  globalMilestones: GlobalMilestone[]
  unlockedRecipes: string[]
  carriedSanityBonus: number
}

export interface InheritedCaseData {
  caseId: string
  completed: boolean
  bestGrade?: ScoreGrade
  bestScore?: number
  unlockedBranches: string[]
  discoveredEvidence: string[]
  discoveredClues: string[]
  playCount: number
  fastestTime?: number
  endings: string[]
}

export interface InheritedBestiaryData {
  discoveredCreatures: string[]
  discoveredItems: string[]
  discoveredOrganizations: string[]
  totalDiscovered: number
}

export interface GlobalMilestone {
  id: string
  name: string
  description: string
  unlocked: boolean
  unlockedAt?: number
  reward?: MilestoneReward
  requirement: MilestoneRequirement
}

export interface MilestoneReward {
  tools?: string[]
  sanityBonus?: number
  unlockCases?: string[]
  unlockEvidence?: string[]
  unlockEndings?: string[]
}

export interface MilestoneRequirement {
  type: 'total_cases_completed' | 'specific_case_completed' | 'branch_unlocked' | 'bestiary_discovered' | 'grade_achieved' | 'ending_unlocked' | 'evidence_discovered' | 'playthrough_count'
  targetCount?: number
  targetIds?: string[]
  minGrade?: ScoreGrade
}

export interface HiddenCaseConfig {
  id: string
  parentCaseId: string
  unlockRequirements: MilestoneRequirement[]
  isUnlocked: boolean
}

export interface SpecialEvidenceConfig {
  id: string
  caseId: string
  sceneId: string
  unlockRequirements: MilestoneRequirement[]
  ngPlusOnly: boolean
}

export interface NewGamePlusEnding {
  id: string
  caseId: string
  name: string
  description: string
  unlockRequirements: MilestoneRequirement[]
  isNgPlusExclusive: boolean
}

export type CommissionDifficulty = 'trivial' | 'easy' | 'normal' | 'hard' | 'nightmare'
export type CommissionRisk = 'low' | 'medium' | 'high' | 'extreme'
export type CommissionStatus = 'available' | 'in_progress' | 'completed' | 'failed' | 'expired'
export type CommissionCategory = 'missing_person' | 'paranormal' | 'artifact' | 'ritual' | 'creature' | 'organization'

export interface CommissionRewards {
  sanityBonus: number
  materials: { materialId: string; quantity: number }[]
  tools?: string[]
  reputation: number
  specialUnlocks?: string[]
}

export interface CommissionPenalty {
  sanityLoss: number
  reputationLoss: number
  description: string
}

export interface Commission {
  id: string
  title: string
  client: string
  clientAvatar?: string
  description: string
  fullDetails: string
  category: CommissionCategory
  difficulty: CommissionDifficulty
  riskLevel: CommissionRisk
  status: CommissionStatus
  sanityCost: number
  recommendedSanity: number
  timeLimitMinutes: number
  rewards: CommissionRewards
  failurePenalty: CommissionPenalty
  riskWarnings: string[]
  prerequisites?: {
    completedCases?: string[]
    minReputation?: number
    requiredTools?: string[]
    unlockedBestiaryEntries?: string[]
  }
  relatedCaseId?: string
  acceptedAt?: number
  completedAt?: number
  deadline?: number
  tags: string[]
  isRecommended?: boolean
  recommendationReason?: string
}

export interface CommissionHistoryEntry {
  commissionId: string
  title: string
  acceptedAt: number
  completedAt?: number
  result: 'completed' | 'failed' | 'abandoned'
  sanityGained: number
  sanityLost: number
  reputationGained: number
  materialsCollected: { materialId: string; quantity: number }[]
  grade?: ScoreGrade
  score?: number
  notes?: string
}

export interface CommissionHallState {
  availableCommissions: Commission[]
  activeCommissions: Commission[]
  completedCommissions: Commission[]
  history: CommissionHistoryEntry[]
  reputation: number
  reputationRank: string
  refreshCooldown: number
  lastRefreshTime: number
  totalCommissionsCompleted: number
  totalReputationEarned: number
}

export type ReplayNodeType = 
  | 'scene_visit'
  | 'evidence_discovery'
  | 'clue_discovery'
  | 'clue_analysis'
  | 'clue_connection'
  | 'deduction_branch'
  | 'conclusion'
  | 'sanity_event'
  | 'tool_use'
  | 'phase_unlock'
  | 'mail_read'
  | 'document_read'
  | 'key_moment'

export interface ReplayNode {
  id: string
  type: ReplayNodeType
  timestamp: number
  relativeTime: number
  title: string
  description: string
  details: Record<string, unknown>
  isKeyMoment: boolean
  tags: string[]
  sanityChange?: number
  evidenceId?: string
  clueId?: string
  sceneId?: string
  sourceLogId?: string
  sourceLogType?: GameLogEntry['type']
  rawEvent?: {
    logEntry?: GameLogEntry
    snapshot?: {
      sanity?: number
      maxSanity?: number
      discoveredEvidence?: string[]
      discoveredClues?: string[]
      analyzedClues?: string[]
      visitedScenes?: string[]
      deductionBranches?: string[]
      remainingTime?: number
    }
    context?: Record<string, unknown>
  }
}

export interface ReplayTimeline {
  caseId: string
  caseTitle: string
  nodes: ReplayNode[]
  startTime: number
  endTime: number
  totalDuration: number
  sourceSaveId?: string
  createdAt: number
  metadata: {
    endingId?: string
    grade?: ScoreGrade
    totalScore?: number
    sanityLost?: number
    playCount?: number
  }
}

export interface ReplayFilter {
  nodeTypes: ReplayNodeType[]
  searchQuery: string
  keyMomentsOnly: boolean
  dateRange?: { start?: number; end?: number }
}

export interface ReplayPlaybackState {
  isPlaying: boolean
  currentNodeIndex: number
  speed: 0.5 | 1 | 1.5 | 2
  autoAdvance: boolean
  intervalId: number | null
}

export interface ReplayEditorState {
  activeTimeline: ReplayTimeline | null
  availableTimelines: Record<string, ReplayTimeline[]>
  selectedNodeId: string | null
  filter: ReplayFilter
  playback: ReplayPlaybackState
  isEditing: boolean
  highlightedNodeIds: string[]
}

export interface ReplayExportData {
  version: string
  exportedAt: number
  timeline: ReplayTimeline
  summary: {
    totalNodes: number
    keyMoments: number
    evidenceFound: number
    cluesAnalyzed: number
    branchesUnlocked: number
    realLogNodes: number
    inferredNodes: number
    totalDuration: number
    sanityLost: number
  }
}

export interface ReplayStats {
  totalScenesVisited: number
  totalEvidenceDiscovered: number
  totalCluesDiscovered: number
  totalCluesAnalyzed: number
  totalConnections: number
  totalSanityLost: number
  totalSanityGained: number
  keyMomentCount: number
  phaseCount: number
  toolsUsed: string[]
}

export type SanityRecoveryOptionCostType = 
  | 'time' 
  | 'evidence_penalty' 
  | 'pollution_erosion' 
  | 'tool_durability' 
  | 'anomaly_risk' 
  | 'clue_analysis_penalty'

export interface SanityRecoveryOptionCost {
  type: SanityRecoveryOptionCostType
  value: number
  description: string
}

export interface SanityRecoveryOption {
  id: string
  text: string
  sanityRecovery: number
  costs: SanityRecoveryOptionCost[]
  flavorText?: string
}

export type SanityRecoveryTriggerContext = 
  | 'scene_enter' 
  | 'after_search' 
  | 'low_sanity' 
  | 'random'

export interface SanityRecoveryEvent {
  id: string
  name: string
  description: string
  triggerContext: SanityRecoveryTriggerContext
  maximumSanityThreshold?: number
  minimumSanityThreshold?: number
  options: SanityRecoveryOption[]
}

export interface TempStatusEffect {
  value: number
  remainingSeconds?: number
  remainingSearches?: number
}

export interface DeductionFeedback {
  isConclusionCorrect: boolean
  mainMessage: string
  sanityCostModifier: number
  scoreModifier: number
  detailMessages?: string[]
  feedbackLevel?: 'correct' | 'wrong' | 'uncertain'
  feedbackLevelLabel?: string
  detailedMessages?: string[]
  suggestions?: string[]
}

export interface DeductionValidationResult {
  isValid: boolean
  blockingReason?: string
  sufficiency?: EvidenceSufficiencyResult
  feedback?: DeductionFeedback
}

export type EvidenceSufficiencyLevel = 
  | 'overwhelming' 
  | 'sufficient' 
  | 'moderate' 
  | 'weak' 
  | 'insufficient'

export interface EvidenceSufficiencyResult {
  level: EvidenceSufficiencyLevel
  canAttemptDeduction: boolean
  scoreMultiplier: number
  description: string
  requiredEvidenceCount: number
  discoveredEvidenceCount: number
  warnings: string[]
  recommendedActions: string[]
  scorePenalty: number
  sanityRiskMultiplier: number
  levelLabel: string
}

export type EvidenceSufficiencyCheck = EvidenceSufficiencyResult

export type LogType = 
  | 'discovery' 
  | 'analysis' 
  | 'analysis_start' 
  | 'analysis_complete' 
  | 'connection' 
  | 'sanity_loss' 
  | 'conclusion' 
  | 'tool_use' 
  | 'tool_repair' 
  | 'tool_break' 
  | 'timer' 
  | 'scene_switch' 
  | 'timeout' 
  | 'penalty' 
  | 'bonus' 
  | 'evidence_refresh' 
  | 'material_drop' 
  | 'crafting' 
  | 'recipe_unlock'

export interface LogFilterState {
  types: LogType[]
  phaseIds: string[]
  searchQuery: string
  timeStart: number | null
  timeEnd: number | null
}

export interface LogNavigationState {
  focusedLogId: string | null
  currentIndex: number
}

declare module './index' {
  interface GameState {
    activeSanityRecoveryEvent: SanityRecoveryEvent | null
    sanityRecoveryEventCooldown: number
  }
}
