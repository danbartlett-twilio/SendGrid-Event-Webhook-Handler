/**
 * handle-sqs-messages
 * 
 * Lambda function that is triggered by SQS. Opens message, pulls out
 * payload depending on where the message originated (SQS or S3-to-SQS),
 * checks x-twilio-email-event-webhook-signature/timestamp,
 * and if valid, publishes message to SNS topic for downstream processing.
 * 
 */
// Bring in S3 client
import { S3Client, GetObjectCommand } from "@aws-sdk/client-s3";
let s3Client = new S3Client( { region: process.env.REGION } );

// Helper function in Lambda Layer
import { validateSendGridSignature } from '/opt/validate-sendgrid-signature.mjs';

// Bring in SNS client
import  { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
const snsClient = new SNSClient({ region: process.env.REGION });

/**
 * processRecord accepts a single record from the SQS queue, tests the 
 * x-twilio-email-event-webhook-signature & timestamp to be sure that it
 * is a valid post request from SendGrid. If it passes, it loops through
 * all events in the array and publishes a message to SNS for downstream
 * processessors to handle.
 */
async function processRecord(messageId, messageTs, sourceIp, webhookEvents, xTs, xSig, publicKey) {    
    
    // Call function in layer to validate the post request
    let validEvent = await validateSendGridSignature(Object.values(webhookEvents), xSig, xTs, publicKey)    
    
    // If it is a valid event, proceed
    if (validEvent) {

        // Look through array of events sent from SendGrid
        await Promise.all(webhookEvents.map(async (evt) => {

            // Build message to publish to SNS Topic
            let snsObject = {
                ...evt,
                sqs_record:messageId,
                timestamp:parseInt(messageTs),
                sourceIp:sourceIp
            };            
                
            // Object to send to SNS
            const params = {
                Message: JSON.stringify(snsObject),            
                TopicArn: process.env.SNStopic
            };
            
            // Send to SNS
            try {
                
                const data = await snsClient.send(new PublishCommand(params));                

            } catch (err) {
                
                console.log("Error publishing message to Topic!", err.stack);

            } 

        })); 
    
    } else {
        
        // Add handling for events where signature validation fails.

        console.log("!!!!!!!!! Validation of SendGrid Headers Failed !!!!!!!!!");

    }
}

export const lambdaHandler = async (event, context) => {
         
    console.log(JSON.stringify(event, 2, null));        

    // Loop through all messages in batch received from SQS
    // Number of messages pulled from each poll to SQS is
    // configurable. Map through the array.
    
    await Promise.all(event.Records.map(async (record) => {

        // Initialize / set the necessary parameters
        let messageId = record.messageId;        
        let messageTimeStamp = (record.attributes['ApproximateFirstReceiveTimestamp']) ? (record.attributes['ApproximateFirstReceiveTimestamp']) : null;
        let xTwilioEmailEventWebhookTimestamp = null;
        let xTwilioEmailEventWebhookSignature = null;
        let sourceIp = null;
        let sqsMessageBody = JSON.parse(record?.body);
        let webhookEvents = null; // Placeholder for array of events (1 -- x) from SendGrid

        let publicKey = null; // Use to valid event is from SendGrid        

        /**
         * Messages from SQS are received from either the API => SQS flow
         * or from the API => Lambda => S3 => SQS flow. The message content
         * will be different depending on source. Test for source and process
         * message content accordingly.
         * 
         * SendGrid sends and array of events.
         */

        // Check if this message came from API => LAMBDA => S3 => SQS
        if (sqsMessageBody?.Records !== undefined && sqsMessageBody.Records[0].eventSource !== undefined && sqsMessageBody.Records[0].eventSource === "aws:s3") {
            
            // Message is from API => LAMBDA => S3 => SQS => LAMBDA
            
            // Set the public key from the SG Event Webhook to the "...TO_S3"
            publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY_API_TO_S3;
            
            // Get the bucket and key for object storing this set of events
            let bucket = sqsMessageBody?.Records[0]?.s3.bucket.name;
            let key = decodeURIComponent(sqsMessageBody?.Records[0]?.s3.object.key);
            
            //console.log("bucket => ", bucket);
            //console.log("key => ", key);
            
            let command = new GetObjectCommand({Bucket: bucket,Key: key});
            
            try {
        
                // Get the Object from S3
                let data = await s3Client.send(command);        
                
                let rawEventObject = await data.Body.transformToString();
                
                let eventObject = JSON.parse(rawEventObject);

                // console.log("eventObject => ", eventObject);

                // Set the parameters
                xTwilioEmailEventWebhookTimestamp = (eventObject.headers['x-twilio-email-event-webhook-timestamp']) ? (eventObject.headers['x-twilio-email-event-webhook-timestamp']) : null;
                xTwilioEmailEventWebhookSignature = (eventObject.headers['x-twilio-email-event-webhook-signature']) ? (eventObject.headers['x-twilio-email-event-webhook-signature']) : null;
                sourceIp = (eventObject.headers['sourceIp']) ? (eventObject.headers['sourceIp']) : null;
                webhookEvents = eventObject.eventBody; 
            
            } catch (error) {
        
                console.log("Error event object from S3! => ", error);
        
            }            
            

        } else {

            // Message is from API => SQS => LAMBDA    

            // Set the public key from the SG Event Webhook to the "...TO_SQS"
            publicKey = process.env.SENDGRID_WEBHOOK_PUBLIC_KEY_API_TO_SQS;
            
            if (
                record.messageAttributes['x-twilio-email-event-webhook-timestamp'] !== undefined && 
                record.messageAttributes['x-twilio-email-event-webhook-signature'] !== undefined && 
                record.messageAttributes['sourceIp'] !== undefined ) {
                xTwilioEmailEventWebhookTimestamp = (record.messageAttributes['x-twilio-email-event-webhook-timestamp'].stringValue) ? (record.messageAttributes['x-twilio-email-event-webhook-timestamp'].stringValue) : null;
                xTwilioEmailEventWebhookSignature = (record.messageAttributes['x-twilio-email-event-webhook-signature'].stringValue) ? (record.messageAttributes['x-twilio-email-event-webhook-signature'].stringValue) : null;
                sourceIp = (record.messageAttributes['sourceIp'].stringValue) ? (record.messageAttributes['sourceIp'].stringValue) : null;                webhookEvents = sqsMessageBody;
            }

        }

        console.log("webhookEvents => ", webhookEvents);

        // Only proceed IF proper headers are present (checked in the next function)
        // If headers are NOT present, the request is not valid and should be discarded/handled
        if (xTwilioEmailEventWebhookTimestamp && xTwilioEmailEventWebhookSignature) {
        
            await processRecord(messageId,messageTimeStamp,sourceIp,webhookEvents,xTwilioEmailEventWebhookTimestamp,xTwilioEmailEventWebhookSignature,publicKey);

        } else {

            // Handle event without Twilio SendGrid Headers
            console.log("SQS Message with this ID did not have Twilio SendGrid header (possible test event): ", messageId);

        }

    }));            

};