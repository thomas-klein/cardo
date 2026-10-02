import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function load(path, mocks, transform = (source) => source) {
  const source = transform(fs.readFileSync(new URL(path, import.meta.url), 'utf8'))
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX },
  })
  const exports = {}
  vm.runInNewContext(outputText, {
    exports,
    require: (name) => {
      assert.ok(name in mocks, `Missing mock: ${name}`)
      return mocks[name]
    },
    URLSearchParams,
    console: { error() {} },
    window: { history: { state: { idx: 0 }, length: 1 } },
    clearTimeout,
  })
  return exports
}

let requests = 0
const env = {}
let response = { ok: true, json: async () => ({ feeds: [] }) }
const podcastIndex = load(
  '../src/engines/search/podcastindex.ts',
  {
    '@tauri-apps/plugin-http': {
      fetch: async () => {
        requests++
        return response
      },
    },
    'js-sha1': { sha1: () => 'hash' },
    '../../../src-tauri/tauri.conf.json': { default: { productName: 'Cardo', version: 'test' } },
    env,
  },
  (source) => source.replaceAll('import.meta.env', 'require("env")'),
)

for (const credentials of [{}, { VITE_PODCASTINDEX_API_KEY: 'key' }, { VITE_PODCASTINDEX_API_SECRET: 'secret' }]) {
  delete env.VITE_PODCASTINDEX_API_KEY
  delete env.VITE_PODCASTINDEX_API_SECRET
  Object.assign(env, credentials)
  await assert.rejects(podcastIndex.searchPodcastIndex('science'), podcastIndex.PodcastIndexConfigurationError)
}
assert.equal(requests, 0)
Object.assign(env, { VITE_PODCASTINDEX_API_KEY: 'key', VITE_PODCASTINDEX_API_SECRET: 'secret' })
response = { ok: false, status: 401 }
await assert.rejects(podcastIndex.searchPodcastIndex('science'), /HTTP 401/)

const states = [],
  refs = [],
  actions = []
let stateIndex = 0,
  refIndex = 0
let failure = new podcastIndex.PodcastIndexConfigurationError()
let delayedResponse
let emptyResponse = false
const jsx = (type, props) => ({ type, props })
const SearchBar = load('../src/components/SearchBar.tsx', {
  react: {
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
    useRef: (initial) => refs[refIndex++] ?? (refs[refIndex - 1] = { current: initial }),
    useEffect: () => {},
    useTransition: () => [
      false,
      (action) => {
        actions.push(Promise.resolve(action()))
      },
    ],
  },
  'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'fragment' },
  '../engines/search/base': {
    searchPodcast: async () => {
      if (delayedResponse) return delayedResponse
      if (failure) throw failure
      if (emptyResponse) return []
      return [{ feedUrl: 'https://example.com/feed', podcastName: 'Science' }]
    },
  },
  '../engines/search/podcastindex': podcastIndex,
  './PodcastCard': { default: 'PodcastCard' },
  './EpisodeCard': { default: 'EpisodeCard' },
  'react-i18next': { useTranslation: () => ({ t: (key) => key }) },
  '../Icons': {},
  'react-router-dom': { useLocation: () => ({ pathname: '/' }), useNavigate: () => () => {} },
  '../ContextProviders': { useSubscriptionsEpisodes: () => ({}), useSubscriptions: () => ({ subscriptions: [] }) },
  '../engines/Settings': { useSettings: () => [{ search: { engine: 'PodcastIndex' } }, () => {}] },
}).default

function render() {
  stateIndex = 0
  refIndex = 0
  return SearchBar()
}
function find(node, predicate) {
  if (!node || typeof node !== 'object') return undefined
  if (predicate(node)) return node
  for (const child of [node.props?.children].flat(Infinity)) {
    const found = find(child, predicate)
    if (found) return found
  }
}
async function submit() {
  const tree = render()
  find(tree, (node) => node.type === 'input').props.ref.current = { value: 'science' }
  find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
  while (actions.length) await Promise.all(actions.splice(0))
  return render()
}

let tree = await submit()
assert.equal(find(tree, (node) => node.props?.role === 'alert').props.children, 'podcastindex_configuration_error')
assert.ok(find(tree, (node) => node.props?.children === 'iTunes'))
failure = new Error('Network unavailable')
tree = await submit()
assert.equal(find(tree, (node) => node.props?.role === 'alert').props.children, 'search_error')
find(tree, (node) => node.type === 'input').props.onKeyDown({ key: 'Escape' })
assert.equal(
  find(render(), (node) => node.props?.role === 'alert'),
  undefined,
)
failure = undefined
tree = await submit()
assert.equal(
  find(tree, (node) => node.props?.role === 'alert'),
  undefined,
)
assert.ok(find(tree, (node) => node.type === 'PodcastCard'))

// Tab navigates the modal instead of dismissing it.
find(tree, (node) => node.type === 'input').props.onKeyDown({ key: 'Tab' })
assert.ok(find(render(), (node) => node.type === 'PodcastCard'))
// Clicking content keeps results, clicking the backdrop closes them.
const dialog = find(tree, (node) => node.type === 'dialog')
dialog.props.onClick({ target: {}, currentTarget: {} })
assert.ok(find(render(), (node) => node.type === 'PodcastCard'))
const backdrop = {}
dialog.props.onClick({ target: backdrop, currentTarget: backdrop })
assert.equal(
  find(render(), (node) => node.type === 'PodcastCard'),
  undefined,
)

emptyResponse = true
tree = await submit()
assert.ok(find(tree, (node) => node.props?.children === 'no_search_results'))
emptyResponse = false

// Closing during an outstanding request must ignore the eventual response.
let resolveResponse
delayedResponse = new Promise((resolve) => {
  resolveResponse = resolve
})
tree = render()
find(tree, (node) => node.type === 'input').props.ref.current = { value: 'science' }
find(tree, (node) => node.type === 'form').props.onSubmit({ preventDefault() {} })
tree = render()
find(tree, (node) => node.type === 'dialog').props.onCancel({ preventDefault() {} })
resolveResponse([{ feedUrl: 'https://example.com/late', podcastName: 'Late result' }])
while (actions.length) await Promise.all(actions.splice(0))
tree = render()
assert.equal(
  find(tree, (node) => node.type === 'PodcastCard'),
  undefined,
)
assert.ok(find(tree, (node) => node.type === 'form'))
console.log(
  'Search checks passed: errors, recovery, empty results, Tab navigation, backdrop dismissal, Escape, late response after closing.',
)
