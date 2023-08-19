#!/usr/bin/env node

import engine from '@pupille/engine'
import { program } from 'commander'
import display from './display'
import chalk from 'chalk'

program.name('pupille').description('CLI for pupille').version('1.0.0')

program
  .command('check')
  .description(
    'Runs pupille to take screenshots and check that nothing changed'
  )
  .action(async () => {
    try {
      const process = engine.run()
      const render = display.render(engine.store)

      await process
      render.stop()
    } catch (error) {
      if (typeof error === 'object' && error && 'message' in error) {
        console.error(error.message)
      } else {
        console.error(error)
      }
      process.exit(1)
    }
  })

program
  .command('approve <tests>')
  .description(
    'Approves the tests specified by their URL. You can specify multiple URL separated by ",", or approve all of them with "*"'
  )
  .action(async (tests: string) => {
    const result = await engine.approve(
      tests === '*' ? undefined : tests.split(',')
    )

    if (tests === '*') {
      console.log('Approving all the pending tests')
    }

    console.log(
      `${result.approved.length} test${result.approved.length > 1 ? 's' : ''} ${
        result.approved.length > 1 ? 'were' : 'was'
      } approved`
    )
    result.approved.map((test) => console.log(` - ${test}`))

    if (result.failed.length > 0) {
      console.log(
        `${result.failed.length} test${result.failed.length > 1 ? 's' : ''} ${
          result.failed.length > 1 ? 'have' : 'has'
        } failed to be approved`
      )
      result.failed.map((test) => console.log(` - ${test}`))
    }

    if (result.remaining.length > 0) {
      console.log(
        `${result.remaining.length} test${
          result.remaining.length > 1 ? 's' : ''
        } ${result.remaining.length > 1 ? 'remain' : 'remains'}`
      )
      result.remaining.map((test) => console.log(` - ${test}`))
    } else {
      console.log('')
      if (result.errored.length > 0) {
        console.log(
          `${chalk.bold.green('✓')} All valid tests have been approved`
        )
        console.log(
          `However, there are still ${result.errored.length} test${
            result.errored.length > 1 ? 's' : ''
          } that ${result.errored.length > 1 ? 'are' : 'is'} in error`
        )
        result.errored.map((test) => console.log(` - ${test}`))
      } else {
        console.log(`${chalk.bold.green('✓')} All tests have been approved`)
      }
    }
  })

program
  .command('open')
  .description('Opens pupille to review the screenshots taken')
  .action(() => {})

program.parse()
