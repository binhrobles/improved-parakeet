const marshaller = require('@aws-sdk/eventstream-marshaller') // for converting binary event stream messages to and from JSON
const util_utf8_node = require('@aws-sdk/util-utf8-node') // utilities for encoding and decoding UTF8
const mic = require('mic')
const keypress = require('keypress')
const WebSocket = require('ws')
const audioUtils = require('./lib/audioUtils')

// our converter between binary event streams messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
)

const convertAudioToBinaryMessage = (audioChunk) => {
  if (audioChunk == null) return

  // downsample and convert the raw audio bytes to PCM
  const downsampledBuffer = audioUtils.downsampleBuffer(audioChunk)
  const pcmEncodedBuffer = audioUtils.pcmEncode(downsampledBuffer)

  return pcmEncodedBuffer

  // add the right JSON headers and structure to the message
  //const audioEventMessage = getAudioEventMessage(Buffer.from(pcmEncodedBuffer))

  ////convert the JSON object + headers into a binary event stream message
  //const binary = eventStreamMarshaller.marshall(audioEventMessage)

  // return binary
}

const getAudioEventMessage = (buffer) => {
  // wrap the audio data in a JSON envelope
  return {
    headers: {
      ':message-type': {
        type: 'string',
        value: 'event',
      },
      ':event-type': {
        type: 'string',
        value: 'AudioEvent',
      },
    },
    body: buffer,
  }
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
    const binary = convertAudioToBinaryMessage(rawAudioChunk)

    ws.send(binary)
  })
})

// set up keypress functionality
let streaming = false
keypress(process.stdin)

// listen for the "keypress" event
process.stdin.on('keypress', (ch, key) => {
  // space: toggle microphone
  if (key && key.name == 'space') {
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
  if (key && key.ctrl && key.name == 'c') {
    process.stdin.pause()
    ws.terminate()
  }
})

process.stdin.setRawMode(true)
process.stdin.resume()
