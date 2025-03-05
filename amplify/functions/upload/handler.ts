import { RekognitionClient, DetectFacesCommand, CompareFacesCommand} from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { DynamoDBClient, PutItemCommand, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
import { S3Handler } from "aws-lambda";
import sharp from "sharp";

const rekogClient = new RekognitionClient();
const s3Client = new S3Client();
const dbClient = new DynamoDBClient();

async function compareFaces(croppedImage: Buffer, targetImage: Buffer) {
    const input = {
        SourceImage: {
            Bytes: croppedImage
        },
        TargetImage: {
            Bytes: targetImage
        }
    }

    const command = new CompareFacesCommand(input);
    let response;
    try {
        response = await rekogClient.send(command);
        console.log(response.$metadata);
    } catch (error) {
        console.error(error);
        return error;
    }

    if (!response.FaceMatches) {
        console.log("No faces detected");
        return;
    }

    for (const match of response.FaceMatches) {
        console.log(`Similarity: ${match.Similarity}`);
    }

}




/**
 * Crops image to detected to be stored for comparison purposes
 * @param Left 
 * @param Top 
 * @param Width 
 * @param Height 
 * @returns 
 */
async function cropToFaceAndCompare(Left: number, Top: number, Width: number, Height: number, S3Path: string, faceNumber: number) {
    const object = await s3Client.send(new GetObjectCommand({ 
        Bucket: "", 
        Key: "" 
    }));

    const imageBuffer = await object.Body?.transformToByteArray();
    const image = await sharp(imageBuffer).metadata();
    const imageWidth = image.width;
    const imageHeight = image.height

    if (!imageWidth || !imageHeight) {
        console.log("Could not get image dimensions");
        return;
    }

    const cropParams = {
        left: Math.round(Left * imageWidth),
        top: Math.round(Top * imageHeight),
        width: Math.round(Width * imageWidth),
        height: Math.round(Height * imageHeight),
    }


    const croppedImage = await sharp(imageBuffer)
        .extract(cropParams)
        .toBuffer();

    
    
    const input = {
        "TableName": "UserFaces",
        "Key": {
            "userID": {
                "S": "user1"
            }
        }
    }
    const command = new GetItemCommand(input);
    const response = await dbClient.send(command);
    console.log(response);

    if (!response.Item) {
        console.log("No faces detected");
        return;
    }

    // compare faces
    let matched = false;
    for( const face in response.Item.faces) {
        const input = {
            "SimilarityThreshold": 90,
            "SourceImage": {
                "Bytes": croppedImage
            },
            "TargetImage": {
                "S3Object": {
                    "Bucket": "MomentMaker",
                    "Name": face
                }
            }
        }
    
        const command = new CompareFacesCommand(input);
        let response;
        try {
            response = await rekogClient.send(command);
            console.log(response.$metadata);
        } catch (error) {
            console.error(error);
            throw error;
        }

        if (response.FaceMatches) {
            if (response.FaceMatches.length > 0) {
                console.log("Matching Faces");
                console.log(response.FaceMatches);
                const input = {
                    "TableName": "UserFaces",
                    "Key": {
                        "userID": {
                            "S": "user1"
                        }
                    },
                    "UpdateExpression": "SET faces = list_append(faces, :face)",
                    "ExpressionAttributeValues": {
                        ":face": {
                            "S": S3Path
                        }
                    }
                }
                const command = new UpdateItemCommand(input);
                await dbClient.send(command);
                break;
            }
            else {
                console.log("Faces Don't Match");
                continue;
            }
        }
    }

    // if face doesn't match existing faces
    if (!matched) {
        // upload the cropped unique face
        const s3Input = {
            Bucket: "MomentMaker",
            Key: `${S3Path+faceNumber}`,
            Body: croppedImage,
        }
        const s3command = new PutObjectCommand(s3Input);
        await s3Client.send(s3command);

        // update the user's faces
        const dbInput = {
            "TableName": "UserFaces",
            "Key": {
                "userID": {
                    "S": "user1"
                }
            },
            "UpdateExpression": "SET faces = list_append(faces, :face)",
            "ExpressionAttributeValues": {
                ":face": {
                    "S": `${S3Path+faceNumber}`
                }
            }
        }
        const command = new UpdateItemCommand(dbInput);
        await dbClient.send(command);
        
    }

/*     const newKey = 'faces/new_face'
    await s3Client.send(new PutObjectCommand({
        Bucket: "",
        Key: newKey,
        Body: croppedImage,
        ContentType: "image/jpeg"
    })); */
}




/**
 * Detects faces in a given image
 */
async function analyzeImage(s3Path: string) {
    const input = {
        Image: {
            S3Object: {
                Bucket: "MomentMaker",
                Name: s3Path
            }
        }
    }
    const command = new DetectFacesCommand(input);
    let response;
    try {
        response = await rekogClient.send(command);
        console.log(response.$metadata);
    } catch (error) {
        console.error(error);
        throw error;
    }

    if (!response.FaceDetails) {
        console.log("No faces detected");
        return;
    }


    let faceCounter = 0;
    for (const face of response.FaceDetails) {

        if (face.BoundingBox && face.Quality && face.Quality.Sharpness !== undefined && face.Quality.Sharpness > 70) {
            const {Height, Left, Top, Width} = face.BoundingBox;

            if (Height !== undefined && Left !== undefined && Top !== undefined && Width !== undefined) {
                faceCounter++;
                cropToFaceAndCompare(Left, Top, Width, Height, s3Path, faceCounter);
            }
        }
    }
}


export const handler: S3Handler = async (event) => {
    console.log("called function");
    // S3 performs batch operations (so might have multiple keys uploaded at once) thats why multiple keys
    const objectKeys = event.Records.map((record) => record.s3.object.key);
    const bucketName = event.Records[0].s3.bucket.name;

    for (const objectKey of objectKeys) {

        console.log(`Analyzing image: ${objectKey}`);
        
        let metadata;
        try {
            const headObjectCommand = new HeadObjectCommand({
                Bucket: bucketName,
                Key: objectKey
            });
            const metadataResponse = await s3Client.send(headObjectCommand);
            metadata = metadataResponse.Metadata;
        }
        catch (error) {
            console.error(error);
            throw error;
        }
        
        if (!metadata || !metadata.fileType || !metadata.userId) {
            continue;
        }
        console.log(metadata.userId);
        //await analyzeImage(objectKey);

    }
};