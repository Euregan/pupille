import './app.css'
import { Elm } from './Main.elm'
import { ipcRenderer } from 'electron'

ipcRenderer.on('config', (event, config) => {
  const app = Elm.Main.init({
    node: document.getElementById('app'),
    flags: config
  })

  ipcRenderer.on('results-updated', (event, results) => {
    app.ports.testsUpdated.send(
      Object.entries(results.tests).map(([slug, test]) => ({ ...test, slug }))
    )
  })

  ipcRenderer.send('request-results')
})

ipcRenderer.send('request-config')
