import { EngineState, FailedTest } from '@pupille/engine'
import chalk from 'chalk'
import { StoreApi } from 'zustand'

const stageToLabel = (stage: FailedTest['stage']): string =>
  ({
    prepare: 'when setting up the test. Please check your prepare functions.',
    loading: 'when loading the page.',
    waiting:
      'when waiting for some elements to appear. A screenshot of the current state of the page has been taken.',
    comparing: 'when comparing previous and current screenshots.',
  }[stage])

const spinner = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏']

export default {
  render: (store: StoreApi<EngineState>) => {
    let running = true

    const render = () => {
      const state = store.getState()

      const longestUrl = Object.values(state.tests).reduce(
        (longestUrl, test) =>
          test.url.length > longestUrl ? test.url.length : longestUrl,
        0
      )

      let pendingCount = 0
      let runningCount = 0
      let successCount = 0
      let failureCount = 0
      let newCount = 0

      console.clear()

      Object.values(state.tests).forEach((test) => {
        switch (test.status) {
          case 'failure':
            return failureCount++
          case 'new':
            return newCount++
          case 'success':
            return successCount++
          case 'running':
            return runningCount++
          case 'pending':
            return pendingCount++
        }
      })

      if (runningCount + pendingCount === 0) {
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
          console.log('')
        })
      }

      Object.values(state.tests).forEach((test) => {
        process.stdout.write(test.url.padEnd(longestUrl + 1))
        process.stdout.write(' ')
        switch (test.status) {
          case 'failure':
            return console.log(chalk.bold.red('✗'), test.duration, 'ms')
          case 'new':
            return console.log(chalk.bold.green('!'), test.duration, 'ms')
          case 'success':
            return console.log(chalk.bold.green('✓'), test.duration, 'ms')
          case 'running':
            return console.log(
              chalk.bold(
                // We update the spinner every 80ms
                spinner[Math.ceil(new Date().getTime() / 80) % spinner.length]
              )
            )
          case 'pending':
            return console.log(chalk.bold('-'))
        }
      })

      console.log('')

      if (runningCount + pendingCount > 0) {
        process.stdout.write(`${runningCount + pendingCount} tests running, `)
      } else {
        process.stdout.write('tests done, ')
      }
      console.log(
        `${successCount} succeeded, ${failureCount} failed, ${newCount} new`
      )

      if (running) {
        setTimeout(render, 1000 / 30)
      }
    }

    render()

    return { stop: () => (running = false) }
  },
}
