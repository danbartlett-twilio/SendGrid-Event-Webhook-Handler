/**
 *  save-to-s3
 * 
 * Lambda function subscribed to SNS Topic. Receives
 * new messages, parses the message body, and then
 * saves to S3 bucket. Object key follows pattern:
 * date/timestamp-messagesid-status.json
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

export const lambdaHandler = async (event, context) => {
    
    let messageBody = JSON.parse(event.Records[0].Sns.Message);

    //console.info("EVENT\n" + JSON.stringify(event, null, 2));    
    //console.info("Message\n" + JSON.stringify(messageBody, null, 2));
    /**
     * Event Message will lok something like...
        {
            "apiCallTimestamp": 1695770729,
            "apiKeyId": "Qu3-xxxxxxxxxxxxxx",
            "email": "some@something.com",
            "event": "open",
            "globalFrom": "some@something.com",
            "ip": "xx.xxx.xxx.xx",
            "requestId": "SGRxxxxxxxxxxxxxxx",
            "sg_content_type": "html",
            "sg_event_id": "1kxxxxxxxxxxxxxxx",
            "sg_machine_open": false,
            "sg_message_id": "T4xxxxxxxxxxxxxxx",
            "subject": "Some Email Subject!",
            "timestamp": 169xxxxxxxxxxxxxxx,
            "useragent": "some user agent",
            "sqs_record": "39xxxxxxxxxxxxxxx",
            "sourceIp": "xx.xxx.xxx.xx"
        }
     */

    const client = new S3Client({ region: process.env.REGION });

    let now = new Date(); 
    let y = now.getFullYear().toString();
    let m = (now.getMonth() < 10 ? '0' : '') + now.getMonth().toString();
    let d = (now.getDate() < 10 ? '0' : '') + now.getDate().toString();
    // Create a date prefix so that objects in S3 bucket are organized
    // by date. Note, date is based on UTC time!
    let dateprefix = `${y}-${m}-${d}/`;

    // Key format sorts by date, then event type, and then additional identifiers
    // Modify your key as required
    let key = `${dateprefix}${messageBody.event}/${messageBody.apiCallTimestamp}__${messageBody.requestId}__${messageBody.sg_event_id}.json`;

    const params = {
        Bucket: process.env.DestinationBucket,
        Key: key,
        Body: JSON.stringify(messageBody),
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

};