// Locate your certificate
var join = require('path').join
  , pfx_key = join(__dirname, '../_certs/apns-production-key.pem')
  , pfx_cert = join(__dirname, '../_certs/apns-production-cert.pem');

// Create a new agent
var apnagent = require('apnagent')
  , agent = module.exports = new apnagent.Agent();

// set our credentials
agent.set('cert file', pfx_cert);
agent.set('key file', pfx_key);

// our credentials were for development
agent.enable('production');

/*!
 * Error Mitigation
 */

agent.on('message:error', function (err, msg) {
  switch (err.name) {
    // This error occurs when Apple reports an issue parsing the message.
    case 'GatewayNotificationError':
      console.log('[message:error] GatewayNotificationError: %s', err.message);

      // The err.code is the number that Apple reports.
      // Example: 8 means the token supplied is invalid or not subscribed
      // to notifications for your application.
      if (err.code === 8) {
        console.log('    > %s', msg.device().toString());
        // In production you should flag this token as invalid and not
        // send any futher messages to it until you confirm validity
      }

      break;

    // This happens when apnagent has a problem encoding the message for transfer
    case 'SerializationError':
      console.log('[message:error] SerializationError: %s', err.message);
      break;

    // unlikely, but could occur if trying to send over a dead socket
    default:
      console.log('[message:error] other error: %s', err.message);
      break;
  }
});


agent.connect(function (err) {
  // gracefully handle auth problems
  if (err && err.name === 'GatewayAuthorizationError') {
    console.log('Authentication Error: %s', err.message);
    process.exit(1);
  }

  // handle any other err (not likely)
  else if (err) {
  	console.log('Unexpected error!');
    throw err;
  }

  // it worked!
  var env = agent.enabled('house')
    ? 'house'
    : 'production';

  console.log('apnagent [%s] gateway connected', env);
});