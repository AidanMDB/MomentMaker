import { defineFunction, defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'MediaStorage',
    access: (allow) => ({
        'user-media/*': [
            allow.entity('identity').to(['read', 'write', 'delete'])
        ],
    }),
    triggers: {
        onUpload: defineFunction({
            entry: 'functions/upload/handler.ts',
            resourceGroupName: 'storage',
        })
    }
});