const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const marshaller = require('@aws-sdk/eventstream-marshaller');
const util_utf8_node = require('@aws-sdk/util-utf8-node');
const v4 = require('./lib/aws-signature-v4');

// our converter between binary event streams messages and JSON
const eventStreamMarshaller = new marshaller.EventStreamMarshaller(
  util_utf8_node.toUtf8,
  util_utf8_node.fromUtf8
);

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
  };
};

// liberally copied from https://github.com/aws-samples/amazon-transcribe-websocket-static/blob/6a0b97f1c667b649c31cd9b550c37795a5c7ce25/lib/main.js#L225
const region = 'us-east-1';
const languageCode = 'en-US'; // TODO: can I dynamically switch this?
const sampleRate = 44100; // only valid for en-US and es-US
const createPresignedUrl = () => {
  // get a preauthenticated URL that we can use to establish our WebSocket
  return v4.createPresignedURL(
    'GET',
    `transcribestreaming.${region}.amazonaws.com:8443`,
    '/stream-transcription-websocket',
    'transcribe',
    crypto.createHash('sha256').update('', 'utf8').digest('hex'),
    {
      protocol: 'wss',
      expires: 15,
      region,
      query:
        'language-code=' +
        languageCode +
        '&media-encoding=pcm&sample-rate=' +
        sampleRate,
    }
  );
};

const app = express();

// initialize a simple http server
const server = http.createServer(app);

// initialize the WebSocket server instance
const wss = new WebSocket.Server({ server });

// initialize websocket connection with Amazon Transcribe
const transcribeSocket = new WebSocket(createPresignedUrl());
transcribeSocket.binaryType = 'arraybuffer';

wss.on('connection', (ws) => {
  ws.on('message', (chunk) => {
    // add the right Transcribe JSON headers and structure to the chunk
    const audioEventChunk = getAudioEventMessage(Buffer.from(chunk));

    //convert the JSON object + headers into a binary event stream chunk
    const binary = eventStreamMarshaller.marshall(audioEventChunk);

    if (transcribeSocket.readyState === WebSocket.OPEN) {
      transcribeSocket.send(binary);
    }
  });
});

//start our server
server.listen(8000, () => {
  console.log(`Server listening on port ${server.address().port}`);
});
