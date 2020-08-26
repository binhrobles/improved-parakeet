const express = require('express')
const http = require('http')
const WebSocket = require('ws')
const marshaller = require('@aws-sdk/eventstream-marshaller') // for converting binary event stream messages to and from JSON
const util_utf8_node = require('@aws-sdk/util-utf8-node') // utilities for encoding and decoding UTF8

// our converter between binary event streams messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
)

// wrap the audio data in a JSON envelope
const getAudioEventMessage = (buffer) => {
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

const app = express()

//initialize a simple http server
const server = http.createServer(app)

//initialize the WebSocket server instance
const wss = new WebSocket.Server({ server })

wss.on('connection', (ws) => {
  ws.on('message', (chunk) => {
    // add the right Transcribe JSON headers and structure to the chunk
    const audioEventChunk = getAudioEventMessage(Buffer.from(chunk))

    //convert the JSON object + headers into a binary event stream chunk
    const binary = eventStreamMarshaller.marshall(audioEventChunk)

    console.log(audioEventChunk)
    console.log(binary)
  })
})

//start our server
server.listen(8000, () => {
  console.log(`Server listening on port ${server.address().port}`)
})
