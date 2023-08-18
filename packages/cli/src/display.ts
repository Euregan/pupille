import { EngineState, FailedTest } from '@pupille/engine'
import chalk from 'chalk'

const stageToLabel = (stage: FailedTest['stage']): string =>
  ({
    prepare: 'when setting up the test. Please check your prepare functions.',
    loading: 'when loading the page.',
    waiting:
      'when waiting for some elements to appear. A screenshot of the current state of the page has been taken.',
    comparing: 'when comparing previous and current screenshots.',
  }[stage])

export default {
  render: (state: EngineState) => {
    const longestUrl = Object.values(state.tests).reduce(
      (longestUrl, test) =>
        test.url.length > longestUrl ? test.url.length : longestUrl,
      0
    )

    let runningCount = 0
    let successCount = 0
    let failureCount = 0
    let newCount = 0

    console.clear()

    Object.values(state.tests).forEach((test) => {
      process.stdout.write(test.url.padEnd(longestUrl + 1))
      process.stdout.write(' ')
      switch (test.status) {
        case 'failure':
          failureCount++
          return console.log(chalk.bold.red('✗'))
        case 'new':
          newCount++
          return console.log(chalk.bold.green('!'))
        case 'success':
          successCount++
          return console.log(chalk.bold.green('✓'))
        case 'running':
        default:
          runningCount++
          return console.log(chalk.bold('⋯'))
      }
    })

    console.log('')

    if (runningCount > 0) {
      process.stdout.write(`${runningCount} tests running, `)
    } else {
      process.stdout.write('tests done, ')
    }
    console.log(
      `${successCount} succeeded, ${failureCount} failed, ${newCount} new`
    )
    ;(
      Object.values(state.tests).filter(
        (test) => test.status === 'failure'
      ) as Array<FailedTest>
    ).forEach((test) => {
      console.log(
        `${chalk.bold(test.url)} failed ${stageToLabel(test.stage)}${
          test.error ? ' The error was:' : ''
        }`
      )
      if (test.error) {
        console.log(test.error)
      }
    })
  },
}
