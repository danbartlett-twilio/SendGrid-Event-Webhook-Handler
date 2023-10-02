/**
 *  generic-handler
 * 
 * This is a simple Lambda function that is invoked by SNS messages.
 * Build off of this lambda function to meet your business requirements.
 */

export const lambdaHandler = async (event, context) => {
    
    let messageBody = JSON.parse(event.Records[0].Sns.Message);

    console.info("EVENT\n" + JSON.stringify(event, null, 2));    
    console.info("Message\n" + JSON.stringify(messageBody, null, 2));
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

    /**
     * What next?
     * 
     * => Switch on event type (open, click, unsubscribe, bounced, ...) and route for further processing
     * => Update your CDP or CRM
     * => Whatever else your business requires!
     * 
     */

};