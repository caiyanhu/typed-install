import chalk from 'chalk'
import { Spinner } from "./spinner"
import { SUPPORTED_PACKAGE_MANAGERS, getTypeInfo, guessPackageManager, installWithTool, isModuleMissType } from "./utils"

export interface MainOpts {
  dev?: boolean
  prod?: boolean
  exact?: boolean
  packageManager?: SUPPORTED_PACKAGE_MANAGERS
}

export default async (modules: string[], { dev = false, prod = false, exact = false, packageManager }: MainOpts = {}, shouldSpin = false) => {
  const spinner = new Spinner(shouldSpin)

  if (dev && prod) {
    spinner.log(`${chalk.redBright("WARNING")} using both --dev and --prod will probably not do what you expect`, true)
  }

  if (packageManager === undefined) {
    packageManager = guessPackageManager()
  }

  spinner.log(`Running using ${chalk.cyanBright(packageManager)}`)

  try {
    await installWithTool(modules, { packageManager, dev, exact })
  } catch (error) {
    spinner.fail(error)
    return
  }

  spinner.succeed()

  // 从安装的模块中找出需要安装类型的模块
  const needTypes = await Promise.all(modules.filter(m => isModuleMissType(m)))

  spinner.waitOn("Checking for @types")
  // 从需要安装类型的模块里找出能安装类型的模块
  const hasTypes = await Promise.all(needTypes.filter(m => getTypeInfo(m)))

  spinner.succeed()

  try {
    await installWithTool(hasTypes.map(m => `@types/${m}`), { packageManager, dev: !prod, exact })
  } catch (error) {
    spinner.fail(error)
    return
  }

  spinner.succeed()
}
