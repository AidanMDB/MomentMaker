import { referenceAuth } from "@aws-amplify/backend";

/**
 * Define and configure your auth resource
 * @see https://docs.amplify.aws/gen2/build-a-backend/auth
 */

export const auth = referenceAuth({
    userPoolId: "us-east-1_53upoqrsV", 
    identityPoolId: "us-east-1:7b015516-8413-4a98-85d1-25810a554cda",
    authRoleArn: "arn:aws:iam::195275659712:role/amplify-amplifyvitereactt-amplifyAuthauthenticatedU-Xbo1BaWqKyjP",
    unauthRoleArn: "arn:aws:iam::195275659712:role/amplify-amplifyvitereactt-amplifyAuthunauthenticate-ZXlRCV05nch6",
    userPoolClientId: "6ob3f91tf61ssmcqngllibskin",
});
