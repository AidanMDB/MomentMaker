import { defineFunction } from "@aws-amplify/backend";

export const videoAnalyzer = defineFunction({
    name: 'video-analyzer',         // Function name
    timeoutSeconds: 180,            // 3 minute timeout (increase if needed)  
    memoryMB: 1024                  // 1GB memory (increase if needed)
});