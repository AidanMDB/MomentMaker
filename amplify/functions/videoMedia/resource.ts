import { defineFunction } from "@aws-amplify/backend";

export const videoAnalyzer = defineFunction({
    name: 'VideoMediaUpload',         
    timeoutSeconds: 120,         
    memoryMB: 1024,
    runtime: 20,
    layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"}
});