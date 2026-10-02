import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import { DatabaseSync } from 'node:sqlite'
import ts from 'typescript'

const database = new DatabaseSync(':memory:')
database.exec(`CREATE TABLE episodes_history (episode TEXT UNIQUE, podcast TEXT, position INTEGER, total INTEGER, timestamp INTEGER);
  INSERT INTO episodes_history VALUES ('legacy', 'feed', 120, 600, NULL), ('recent', 'feed', 240, 600, 2000), ('completed', 'feed', 600, 600, NULL);`)
const bind = (params) => Object.fromEntries(params.map((value, index) => [`$${index + 1}`, value]))
const db = {
  select: async (query, params = []) => database.prepare(query).all(bind(params)),
  execute: async (query, params = []) => database.prepare(query).run(bind(params)),
}
const effects = []
let cache
const react = {
  useState: (initial) => {
    cache ??= initial
    return [
      cache,
      (value) => {
        cache = typeof value === 'function' ? value(cache) : value
      },
    ]
  },
  useCallback: (callback) => callback,
  useEffect: (effect) => {
    effects.push(effect)
  },
}
const source = fs.readFileSync(new URL('../src/DB/EpisodeState.ts', import.meta.url), 'utf8')
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
})
const exports = {}
vm.runInNewContext(outputText, {
  exports,
  require: (name) => {
    assert.equal(name, 'react')
    return react
  },
})
let history = exports.useEpisodeStateStore(db)
effects.shift()()
await new Promise((resolve) => setImmediate(resolve))
history = exports.useEpisodeStateStore(db)
assert.equal(history.getSync('legacy').position, 120, 'Legacy progress must be available at startup without playing')
assert.equal(history.getSync('recent').position, 240)
assert.equal(history.getSync('completed').position, 600)
assert.equal((await history.getAll()).length, 3)
assert.deepEqual(
  (await history.getAll(1000)).map((state) => state.episode),
  ['recent'],
  'Synchronization must keep its timestamp filter',
)
await history.update('legacy', 'feed', 180, 600, 3000)
assert.equal((await history.get('legacy')).position, 180, 'A NULL timestamp must not block saving progress')
assert.equal((await history.get('legacy')).timestamp, 3000)
await history.update('legacy', 'feed', 30, 600, 2500)
assert.equal(
  (await history.get('legacy')).position,
  180,
  'Older synchronized updates must not overwrite newer saved progress',
)
database.close()
console.log(
  'History checks passed: startup progress without playback, legacy NULL timestamps, completed episodes, incremental synchronization, saving legacy progress.',
)
