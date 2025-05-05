import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import fs from "fs";
import { join, basename } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import * as path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { GetCommand, DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";

ffmpeg.setFfmpegPath("/opt/ffmpeglib/ffmpeg"); // For Lambda Layer or bundled binary

const TMP_DIR = "/tmp";
const IMAGE_DURATION = 4;
let TOTAL_VIDEO_DURATION = 300; // Default to 5 minutes
const SUPPORTED_VIDEO_EXT = [".mp4", ".avi", ".mov", ".mkv"];
const SUPPORTED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif"];
const OUTPUT_RESOLUTION = { width: 1280, height: 720 };

const pipe = promisify(pipeline);
const s3Client = new S3Client({ region: "us-east-1" });
const dbclient = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(dbclient);
//const BUCKET_NAME = "amplify-amplifyvitereactt-mediastoragebucket2b6d90-fcbuq5j5ksnw";
const BUCKET_NAME = "amplify-d1mzyzgpuskuft-ma-mediastoragebucket2b6d90-qdrepwmd6l9v";

export const handler = async (event: APIGatewayEvent): Promise<APIGatewayProxyResult> => {
    console.log("Handler invoked");
    if (event.httpMethod === 'OPTIONS') {
        console.log("OPTIONS request received");
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
            body: '',
        };
    }

    console.log("Received event:", JSON.stringify(event, null, 2));

    const userID = event.queryStringParameters?.userID;
    if (!userID) {
        console.error("Missing userID parameter");
        return { statusCode: 400, body: JSON.stringify({ error: "Missing userID parameter" }) };
    }
    console.log("UserID:", userID);

    // Get faceID from query string and parse into array
    const faceIDParam = event.multiValueQueryStringParameters?.faceID || 
    event.queryStringParameters?.faceID?.split(",") || [];

    const faceIDs = faceIDParam.filter(id => id && id !== "undefined" && id.trim() !== "").map(id => id.trim());

    console.log("Parsed faceIDs:", faceIDs);

    const timeLimit = event.queryStringParameters?.timeLimit;
    if (!timeLimit) {
        console.error("Missing timeLimit parameter");
        return { statusCode: 400, body: JSON.stringify({ error: "Missing timeLimit parameter" }) };
    }
    TOTAL_VIDEO_DURATION = parseInt(timeLimit, 10);
    console.log("Time Limit:", timeLimit);

    const song = event.queryStringParameters?.song;
    console.log("Song:", song);

    try {
        console.log("Downloading all media for userID:", userID);
        const downloadedFiles = await downloadAllMediaFromS3(userID, song);
        if (downloadedFiles.length === 0) {
            console.warn("No media files found for userID:", userID);
            return { statusCode: 404, body: JSON.stringify({ error: "No media files found" }) };
        }
        console.log("Downloaded files:", downloadedFiles);

        let fileMatches = null;
        let fileNamesFromID: { filename: string; timestamp?: number }[] = [];
        if (faceIDs.length === 0) {
            console.log("No valid faceIDs provided, skipping DynamoDB lookup.");
        } else {
            console.log("Fetching files from DynamoDB for faceIDs:", faceIDs);
        
            const allFaceIDResults: { filename: string; timestamp?: number }[] = [];
        
            for (const id of faceIDs) {
                const faceIDData = await getFilesfromFaceID(userID, id);
                if (!faceIDData) {
                    console.warn(`No data found for faceID: ${id}`);
                    continue;
                }
        
                const parsed = faceIDData.map((loc: string | { videoKey: string; timestamp?: number }) => {
                    if (typeof loc === "string") {
                        return { filename: loc.split("/").pop()! };
                    } else {
                        return {
                            filename: loc.videoKey.split("/").pop()!,
                            timestamp: loc.timestamp
                        };
                    }
                });
        
                allFaceIDResults.push(...parsed);
            }
        
            if (allFaceIDResults.length === 0) {
                console.warn("No faceID data found for any of the provided faceIDs.");
                return { statusCode: 404, body: JSON.stringify({ error: "No faceID data found" }) };
            }
        
            fileNamesFromID = allFaceIDResults;
            console.log("Aggregated filenames from faceIDs:", fileNamesFromID);

            fileMatches = downloadedFiles.filter(item => fileNamesFromID.map(file => file.filename).includes(item));
        }

        console.log("File matches:", fileMatches);
        let filteredFiles = downloadedFiles;
        if (fileMatches && fileMatches.length > 0) {
            console.log("Filtering downloaded files based on faceID data.");
            filteredFiles = fileMatches;
        }

        console.log("Processing downloaded files...");
        const processedFiles = await handleFiles(filteredFiles, fileNamesFromID);
        console.log("Processed files:", processedFiles);

        console.log("Merging media files...");
        const finalPath = await mergeMedia(processedFiles, `final_video_${randomUUID()}.mp4`, `${song}.mp3`);
        console.log("Merged video path:", finalPath);

        const finalFullPath = path.join(TMP_DIR, finalPath);
        const videoBuffer = fs.readFileSync(finalFullPath);

        try {
            console.log("Uploading final video to S3...");
            const command = new PutObjectCommand({
                Bucket: BUCKET_NAME,
                Key: `user-media/${userID}/moments/${finalPath}`,
                Body: videoBuffer,
                ContentType: 'video/mp4',
                Metadata: {
                    fileType: 'video/mp4',
                    userID: userID,
                },
            });

            await s3Client.send(command);
            console.log(`Uploaded video to S3: ${finalPath}`);
        } catch (error) {
            console.error("Error uploading video to S3:", error);
            return { statusCode: 500, body: JSON.stringify({ error: "Failed to upload video" }) };
        }

        return { statusCode: 200, body: JSON.stringify({ message: "Video created", file: finalPath }) };
    } catch (error) {
        console.error("Error processing video:", error);
        return { statusCode: 500, body: JSON.stringify({ error: "Internal Server Error" }) };
    }
};

