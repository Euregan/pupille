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

const buffer = () => {
  let lines: Array<string> = []

  return {
    line: (line: string) => lines.push(line),
    render: () => {
      console.clear()
      console.log(lines.join('\n'))
      lines = []
    },
  }
}

export default {
  render: (store: StoreApi<EngineState>) => {
    let running = true
    const terminal = buffer()

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
          terminal.line(
            `${chalk.bold(test.url)} failed ${stageToLabel(test.stage)}${
              test.error ? ' The error was:' : ''
            }`
          )
          if (test.error) {
            terminal.line(test.error)
          }
          terminal.line('')
        })
      }

      Object.values(state.tests).forEach((test) => {
        let line = `${test.url.padEnd(longestUrl + 1)} `
        switch (test.status) {
          case 'failure':
            line += `${chalk.bold.red('✗')} ${test.duration} ms`
            break
          case 'new':
            line += `${chalk.bold.green('!')} ${test.duration} ms`
            break
          case 'success':
            line += `${chalk.bold.green('✓')} ${test.duration} ms`
            break
          case 'running':
            line += chalk.bold(
              // We update the spinner every 80ms
              spinner[Math.ceil(new Date().getTime() / 80) % spinner.length]
            )
            break
          case 'pending':
            line += chalk.bold('-')
            break
        }
        terminal.line(line)
      })

      terminal.line('')

      terminal.line(
        `${
          runningCount + pendingCount > 0
            ? `${runningCount + pendingCount} tests running, `
            : 'tests done, '
        }${successCount} succeeded, ${failureCount} failed, ${newCount} new`
      )

      terminal.line('')

      terminal.render()

      if (running) {
        setTimeout(render, 1000 / 30)
      }
    }

    render()

    return { stop: () => (running = false) }
  },
}
