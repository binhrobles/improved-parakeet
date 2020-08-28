import * as aws from '@pulumi/aws';

// Create an AWS resource (S3 Bucket)
const bucket = new aws.s3.Bucket('transcribe-reader');

// Export the name of the bucket
export const bucketName = bucket.id;