function isVideo(file: string) {
    const result = SUPPORTED_VIDEO_EXT.includes(path.extname(file).toLowerCase());
    console.log(`isVideo check for file: ${file}, result: ${result}`);
    return result;
}

function isImage(file: string) {
    const result = SUPPORTED_IMAGE_EXT.includes(path.extname(file).toLowerCase());
    console.log(`isImage check for file: ${file}, result: ${result}`);
    return result;
}

function parseVideo(inputPath: string, outputPath: string, start: number, end: number): Promise<string> {
    console.log(`Parsing video: inputPath=${inputPath}, outputPath=${outputPath}, start=${start}, end=${end}`);
    return new Promise((resolve, reject) => {
        ffmpeg(path.join(TMP_DIR, inputPath))
            .setStartTime(start)
            .setDuration(end - start)
            .videoFilters(`scale=${OUTPUT_RESOLUTION.width}:${OUTPUT_RESOLUTION.height}:force_original_aspect_ratio=decrease,pad=${OUTPUT_RESOLUTION.width}:${OUTPUT_RESOLUTION.height}:(ow-iw)/2:(oh-ih)/2:color=black`)
            .noAudio()
            .output(path.join(TMP_DIR, outputPath))
            .on("end", () => {
                console.log(`Video parsed successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", (error: Error) => {
                console.error("Error parsing video:", error);
                reject(error);
            })
            .run();
    });
}

function convertImageToVideo(imagePath: string, outputPath: string, duration = IMAGE_DURATION): Promise<string> {
    console.log(`Converting image to video: imagePath=${imagePath}, outputPath=${outputPath}, duration=${duration}`);
    return new Promise((resolve, reject) => {
        ffmpeg(path.join(TMP_DIR, imagePath))
            .loop(duration)
            .outputOptions(["-t " + duration, "-r 24", `-vf scale=${OUTPUT_RESOLUTION.width}:${OUTPUT_RESOLUTION.height}:force_original_aspect_ratio=decrease,pad=${OUTPUT_RESOLUTION.width}:${OUTPUT_RESOLUTION.height}:(ow-iw)/2:(oh-ih)/2:color=black`])
            .output(path.join(TMP_DIR, outputPath))
            .on("end", () => {
                console.log(`Image converted to video successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", (error: Error) => {
                console.error("Error converting image to video:", error);
                reject(error);
            })
            .run();
    });
}

async function handleFiles(fileList: string[], fileInfo: { filename: string; timestamp?: number }[]): Promise<string[]> {
    console.log("Handling files:", fileList);
    let processedFiles: string[] = [];

    for (const file of fileList) {
        if (isVideo(file)) {
            const trimmedName = `trimmed_${file}`;
            console.log(`Trimming video: ${file}`);
            if (fileInfo.length === 0) {
                processedFiles.push(file);
                console.log(`No timestamps found for video, using full video: ${file}`);
                continue;
            } else {
                const timestamps = fileInfo
                    .filter(info => info.filename === file)
                    .map(info => info.timestamp)
                    .filter((timestamp): timestamp is number => timestamp !== undefined);
                console.log("Timestamps for video:", timestamps);
                if (timestamps.length === 0) {
                    console.log("No timestamps found for video, not using it");
                } else {
                    const CLUSTER_THRESHOLD = 3000; // 1 seconds in ms
                    const BUFFER = 500; // optional extra time in ms after the last timestamp
                    const sortedTimestamps = [...timestamps].sort((a, b) => a - b);

                    let clusterStart = sortedTimestamps[0] || 0;

                    for (let i = 1; i <= sortedTimestamps.length; i++) {
                        const current = sortedTimestamps[i];
                        const previous = sortedTimestamps[i - 1];

                        // If the next timestamp is too far or this is the last one, close the current cluster
                        if (!current || current - previous > CLUSTER_THRESHOLD) {
                            const clusterEnd = previous + BUFFER;
                            console.log(`Trimming video from ${clusterStart} ms to ${clusterEnd} ms`);
                            await parseVideo(file, `clip_${i}_${trimmedName}`, clusterStart / 1000, clusterEnd / 1000);
                            processedFiles.push(`clip_${i}_${trimmedName}`);
                            console.log(`Trimmed video saved as: clip_${i}-${trimmedName}`);
                            clusterStart = current;
                        }
                    }
                }
            }
        } else if (isImage(file)) {
            const imageVidName = `vid_of_image_${file}.mp4`;
            console.log(`Converting image to video: ${file}`);
            await convertImageToVideo(file, imageVidName);
            processedFiles.push(imageVidName);
        } else {
            console.log(`Skipping unsupported file: ${file}`);
        }
    }
    console.log("Processed files before shuffling:", processedFiles);

    const shuffleCount = Math.floor(Math.random() * 5) + 1;
    console.log(`Shuffling files ${shuffleCount} times`);
    for (let i = 0; i < shuffleCount; i++) {
        processedFiles = shuffleArray(processedFiles) // Shuffle the array
    }
    return processedFiles;
}

function shuffleArray(array: string[]): string[] {
    const arr = [...array]; // make a shallow copy to avoid mutating original
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1)); // random index from 0 to i
      [arr[i], arr[j]] = [arr[j], arr[i]]; // swap elements
    }
    return arr;
}  

