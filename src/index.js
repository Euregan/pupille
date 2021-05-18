const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')
const slugify = require('slugify')
const chalk = require('chalk')
const create = require('zustand/vanilla').default

const store = create(set => ({
  tests: {}
}))

const checkUrl = browser => url =>
  browser.newPage().then(page =>
    page
      .goto(url)
      .then(() =>
        page.screenshot({
          path: `vision/new/${slugify(url, { lower: true })}.png`
        })
      )
      .then(() => {
        const img1 = PNG.sync.read(
          fs.readFileSync(
            `vision/original/${slugify(url, { lower: true })}.png`
          )
        )
        const img2 = PNG.sync.read(
          fs.readFileSync(`vision/new/${slugify(url, { lower: true })}.png`)
        )
        const { width, height } = img1
        const diff = new PNG({ width, height })

        const mismatch = pixelmatch(
          img1.data,
          img2.data,
          diff.data,
          width,
          height,
          {
            threshold: 0.1
          }
        )

        fs.writeFileSync(
          `vision/results/${slugify(url, { lower: true })}.png`,
          PNG.sync.write(diff)
        )

        const state = { ...store.getState().tests }

        if (mismatch > 0) {
          state[`${slugify(url)}`] = 'failure'
          store.setState({ tests: state })
          return Promise.reject(mismatch)
        } else {
          state[`${slugify(url)}`] = 'success'
          store.setState({ tests: state })
          return Promise.resolve(mismatch)
        }
      })
  )

const test = (browser, tests) =>
  checkUrl(browser)(tests[0].url)
    .then(() =>
      tests.length === 1
        ? { successes: [tests[0].url], failures: [] }
        : test(browser, tests.slice(1)).then(results => ({
            ...results,
            successes: results.successes.concat(tests[0].url)
          }))
    )
    .catch(() =>
      tests.length === 1
        ? { successes: [], failures: [tests[0].url] }
        : test(browser, tests.slice(1)).then(results => ({
            ...results,
            failures: results.failures.concat(tests[0].url)
          }))
    )

const configPath = process.argv[2]

if (!configPath) {
  console.error('You need to pass a config file as the first argument')
} else {
  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'))

  store.subscribe(state => {
    console.clear()
    Object.entries(state.tests).forEach(([url, state]) => {
      process.stdout.write(url)
      process.stdout.write(' ')
      switch (state) {
        case 'failure':
          return console.log(chalk.red('✗'))
        case 'success':
          return console.log(chalk.green('✓'))
        case 'running':
        default:
          return console.log('⋯')
      }
    })
  })

  let tests = {}
  config.tests.forEach(({ url }) => (tests[slugify(url)] = 'running'))
  store.setState({ tests })

  puppeteer
    .launch()
    .then(browser =>
      test(browser, config.tests)
        .then(results => {
          browser.close()
          return results
        })
        .catch(error => {
          browser.close()
          return Promise.reject(error)
        })
    )
    .catch(console.error)
}
