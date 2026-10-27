/**
 * Copies the SCORM package files into client/public so the dev server can launch it.
 * Usage: bun scorm/qta-sample-c04/build.ts
 */
import { copyFileSync, mkdirSync, readdirSync, rmSync } from 'node:fs'
import { join, resolve } from 'node:path'

const PACKAGE_FILES = ['imsmanifest.xml', 'index.html', 'styles.css', 'runtime.js', 'content.js']

const sourceDir = import.meta.dir
const targetDir = resolve(sourceDir, '../../client/public/scorm/qta-sample-c04')

rmSync(targetDir, { recursive: true, force: true })
mkdirSync(targetDir, { recursive: true })

for (const file of PACKAGE_FILES) {
  copyFileSync(join(sourceDir, file), join(targetDir, file))
}

console.log(`Copied ${readdirSync(targetDir).length} files to ${targetDir}`)