function mergeMedia(clips: string[], outputPath: string, songFile?: string): Promise<string> {
    console.log("Merging media clips:", clips);

    const requiredFiles = clips.map(f => path.join(TMP_DIR, f));
    fs.readdirSync(TMP_DIR).forEach(file => {
        const fullPath = path.join(TMP_DIR, file);
        if (!requiredFiles.includes(fullPath) && !fullPath.endsWith(".mp3")) {
            fs.unlinkSync(fullPath);
        }
    });
    console.log("Temporary files cleaned up.");
    console.log("Temporary files in TMP_DIR:", fs.readdirSync(TMP_DIR));

    return new Promise((resolve, reject) => {
        const tempListFile = path.join(TMP_DIR, "input.txt");
        fs.writeFileSync(
            tempListFile,
            clips.map(f => `file '${path.join(TMP_DIR, f)}'`).join("\n")
        );

        let ffmpegCommand = ffmpeg()
            .input(tempListFile)
            .inputOptions(["-f", "concat", "-safe", "0"]);

        if (songFile && songFile !== "undefined.mp3" && songFile !== ".mp3") {
            const songPath = path.join(TMP_DIR, songFile);
            ffmpegCommand = ffmpegCommand
                .input(songPath)
                .inputOptions("-stream_loop", "-1") // loop song infinitely
                .audioCodec("aac")
                .outputOptions([
                    "-preset", "ultrafast",
                    "-t", `${TOTAL_VIDEO_DURATION}`, // total video duration
                    "-shortest",                      // clip song to match video
                    "-map", "0:v:0",
                    "-map", "1:a:0"
                ]);
        } else {
            ffmpegCommand = ffmpegCommand.outputOptions([
                "-preset", "ultrafast",
                "-t", `${TOTAL_VIDEO_DURATION}`
            ]);
        }

        ffmpegCommand
            .output(path.join(TMP_DIR, outputPath))
            .on("end", () => {
                console.log(`Media merged successfully: ${outputPath}`);
                resolve(outputPath);
            })
            .on("error", (error: Error) => {
                console.error("Error merging media:", error);
                reject(error);
            })
            .run();
    });
}


