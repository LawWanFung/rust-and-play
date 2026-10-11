export type QuestionMode = 'quiz' | 'predict' | 'fix' | 'match'

export interface MatchPair {
  /** concept (one side of the card) */
  a: string
  /** definition / behavior (other side) */
  b: string
}

export type Question =
  | {
      mode: 'quiz'
      prompt: string
      code?: string
      options: string[]
      answer: number
      explain: string
    }
  | {
      mode: 'predict'
      prompt: string
      code: string
      options: string[]
      answer: number
      explain: string
    }
  | {
      mode: 'fix'
      prompt: string
      /** the broken source */
      code: string
      /** real rustc error shown in a terminal box */
      error?: string
      options: string[]
      answer: number
      /** the fixed source, revealed in feedback */
      fixedCode?: string
      explain: string
    }
  | {
      mode: 'match'
      prompt: string
      pairs: MatchPair[]
      /** one-liner shown in feedback */
      summary: string
    }

export interface ModuleDef {
  id: string
  title: string
  subtitle: string
  icon: string
  /** accent hue for the card */
  hue: number
  /** badge awarded when this module's boss is beaten */
  clearBadge?: string
  questions: Question[]
}
