import puppeteer, { Browser, Page } from 'puppeteer'
import fs from 'fs/promises'
import { PNG } from 'pngjs'
import pixelmatch from 'pixelmatch'
import slugify from 'slugify'
import { createStore } from 'zustand/vanilla'
import { z } from 'zod'

const sanitizeUrl = (url: string) =>
  slugify(url, { lower: true }).replace(/:/g, '')

type BaseTest = {
  url: string
  status: 'pending' | 'running'
  waitFor?: string | Array<string>
}

export type ResolvedTest = {
  url: string
  status: 'success' | 'new'
  waitFor?: string | Array<string>
  duration: number
}

export type ErrorTest = {
  url: string
  status: 'error'
  waitFor?: string | Array<string>
  duration: number
  stage: 'prepare' | 'loading' | 'waiting'
  error: any
}

export type FailedTest = {
  url: string
  status: 'failure'
  waitFor?: string | Array<string>
  duration: number
}

export type Test = BaseTest | ResolvedTest | ErrorTest | FailedTest

export type Tests = Record<string, Test>

export type EngineState = {
  tests: Tests
}

export const store = createStore<EngineState>()(() => ({
  tests: {},
}))

const optionSchema = z.object({
  url: z.string(),
  waitFor: z.union([z.string(), z.array(z.string())]).optional(),
  prepare: z
    .function()
    .args(z.instanceof(Page))
    .returns(z.promise(z.undefined()))
    .optional()
    .default(
      () => () => new Promise<undefined>((resolve) => resolve(undefined))
    ),
})

const configSchema = z.object({
  baseUrl: z.string(),
  root: z.string().optional().default('pupille'),
  prepare: z
    .function()
    .args(z.instanceof(Page))
    .returns(z.promise(z.undefined()))
    .optional()
    .default(
      () => () => new Promise<undefined>((resolve) => resolve(undefined))
    ),
  resolutions: z
    .array(z.tuple([z.number().int(), z.number().int()]))
    .nonempty()
    .optional()
    .default([[1920, 1080]]),
  tests: z.array(optionSchema),
})

type Config = z.infer<typeof configSchema>

const setupFolders = async (config: Config) => {
  const root = config.root

  await fs.access(root).catch(() => fs.mkdir(root))

  await Promise.all([
    fs.access(`${root}/new`).catch(() => fs.mkdir(`${root}/new`)),
    fs.access(`${root}/original`).catch(() => fs.mkdir(`${root}/original`)),
    fs.access(`${root}/results`).catch(() => fs.mkdir(`${root}/results`)),
    fs.access(`${root}/error`).catch(() => fs.mkdir(`${root}/error`)),
    fs
      .access(`${root}/.gitignore`)
      .catch(() => fs.writeFile(`${root}/.gitignore`, 'new\nresults')),
  ])
}

type Options = {
  root: string
  baseUrl: string
  waitFor: Array<string>
  prepare: (page: Page) => Promise<undefined>
  resolution: [number, number]
}

