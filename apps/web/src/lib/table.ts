/**
 * Column classes shared by the console's tables (the project list, users),
 * so their columns are spaced the same: the first column's share of a wide
 * table, the gap between columns, and room for the columns that hold several
 * things (tags, a person).
 */
export const COLUMN = {
  /**
   * The name column on wide tables (below @xl it takes the free width). The
   * last column takes what is left (w-full), which scales percentages down,
   * so the share comes with a minimum.
   */
  first: '@xl:w-[30%] @xl:min-w-80',
  /** Every column after the first: 40 px between columns. */
  gap: 'px-5',
  /** A person with an avatar. */
  person: 'min-w-44',
  /** Tags, which wrap within it. */
  tags: 'min-w-72',
} as const
