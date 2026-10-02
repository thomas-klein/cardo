import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const states = []
let stateIndex = 0
let loads = 0
let reads = 0
const playedAt = []
const audio = {
  src: '',
  currentTime: 0,
  duration: 3600,
  paused: true,
  load() {
    loads++
    this.currentTime = 0
  },
  async play() {
    playedAt.push(this.currentTime)
    this.paused = false
  },
  pause() {
    this.paused = true
  },
}
let resolveHistory
const history = {
  get: () => {
    reads++
    return new Promise((resolve) => {
      resolveHistory = resolve
    })
  },
  update: async () => {},
}
const jsx = (type, props) => ({ type, props })
const mocks = {
  react: {
    useRef: () => ({ current: audio }),
    useState: (initial) => {
      const index = stateIndex++
      if (!(index in states)) states[index] = initial
      return [
        states[index],
        (value) => {
          states[index] = value
        },
      ]
    },
    useEffect: () => {},
    useCallback: (callback) => callback,
  },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '../ContextProviders': {
    PlayerContext: { Provider: 'PlayerProvider' },
    PlayerPositionContext: { Provider: 'PositionProvider' },
    useHistory: () => history,
    useMisc: () => ({}),
    useDownloads: () => ({ includes: (src) => (src === 'downloaded' ? { localFile: 'episode.mp3' } : undefined) }),
  },
  '@tauri-apps/api/core': { convertFileSrc: (path) => `asset://${path}` },
}
const { outputText } = ts.transpileModule(
  fs.readFileSync(new URL('../src/components/AudioPlayer.tsx', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX } },
)
const exports = {}
vm.runInNewContext(outputText, { exports, require: (name) => mocks[name] ?? {} })
function render() {
  stateIndex = 0
  return exports.AudioPlayerProvider({ children: null }).props.value
}

const episode = { src: 'remote', podcastUrl: 'feed' }
let player = render()
const starting = player.play(episode)
assert.equal(loads, 1)
assert.equal(playedAt.length, 0, 'Playback must wait for saved position')
resolveHistory({ position: 120, total: 3600 })
await starting
assert.equal(playedAt.at(-1), 120)
player = render()

// Resume after natural progress, seeking before pause, seeking while paused, and seeking to zero.
for (const position of [150, 900, 45, 0]) {
  audio.currentTime = position
  player.pause()
  await player.play({ ...episode })
  assert.equal(audio.currentTime, position)
  assert.equal(playedAt.at(-1), position)
  assert.equal(loads, 1, 'Resuming the loaded episode must not reload audio')
  assert.equal(reads, 1, 'Resuming must not restore stale history')
}

// Switching episodes still selects the downloaded file and restores its own saved position.
player.pause()
const switching = player.play({ src: 'downloaded', podcastUrl: 'other-feed' })
assert.equal(loads, 2)
assert.equal(audio.src, 'asset://episode.mp3')
assert.equal(playedAt.length, 5)
resolveHistory({ position: 300, total: 3600 })
await switching
assert.equal(playedAt.at(-1), 300)
player = render()
audio.currentTime = 350
player.pause()
await player.play()
assert.equal(playedAt.at(-1), 350)
assert.equal(loads, 2)
console.log(
  'Playback checks passed: live resume after progress and seeks, zero position, saved-position loading, downloaded episodes, player controls.',
)
