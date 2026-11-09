import { mkdir, copyFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
const require = createRequire(import.meta.url)
await mkdir(new URL('../.test-deps/', import.meta.url), { recursive: true })
for (const [pkg, file] of [['react', 'react.js'], ['react-dom', 'react-dom.js']]) {
  await copyFile(new URL(`umd/${pkg}.development.js`, pathToFileURL(require.resolve(`${pkg}/package.json`))), new URL(`../.test-deps/${file}`, import.meta.url))
}
console.log('Prepared pinned React UMD test dependencies; run npx playwright install chromium if needed')
