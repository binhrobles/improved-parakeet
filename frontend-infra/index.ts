import * as aws from '@pulumi/aws';

// Create an AWS resource (S3 Bucket)
const siteBucket = new aws.s3.Bucket('transcribe-reader', {
  acl: 'public-read',
  website: {
    indexDocument: 'index.html',
    errorDocument: 'index.html',
  },
});
new aws.s3.BucketPolicy('bucketPolicy', {
  bucket: siteBucket.bucket,
  policy: siteBucket.bucket.apply((bucketName) =>
    JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: ['s3:GetObject'],
          Resource: [`arn:aws:s3:::${bucketName}/*`],
        },
      ],
    })
  ),
});

// Export the name of the bucket
export const bucketName = siteBucket.id;