export async function downloadAllMediaFromS3(userID: string, song?: string): Promise<string[]> {
    console.log("Downloading all media from S3 for userID:", userID);
    const downloadedFiles: string[] = [];
    const prefixes = [`user-media/${userID}/image/`, `user-media/${userID}/video/`];

    try {
        for (const prefix of prefixes) {
            console.log(`Listing objects with prefix: ${prefix}`);
            const listCommand = new ListObjectsV2Command({ Bucket: BUCKET_NAME, Prefix: prefix });
            const listResponse = await s3Client.send(listCommand);

            if (!listResponse.Contents) {
                console.log(`No files found in the bucket for prefix: ${prefix}`);
                continue;
            }

            for (const file of listResponse.Contents) {
                if (!file.Key) continue;

                console.log(`Downloading: ${file.Key}`);
                const fileName = basename(file.Key);
                const filePath = join(TMP_DIR, fileName);

                const getCommand = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: file.Key });
                const { Body } = await s3Client.send(getCommand);

                if (Body) {
                    const writeStream = fs.createWriteStream(filePath);
                    await pipe(Body as NodeJS.ReadableStream, writeStream);
                    console.log(`Saved: ${filePath}`);
                    downloadedFiles.push(fileName);
                }
            }
        }
    } catch (error) {
        console.error("Error downloading files:", error);
        return [];
    }
    
    console.log("Downloaded files:", downloadedFiles);
    if (!song || song === "undefined" || song === "") {
        console.log("No song provided, skipping download.");
        return downloadedFiles;
    }
    console.log("Downloading song:", song);

    const songFileName = `${song}.mp3`;

    const songKey = `user-media/${userID}/audio/${songFileName}`;
    const songPath = path.join(TMP_DIR, songFileName);

    try {
        console.log(`Downloading song from S3: ${songKey}`);
        const getSong = new GetObjectCommand({ Bucket: BUCKET_NAME, Key: songKey });
        const { Body: songBody } = await s3Client.send(getSong);

        if (songBody) {
            const songWriteStream = fs.createWriteStream(songPath);
            await pipe(songBody as NodeJS.ReadableStream, songWriteStream);
            console.log(`Song downloaded to: ${songPath}`);
        } else {
            throw new Error("No body in song response");
        }
    } catch (error) {
        console.error("Failed to download song:", error);
    }

    return downloadedFiles;
}


export async function getFilesfromFaceID(userID: string, faceID: string): Promise<string[]> {
    const command = new GetCommand({
        TableName: process.env.FACE_LOCATIONS_TABLE_NAME,
        Key: {
            userID,
            faceID,
        },
    });

    const result = await docClient.send(command);
    console.log("DynamoDB result:", result.Item);
    if (!result.Item) {
        console.error("No data found for userID:", userID, "and faceID:", faceID);
        return [];
    }
    return result.Item.imageLocations as string[];
}
