import puppeteer, { Browser } from 'puppeteer'
import fs from 'fs'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import slugify from 'slugify'
import { createStore } from 'zustand/vanilla'
import { z } from 'zod'

const sanitizeUrl = (url: string) =>
  slugify(url, { lower: true }).replace(/:/g, '')

export type Test = {
  url: string
  status: 'running' | 'new' | 'failure' | 'success'
  waitFor?: string | Array<string>
}

export type Tests = Record<string, Test>

export type EngineState = {
  tests: Tests
}

export const store = createStore<EngineState>()(() => ({
  tests: {},
}))

const configSchema = z.object({
  root: z.string().optional().default('pupille'),
  tests: z.array(
    z.object({
      url: z.string(),
      waitFor: z.union([z.string(), z.array(z.string())]).optional(),
    })
  ),
})

type Config = z.infer<typeof configSchema>

const setupFolders = async (config: Config) => {
  const root = config.root
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
}

type Options = {
  waitFor?: Array<string>
}

const checkUrl =
  (browser: Browser) => async (url: string, options: Options) => {
    const page = await browser.newPage()
    await page.goto(url)

    // If the user has specified selectors to wait for, we wait for them
    if (options.waitFor && options.waitFor.length > 0) {
      await Promise.all(
        options.waitFor.map((selector) => page.waitForSelector(selector))
      )
    }

    // We take a new screenshot
    await page.screenshot({
      path: `pupille/new/${sanitizeUrl(url)}.png`,
    })

    const state = { ...store.getState().tests }

    if (!fs.existsSync(`pupille/original/${sanitizeUrl(url)}.png`)) {
      state[`${sanitizeUrl(url)}`] = {
        ...state[`${sanitizeUrl(url)}`],
        status: 'new',
      }
      store.setState({ tests: state })

      return 0
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

        return mismatch
      }
    }
  }

type TestingResults = {
  successes: Array<string>
  failures: Array<string>
}

const test = async (
  browser: Browser,
  tests: Config['tests']
): Promise<TestingResults> => {
  if (tests.length === 0) {
    return { successes: [], failures: [] }
  }

  try {
    await checkUrl(browser)(tests[0].url, {
      waitFor:
        tests[0].waitFor === undefined || Array.isArray(tests[0].waitFor)
          ? tests[0].waitFor
          : [tests[0].waitFor],
    })

    return tests.length === 1
      ? { successes: [tests[0].url], failures: [] }
      : test(browser, tests.slice(1)).then((results) => ({
          ...results,
          successes: results.successes.concat(tests[0].url),
        }))
  } catch (error) {
    return tests.length === 1
      ? { successes: [], failures: [tests[0].url] }
      : test(browser, tests.slice(1)).then((results) => ({
          ...results,
          failures: results.failures.concat(tests[0].url),
        }))
  }
}

export const run = async () => {
  if (!fs.existsSync(`${process.cwd()}/pupille.config.js`)) {
    throw new Error(
      `There is no config in ${process.cwd()}. Make sure your configuration file is called "pupille.config.js"`
    )
  }

  const { default: rawConfig } = await import(
    `${process.cwd()}/pupille.config.js`
  )

  // We validate the user's configuration
  const configValidation = configSchema.safeParse(rawConfig)
  if (!configValidation.success) {
    throw new Error(
      `Your configuration file didn't return the expected object:\n${configValidation.error}`
    )
  }
  const config = configValidation.data

  // We setup all the required folders for the tests results
  await setupFolders(config)

  // We subscribe to any update on the tests result
  store.subscribe((state) =>
    fs.writeFileSync(
      `${config.root}/results.json`,
      JSON.stringify(
        {
          ...state,
          running: true,
        },
        null,
        2
      )
    )
  )

  // We setup the tests in the store
  const tests = Object.fromEntries(
    config.tests.map(({ url }) => [
      sanitizeUrl(url),
      { url, status: 'running' as const },
    ])
  )
  store.setState({ tests })

  const browser = await puppeteer.launch({ headless: 'new' })

  try {
    const result = await test(browser, config.tests)
    browser.close()

    fs.writeFileSync(
      `${config.root}/results.json`,
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

    return result
  } catch (error) {
    browser.close()
    throw error
  }
}

export default {
  store,
  run,
}
