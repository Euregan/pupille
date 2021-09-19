const { WebSocketServer } = require('ws')
const express = require('express')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')

module.exports = {
  start: () => {
    const wss = new WebSocketServer({ port: 8080 })

    wss.on('connection', client => {
      client.on('message', message => {
        const { type, payload } = JSON.parse(message.toString())
        switch (type) {
          case 'request-results':
            fs.readFile('pupille/results.json', 'utf-8', (error, results) =>
              client.send(
                JSON.stringify({
                  type: 'results-updated',
                  payload: error || JSON.parse(results)
                })
              )
            )
            break
          case 'approve-test':
            fs.readFile(
              'pupille/results.json',
              'utf-8',
              (error, resultsRaw) => {
                let results = JSON.parse(resultsRaw)
                results.tests[slug] = {
                  ...results.tests[slug],
                  status: 'approved'
                }
                fs.writeFile(
                  'pupille/results.json',
                  JSON.stringify(results, null, 2),
                  () => {}
                )
              }
            )
            break

          case 'reject-test':
            fs.readFile(
              'pupille/results.json',
              'utf-8',
              (error, resultsRaw) => {
                let results = JSON.parse(resultsRaw)
                results.tests[slug] = {
                  ...results.tests[slug],
                  status: 'rejected'
                }
                fs.writeFile(
                  'pupille/results.json',
                  JSON.stringify(results, null, 2),
                  () => {}
                )
              }
            )
            break

          case 'apply':
            fs.readFile(
              'pupille/results.json',
              'utf-8',
              (error, resultsRaw) => {
                let results = JSON.parse(resultsRaw)

                let copies = []
                Object.entries(results.tests).forEach(([slug, test]) => {
                  results.tests[slug] = {
                    ...results.tests[slug],
                    status: 'success'
                  }
                  copies.push(
                    new Promise((resolve, reject) =>
                      fs.copyFile(
                        `pupille/new/${slug}.png`,
                        `pupille/original/${slug}.png`,
                        error => (error ? reject(error) : resolve())
                      )
                    )
                  )
                })

                Promise.all(copies).then(() => {
                  fs.unlink('pupille/new', () => {})
                  fs.unlink('pupille/results', () => {})
                  fs.writeFile(
                    'pupille/results.json',
                    JSON.stringify(results, null, 2),
                    () => {}
                  )
                })
              }
            )
            break

          case 'request-config':
            fs.readFile('pupille.config.json', 'utf-8', (error, config) =>
              client.send(
                JSON.stringify({
                  type: 'config',
                  payload: error
                    ? { ...error, error: true }
                    : {
                        ...JSON.parse(config)
                      }
                })
              )
            )
            break
        }
      })

      fs.readFile('pupille.config.json', 'utf-8', (error, config) =>
        client.send(
          JSON.stringify({
            type: 'config',
            payload: error
              ? { ...error, error: true }
              : {
                  ...JSON.parse(config)
                }
          })
        )
      )

      chokidar.watch('pupille/results.json').on('all', (event, path) => {
        const results = fs.readFileSync('pupille/results.json', 'utf-8')
        client.send(
          JSON.stringify({
            type: 'results-updated',
            payload: JSON.parse(results)
          })
        )
      })
    })
    console.log(`ws://localhost:${8080}`)

    const app = express()
    const port = 3000

    app.use(express.static(path.resolve(__dirname, '../dist')))
    app.use(express.static('pupille'))

    app.listen(port, () => {
      console.log(`Example app listening at http://localhost:${port}`)
    })
  }
}
