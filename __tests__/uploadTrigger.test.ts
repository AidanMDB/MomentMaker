/* import * as handler from '../amplify/storage/handler';
import { mockClient } from 'aws-sdk-client-mock';
import { S3Handler } from 'aws-lambda';
import { RekognitionClient, detectFaces } from '@aws-sdk/client-rekognition';
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import sharp from "sharp";
import * as fs from fs;
import * as path from path;

const s3Mock = mockClient(S3Client);
const rekogMock = mockClient(RekognitionClient);


describe ('uploadTrigger', () => {
    beforeEach(() => {
        s3Mock.reset();
        rekogMock.reset();
    });


    it('should skip uploaded face image', async () => {

    });



    it('should crop image to face', async () => {

    });
}); */