// Ported from Overleaf (https://github.com/overleaf/overleaf), AGPL-3.0.
// Upstream: services/web/frontend/js/features/source-editor/utils/effects.ts @ e039ad26c5bf5422eb57b89fc7e57c75055e631d
// See NOTICE at the repository root.

import { StateEffectType, Transaction } from '@codemirror/state'
import { ViewUpdate } from '@codemirror/view'

export const hasEffect =
  <T>(effectType: StateEffectType<T>) =>
  (tr: Transaction) =>
    tr.effects.some(effect => effect.is(effectType))

export const updateHasEffect =
  <T>(effectType: StateEffectType<T>) =>
  (update: ViewUpdate) =>
    update.transactions.some(tr =>
      tr.effects.some(effect => effect.is(effectType))
    )
