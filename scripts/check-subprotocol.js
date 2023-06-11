#!/usr/bin/node

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = join(fileURLToPath(import.meta.url), '..', '..')

function read(...parts) {
  return readFileSync(join(ROOT, ...parts)).toString()
}

let pkg = JSON.parse(read('api', 'package.json'))
let index = read('api', 'index.ts')

let minor = pkg.version.replace(/\.\d+$/, '')

if (!index.includes(`SUBPROTOCOL = '${minor}`)) {
  process.stderr.write(
    'api/index.ts and api/package.json have different minor subprotocol\n'
  )
  process.exit(1)
}