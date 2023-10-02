/**
 * valiate-sendgrid-signatire
 * 
 * helper function to validate twilio sendgrid signature
 * to be sure that request is coming from twilio sendgrid.
 * Calculation reliant on secret "webhook public key".
 * 
 * This code roughly pulled from this document:
 * https://www.twilio.com/docs/serverless/functions-assets/quickstart/validate-webhook-requests-from-sendgrid
 * 
 */
import { EventWebhook } from '@sendgrid/eventwebhook';

async function validateSendGridSignature (payload, signature, timestamp, publicKey) {
  
  //console.log("validateSendGridSignature: signature: ", signature);
  //console.log("validateSendGridSignature: timestamp: ", timestamp);

  // Initialize a new SendGrid EventWebhook to expose helpful request validation methods
  const eventWebhook = new EventWebhook();
  
  // Convert the public key string into an ECPublicKey
  const ecPublicKey = eventWebhook.convertPublicKeyToECDSA(publicKey);

  // Stringify the payload and add newlines/carriage returns since they're expected by validator
  const rawEvent = JSON.stringify(payload).split('},{').join('},\r\n{') + '\r\n';

  // Use the sendgrid library to return true or false
  return eventWebhook.verifySignature(
    ecPublicKey,
    rawEvent,
    signature,
    timestamp
  );

};

export { validateSendGridSignature }
