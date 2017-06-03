var dev_agent = require('./agent/_dev_header');
var house_agent = require('./agent/_house_header');
var production_agent = require('./agent/_production_header');

var pg = require('pg');
var config = require('./database/config');

pg.connect(config,	function(err, client, done) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  send_iOS(client);
});

function send_iOS(client)
{
  setTimeout(function() {
    client.query('SELECT apns_devices.development, apns_messages.message, apns_devices.badge, apns_devices.devicetoken, apns_messages.pid, apns_devices.pushbadge FROM apns_messages LEFT JOIN apns_devices ON apns_messages.fk_device = apns_devices.pid WHERE apns_messages.status = \'new\'', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }

      for (var i in result.rows) {

        var message = JSON.parse(result.rows[i]['message']);
        if (result.rows[i]['development'] == 'sandbox')
          msg = dev_agent.createMessage();
        else if (result.rows[i]['development'] == 'house')
          msg = house_agent.createMessage();
        else
          msg = production_agent.createMessage();

        msg.device(result.rows[i]['devicetoken']);
        msg.alert(message['alert']);
        msg.set(message['args']);
        if (result.rows[i]['pushbadge'] == "enabled")
          msg.badge(parseInt(result.rows[i]['badge']));
        msg.send();

        client.query('UPDATE apns_messages SET status = \'delivered\' WHERE pid = ' + result.rows[i]['pid']);
        console.log(Date.now() + ": message \"" + message['alert'] + "\" sended to " + result.rows[i]['devicetoken']);  //@todo: turn it off

      }

      send_iOS(client);

    });
  }, 1000);
}
