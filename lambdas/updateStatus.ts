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

    try {
      await dynamo.send(new UpdateItemCommand({
        TableName: TABLE_NAME,
        Key: { id: { S: message.id } },
        UpdateExpression: "SET #status = :status, #reason = :reason, #date = :date",
        ExpressionAttributeNames: {
          "#status": "status",
          "#reason": "reason",
          "#date": "date",
        },
        ExpressionAttributeValues: {
          ":status": { S: message.update.status },
          ":reason": { S: message.update.reason },
          ":date": { S: message.date },
        },
      }));

      console.log("Status updated");
    } catch (err) {
      console.log("Update failed", err);
    }
  }
};
