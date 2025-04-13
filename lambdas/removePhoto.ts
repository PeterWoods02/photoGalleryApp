import { SQSHandler } from "aws-lambda";
import { S3Client, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3 = new S3Client();

export const handler: SQSHandler = async (event) => {
  for (const record of event.Records) {
    let snsMessage;

    try {
    snsMessage = JSON.parse(record.body); 
    } catch (e) {
    console.log("Failed to parse DLQ body:", record.body);
    continue;
    }

    for (const messageRecord of snsMessage.Records || []) {
      const bucket = messageRecord.s3.bucket.name;
      const key = decodeURIComponent(messageRecord.s3.object.key.replace(/\+/g, " "));

      try {
        await s3.send(new DeleteObjectCommand({
          Bucket: bucket,
          Key: key,
        }));

        console.log(`Deleted invalid image: ${key}`);
      } catch (error) {
        console.log("Delete failed:", error);
      }
    }
  }
};
