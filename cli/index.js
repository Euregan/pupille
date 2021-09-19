#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const screenshotEngine = require('./screenshotEngine')
const server = require('../app/server')

const argv = yargs(hideBin(process.argv))
  .command(
    'check',
    'Runs pupille to take screenshots and check that nothing changed'
  )
  .command('open', 'Opens pupille to review the screenshots taken').argv

const command = argv._[0]

switch (command) {
  case 'check':
    return screenshotEngine.run()
  case 'open':
    return server.start()
}
