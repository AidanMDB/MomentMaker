import { Predictions } from "aws-amplify/predictions";
import { S3Handler } from "aws-lambda";

export const handler: S3Handler = async (event) => {
    // function code here
    const objectKey = event.Records.map((record) => record.s3.object.key);
};