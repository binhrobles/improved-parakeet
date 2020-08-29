const AWS = require('aws-sdk');
const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const shortid = require('shortid');
const transcribe = require('aws-transcribe');

const REGION = process.env.REGION || 'us-west-2';
let id = 1000;

const initiateTranscription = async ({
  publishStream,
  speaker,
  listenerConfig,
}) => {
  // prepare aws service connections
  AWS.config.update({ region: REGION });
  const creds = await new AWS.CredentialProviderChain().resolvePromise();
  const transcribeClient = new transcribe.AwsTranscribe(creds);
  const translateClient = new AWS.Translate(); // sdk client, so auto uses CredentialProviderChain

  // initialize websocket connection with Amazon Transcribe
  const transcribeStream = transcribeClient
    .createStreamingClient({
      region: REGION,
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
        id += 1;
        publishStream.clients.forEach(async (client) => {
          // if they want to translate, pipe through translate
          // could be improved by adding a cache for entries, calling translate ideally once
          let translated;
          let latency;
          if (listenerConfig[client.id].languageCode) {
            try {
              const start = new Date();
              const response = await translateClient
                .translateText({
                  SourceLanguageCode: 'en',
                  TargetLanguageCode: listenerConfig[client.id].languageCode,
                  Text: text,
                })
                .promise();

              translated = response.TranslatedText;
              latency = new Date() - start;
            } catch (e) {
              console.error(e);
            }
          }

          if (client.readyState === WebSocket.OPEN) {
            client.send(
              JSON.stringify({
                id,
                event: 'text',
                languageCode: 'en',
                value: text,
                isPartial: result.IsPartial,
              })
            );
            if (translated) {
              client.send(
                JSON.stringify({
                  id,
                  event: 'text',
                  languageCode: listenerConfig[client.id].languageCode,
                  value: translated,
                  isPartial: result.IsPartial,
                  latency,
                })
              );
            }
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

// initialize connection state that should live externally
const state = {};

audioWss.on('connection', (ws) => {
  // initialize connection config
  ws.id = shortid();
  state[ws.id] = {};
  console.log(`client ${ws.id} connected`);

  ws.on('message', async (data) => {
    // first try to parse the data, to see if it's a user command
    // how could this be rearchitected to avoid this?
    let message;
    try {
      message = JSON.parse(data.toString());
    } catch (e) {
      return;
    }

    // accept a new audio client, and start a transcription stream
    if (message.event === 'start' && message.value === 'audio-client') {
      console.log('new audio client');

      const transcribeStream = await initiateTranscription({
        publishStream: audioWss,
        speaker: ws,
        listenerConfig: state,
      });
      const audioInputPipe = WebSocket.createWebSocketStream(ws);

      console.log('piping audio...');
      audioInputPipe.pipe(transcribeStream);

      return;
    }

    // accept language change
    if (message.event === 'change-language') {
      state[ws.id].languageCode = message.value;
      return;
    }
  });
});

//start our server
server.listen(8000, () => {
  console.log(`Server listening on port ${server.address().port}`);
});
