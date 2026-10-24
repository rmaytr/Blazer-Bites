// Assembles the whole site for one Vercel deployment: builds the app (app/) with its asset base
// set to /app/, then lays everything out under dist/ at the repo root —
//   dist/index.html        the choice page (repo root index.html, copied as-is)
//   dist/site/index.html   the promo page (site/, copied as-is)
//   dist/app/...            the built React app
//   dist/sw.js             retires the old root-scoped service worker (see sw.js)
import { execSync } from 'node:child_process'
import { cpSync, mkdirSync, rmSync } from 'node:fs'

// All commands below are hardcoded (no user input), so building a plain string for the shell is safe.
const run = (cmd) => execSync(cmd, { stdio: 'inherit' })

rmSync('dist', { recursive: true, force: true })
mkdirSync('dist', { recursive: true })

run('npm --prefix app ci')
run('npm --prefix app run build')

cpSync('app/dist', 'dist/app', { recursive: true })
cpSync('index.html', 'dist/index.html')
cpSync('sw.js', 'dist/sw.js')
cpSync('site', 'dist/site', { recursive: true })

console.log('dist/ assembled: index.html, sw.js, site/, app/')
