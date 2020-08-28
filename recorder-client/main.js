// invoke like:
// yarn start transcribeenv-7d0e32d.eba-egz27rfr.us-west-2.elasticbeanstalk.com:80
const WebSocket = require('ws');
const recorder = require('node-record-lpcm16');

// set up websocket connection
const ws = new WebSocket(
  process.argv[2] ? `ws://${process.argv[2]}` : 'ws://localhost:8000'
);
ws.binaryType = 'arraybuffer';
const duplex = WebSocket.createWebSocketStream(ws);

// notify server that we're speaking
duplex.write(
  JSON.stringify({ event: 'start', value: 'audio-client' }),
  'utf-8'
);

// create microphone instance
const recordStream = recorder
  .record({
    sampleRateHertz: 16000,
    threshold: 0, //silence threshold
    recordProgram: 'sox',
    silence: '5.0', //seconds of silence before ending
  })
  .stream();

recordStream.on('error', console.error);
recordStream.pipe(duplex); // send everything from recorder into backend connection

duplex.on('data', (data) => {
  console.log(data.toString());
});

process.on('SIGINT', () => {
  console.log('Goodbye');
  duplex.destroy();
  process.exit(0);
});
