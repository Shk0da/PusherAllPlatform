var gcm = require('node-gcm');
var sender = new gcm.Sender('AIzaSyBcoeq0zos_HQUt3-fhmQc9vPOINudBRR4');

var pg = require('pg');
var config = require('./database/config');

pg.connect(config,	function(err, client, done) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  send_Android(client);
});

function send_Android(client)
{
  setTimeout(function() {
    client.query('SELECT gcm_messages.message, gcm_devices.badge, gcm_devices.reg_id, gcm_messages.pid FROM gcm_messages LEFT JOIN gcm_devices ON gcm_messages.fk_device = gcm_devices.pid WHERE gcm_messages.status = \'new\'', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }

      for (var i in result.rows) {

        var message = JSON.parse(result.rows[i]['message']);

    	var msg = new gcm.Message();

		msg.addData(message['args']);
		msg.addData('alert', message['alert']);
		msg.addData('badge', result.rows[i]['badge']);

		var regIds = [result.rows[i]['reg_id']];
		sender.send(msg, regIds, function (err, result) {
		    if(err) console.error(err);
		    // else    console.log(result);
		});

        client.query('UPDATE gcm_messages SET status = \'delivered\' WHERE pid = ' + result.rows[i]['pid']);
        console.log(Date.now() + " message \"" + message['alert'] + "\" sended to " + result.rows[i]['reg_id']);  //@todo: turn it off

      }

      send_Android(client);
    });
  }, 1000);
}