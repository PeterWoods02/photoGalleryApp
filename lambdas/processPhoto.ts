/* eslint-disable import/extensions, import/no-absolute-path */
import { SQSHandler } from "aws-lambda";
import {
  GetObjectCommand,
  PutObjectCommandInput,
  GetObjectCommandInput,
  S3Client,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import {
    DynamoDBClient,
    PutItemCommand,
    PutItemCommandInput,
  } from "@aws-sdk/client-dynamodb";
  

const s3 = new S3Client();
const dynamo = new DynamoDBClient();

const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: SQSHandler = async (event) => {
  console.log("Event ", JSON.stringify(event));
  for (const record of event.Records) {
    const snsMessage = JSON.parse(record.body);

    if (snsMessage.Records) {
      console.log("Record body ", JSON.stringify(snsMessage));
      for (const messageRecord of snsMessage.Records) {
        const s3e = messageRecord.s3;
        const srcBucket = s3e.bucket.name;
       
        const srcKey = decodeURIComponent(s3e.object.key.replace(/\+/g, " "));
        let origimage = null;
        try {
          
            if (!srcKey.endsWith(".jpeg") && !srcKey.endsWith(".png")) {
              console.log(`Invalid file type for: ${srcKey}`);
              throw new Error("Unsupported file type");
            }
            
          // Download the image from the S3 source bucket.
          const params: GetObjectCommandInput = {
            Bucket: srcBucket,
            Key: srcKey,
          };
          origimage = await s3.send(new GetObjectCommand(params));

          // Write entry to DynamoDB
          const putParams: PutItemCommandInput = {
            TableName: TABLE_NAME,
            Item: {
              id: { S: srcKey }, 
            },
          };

          await dynamo.send(new PutItemCommand(putParams));

          // Process the image 
        } catch (error) {
          console.log(error);
          throw error;
        }
      }
    }
  }
};