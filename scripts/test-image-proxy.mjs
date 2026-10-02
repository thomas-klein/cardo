import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const { outputText } = ts.transpileModule(
  fs.readFileSync(new URL('../src/utils/imageProxy.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } },
)
let tauri = false
const calls = []
const exports = {}
vm.runInNewContext(outputText, {
  exports,
  require: (name) => {
    assert.equal(name, '@tauri-apps/api/core')
    return {
      isTauri: () => tauri,
      convertFileSrc: (...args) => {
        calls.push(args)
        return 'platform-specific-proxy-url'
      },
    }
  },
})
const { proxyUrl } = exports
const source = 'http://example.com:8080/cover.jpg?q=a%2Fb&token=1#cover'
assert.equal(proxyUrl(source), source)
assert.equal(calls.length, 0)
tauri = true
for (const unchanged of [undefined, '', 'data:image/png;base64,abc', 'asset://localhost/cover.png', '/cover.png']) {
  assert.equal(proxyUrl(unchanged), unchanged)
}
assert.equal(calls.length, 0)
for (const url of [source, 'https://example.com/cover.jpg?version=1234567890']) {
  assert.equal(proxyUrl(url), 'platform-specific-proxy-url')
  assert.deepEqual(calls.at(-1), [url, 'imgproxy'])
}
console.log('Image proxy frontend checks passed')