const checkUrl =
  (browser: Browser) => async (url: string, options: Options) => {
    const startTime = new Date().getTime()
    store.setState((state) => ({
      ...state,
      tests: {
        ...state.tests,
        [`${sanitizeUrl(url)}`]: {
          ...state.tests[`${sanitizeUrl(url)}`],
          status: 'running',
        },
      },
    }))

    const page = await browser.newPage()
    await page.setViewport({
      width: options.resolution[0],
      height: options.resolution[1],
    })

    try {
      await options.prepare(page)
    } catch (error) {
      store.setState((state) => ({
        ...state,
        tests: {
          ...state.tests,
          [`${sanitizeUrl(url)}`]: {
            ...state.tests[`${sanitizeUrl(url)}`],
            status: 'error',
            duration: new Date().getTime() - startTime,
            stage: 'prepare',
            error,
          },
        },
      }))

      return 0
    }

    try {
      await page.goto(`${options.baseUrl}${url}`)
    } catch (error) {
      store.setState((state) => ({
        ...state,
        tests: {
          ...state.tests,
          [`${sanitizeUrl(url)}`]: {
            ...state.tests[`${sanitizeUrl(url)}`],
            status: 'failure',
            duration: new Date().getTime() - startTime,
            stage: 'loading',
            error,
          },
        },
      }))

      return 0
    }

    // If the user has specified selectors to wait for, we wait for them
    try {
      await Promise.all(
        options.waitFor.map((selector) => page.waitForSelector(selector))
      )
    } catch (error) {
      await page.screenshot({
        path: `${options.root}/error/${options.resolution[0]}x${
          options.resolution[1]
        }|${sanitizeUrl(url)}.png`,
      })

      store.setState((state) => ({
        ...state,
        tests: {
          ...state.tests,
          [`${sanitizeUrl(url)}`]: {
            ...state.tests[`${sanitizeUrl(url)}`],
            status: 'failure',
            duration: new Date().getTime() - startTime,
            stage: 'waiting',
            error,
          },
        },
      }))

      return 0
    }

    // We take a new screenshot
    await page.screenshot({
      path: `${options.root}/new/${options.resolution[0]}x${
        options.resolution[1]
      }|${sanitizeUrl(url)}.png`,
    })

    const state = { ...store.getState().tests }

    try {
      await fs.access(
        `${options.root}/original/${options.resolution[0]}x${
          options.resolution[1]
        }|${sanitizeUrl(url)}.png`
      )
    } catch {
      state[`${sanitizeUrl(url)}`] = {
        ...state[`${sanitizeUrl(url)}`],
        status: 'new',
        duration: new Date().getTime() - startTime,
      }
      store.setState({ tests: state })

      return 0
    }

    const img1 = PNG.sync.read(
      await fs.readFile(
        `${options.root}/original/${options.resolution[0]}x${
          options.resolution[1]
        }|${sanitizeUrl(url)}.png`
      )
    )
    const img2 = PNG.sync.read(
      await fs.readFile(
        `${options.root}/new/${options.resolution[0]}x${
          options.resolution[1]
        }|${sanitizeUrl(url)}.png`
      )
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

    await fs.writeFile(
      `${options.root}/results/${options.resolution[0]}x${
        options.resolution[1]
      }|${sanitizeUrl(url)}.png`,
      PNG.sync.write(diff)
    )

    if (mismatch > 0) {
      state[`${sanitizeUrl(url)}`] = {
        ...state[`${sanitizeUrl(url)}`],
        status: 'failure',
        duration: new Date().getTime() - startTime,
      }
      store.setState({ tests: state })

      return Promise.reject(mismatch)
    } else {
      state[`${sanitizeUrl(url)}`] = {
        ...state[`${sanitizeUrl(url)}`],
        status: 'success',
        duration: new Date().getTime() - startTime,
      }
      store.setState({ tests: state })

      return mismatch
    }
  }

type TestingResults = {
  successes: Array<string>
  failures: Array<string>
}

const test = async (
  browser: Browser,
  tests: Config['tests'],
  config: Config
): Promise<TestingResults> => {
  if (tests.length === 0) {
    return { successes: [], failures: [] }
  }

  try {
    await Promise.all(
      config.resolutions.map((resolution) =>
        checkUrl(browser)(tests[0].url, {
          root: config.root,
          baseUrl: config.baseUrl,
          waitFor:
            tests[0].waitFor === undefined
              ? []
              : Array.isArray(tests[0].waitFor)
              ? tests[0].waitFor
              : [tests[0].waitFor],
          prepare: (page: Page) =>
            config.prepare(page).then(() => tests[0].prepare(page)),
          resolution,
        })
      )
    )

    return tests.length === 1
      ? { successes: [tests[0].url], failures: [] }
      : test(browser, tests.slice(1), config).then((results) => ({
          ...results,
          successes: results.successes.concat(tests[0].url),
        }))
  } catch (error) {
    return tests.length === 1
      ? { successes: [], failures: [tests[0].url] }
      : test(browser, tests.slice(1), config).then((results) => ({
          ...results,
          failures: results.failures.concat(tests[0].url),
        }))
  }
}

const getConfig = async (): Promise<Config> => {
  await fs
    .access(`${process.cwd()}/pupille.config.js`)
    .catch(() =>
      Promise.reject(
        `There is no config in ${process.cwd()}. Make sure your configuration file is called "pupille.config.js"`
      )
    )

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
  return configValidation.data
}

export const run = async () => {
  const config = await getConfig()

  // We setup all the required folders for the tests results
  await setupFolders(config)

  // We setup the tests in the store
  const tests = Object.fromEntries(
    config.tests.map(({ url }) => [
      sanitizeUrl(url),
      { url, status: 'pending' as const },
    ])
  )
  store.setState({ tests })

  const browser = await puppeteer.launch({ headless: 'new' })

  try {
    const result = await test(browser, config.tests, config)
    browser.close()

    return result
  } catch (error) {
    browser.close()
    throw error
  }
}

export const approve = async (urls?: Array<string>) => {
  const config = await getConfig()

  // If no urls have been specified, this means the user wants to approve all the pending tests
  if (!urls) {
    const pendingFiles = await fs.readdir(`${config.root}/new`)

    urls = config.tests
      .map(({ url }) => url)
      .filter((url) =>
        pendingFiles.some((file) => file.endsWith(`${sanitizeUrl(url)}.png`))
      )
  }

  const movedTests = await Promise.all(
    urls.flatMap((url) =>
      config.resolutions.map((resolution) =>
        fs
          .copyFile(
            `${config.root}/new/${resolution[0]}x${resolution[1]}|${sanitizeUrl(
              url
            )}.png`,
            `${config.root}/original/${resolution[0]}x${
              resolution[1]
            }|${sanitizeUrl(url)}.png`
          )
          .then(() => ({
            success: url,
          }))
          .catch(() => ({
            failure: url,
          }))
      )
    )
  )

  await Promise.all(
    urls
      .flatMap((url) =>
        config.resolutions.map((resolution) =>
          fs
            .unlink(
              `${config.root}/new/${resolution[0]}x${
                resolution[1]
              }|${sanitizeUrl(url)}.png`
            )
            .catch(() => {})
        )
      )
      .concat(
        urls.flatMap((url) =>
          config.resolutions.map((resolution) =>
            fs
              .unlink(
                `${config.root}/results/${resolution[0]}x${
                  resolution[1]
                }|${sanitizeUrl(url)}.png`
              )
              .catch(() => {})
          )
        )
      )
  )

  const remainingFiles = await fs.readdir(`${config.root}/new`)
  const erroredFiles = await fs.readdir(`${config.root}/error`)

  return {
    approved: (
      movedTests.filter((file) => 'success' in file) as Array<{
        success: string
      }>
    ).map(({ success }) => success),
    failed: (
      movedTests.filter((file) => 'failure' in file) as Array<{
        failure: string
      }>
    ).map(({ failure }) => failure),
    remaining: config.tests
      .map(({ url }) => url)
      .filter((url) =>
        remainingFiles.some((file) => file.endsWith(`${sanitizeUrl(url)}.png`))
      ),
    errored: config.tests
      .map(({ url }) => url)
      .filter((url) =>
        erroredFiles.some((file) => file.endsWith(`${sanitizeUrl(url)}.png`))
      ),
  }
}

export default {
  store,
  run,
  approve,
}
