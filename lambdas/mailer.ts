import { DynamoDBStreamHandler } from "aws-lambda";
import {
  SESClient,
  SendEmailCommand,
  SendEmailCommandInput,
} from "@aws-sdk/client-ses";

import { SES_EMAIL_FROM, SES_EMAIL_TO, SES_REGION } from "../env";

if (!SES_EMAIL_TO || !SES_EMAIL_FROM || !SES_REGION) {
  throw new Error(
    "Please add the SES_EMAIL_TO, SES_EMAIL_FROM and SES_REGION environment variables in an env.js file located in the root directory"
  );
}

type ContactDetails = {
  name: string;
  email: string;
  message: string;
};

const client = new SESClient({ region: SES_REGION });

export const handler: DynamoDBStreamHandler = async (event) => {
  console.log("Event", JSON.stringify(event));

  for (const record of event.Records) {
    if (record.eventName !== "MODIFY") continue;

    const newImage = record.dynamodb?.NewImage;
    const oldImage = record.dynamodb?.OldImage;

    const newStatus = newImage?.status?.S;
    const oldStatus = oldImage?.status?.S;

    if (newStatus && newStatus !== oldStatus) {
      const id = newImage.id?.S;
      const reason = newImage.reason?.S;
      const toEmail = newImage.name?.S || SES_EMAIL_TO;

      const emailData: ContactDetails = {
        name: "Photo Review",
        email: SES_EMAIL_FROM,
        message: `Your image '${id}' was reviewed.\nStatus: ${newStatus}\nReason: ${reason}`,
      };

      const params = sendEmailParams({ ...emailData, email: toEmail });

      try {
        await client.send(new SendEmailCommand(params));
        console.log("Email sent");
      } catch (error) {
        console.log("ERROR is:", error);
      }
    }
  }
};

function sendEmailParams({ name, email, message }: ContactDetails) {
  const parameters: SendEmailCommandInput = {
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Body: {
        Html: {
          Charset: "UTF-8",
          Data: getHtmlContent({ name, email, message }),
        },
      },
      Subject: {
        Charset: "UTF-8",
        Data: `Photo Status Update`,
      },
    },
    Source: SES_EMAIL_FROM,
  };
  return parameters;
}

function getHtmlContent({ name, email, message }: ContactDetails) {
  return `
    <html>
      <body>
        <h2>Sent from: </h2>
        <ul>
          <li style="font-size:18px"><b>${name}</b></li>
          <li style="font-size:18px"><b>${email}</b></li>
        </ul>
        <p style="font-size:18px">${message}</p>
      </body>
    </html> 
  `;
}
