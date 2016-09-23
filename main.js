const electron = require('electron')
const ipc = require('electron').ipcMain

// Module to control application life.
const app = electron.app
// Module to create native browser window.
const BrowserWindow = electron.BrowserWindow

class MusicPlayerMini {
  constructor () {
    this.song = {
      file: './samples/song1.mp3',
      metadata: {
        title: 'La Mer',
        artist: 'Sarah Brightman',
        album: 'Dive',
        length: 214000 // milliseconds
      },
      playing: false // playing state
    }

    this._start_ms = new Date().getTime()
  }

  play () {
    console.log('MusicPlayerMini playing', this.song.file)
    this.song.playing = true
    return true // playing is true
  }

  pause () {
    console.log('MusicPlayerMini paused', this.song.file)
    this.song.playing = false
    return false // playing is false
  }

  goto (time) {
    console.log('goto time', time, 'for', this.song.file)
    this._start_ms -= time - this.progress()
  }

  progress () {
    return new Date().getTime() - this._start_ms
  }
}

const player = new MusicPlayerMini()

ipc.on('ui-play-or-pause', (event, _) => {
  let playing
  if (player.song.playing) {
    playing = player.pause()
  } else {
    playing = player.play()
  }

  event.sender.send('player-play-or-pause', playing)
})
ipc.on('ui-pause', (event, _) => event.sender.send('player-play-or-pause', player.pause()))
ipc.on('ui-goto', (event, time) => {
  event.sender.send('player-goto', player.goto(time))
})
ipc.on('ui-progress', (event, _) => {
  let p = player.progress()
  event.sender.send('player-progress', p)
  if (p >= player.song.metadata.length) {
    event.sender.send('player-play-or-pause', player.pause())
  }
})

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let mainWindow

function createWindow () {
  // Create the browser window.
  mainWindow = new BrowserWindow({
    icon: './images/app_icon.png',
    width: 456,
    height: 152,
    useContentSize: true,
    resizable: false,
    frame: false
  })

  // Disable the application menu bar
  mainWindow.setAutoHideMenuBar(true)

  // and load the index.html of the app.
  mainWindow.loadURL(`file://${__dirname}/index.html`)

  // Open the DevTools.
  mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on('closed', function () {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null
  })
}

function initApp () {
  createWindow()

  // Start playing music.
  let webContents = mainWindow.webContents
  webContents.on('did-finish-load', () => {
    webContents.send('player-play-or-pause', player.play())
    webContents.send('player-song-change', player.song.metadata)
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', initApp)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', function () {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
