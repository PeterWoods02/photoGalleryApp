import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
import * as sns from "aws-cdk-lib/aws-sns";
import * as subs from "aws-cdk-lib/aws-sns-subscriptions";
import * as sqs from "aws-cdk-lib/aws-sqs";
import * as events from "aws-cdk-lib/aws-lambda-event-sources";
import * as lambdanode from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as s3n from "aws-cdk-lib/aws-s3-notifications";

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PhotoGalleryAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // S3 Bucket & Table creation
    const photosBucket = new s3.Bucket(this, "photos", {
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      publicReadAccess: false,
    });

    const photoDataTable = new dynamodb.Table(this, "photoDataTable", {
      partitionKey: { name: "id", type: dynamodb.AttributeType.STRING },
      removalPolicy: cdk.RemovalPolicy.DESTROY,
    });

    // Integration infrastructure
    const photoProcessQueue = new sqs.Queue(this, "photoProcessQueue", {
      receiveMessageWaitTime: cdk.Duration.seconds(10),
    });

    const photoEventsTopic = new sns.Topic(this, "PhotoEventsTopic", {
      displayName: "New Photos topic",
    }); 

    // Lambda functions

    const processPhotoFn = new lambdanode.NodejsFunction(
      this,
      "ProcessPhotoFn",
      {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: `${__dirname}/../lambdas/processPhoto.ts`,
        timeout: cdk.Duration.seconds(15),
        memorySize: 128,
        environment: {
          TABLE_NAME: photoDataTable.tableName,
        },
      });

      const addMetadataFn = new lambdanode.NodejsFunction(
        this,
         "AddMetadataFunction",
        {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: `${__dirname}/../lambdas/addMetadata.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: photoDataTable.tableName,
        },
      });

      const updateStatusFn = new lambdanode.NodejsFunction(this, "UpdateStatusFunction", {
        runtime: lambda.Runtime.NODEJS_22_X,
        entry: `${__dirname}/../lambdas/updateStatus.ts`,
        timeout: cdk.Duration.seconds(10),
        memorySize: 128,
        environment: {
          TABLE_NAME: photoDataTable.tableName,
        },
      });
      

    // S3 --> SNS
    photosBucket.addEventNotification(
      s3.EventType.OBJECT_CREATED,
      new s3n.SnsDestination(photoEventsTopic)
    );

    // SQS --> Lambda
    const newPhotoEventSource = new events.SqsEventSource(photoProcessQueue, {
      batchSize: 5,
      maxBatchingWindow: cdk.Duration.seconds(5),
    });
  
    processPhotoFn.addEventSource(newPhotoEventSource);
  

    // Subs 

    photoEventsTopic.addSubscription(
      new subs.SqsSubscription(photoProcessQueue, {
        rawMessageDelivery: true,
        filterPolicy: {
          metadata_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ['none']
          }),
        },
      })
    );

    photoEventsTopic.addSubscription(
      new subs.LambdaSubscription(addMetadataFn, {
        filterPolicy: {
          metadata_type: sns.SubscriptionFilter.stringFilter({
            allowlist: ['Caption', 'Date', 'name']
          }),
        },
      })
    );

    photoEventsTopic.addSubscription(
      new subs.LambdaSubscription(updateStatusFn)
    );

    // Permissions
    photosBucket.grantRead(processPhotoFn);

    photoDataTable.grantWriteData(processPhotoFn);
    photoDataTable.grantWriteData(addMetadataFn);
    photoDataTable.grantWriteData(updateStatusFn);



    // Outputs

    new cdk.CfnOutput(this, "BucketName", {
      value: photosBucket.bucketName,
    });

    new cdk.CfnOutput(this, "TableName", {
      value: photoDataTable.tableName,
    });

    new cdk.CfnOutput(this, "PhotoEventsTopicArn", {
      value: photoEventsTopic.topicArn,
    });
  }
}
