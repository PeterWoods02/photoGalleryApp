/* eslint-disable import/extensions, import/no-absolute-path */
import { SNSHandler } from "aws-lambda";
import {
  DynamoDBClient,
  UpdateItemCommand,
} from "@aws-sdk/client-dynamodb";

const dynamo = new DynamoDBClient();
const TABLE_NAME = process.env.TABLE_NAME!;

export const handler: SNSHandler = async (event) => {
  console.log("Event", JSON.stringify(event));

  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const metadataType = record.Sns.MessageAttributes?.metadata_type?.Value;

    if (!["Caption", "Date", "name"].includes(metadataType)) {
      console.log("Invalid metadata type");
      continue;
    }

    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: message.id } },
        UpdateExpression: "SET #attr = :val",
        ExpressionAttributeNames: {
          "#attr": metadataType,
        },
        ExpressionAttributeValues: {
          ":val": { S: message.value },
        },
      }));

      console.log("Metadata updated");
    } catch (error) {
      console.log("Update failed", error);
    }
  }
};
