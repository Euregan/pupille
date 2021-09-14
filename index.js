const { app, BrowserWindow, protocol, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  })

  win.webContents.openDevTools()

  ipcMain.on('request-results', event =>
    fs.readFile('pupille/results.json', 'utf-8', (error, results) =>
      event.reply('results-updated', error || JSON.parse(results))
    )
  )

  ipcMain.on('approve-test', (event, slug) =>
    fs.readFile('pupille/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)
      results.tests[slug] = { ...results.tests[slug], status: 'approved' }
      fs.writeFile(
        'pupille/results.json',
        JSON.stringify(results, null, 2),
        () => {}
      )
    })
  )

  ipcMain.on('reject-test', (event, slug) =>
    fs.readFile('pupille/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)
      results.tests[slug] = { ...results.tests[slug], status: 'rejected' }
      fs.writeFile(
        'pupille/results.json',
        JSON.stringify(results, null, 2),
        () => {}
      )
    })
  )

  ipcMain.on('apply', event =>
    fs.readFile('pupille/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)

      let copies = []
      Object.entries(results.tests).forEach(([slug, test]) => {
        results.tests[slug] = { ...results.tests[slug], status: 'success' }
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
    })
  )

  ipcMain.on('request-config', event =>
    fs.readFile('pupille.config.json', 'utf-8', (error, config) =>
      event.reply(
        'config',
        error
          ? { ...error, error: true }
          : {
              ...JSON.parse(config),
              root: path.resolve(process.cwd())
            }
      )
    )
  )

  fs.readFile('pupille/results.json', 'utf-8', (error, results) =>
    win.webContents.send(
      'results-updated',
      error ? { ...error, error: true } : JSON.parse(results)
    )
  )

  chokidar.watch('pupille/results.json').on('all', (event, path) => {
    const results = fs.readFileSync('pupille/results.json', 'utf-8')
    win.webContents.send('results-updated', JSON.parse(results))
  })

  win.loadFile('tmp/index.html')
}

app.whenReady().then(() => {
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
