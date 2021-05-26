import './font.css'
import './app.css'
import { Elm } from './Main.elm'
import { ipcRenderer } from 'electron'

ipcRenderer.on('config', (event, config) => {
  const app = Elm.Main.init({
    node: document.getElementById('app'),
    flags: config
  })

  app.ports.approveChange.subscribe(slug =>
    ipcRenderer.send('approve-test', slug)
  )

  app.ports.rejectChange.subscribe(slug =>
    ipcRenderer.send('reject-test', slug)
  )

  app.ports.apply.subscribe(() => ipcRenderer.send('apply'))

  ipcRenderer.on('results-updated', (event, results) =>
    app.ports.testsUpdated.send(
      Object.entries(results.tests).map(([slug, test]) => ({ ...test, slug }))
    )
  )

  ipcRenderer.send('request-results')
})

ipcRenderer.send('request-config')
