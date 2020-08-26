const mic = require('mic')
const AWS = require('aws-sdk')
const s3 = new AWS.S3()

// create microphone instance
const micInstance = mic({
  debug: true,
  fileType: 'wav',
})
const micInputStream = micInstance.getAudioStream()

// create S3 bucket connection
const params = {
  Bucket: 'audio-input-ad784cc',
  Key: 'cli',
  Body: micInputStream,
}
s3.upload(params, (err, data) => {
  if (err) {
    console.log(`S3 Upload Error: ${err}`)
  } else {
    console.log(`Upload complete: ${JSON.stringify(data, null, 2)}`)
  }
})

micInputStream.on('error', (err) => {
  console.log(`Input Stream Error: ${err}`)
})

// TODO: listen to some keyboard event
micInputStream.on('startComplete', () => {
  console.log('starting 5s timer')
  setTimeout(function () {
    micInstance.stop()
  }, 5000)
})

micInstance.start()
