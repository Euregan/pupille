import './font.css'
import './app.css'
import { Elm } from './Main.elm'

const server = new WebSocket('ws://localhost:8080')

const appNode = document.getElementById('app')
let app = null

server.onmessage = ({ data }) => {
  const { type, payload } = JSON.parse(data)
  switch (type) {
    case 'config':
      const config = payload
      if (config.error) {
        const error = config

        switch (error.code) {
          case 'ENOENT':
            return appNode.append(
              `Seems like no ${error.path} file exist at the root of the project, please create one, then restart Pupille`
            )
          default:
            return appNode.append('An error happened, sorry about that 😔')
        }
      }

      app = Elm.Main.init({
        node: appNode,
        flags: config
      })

      app.ports.approveChange.subscribe(slug =>
        server.send(JSON.stringify({ type: 'approve-test', payload: slug }))
      )

      app.ports.rejectChange.subscribe(slug =>
        server.send(JSON.stringify({ type: 'reject-test', payload: slug }))
      )

      app.ports.apply.subscribe(() =>
        server.send(JSON.stringify({ type: 'apply' }))
      )

      server.send(JSON.stringify({ type: 'request-results' }))
      break

    case 'results-updated':
      const results = payload
      if (!results.error && app) {
        app.ports.testsUpdated.send(
          Object.entries(results.tests).map(([slug, test]) => ({
            ...test,
            slug
          }))
        )
      }

      break
  }
}
