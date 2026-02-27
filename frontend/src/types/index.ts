export type PreparationStatus = 'Preparing' | 'Ready'

export interface StrategyTopic {
    id: string
    title: string
    description: string
    stance: string
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
    organization?: string
    knownPositions?: string
    debateStyle?: string
    previousEncounters: number
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
