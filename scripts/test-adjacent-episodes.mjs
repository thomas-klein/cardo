import assert from 'node:assert/strict'
import fs from 'node:fs'
import ts from 'typescript'
const { outputText } = ts.transpileModule(
  fs.readFileSync(new URL('../src/utils/adjacentEpisodes.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2020 } },
)
const { getAdjacentEpisodes } = await import(
  'data:text/javascript;base64,' + Buffer.from(outputText).toString('base64')
)
const ep = (src, day, podcastUrl = 'podcast') => ({ src, podcastUrl, pubDate: new Date(2026, 8, day) })
const older = ep('older', 1),
  current = ep('current', 2),
  newer = ep('newer', 3)
assert.deepEqual(getAdjacentEpisodes([newer, older, current, older, ep('other', 2, 'other')], current), {
  previous: older,
  next: newer,
})
assert.deepEqual(getAdjacentEpisodes([newer, older], current), { previous: older, next: newer })
assert.deepEqual(getAdjacentEpisodes([older, current, newer], older), { previous: undefined, next: current })
assert.deepEqual(getAdjacentEpisodes([older, current, newer], newer), { previous: current, next: undefined })
assert.deepEqual(getAdjacentEpisodes([], current), { previous: undefined, next: undefined })
const tied = [ep('c', 2), ep('a', 2), ep('b', 2)]
assert.deepEqual(getAdjacentEpisodes(tied, tied[2]), { previous: tied[1], next: tied[0] })
console.log('6 chronology checks passed (order, duplicates, missing current, boundaries, empty catalog, tied dates).')
