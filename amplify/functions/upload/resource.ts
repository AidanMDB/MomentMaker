import { defineFunction } from "@aws-amplify/backend";
import { imageAnalyzer } from "../imageMedia/resource"; 

export const myUploadFunction = defineFunction({
    name: 'mediaUpload',         
    timeoutSeconds: 30,         
    //memoryMB: 1024,
    runtime: 20,
    layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"},
    //environment: {
    //    IMAGE_ANALYZER_FUNCTION_NAME: imageAnalyzer,
    //}
});