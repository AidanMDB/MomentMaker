import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';

const lambdaClient = new LambdaClient({ region: 'us-east-1' });

export const handler: S3Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const currentBucketName = event.Records[0].s3.bucket.name;
    

    // loop through all the uploaded media and determine which lambda function to invoke based on the prefix of the key
    for (const objectKey of objectKeys) {

        if (objectKey.startsWith('user-media/image/')) 
        {
            const invokeParams = {
                FunctionName: 'ImageMediaUpload',
                InvocationType: InvocationType.Event,
                Payload: JSON.stringify({
                    bucket: currentBucketName,
                    key: objectKey,
                }),
            };
            await lambdaClient.send(new InvokeCommand(invokeParams));
            console.log(`Image uploaded to: ${objectKey}`);
        }
        else if (objectKey.startsWith('user-media/video/')) 
        {
            const invokeParams = {
                FunctionName: 'VideoMediaUpload',
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
                FunctionName: 'ZipFiles',
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