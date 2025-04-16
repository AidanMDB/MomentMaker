import { S3Handler } from 'aws-lambda';
import { LambdaClient, InvokeCommand, InvocationType } from '@aws-sdk/client-lambda';
//import { S3Client, HeadObjectCommand } from '@aws-sdk/client-s3';
//import { imageAnalyzer } from '../imageMedia/resource';


const lambdaClient = new LambdaClient({ region: 'us-east-1' });
//const s3Client = new S3Client({ region: 'us-east-1' });


/* async function getUserIdMetadata(bucket: string, key: string) {
    console.log(`Getting userID metadata for ${key} in ${bucket}`);
    const params = {
        Bucket: bucket,
        Key: key,
    };
    const command = new HeadObjectCommand(params);
    const response = await s3Client.send(command);
    console.log(`Response ${response}`);
    return response.Metadata?.userId || null;
} */


async function invokeLambdaFunction(functionName: string | undefined, object: string, bucketName: string) {
    console.log(`Invoking ${functionName} for object ${object} in bucket ${bucketName}`);
    const params = {
        FunctionName: functionName,
        InvocationType: InvocationType.RequestResponse,
        
        Payload: JSON.stringify({
            bucket: bucketName,
            key: object,
        }),
    };
    const response = await lambdaClient.send(new InvokeCommand(params));
    console.log(`Response ${response}`);
    return response;
}


export const handler: S3Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const currentBucketName = event.Records[0].s3.bucket.name;
    
    // loop through all the uploaded media and determine which lambda function to invoke based on the prefix of the key
    for (const objectKey of objectKeys) {
        const decodedObjectKey = decodeURIComponent(objectKey.replace(/\+/g, ' ')); // Decode the object key

        if (decodedObjectKey.startsWith('user-media/') && decodedObjectKey.includes('/faces/')) 
        {
            console.log('Ignore Face Directory');
            continue; // Skip processing for face directory    
        }

        
        if (decodedObjectKey.startsWith('user-media/') && decodedObjectKey.includes('/image/')) 
        {
            await invokeLambdaFunction(process.env.IMAGE_ANALYZER_FUNCTION_NAME, decodedObjectKey, currentBucketName);
        }
        else if (decodedObjectKey.startsWith('user-media/') && decodedObjectKey.includes('/video/')) 
        {
            await invokeLambdaFunction(process.env.VIDEO_ANALYZER_FUNCTION_NAME, decodedObjectKey, currentBucketName);
        }
        else if (decodedObjectKey.startsWith('user-media/') && decodedObjectKey.includes('/zip/')) 
        {
            await invokeLambdaFunction(process.env.ZIP_ANALYZER_FUNCTION_NAME, decodedObjectKey, currentBucketName);
        }

        console.log(`${decodedObjectKey} in ${currentBucketName}`);
    }
};