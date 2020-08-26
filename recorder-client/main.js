const mic = require('mic')
const keypress = require('keypress')
const WebSocket = require('ws')
const audioUtils = require('./lib/audioUtils')

const convertAudioToBinaryMessage = (audioChunk) => {
  if (audioChunk == null) return

  // downsample and convert the raw audio bytes to PCM
  // TODO: can I not use sox to record audio in PCM format?
  const downsampledBuffer = audioUtils.downsampleBuffer(audioChunk)
  const pcmEncodedBuffer = audioUtils.pcmEncode(downsampledBuffer)

  return pcmEncodedBuffer
}

// set up websocket connection
const ws = new WebSocket('ws://localhost:8000')
ws.binaryType = 'arraybuffer'

// create microphone instance
const micInstance = mic()
const micInputStream = micInstance.getAudioStream()

micInputStream.on('error', (err) => {
  console.log(`Input Stream Error: ${err}`)
})

ws.on('open', () => {
  micInputStream.on('data', (rawAudioChunk) => {
    // the audio stream is raw audio bytes. Transcribe expects PCM with additional metadata, encoded as binary
    ws.send(convertAudioToBinaryMessage(rawAudioChunk))
  })
})

// set up keypress functionality
let streaming = false
keypress(process.stdin)

// listen for the "keypress" event
process.stdin.on('keypress', (ch, key) => {
  if (key) {
    // space: toggle microphone
    if (key.name == 'space') {
      if (streaming) {
        console.log('Stopping audio stream')
        micInstance.stop()
      } else {
        console.log('Starting audio stream')
        micInstance.start()
      }
      streaming = !streaming
    }

    // ctrl+c: exit the program
    if (key.ctrl && key.name == 'c') {
      console.log('Quitting')
      process.stdin.pause()
      ws.close()
    }
  }
})

process.stdin.setRawMode(true)
process.stdin.resume()
