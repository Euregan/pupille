import './font.css'
import './app.css'
import { Elm } from './Main.elm'
import { ipcRenderer } from 'electron'

ipcRenderer.on('config', (event, config) => {
  const appNode = document.getElementById('app')

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

  const app = Elm.Main.init({
    node: appNode,
    flags: config
  })

  app.ports.approveChange.subscribe(slug =>
    ipcRenderer.send('approve-test', slug)
  )

  app.ports.rejectChange.subscribe(slug =>
    ipcRenderer.send('reject-test', slug)
  )

  app.ports.apply.subscribe(() => ipcRenderer.send('apply'))

  ipcRenderer.on('results-updated', (event, results) => {
    if (!results.error) {
      app.ports.testsUpdated.send(
        Object.entries(results.tests).map(([slug, test]) => ({ ...test, slug }))
      )
    }
  })

  ipcRenderer.send('request-results')
})

ipcRenderer.send('request-config')
