// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

const ipc = require('electron').ipcRenderer
const remote = require('electron').remote

function msToMMSS (milliseconds) {
  let seconds = Math.floor(milliseconds / 1000)
  return `${Math.floor(seconds / 60)}:${('0' + (seconds % 60)).slice(-2)}`
}

let progressUpdateSchedule
function scheduleProgressUpdate (playing) {
  if (playing) {
    // Schedule progress slider update.
    progressUpdateSchedule = setInterval(() => {
      // Ask for playing progress, then
      // update time current text and progress slider position.
      // The second part is dealt by receiving 'player-progress' messages
      ipc.send('ui-progress')
    }, 15)
  } else {
    // Cancel update schedule.
    clearInterval(progressUpdateSchedule)
  }
}

class ProgressSlider {
  constructor () {
    this.range = document.getElementById('progress')
    this.lower = document.getElementById('progress-slider-background-lower')
    this.upper = document.getElementById('progress-slider-background-upper')
    this.tooltip = document.getElementById('progress-tooltip')

    this.range.addEventListener('mousedown', () => scheduleProgressUpdate(false))
    this.range.addEventListener('click', () => this.setValue(this.range.value))
    // Resume playing if the song was playing.
    this.range.addEventListener('mouseup', () => ipc.send('ui-goto', parseInt(this.range.value, 10)))

    let mousemoveHandler
    this.range.addEventListener('mouseenter', () => {
      // Bind the tooltip to the mouse movement.
      mousemoveHandler = this.range.addEventListener('mousemove', event => {
        let mouseX = event.clientX
        let tooltipWidth = this.tooltip.getBoundingClientRect().width
        let rangeLeft = this.range.getBoundingClientRect().left
        let rangeWidth = this.range.getBoundingClientRect().width
        // Progress input range width is longer than background track on each
        // side of 6px.
        // Check the stylesheet to see.
        let trackLeft = rangeLeft + 6
        let trackWidth = rangeWidth - 12
        let trackRight = trackLeft + trackWidth
        let distance = mouseX - trackLeft
        let value = Math.floor(distance / trackWidth * this.range.max)

        // Set tooltip text.
        this.tooltip.innerHTML = msToMMSS(value)
        // Show tooltip when mouse is over the progress input and between the
        // track start and end.
        this.tooltip.className = (mouseX >= trackLeft && mouseX <= trackRight) ? 'show' : 'hidden'
        this.tooltip.style.left = `${mouseX - tooltipWidth / 2 - rangeLeft}px`
      })
    })
    this.range.addEventListener('mouseleave', () => {
      // Unbind the tooltip and hide it.
      this.range.removeEventListener('mouseover', mousemoveHandler)
      this.tooltip.className = 'hidden'
    })
    this.range.addEventListener('input', () => this._updateStyles(this.range.value))
  }

  setValue (value) {
    this.range.value = value
    this._updateStyles(value)
  }

  _updateStyles (value) {
    let percent = value / this.range.max

    this.range.className = value === 0 ? 'is-lowest-value' : ''
    this.lower.style.flexGrow = percent
    this.upper.style.flexGrow = 1 - percent
  }

  setRangeMax (max) {
    this.range.max = max
  }
}

const windowClose = document.getElementById('window-close')
const songTitle = document.getElementById('song-title')
const songArtist = document.getElementById('song-artist')
const songAlbum = document.getElementById('song-album')
const timeCurrent = document.getElementById('time-current')
const timeTotal = document.getElementById('time-total')
const progressSlider = new ProgressSlider()
const playPause = document.getElementById('play-pause')
const skipPrevious = document.getElementById('skip-previous')
const skipNext = document.getElementById('skip-next')

function setPlayOrPauseButtonState (playing) {
  if (playing) {
    playPause.src = './images/pause.svg'
  } else {
    playPause.src = './images/play.svg'
  }
}

windowClose.addEventListener('click', () => remote.getCurrentWindow().close())
playPause.addEventListener('click', () => {
  ipc.send('ui-play-or-pause')
})

ipc.on('player-song-change', (event, metadata) => {
  songTitle.innerHTML = metadata.title || 'Untitled'
  songArtist.innerHTML = metadata.artist || 'Unknown Artist'
  songAlbum.innerHTML = metadata.album || 'Unknown Album'
  timeCurrent.innerHTML = '0:0'
  timeTotal.innerHTML = msToMMSS(metadata.length)
  progressSlider.setValue(0)
  progressSlider.setRangeMax(metadata.length)
})
ipc.on('player-play-or-pause', (event, playing) => {
  setPlayOrPauseButtonState(playing)
  scheduleProgressUpdate(playing)
})
ipc.on('player-progress', (event, progress) => {
  // `progress` is in milliseconds.
  // Update time current text and progress slider position.
  timeCurrent.innerHTML = msToMMSS(progress)
  progressSlider.setValue(progress)
})
