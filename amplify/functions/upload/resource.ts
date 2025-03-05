import { defineFunction } from "@aws-amplify/backend";

export const myUploadFunction = defineFunction({
    name: 'mediaUpload',         
    timeoutSeconds: 30,         
    //memoryMB: 1024,
    layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"}
});