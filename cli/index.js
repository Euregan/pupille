const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')
const slugify = require('slugify')
const create = require('zustand/vanilla').default

const { render } = require('./display')

const store = create(set => ({
  tests: {}
}))

const setup = config => {
  const root = config.root || 'vision'
  if (!fs.existsSync(root)) {
    fs.mkdirSync(root)
  }
  if (!fs.existsSync(`${root}/new`)) {
    fs.mkdirSync(`${root}/new`)
  }
  if (!fs.existsSync(`${root}/original`)) {
    fs.mkdirSync(`${root}/original`)
  }
  if (!fs.existsSync(`${root}/results`)) {
    fs.mkdirSync(`${root}/results`)
  }

  return Promise.resolve()
}

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
        const state = { ...store.getState().tests }

        if (
          !fs.existsSync(`vision/original/${slugify(url, { lower: true })}.png`)
        ) {
          state[`${slugify(url)}`] = {
            ...state[`${slugify(url)}`],
            status: 'new'
          }
          store.setState({ tests: state })
          return Promise.resolve(mismatch)
        } else {
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

          if (mismatch > 0) {
            state[`${slugify(url)}`] = {
              ...state[`${slugify(url)}`],
              status: 'failure'
            }
            store.setState({ tests: state })
            return Promise.reject(mismatch)
          } else {
            state[`${slugify(url)}`] = {
              ...state[`${slugify(url)}`],
              status: 'success'
            }
            store.setState({ tests: state })
            return Promise.resolve(mismatch)
          }
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

  store.subscribe(render)
  store.subscribe(state =>
    fs.writeFileSync(
      'vision/results.json',
      JSON.stringify(
        {
          ...store.getState()
        },
        null,
        2
      )
    )
  )

  setup(config)
    .then(() => {
      let tests = {}
      config.tests.forEach(
        ({ url }) => (tests[slugify(url)] = { url, status: 'running' })
      )
      store.setState({ tests })

      return puppeteer.launch().then(browser =>
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
    })
    .then(() =>
      fs.writeFileSync(
        'vision/results.json',
        JSON.stringify(
          {
            ...store.getState(),
            done: new Date()
          },
          null,
          2
        )
      )
    )
    .catch(console.error)
}
