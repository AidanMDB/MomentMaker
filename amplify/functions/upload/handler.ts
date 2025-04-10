import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
//import { imageAnalyzer } from '../imageMedia/resource';


const lambdaClient = new LambdaClient({ region: 'us-east-1' });

export const handler: S3Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const currentBucketName = event.Records[0].s3.bucket.name;
    
    // loop through all the uploaded media and determine which lambda function to invoke based on the prefix of the key
    for (const objectKey of objectKeys) {

        if (objectKey.startsWith('user-media/image/')) 
        {
            console.log(`Image upload detected: ${objectKey}`);
            const invokeParams = {
                FunctionName: process.env.IMAGE_ANALYZER_FUNCTION_NAME,
                InvocationType: InvocationType.Event,
                Payload: JSON.stringify({
                    bucket: currentBucketName,
                    key: objectKey,
                }),
            };
            const response = await lambdaClient.send(new InvokeCommand(invokeParams));
            console.log(`Response: ${response}\n${process.env.IMAGE_ANALYZER_FUNCTION_NAME} \n Function invoked for image upload`);
        }
        else if (objectKey.startsWith('user-media/video/')) 
        {
            const invokeParams = {
                FunctionName: process.env.VIDEO_ANALYZER_FUNCTION_NAME,
                InvocationType: InvocationType.Event,
                Payload: JSON.stringify({
                    bucket: currentBucketName,
                    key: objectKey,
                }),
            };
            await lambdaClient.send(new InvokeCommand(invokeParams));
            console.log(`Video uploaded to: ${objectKey}`);
        }
        else if (objectKey.startsWith('user-media/zip/')) 
        {
            const invokeParams = {
                FunctionName: process.env.ZIP_FILE_EXTRACTOR_FUNCTION_NAME,
                InvocationType: InvocationType.Event,
                Payload: JSON.stringify({
                    bucket: currentBucketName,
                    key: objectKey,
                }),
            };
            await lambdaClient.send(new InvokeCommand(invokeParams));
            console.log(`Zip file uploaded to: ${objectKey}`);
        }

        console.log(`${objectKey} in ${currentBucketName}`);
    }
};