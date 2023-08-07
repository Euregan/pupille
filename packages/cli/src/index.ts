#!/usr/bin/env node

import engine from '@pupille/engine'
import { program } from 'commander'
import pckg from '../package.json'
import display from './display'

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
    engine.approve(tests === '*' ? undefined : tests.split(','))
  })

program
  .command('open')
  .description('Opens pupille to review the screenshots taken')
  .action(() => {})

program.parse()
