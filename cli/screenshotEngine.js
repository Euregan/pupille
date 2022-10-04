const puppeteer = require('puppeteer')
const path = require('path')
const fs = require('fs')
const PNG = require('pngjs').PNG
const pixelmatch = require('pixelmatch')
const slugify = require('slugify')
const create = require('zustand/vanilla').default

const sanitizeUrl = (url) => slugify(url, { lower: true }).replace(/:/g, '')

const { render } = require('./display')

const store = create((set) => ({
  tests: {},
}))

const setup = (config) => {
  const root = config.root || 'pupille'
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

const checkUrl = (browser) => (url, options) =>
  browser.newPage().then((page) =>
    page
      .goto(url)
      .then(() =>
        options.waitFor && options.waitFor.length > 0
          ? Promise.all(
              options.waitFor.map((selector) => page.waitForSelector(selector))
            )
          : Promise.resolve()
      )
      .then(() =>
        page.screenshot({
          path: `pupille/new/${sanitizeUrl(url)}.png`,
        })
      )
      .then(() => {
        const state = { ...store.getState().tests }

        if (!fs.existsSync(`pupille/original/${sanitizeUrl(url)}.png`)) {
          state[`${sanitizeUrl(url)}`] = {
            ...state[`${sanitizeUrl(url)}`],
            status: 'new',
          }
          store.setState({ tests: state })
          return Promise.resolve(mismatch)
        } else {
          const img1 = PNG.sync.read(
            fs.readFileSync(`pupille/original/${sanitizeUrl(url)}.png`)
          )
          const img2 = PNG.sync.read(
            fs.readFileSync(`pupille/new/${sanitizeUrl(url)}.png`)
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
              threshold: 0.1,
            }
          )

          fs.writeFileSync(
            `pupille/results/${sanitizeUrl(url)}.png`,
            PNG.sync.write(diff)
          )

          if (mismatch > 0) {
            state[`${sanitizeUrl(url)}`] = {
              ...state[`${sanitizeUrl(url)}`],
              status: 'failure',
            }
            store.setState({ tests: state })
            return Promise.reject(mismatch)
          } else {
            state[`${sanitizeUrl(url)}`] = {
              ...state[`${sanitizeUrl(url)}`],
              status: 'success',
            }
            store.setState({ tests: state })
            return Promise.resolve(mismatch)
          }
        }
      })
  )

const test = (browser, tests) =>
  checkUrl(browser)(tests[0].url, {
    waitFor:
      tests[0].waitFor === undefined || Array.isArray(tests[0].waitFor)
        ? tests[0].waitFor
        : [tests[0].waitFor],
  })
    .then(() =>
      tests.length === 1
        ? { successes: [tests[0].url], failures: [] }
        : test(browser, tests.slice(1)).then((results) => ({
            ...results,
            successes: results.successes.concat(tests[0].url),
          }))
    )
    .catch(() =>
      tests.length === 1
        ? { successes: [], failures: [tests[0].url] }
        : test(browser, tests.slice(1)).then((results) => ({
            ...results,
            failures: results.failures.concat(tests[0].url),
          }))
    )

module.exports.run = async () => {
  const { default: config } = await import(`${process.cwd()}/pupille.config.js`)

  store.subscribe(render)
  store.subscribe((state) =>
    fs.writeFileSync(
      'pupille/results.json',
      JSON.stringify(
        {
          ...store.getState(),
          running: true,
        },
        null,
        2
      )
    )
  )

  return setup(config)
    .then(() => {
      let tests = {}
      config.tests.forEach(
        ({ url }) => (tests[sanitizeUrl(url)] = { url, status: 'running' })
      )
      store.setState({ tests })

      return puppeteer.launch().then((browser) =>
        test(browser, config.tests)
          .then((results) => {
            browser.close()
            return results
          })
          .catch((error) => {
            browser.close()
            return Promise.reject(error)
          })
      )
    })
    .then(() =>
      fs.writeFileSync(
        'pupille/results.json',
        JSON.stringify(
          {
            ...store.getState(),
            running: false,
            done: new Date(),
          },
          null,
          2
        )
      )
    )
    .catch(console.error)
}
