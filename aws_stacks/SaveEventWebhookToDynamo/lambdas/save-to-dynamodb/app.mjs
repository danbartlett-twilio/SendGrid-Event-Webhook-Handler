/**
 *  save-to-dynamodb
 * 
 * Lambda function subscribed to SNS Topic. Receives
 * new messages, parses the message body, and then
 * saves to DynamoDB Table. primary key / sort key follows pattern:
 * pk: messageBody.email, sk: `${messageBody.event}::${messageBody.apiCallTimestamp}::${messageBody.sg_event_id}`
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

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


    const client = new DynamoDBClient({ region: process.env.REGION });
    const ddbDocClient = DynamoDBDocumentClient.from(client);                   

    // Set primary key as message sid
    // Set sort key as message status
    const newItem = {
        pk: messageBody.email,
        sk: `${messageBody.event}::${messageBody.apiCallTimestamp}::${messageBody.sg_event_id}`,
        ...messageBody
    }; 

    // console.log("newItem => ", newItem);
    
    try {
        
        const data = await ddbDocClient.send(
            new PutCommand({
              TableName: process.env.TABLE_NAME,
              Item: newItem,
            })
        );
        //console.log("Successfully saved object to DynamoDB Table! Data => ", data);
        
    } catch (error) {
        
        console.log("Error saving object to dynamo db table => ", error);

    }    

};