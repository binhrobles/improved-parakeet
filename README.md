## Overview

## Learnings

### AWS transcribe streams

- there's also a medical option, but didn't explore that
- streaming functionality different than Transcribe jobs
  - https://docs.aws.amazon.com/transcribe/latest/dg/streaming.html
- transcribe streaming API responds chunk by chunk to the sender
  - so if streaming from client, client would need to track all listeners
  - better to have a separate backend service handling those connections
  - allows more flexibilty with what to do with the transcribed chunks
- presigned url generation would've been a HUGE headache without a good community library
  - https://github.com/qasim9872/aws-transcribe
  - official AWS examples suck/are too low level
- no auto-lang detect: language must be declared on connection
- struggles with informal speak/accents
- domain-specific speech can be improved with custom libraries
  - https://docs.aws.amazon.com/transcribe/latest/dg/how-vocabulary.html
- no multi-channel/multi-speaker support
- provided http2 clients only available in select languages (not JS)
- streaming API expects very specific 16-bit PCM audio format
  - this was a struggle until I found a lib

### AWS Translate streams

- allows auto detection of text language
- 300->500ms latency seemed to do fine when piping in Transcribe partial output

### Modern audio streaming architectures

- for web tech, websockets are king, but HTTP2 + SSE also possible
- APIG is an option for simpler use cases
- should separate inbound/outbound concerns w/ data streaming architecture
- could be managed service or another container, depending on tradeoff b/w portability, scale, and persistence
- Kinesis, Kafka, Redis Pub/sub, Redis streams, ...
- [data stream tech discussion](https://redislabs.com/blog/what-to-choose-for-your-synchronous-and-asynchronous-communication-needs-redis-streams-redis-pub-sub-kafka-etc-best-approaches-synchronous-asynchronous-communication/)

### ADO

- templating of specific pipeline pieces super useful
  - should create shareable example templates for common scenarios
- would like to cache intermediate docker images
  - yarn caching a bit more difficult when inside docker container

### Elastic Beanstalk

- Dockerrun.aws.json defines a single Task which is created on each underlying EC2 instance
- horizontal scaling would thus duplicate the entire definition
- if you want more granular scaling, move to ECS, or multiple EB apps
- [small hack required to enable websockets](https://medium.com/@binyamin/node-websockets-with-aws-elastic-beanstalk-elastic-load-balancer-elb-or-application-load-6a693b21415a)
