const AWS = require('aws-sdk');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const transcribe = require('aws-transcribe');

const retrieveCurrentAwsCreds = async () => {
  const chain = new AWS.CredentialProviderChain();
  return await chain.resolvePromise();
};

const initiateTranscription = async ({ publishStream, speaker }) => {
  const creds = await retrieveCurrentAwsCreds();

  // initialize websocket connection with Amazon Transcribe
  const client = new transcribe.AwsTranscribe(creds);
  const transcribeStream = client
    .createStreamingClient({
      region: 'us-west-2', // TODO: not this
      sampleRate: 16000,
      languageCode: 'en-US',
    })
    // enums for returning the event names which the stream will emit
    .on(transcribe.StreamingClient.EVENTS.OPEN, () => {
      console.log('transcribe connection opened');
      speaker.send('ready');
    })
    .on(transcribe.StreamingClient.EVENTS.ERROR, console.error)
    .on(transcribe.StreamingClient.EVENTS.CLOSE, () =>
      console.log('transcribe connection closed')
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
      // currently using a global audioWss object
      // but ideally this step would just publish to a pubsub service and be done
      if (final) {
        publishStream.clients.forEach((client) => {
          if (client.readyState === WebSocket.OPEN) {
            client.send(text);
          }
        });
      }
    });

  return transcribeStream;
};

// initialize a simple http server
const app = express();
const server = http.createServer(app);

// initialize the audio WebSocket listener
const audioWss = new WebSocket.Server({ server });

audioWss.on('connection', (ws) => {
  ws.on('message', async (data) => {
    if (data.toString() === 'audio-client') {
      console.log('new audio client');

      const transcribeStream = await initiateTranscription({
        publishStream: audioWss,
        speaker: ws,
      });
      const audioInputPipe = WebSocket.createWebSocketStream(ws);

      console.log('piping audio...');
      audioInputPipe.pipe(transcribeStream);
    }
  });
});

//start our server
server.listen(8000, () => {
  console.log(`Server listening on port ${server.address().port}`);
});
