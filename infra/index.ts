import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// scaffold eb environment
const transcribeBackend = new aws.elasticbeanstalk.Application(
  'transcribeBackend',
  { description: 'Backend services for transcribing' }
);
const transcribeEnv = new aws.elasticbeanstalk.Environment('transcribeEnv', {
  application: transcribeBackend.name,
  solutionStackName:
    '64bit Amazon Linux 2018.03 v2.21.0 running Multi-container Docker 19.03.6-ce (Generic)',
});

// Export important stuff
export const endpoint = transcribeEnv.endpointUrl;
