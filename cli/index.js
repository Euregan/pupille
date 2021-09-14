#!/usr/bin/env node

const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')
const screenshotEngine = require('./screenshotEngine')
const { spawn } = require('child_process')
const os = require('os')
const fs = require('fs')
const package = require('../package.json')

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
    return new Promise((resolve, reject) => {
      switch (os.platform()) {
        case 'linux':
          const pupille = spawn(
            `${__dirname}/../dist/pupille-${package.version}.AppImage`
          )

          pupille.stdout.on('data', console.log)

          pupille.stderr.on('data', data => {
            console.error(data)
            reject()
          })

          pupille.on('close', code => {
            if (code > 1) {
              console.error(`child process exited with code ${code}`)
              reject(code)
            } else {
              resolve()
            }
          })
      }
    })
}
