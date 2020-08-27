import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// scaffold eb environment
const transcribeBackend = new aws.elasticbeanstalk.Application(
  'transcribeBackend',
  { description: 'Backend services for transcribing' }
);
const transcribeEnv = new aws.elasticbeanstalk.Environment('transcribeEnv', {
  application: transcribeBackend.name,
  // https://docs.aws.amazon.com/elasticbeanstalk/latest/platforms/platforms-supported.html
  // using Docker solution stack, but would need to change to multicontainer
  // if splitting audio and broadcasting concerns
  solutionStackName: '64bit Amazon Linux 2 v3.1.0 running Docker',
});

// Export important stuff
export const endpoint = transcribeEnv.endpointUrl;
