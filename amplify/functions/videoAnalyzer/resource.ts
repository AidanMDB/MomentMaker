import { defineFunction } from "@aws-amplify/backend";

export const videoAnalyzer = defineFunction({
    name: 'video-analyzer',         // Function name
    timeoutSeconds: 240,            // 4 minute timeout (increase if needed)  
    memoryMB: 4096,                 // 4 GB memory (increase if needed)
    runtime: 20,                    
    layers: {"sharp": "arn:aws:lambda:us-east-1:195275659712:layer:mySharpLinuxLayer:1"}

});