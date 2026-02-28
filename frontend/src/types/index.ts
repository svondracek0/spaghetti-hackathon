export type PreparationStatus = 'Preparing' | 'Ready'

export interface ArticleRef {
    articleId: string
    title: string
    url: string
    publisher: string
}

export interface StrategyTopic {
    id: string
    title: string
    description: string
    stance: string
    source: 'user' | 'discovered'
    articleIds: string[]
    articles: ArticleRef[]
    sneakyQuestions: string[]
    arguments: string[]
    whyBadForOpponent: string
}

export interface TimeframeBucket {
    period: string
    count: number
}

export interface TimeframeSuggestion {
    from: string
    to: string
    label: string
    totalArticles: number
}

export interface TimeframeData {
    data: TimeframeBucket[]
    suggestions: TimeframeSuggestion[]
}

export interface SelectedTimeframe {
    from: string
    to: string
    label?: string
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
    selectedTimeframes?: SelectedTimeframe[]
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
    selectedTimeframes?: SelectedTimeframe[]
    opponents?: Omit<Opponent, 'id' | 'previousEncounters'>[]
    strategyTopics?: StrategyTopicInput[]
}

export type PreparationUpdate = Partial<PreparationCreate>
