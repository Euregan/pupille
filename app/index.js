const { app, BrowserWindow, protocol, ipcMain } = require('electron')
const path = require('path')
const fs = require('fs')
const chokidar = require('chokidar')
const config = require('../vision.config.json')

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
    fs.readFile('vision/results.json', 'utf-8', (error, results) =>
      event.reply('results-updated', JSON.parse(results))
    )
  )

  ipcMain.on('approve-test', (event, slug) =>
    fs.readFile('vision/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)
      results.tests[slug] = { ...results.tests[slug], status: 'approved' }
      fs.writeFile(
        'vision/results.json',
        JSON.stringify(results, null, 2),
        () => {}
      )
    })
  )

  ipcMain.on('reject-test', (event, slug) =>
    fs.readFile('vision/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)
      results.tests[slug] = { ...results.tests[slug], status: 'rejected' }
      fs.writeFile(
        'vision/results.json',
        JSON.stringify(results, null, 2),
        () => {}
      )
    })
  )

  ipcMain.on('apply', event =>
    fs.readFile('vision/results.json', 'utf-8', (error, resultsRaw) => {
      let results = JSON.parse(resultsRaw)

      let copies = []
      Object.entries(results.tests).forEach(([slug, test]) => {
        results.tests[slug] = { ...results.tests[slug], status: 'success' }
        copies.push(
          new Promise((resolve, reject) =>
            fs.copyFile(
              `vision/new/${slug}.png`,
              `vision/original/${slug}.png`,
              error => (error ? reject(error) : resolve())
            )
          )
        )
      })

      Promise.all(copies).then(() => {
        fs.unlink('vision/new', () => {})
        fs.unlink('vision/results', () => {})
        fs.writeFile(
          'vision/results.json',
          JSON.stringify(results, null, 2),
          () => {}
        )
      })
    })
  )

  ipcMain.on('request-config', event =>
    fs.readFile('vision.config.json', 'utf-8', (error, config) =>
      event.reply('config', {
        ...JSON.parse(config),
        root: path.resolve(__dirname, '..')
      })
    )
  )

  fs.readFile('vision/results.json', 'utf-8', (error, results) =>
    win.webContents.send('results-updated', JSON.parse(results))
  )

  chokidar.watch('vision/results.json').on('all', (event, path) => {
    const results = fs.readFileSync('vision/results.json', 'utf-8')
    win.webContents.send('results-updated', JSON.parse(results))
  })

  win.loadFile('../dist/index.html')
  // win.loadURL('http://localhost:9000')
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
