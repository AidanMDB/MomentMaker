import * as handler from '../amplify/storage/handler';
import { S3Handler } from 'aws-lambda';
import { RekognitionClient, detectFaces } from '@aws-sdk/client-rekognition';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as fs from fs;
import * as path from path;


