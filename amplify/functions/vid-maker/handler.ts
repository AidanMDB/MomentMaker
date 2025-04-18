import { S3Client, GetObjectCommand, ListObjectsV2Command, PutObjectCommand } from "@aws-sdk/client-s3";
import { APIGatewayEvent, APIGatewayProxyResult } from "aws-lambda";
import fs from "fs";
import { join, basename } from "path";
import { pipeline } from "stream";
import { promisify } from "util";
import * as path from "path";
import { randomUUID } from "crypto";
import ffmpeg from "fluent-ffmpeg";

ffmpeg.setFfmpegPath("/opt/ffmpeglib/ffmpeg"); // For Lambda Layer or bundled binary

const TMP_DIR = "/tmp";
const IMAGE_DURATION = 4;
let TOTAL_VIDEO_DURATION = 300; // Default to 5 minutes
const SUPPORTED_VIDEO_EXT = [".mp4", ".avi", ".mov", ".mkv"];
const SUPPORTED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".gif"];
const OUTPUT_RESOLUTION = { width: 1280, height: 720 };

const pipe = promisify(pipeline);
const s3Client = new S3Client({ region: "us-east-1" });
//const BUCKET_NAME = "amplify-amplifyvitereactt-mediastoragebucket2b6d90-fdhfxhm7qwnv";
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

        console.log("Processing downloaded files...");
        const processedFiles = await handleFiles(downloadedFiles);
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

async function handleFiles(fileList: string[]): Promise<string[]> {
    console.log("Handling files:", fileList);
    const processedFiles: string[] = [];

    for (const file of fileList) {
        if (isVideo(file)) {
            const trimmedName = `trimmed_${file}`;
            console.log(`Trimming video: ${file}`);
            await parseVideo(file, trimmedName, 10, 30);
            processedFiles.push(trimmedName);
        } else if (isImage(file)) {
            const imageVidName = `image_${randomUUID()}.mp4`;
            console.log(`Converting image to video: ${file}`);
            await convertImageToVideo(file, imageVidName);
            processedFiles.push(imageVidName);
        } else {
            console.log(`Skipping unsupported file: ${file}`);
        }
    }

    console.log("Processed files (shuffled):", processedFiles);
    return shuffleArray(processedFiles);
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
    return new Promise((resolve, reject) => {
        const tempListFile = path.join(TMP_DIR, "input.txt");
        fs.writeFileSync(tempListFile, clips.map(f => `file '${path.join(TMP_DIR, f)}'`).join("\n"));

        let ffmpegCommand = ffmpeg()
            .input(tempListFile)
            .inputOptions(["-f", "concat", "-safe", "0"]);

        if (songFile && songFile != "undefined" && songFile != ".mp3") {
            ffmpegCommand = ffmpegCommand
                .input(path.join(TMP_DIR, songFile))
                .audioCodec("aac")
                .outputOptions([
                    '-preset', 'ultrafast',
                    '-t', `${TOTAL_VIDEO_DURATION}`,
                    '-shortest', // ensure the output duration matches the shortest stream
                    '-map', '0:v:0', // video from first input
                    '-map', '1:a:0', // audio from second input (song)
                ]);
        } else {
            ffmpegCommand = ffmpegCommand.outputOptions([
                '-preset', 'ultrafast',
                '-t', `${TOTAL_VIDEO_DURATION}`,
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




