import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as s3 from "aws-cdk-lib/aws-s3";
import * as dynamodb from "aws-cdk-lib/aws-dynamodb";
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

    // Outputs

    new cdk.CfnOutput(this, "BucketName", {
      value: photosBucket.bucketName,
    });

    new cdk.CfnOutput(this, "TableName", {
      value: photoDataTable.tableName,
    });
  }
}
