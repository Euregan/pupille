#!/usr/bin/env node

import engine from '@pupille/engine'
import { program } from 'commander'
import pckg from '../package.json'
import display from './display'
import chalk from 'chalk'

program.name(pckg.name).description(pckg.description).version(pckg.version)

program
  .command('check')
  .description(
    'Runs pupille to take screenshots and check that nothing changed'
  )
  .action(async () => {
    try {
      const process = engine.run()
      engine.store.subscribe(display.render)
      await process
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
      `${result.approved.length} URL${result.approved.length > 1 ? 's' : ''} ${
        result.approved.length > 1 ? 'were' : 'was'
      } approved:`
    )
    result.approved.map((test) => console.log(` - ${test}`))

    if (result.failed.length > 0) {
      console.log(
        `${result.failed.length} URL${result.failed.length > 1 ? 's' : ''} ${
          result.failed.length > 1 ? 'were' : 'was'
        } failed:`
      )
      result.failed.map((test) => console.log(` - ${test}`))
    }

    if (result.remaining.length > 0) {
      console.log(
        `${result.remaining.length} URL${
          result.remaining.length > 1 ? 's' : ''
        } ${result.remaining.length > 1 ? 'remain' : 'remains'}:`
      )
      result.remaining.map((test) => console.log(` - ${test}`))
    } else {
      console.log('')
      console.log(`${chalk.bold.green('✓')} All tests have been approved`)
    }
  })

program
  .command('open')
  .description('Opens pupille to review the screenshots taken')
  .action(() => {})

program.parse()
