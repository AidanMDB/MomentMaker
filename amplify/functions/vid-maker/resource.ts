import { defineFunction } from "@aws-amplify/backend";

export const myVidMakerFunction = defineFunction({
    name: 'vid-maker',         
    timeoutSeconds: 180,            // 3 minute timeout (increase if needed)  
    memoryMB: 1024                  // 1GB memory (increase if needed)

    //testing
});