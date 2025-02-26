import { defineFunction, defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
    name: 'MediaStorage',
    access: (allow) => ({
        'user-media/*': [
            allow.guest.to(['read', 'write', 'delete'])
        ],
    }),
    triggers: {
        onUpload: defineFunction({
            name: 'triggerOnMediaUpload',
            timeoutSeconds: 30,
            entry: './handler.ts',
        })
    }
});