import { RekognitionClient, DetectFacesCommand, CompareFacesCommand} from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { Handler } from "aws-lambda";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";

const rekogClient = new RekognitionClient();
const s3Client = new S3Client();
const dbClient = new DynamoDBClient();

let bucketName: string;
let objectKey: string;
let userID: string; // replace with actual user ID


/**
 * This function analyzes an image in S3, detects faces and returns the detected faces.
 * It uses AWS Rekognition to detect faces in the image and filters out faces with confidence > 70%.
 */
async function detectFaces() {
    const params = {
        Image: {
            S3Object: {
                Bucket: `${bucketName}`,
                Name: `${objectKey}`
            }
        }
    }
    const command = new DetectFacesCommand(params);
    const response = await rekogClient.send(command);
    return response.FaceDetails?.filter(face => face.Confidence && face.Confidence > 70) || [];
}


/**
 * This function retrieves the image from S3 using the current bucket name and object key.
 * 
 * @returns {Promise<Buffer>} - Returns the image from S3 as a Buffer.
 */
async function getS3Image() {
    const params = {
        Bucket: `${bucketName}`,
        Key: `${objectKey}`
    }
    const command = new GetObjectCommand(params);
    const response = await s3Client.send(command);
    return response.Body?.transformToByteArray();
}


/**
 * 
 * @param detectedFaces - Array of detected faces from Rekognition.
 * @returns buffers of cropped faces
 */
async function cropFaces(detectedFaces: any[]) {
    const imageBody = await getS3Image();
    const image = sharp(imageBody);
    const imageMetadata = await image.metadata();

    const faceBuffers = [];
    for (let i = 0; i < detectedFaces.length; i++) {
        const {Height, Left, Top, Width} = detectedFaces[i].BoundingBox;
        
        const cropParams = {
            left: Math.round(Left * imageMetadata.width!),
            top: Math.round(Top * imageMetadata.height!),
            width: Math.round(Width * imageMetadata.width!),
            height: Math.round(Height * imageMetadata.height!),
        }
        const croppedImage = await image.extract(cropParams).toBuffer();
        faceBuffers.push(croppedImage);
    }

    return faceBuffers;
}

/**
 * Function gets all the unique face references from DynamoDB for the user.
 * @returns - Array of face references from DynamoDB.
 */
async function getUserFaces() {
    const input = {
        "TableName": "UserFaces",
        "Key": {
            "userID": { "S": `${userID}` }
        }
    }
    const command = new GetItemCommand(input);
    const response = await dbClient.send(command);
    return response.Item && response.Item.faces ? response.Item.faces : [];
}


/**
 * Calls the Rekognition CompareFaces API to compare the source image with the target image.
 * @param sourceBuffer - Buffer of the face image to be compared.
 * @param targetKey - The S3 key of the target image to compare against.
 * @returns - Array of face matches found in the target image.
 */
async function compareFaces(sourceBuffer: Buffer, targetKey: string) {
    const params = {
        SimilarityThreshold: 90,
        SourceImage: { Bytes: sourceBuffer },
        TargetImage: {
            S3Object: { Bucket: `${bucketName}`, Name: targetKey }
        }
    }
    const command = new CompareFacesCommand(params);
    const response = await rekogClient.send(command);
    return response.FaceMatches || [];
}


/**
 * Uploads the unqie face image to S3 and updates the DynamoDB table with the new face reference.
 * @param buffer - Buffer of the face image to be uploaded.
 */
async function uploadFaceToS3(buffer: Buffer) {
    // generate a unique key for the face image and upload it to S3
    const uniqueKey = `faces/${userID}/${uuidv4()}.jpg`;
    const params = {
        Bucket: `${bucketName}`,
        Key: uniqueKey,
        Body: buffer
    };
    await s3Client.send(new PutObjectCommand(params));
    console.log(`Uploaded new unique face to S3: ${uniqueKey}`);

    // update userFaces table in DynamoDB with the new face reference
    const updateParams = {
        ExpressionAttributeNames: {
            "#faces": "faces"
        },
        ExpressionAttributeValues: {
            ":empty_list": { L: [] },
            ":newFace": {L: [{ S: uniqueKey }] }
        },
        Key: {
            userID: { S: `${userID}` }
        },
        UpdateExpression: "SET faces = list_append(if_not_exists(faces, :empty_list), :newFace)",
        TableName: "UserFaces",
    };

    try {
        await dbClient.send(new UpdateItemCommand(updateParams));
    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            const putParams = {
                TableName: "UserFaces",
                Item: {
                    userID: { S: `${userID}` },
                    faces: { L: [{ S: uniqueKey }] }
                }
            };
            await dbClient.send(new PutItemCommand(putParams));
            console.log(`Created new item for ${userID} in UserFaces`);
        } else {
            console.error(`Error updating UserFaces for ${userID}: ${error}`);
            throw error;
        }
    }
    console.log(`Stored face reference in DynamoDB`);
}

/**
 * Adds the image location to the face locations in DynamoDB.
 * If the face ID does not exist, it creates a new entry in the table.
 * @param faceID - The ID of the face to which the image location will be added.
 */
async function addImageToFaceLocations(faceID: string) {
    const updateParams = {
        ExpressionAttributeNames: {
            "#imageLocations": "imageLocations"
        },
        ExpressionAttributeValues: {
            ":empty_list": { L: [] },
            ":newImage": {L: [{ S: `${objectKey}` }] }
        },
        Key: {
            userID: { S: `${userID}` },
            faceID: { S: `${faceID}` }
        },
        UpdateExpression: "SET imageLocations = list_append(if_not_exists(imageLocations, :empty_list), :newImage)",
        TableName: "FaceLocations",
    };

    try {
        await dbClient.send(new UpdateItemCommand(updateParams));
    } catch (error) {
        if (error instanceof Error && error.name === "ConditionalCheckFailedException") {
            const putParams = {
                TableName: "FaceLocations",
                Item: {
                    userID: { S: `${userID}` },
                    faceID: { S: `${faceID}` },
                    imageLocations: { L: [{ S: `${objectKey}` }] }
                }
            };
            await dbClient.send(new PutItemCommand(putParams));
            console.log(`Created new item for ${userID} in FaceLocations`);
        } else {
            console.error(`Error updating FaceLocations for ${userID}: ${error}`);
            throw error;
        }
    }
    console.log(`Added user to DynamoDB`);
}

/**
 * Detects faces in a given image
 */
async function analyzeImage() {
    const detectedFaces = await detectFaces();

    if (!detectedFaces.length) {
        console.log("No faces detected above 70% confidence");
        return;
    }

    const faceBuffers = await cropFaces(detectedFaces);
    const storedFaces = await getUserFaces();

    for (const faceBuffer of faceBuffers) {
        let isUnique = true;

        for (const storedFace in storedFaces) {
            const match = await compareFaces(faceBuffer, storedFace);
            if (match.length) {
                console.log("Face already exists in the database");
                await addImageToFaceLocations(storedFace);
                isUnique = false;
                break;
            }
        }

        if (isUnique) {
            await uploadFaceToS3(faceBuffer);
        }
    }
}


export const handler: Handler = async (event) => {
    
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const payload = JSON.parse(event.body);
    objectKey = payload.key;
    bucketName = payload.bucket;
    userID = "user1"; // replace with call to user's ID from Cognito or other auth service
    console.log(`Analyzing ${objectKey} in ${bucketName}`);
    await analyzeImage();
};