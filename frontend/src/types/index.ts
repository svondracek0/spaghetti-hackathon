export type PreparationStatus = 'Preparing' | 'Ready'

export interface StrategyTopic {
    id: string
    title: string
    description: string
    stance: string
    source: 'user' | 'discovered'
    articleIds: string[]
    sneakyQuestions: string[]
    arguments: string[]
    whyBadForOpponent: string
}

/** Simplified input for creation — backend generates the rest */
export interface StrategyTopicInput {
    title: string
    description: string
    stance: string
}

export interface Opponent {
    id: string
    name: string
    description?: string
    organization?: string
    knownPositions?: string
    debateStyle?: string
    previousEncounters: number
    kbEnabled?: boolean
    kbStatus?: string
    kbArticleCount?: number
}

export interface Preparation {
    id: string
    title: string
    status: PreparationStatus
    createdAt: string
    updatedAt: string
    // Debate Info
    debateDate?: string
    debateFormat?: string
    debateContext: string
    // Topic
    topic: string
    userPosition: string
    // Opponents
    opponents: Opponent[]
    // Strategy
    winStrategy: string
    keyArguments: string[]
    strategyTopics: StrategyTopic[]
}

export interface PreparationCreate {
    title: string
    status?: PreparationStatus
    debateDate?: string
    debateFormat?: string
    debateContext?: string
    topic?: string
    userPosition?: string
    opponents?: Omit<Opponent, 'id' | 'previousEncounters'>[]
    strategyTopics?: StrategyTopicInput[]
}

export type PreparationUpdate = Partial<PreparationCreate>

// --- User Profile ---

export interface UserProfile {
    id: string
    name: string
    bio: string
    organization?: string
    isPublicFigure: boolean
    knownPositions?: string
    debateStyle?: string
    profileImageUrl?: string
    updatedAt?: string
}

export interface UserProfileUpdate {
    name?: string
    bio?: string
    organization?: string
    isPublicFigure?: boolean
    knownPositions?: string
    debateStyle?: string
    profileImageUrl?: string
}

// --- Dashboard ---

export interface PreparationSummary {
    id: string
    title: string
    debateDate?: string
    status: PreparationStatus
    opponentCount: number
}

export interface DashboardStats {
    totalPreparations: number
    totalOpponents: number
    preparingCount: number
    readyCount: number
    upcomingDebates: PreparationSummary[]
    topOpponents: Opponent[]
}

// --- Opponent Detail ---

export interface OpponentDetail extends Opponent {
    preparations: PreparationSummary[]
}

// --- News Trend ---

export interface NewsTrendPoint {
    month: string
    count: number
}

// --- Knowledgebase ---

export interface KBStatus {
    enabled: boolean;
    status: 'idle' | 'ingesting' | 'ready' | 'error';
    processedCount: number;
    lastIngested: string | null;
}

export interface KBQueryResult {
    query: string;
    mode: string;
    result: string;
}

export interface KBGraphNode {
    id: string;
    name: string;
    type: string;
    val: number;
}

export interface KBGraphLink {
    source: string;
    target: string;
    label: string;
}

export interface KBGraphData {
    nodes: KBGraphNode[];
    links: KBGraphLink[];
}
