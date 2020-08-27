import * as pulumi from '@pulumi/pulumi';
import * as aws from '@pulumi/aws';

// set up permissions for underlying eb ec2 resources
const ebRole = new aws.iam.Role('transcribeRole', {
  assumeRolePolicy: JSON.stringify({
    Version: '2012-10-17',
    Statement: [
      {
        Action: 'sts:AssumeRole',
        Principal: {
          Service: 'ec2.amazonaws.com',
        },
        Effect: 'Allow',
      },
    ],
  }),
});
const ebInstanceProfile = new aws.iam.InstanceProfile(
  'transcribeInstanceProfile',
  {
    role: ebRole.name,
  }
);

// attaches EB managed policies required for existing in EB cluster:
// https://docs.aws.amazon.com/elasticbeanstalk/latest/dg/iam-instanceprofile.html
const webTierAttach = new aws.iam.RolePolicyAttachment('attachWebTierPolicy', {
  policyArn: 'arn:aws:iam::aws:policy/AWSElasticBeanstalkWebTier',
  role: ebRole.name,
});
const multiContainerAttach = new aws.iam.RolePolicyAttachment(
  'attachMultiContainerPolicy',
  {
    policyArn:
      'arn:aws:iam::aws:policy/AWSElasticBeanstalkMulticontainerDocker',
    role: ebRole.name,
  }
);

// scaffold eb environment
const transcribeBackend = new aws.elasticbeanstalk.Application(
  'transcribeBackend',
  { description: 'Backend services for transcribing' }
);

const transcribeEnv = new aws.elasticbeanstalk.Environment('transcribeEnv', {
  application: transcribeBackend.name,
  solutionStackName:
    '64bit Amazon Linux 2018.03 v2.21.0 running Multi-container Docker 19.03.6-ce (Generic)',
  settings: [
    {
      namespace: 'aws:autoscaling:launchconfiguration',
      name: 'IamInstanceProfile',
      value: ebInstanceProfile.name,
    },
  ],
});

// Export important stuff
export const endpoint = transcribeEnv.endpointUrl;
// TODO: app name, env name, s3 bucket (?), for deploying
