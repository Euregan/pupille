#!/usr/bin/env node

import engine from '@pupille/engine'
import { program } from 'commander'
// import open from 'open'
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
  .command('open')
  .description('Opens pupille to review the screenshots taken')
  .action(() => {
    // server
    //   .start()
    //   .then((url) => open(url))
    //   .then(() => engine.run())
  })

program.parse()
