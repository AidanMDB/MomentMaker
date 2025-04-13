import { SNSHandler, SNSEvent } from 'aws-lambda';


















export const handler: SNSHandler = async (event: SNSEvent) => {
    for (const record of event.Records) {
        console.log(`Received message: ${record.Sns.Message}`);
    }
};


