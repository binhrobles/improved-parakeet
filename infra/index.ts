import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

// Create an AWS resource (S3 Bucket)
const audioBucket = new aws.s3.Bucket("audio-input");
const outputBucket = new aws.s3.Bucket("text-output");

// Trigger a Lambda function when something is added.
audioBucket.onObjectCreated("onNewVideo", (bucketArgs) => {
  console.log(`*** New Item in Bucket`);
});

// Export the name of the bucket
export const audioBucketName = audioBucket.id;
export const textBucketName = outputBucket.id;
