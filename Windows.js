var wns = require('wns');
var curl = require('curlrequest');
var currentAccessToken = '';

var pg = require('pg');
var config = require('./database/config');

pg.connect(config,	function(err, client, done) {
  if(err) {
    return console.error('could not connect to postgres', err);
  }
  send_Windows(client);
});

function send_Windows(client)
{
  setTimeout(function() {
    client.query('SELECT wns_messages.message, wns_devices.badge, wns_devices.uri, wns_messages.pid FROM wns_messages LEFT JOIN wns_devices ON wns_messages.fk_device = wns_devices.pid WHERE wns_messages.status = \'new\'', function(err, result) {
      if(err) {
        return console.error('error running query', err);
      }

      for (var i in result.rows) {
      	var options = {
		    client_id: '000000000000000000000000',
		    client_secret: '00000000000000000000',
		    accessToken: currentAccessToken
		};

      	var uri = encodeWindowsURI(result.rows[i]['uri']);
		var message = JSON.parse(result.rows[i]['message']);
		var options_launch = options;
		var data = {
			data: message['args']
		};
		options_launch['launch'] = JSON.stringify(data);
		var text = {
			text1: message['alert'],
			lang: 'ru'
		}
		
		wns.sendToastText01(uri, text, options_launch, function (error, result) {
		    if (error)
		        console.error(error);
		     else
		         console.log(result);

		    if(error && error['newAccessToken'])
		    {
		    	// currentAccessToken = encodeURIComponent(error.newAccessToken);
		    	updateAuthorizeToken();
		    	wns.sendToastText01(uri, text, options_launch, function (error, result) {
		    		console.log('Токен перезапрошен.');
		    		console.log('Новый токен: ' + currentAccessToken);
		    	});
		    }
		});
		// wns.sendBadge(uri, result.rows[i]['badge'], options_launch);  @todo: вернуть

		client.query('UPDATE wns_messages SET status = \'delivered\' WHERE pid = ' + result.rows[i]['pid']);
        console.log(Date.now() + " message \"" + message['alert'] + "\" sended to " + result.rows[i]['uri']);  //@todo: turn it off
      }

      send_Windows(client);
    });
  }, 1000);
}

function encodeWindowsURI(uri)
{
	var hostUrl = uri.replace(/\?token=.*/i, '');
	var token = uri.replace(/.*\?token=/i, '');
	token = encodeURIComponent(token);
	uri =  hostUrl +'?token='+ token;
	return uri;
}

function updateAuthorizeToken()
{
	var data = {
		grant_type: 'client_credentials',
		client_id: 'ms-app://s-1-15-2-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX-XXXXXXXXXX',
	    client_secret: '00000000000000000000000000000',
	    scope: 'notify.windows.com'

	}

	var headers = {
		'Content-Type': 'application/x-www-form-urlencoded'
	}

	var curl_options = {
		url: 'https://login.live.com/accesstoken.srf',
		method: 'POST',
		data: data,
		headers: headers
	}

	curl.request(curl_options, function (err, data) {
		if (err)
			console.log(err);
		if (!err) {
			data = JSON.parse(data);
			console.log(currentAccessToken);
			currentAccessToken = encodeURI(data['access_token']);
			console.log(currentAccessToken);
		}

	});
}