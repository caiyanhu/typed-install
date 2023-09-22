import ora, { Ora } from 'ora'

export class Spinner {
  public spinner: Ora

  constructor(public shouldSpin: boolean) {
    if (shouldSpin) {
      this.spinner = ora()
    }
  }

  public log = (message: string, logAlways = false) => {
    if ((this.shouldSpin || logAlways) && message) {
      console.log(`${message}\n`)
    }
  }

  public waitOn = (message: string) => {
    if (this.shouldSpin) {
      this.spinner.start(message)
    }
  }

  public succeed = () => {
    if (this.shouldSpin) {
      this.spinner.succeed()
    }
  }

  public fail = (e: any) => {
    if (this.shouldSpin) {
      this.spinner.fail()
    }
    console.error(e)
    process.exitCode = e.code
  }
}
