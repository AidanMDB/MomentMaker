import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
//import { imageAnalyzer } from '../imageMedia/resource';


const lambdaClient = new LambdaClient({ region: 'us-east-1' });


async function getUserIdMetadata(bucket: string, key: string) {
    const s3Client = new S3Client({ region: 'us-east-1' });
    const params = {
        Bucket: bucket,
        Key: key,
    };
    const command = new HeadObjectCommand(params);
    const response = await s3Client.send(command);
    return response.Metadata?.userId || null;
}


async function invokeLambdaFunction(functionName: string | undefined, object: string, bucketName: string) {
    const params = {
        FunctionName: functionName,
        InvocationType: InvocationType.Event,
        Payload: JSON.stringify({
            bucket: bucketName,
            key: object,
            userId: getUserIdMetadata(bucketName, object),
        }),
    };
    const response = await lambdaClient.send(new InvokeCommand(params));
    return response;
}


export const handler: S3Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const currentBucketName = event.Records[0].s3.bucket.name;
    
    // loop through all the uploaded media and determine which lambda function to invoke based on the prefix of the key
    for (const objectKey of objectKeys) {

        if (objectKey.startsWith('user-media/image/')) 
        {
            console.log(`Image upload detected: ${objectKey}`);
            const response = invokeLambdaFunction(process.env.IMAGE_ANALYZER_FUNCTION_NAME, objectKey, currentBucketName);
            console.log(`Response: ${response}\n${process.env.IMAGE_ANALYZER_FUNCTION_NAME} \n Function invoked for image upload`);
        }
        else if (objectKey.startsWith('user-media/video/')) 
        {
            const response = invokeLambdaFunction(process.env.VIDEO_ANALYZER_FUNCTION_NAME, objectKey, currentBucketName);
            console.log(`Video uploaded to: ${objectKey}`);
        }
        else if (objectKey.startsWith('user-media/zip/')) 
        {
            const response = invokeLambdaFunction(process.env.ZIP_ANALYZER_FUNCTION_NAME, objectKey, currentBucketName);
            console.log(`Zip file uploaded to: ${objectKey}`);
        }

        console.log(`${objectKey} in ${currentBucketName}`);
    }
};