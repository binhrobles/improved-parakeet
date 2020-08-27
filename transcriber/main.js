const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const transcribe = require('aws-transcribe');

// read AWS credentials out of .env
require('dotenv').config();

const app = express();

// initialize a simple http server
const server = http.createServer(app);

// initialize the audio WebSocket listener
const audioWss = new WebSocket.Server({ server });

// initialize websocket connection with Amazon Transcribe
const client = new transcribe.AwsTranscribe();
const transcribeStream = client
  .createStreamingClient({
    region: 'us-west-2',
    sampleRate: 16000,
    languageCode: 'en-US',
  })
  // enums for returning the event names which the stream will emit
  .on(transcribe.StreamingClient.EVENTS.OPEN, () =>
    console.log(`transcribe connection opened`)
  )
  .on(transcribe.StreamingClient.EVENTS.ERROR, console.error)
  .on(transcribe.StreamingClient.EVENTS.CLOSE, () =>
    console.log(`transcribe connection closed`)
  )
  .on(transcribe.StreamingClient.EVENTS.DATA, (data) => {
    const results = data.Transcript.Results;

    if (!results || results.length === 0) {
      return;
    }

    const result = results[0];
    const final = !result.IsPartial;
    const prefix = final ? 'recognized' : 'recognizing';
    const text = result.Alternatives[0].Transcript;
    console.log(`${prefix} text: ${text}`);

    // only broadcast out once the final result is achieved
    if (final) {
      audioWss.clients.forEach((client) => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(text);
        }
      });
    }
  });

audioWss.on('connection', (ws) => {
  console.log(`audio input established`);
  const audioInputPipe = WebSocket.createWebSocketStream(ws);
  audioInputPipe.pipe(transcribeStream);
});

//start our server
server.listen(8000, () => {
  console.log(`Server listening on port ${server.address().port}`);
});
