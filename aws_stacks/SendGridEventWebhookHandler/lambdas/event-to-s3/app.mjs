/**
 * event-to-s3
 * 
 * Lambda function that is triggered by SQS. Opens
 * message, checks x-twilio-email-event-webhook-signature/timestamp,
 * and if valid, publishes message to SNS topic for downstream processing.
 * 
 */
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
const client = new S3Client({ region: process.env.REGION });

export const lambdaHandler = async (event, context) => {
         
    //console.log(JSON.stringify(event, 2, null));    

    // Configure authentication, pull username and
    // password entered in SG to secure this webhook.
    const authUser = process.env.EVENT_WEBHOOK_USER;
    const authPass = process.env.EVENT_WEBHOOK_PASSWORD;

    // Construct the Basic Auth string expected
    const authString = 'Basic ' + Buffer.from(authUser + ':' + authPass).toString('base64');

    console.log("authString => ", authString);

    if (authString !== event.headers?.authorization) {
        
        // HANDLE FAILED CHECK OF AUTHORIZATION HEADER
        // Send notification or alarm...

        console.log("!!!!!!!!!!! Basic Authentication FAILED !!!!!!!!!!!");        

    } else {

        // Valid authorization header

        let now = new Date(); 
        let y = now.getFullYear().toString();
        let m = (now.getMonth() < 10 ? '0' : '') + now.getMonth().toString();
        let d = (now.getDate() < 10 ? '0' : '') + now.getDate().toString();
        // Create a date prefix so that objects in S3 bucket are organized
        // by date. Note, date is based on UTC time!
        let dateprefix = `${y}-${m}-${d}/`;

        // Key format sorts by date, then event type, and then additional identifiers
        // Modify your key as required
        let key = `${dateprefix}${event.requestContext.requestId}.json`;

        let eventBody = JSON.parse(event.body);

        let eventPayload = {
            eventSource: "s3",
            headers: event.headers,
            eventBody: eventBody
        }

        const params = {
            Bucket: process.env.RAW_EVENT_BUCKET,
            Key: key,
            Body: JSON.stringify(eventPayload),
            ContentType: 'application/json'        
        };
        
        // console.log("params => ", params);
        
        const command = new PutObjectCommand(params);
        
        try {
            
            const data = await client.send(command);
            console.log("Successfully saved object to S3 bucket! Data => ", data);

        } catch (error) {
            
            console.log("Error saving object to S3 bucket => ", error);

        } 

    }

};