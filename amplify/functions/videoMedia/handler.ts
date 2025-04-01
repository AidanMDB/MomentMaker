import { RekognitionClient, StartFaceDetectionCommand } from '@aws-sdk/client-rekognition';
import { Handler } from 'aws-lambda';
import { v4 as uuidv4 } from 'uuid';

const rekogClient = new RekognitionClient();

export const handler: Handler = async (event) => {
    console.log('Event: ', event);
    
    const params = {
        Video: {
            S3Object: {
                Bucket: event.bucket,
                Name: event.key
            }
        },
        NotificationChannel: {
            SNSTopicArn: process.env.SNS_TOPIC_ARN,
            RoleArn: process.env.REKOGNITION_ROLE_ARN
        }
    };
    
    try {
        const command = new StartFaceDetectionCommand(params);
        const response = await rekogClient.send(command);
        console.log('Response: ', response);
    } catch (error) {
        console.error('Error starting face detection: ', error);
    }
};