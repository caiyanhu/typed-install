import { exec } from "shelljs"
import request from "superagent"
import { existsSync } from "fs"
import { packageDirectory } from 'pkg-dir';
import { resolve } from 'path'
import debugFunc from "debug";

const debug = debugFunc("casio")

export const REGISTRY_URL = "https://registry.npmjs.org"

export const EXCEPTION_PACKAGES = new Set(['jest'])

export type SUPPORTED_PACKAGE_MANAGERS = "npm" | "yarn" | "pnpm"

export const listPackagesWithMessage = (message: string, packages: string[]) => {
  if (packages.length === 0) return ''
  return `${message}\n${packages.map(p => ` ${p}`).join('\n')}`
}

export const parseOpts = (packageManager: SUPPORTED_PACKAGE_MANAGERS) => {
  const command = {
    npm: "npm i",
    yarn: "yarn add",
    pnpm: "pnpm i"
  }[packageManager]

  return { command, devFlag: '-D', exactFlag: '-E' }
}

export const installWithTool = async (modules: string[], { packageManager = "npm", dev = false, exact = false }: { packageManager?: SUPPORTED_PACKAGE_MANAGERS, dev?: boolean, exact?: boolean } = {}): Promise<string | null> => {
  if (modules.length === 0) return await Promise.reject(null)
  const { command, devFlag, exactFlag } = parseOpts(packageManager)
  return await new Promise((resolve, reject) => {
    exec([command, dev ? devFlag : '', exact ? exactFlag : '', ...modules].join(' '), { async: true }, (code, stdout, stderr) => {
      if (code !== 0) {
        reject(stderr)
      } else {
        resolve(stdout)
      }
    })
  })
}

export const getTypeInfo = async (name: string) => {
  const typePart = '@' + encodeURIComponent(`types/${name}`)
  const url = `${REGISTRY_URL}/${typePart}`
  const response = await request(url)
  if (response.statusCode === 404) {
    return Promise.reject(null)
  }
  if (response.statusCode >= 400) {
    throw new Error(`trouble reading from ${response.body}`)
  }
  return Promise.resolve(name)
}

export const guessPackageManager = (): SUPPORTED_PACKAGE_MANAGERS => {
  if (existsSync('./pnpm-lock.yaml')) {
    return 'pnpm'
  } else if (existsSync('./yarn.lock')) {
    return 'yarn'
  } else {
    return 'npm'
  }
}

export const isModuleMissType = async (module: string) => {
  debug("looking at ", module)
  if (EXCEPTION_PACKAGES.has(module)) {
    debug(module, "is an exception, return")
    return false
  }
  const pkgRoot = await packageDirectory()
  const installDir = resolve(`${pkgRoot ?? '.'}/node_modules/${module}`)
  try {
    const pkg = require(`${installDir}/package.json`)
    const hasRootDeclaration = existsSync(`${installDir}/index.d.ts`)
    if (pkg.typings !== undefined || pkg.types !== undefined || hasRootDeclaration) {
      debug(module, "has native type")
      return false
    } else {
      debug(
        module, "missing types"
      )
      return true
    }
  } catch (error) {
    console.error("problem reading", module, '-', error)
    return false
  }
}
