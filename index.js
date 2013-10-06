/**
 * Created with JetBrains WebStorm.
 * User: bolu
 * Date: 13-5-2
 * Time: PM11:26
 * To change this template use File | Settings | File Templates.
 */
var engine = require('engine.io');
var express = require('express')
  , path = require('path')
  , http = require('http');
var JSON2 = require('JSON2');
var request_lib = require('request');
var server_url = "http://npeasy.com:3000";
var app = express();
var RedisStore = require('connect-redis')(express);
var redisStore = new RedisStore({prefix: 'RTS_SESSID:'});
app.configure('all', function () {
  app.set('port', process.env.PORT || 3000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.cookieParser('your secret here'));
  app.use(express.session({
    key: 'rts.sid',
    secret: "my secret",
    store: redisStore
  }));
  app.use(express.session());
  app.use(app.router);
  app.use('/public', express.static(path.join(__dirname, '/public')));
});
//TODO for debug, not safe
app.all("/send", function (req, res) {
  var to_user_id = req.param('to_user_id');
  var response_data = '';
  var to_user_sock_ids = user_sock_id[to_user_id];
  if (to_user_sock_ids != undefined) {
    response_data += to_user_sock_ids.length + " sockets on"
    for (var i in to_user_sock_ids) {
      sock_pool[to_user_sock_ids[i]].send('message')
    }
  }
  res.send(response_data)
})
var postSecret = '5199DED1ECBBF664AD4376306FD45F19';
var checkSenderPermission = function (req, res, next) {
  if (req.param('postSecret') == postSecret) {
    next();
  } else {
    res.send('post keyword is not right');
  }
}
app.all("/chat", checkSenderPermission, function (req, res) {
  var user_id = req.param('fromUserId')
  var to_user_id = req.param('toUserId')
  var content = req.param('content')
  var timestamp = req.param('timestamp')
  sendDataToUser(to_user_id, {
    type: 'chat',
    data: {
      from_user_id: user_id,
      content: content,
      timestamp: timestamp
    }
  })
  res.end();
})
app.all("/publish/:channelName/:eventName", checkSenderPermission, function (req, res) {
  var channelName = req.param("channelName");
  var eventName = req.param("eventName");
  var data = req.param('data')
  try {
    publishDataToChannel(channelName, eventName, data);
    res.send('success')
  } catch (e) {
    res.send(e);
  }
});

app.all("/identity", function (req, res) {
  var conn_id = req.param("conn_id");
  var from_site = req.param("from_site");
  res.redirect(from_site + "/rts_authorize_url?conn_id=" + conn_id + "&rts_receive_auth_code_url=" + server_url + "/receive_auth_code");
})
app.all("/receive_auth_code", function (req, res) {
  var conn_id = req.param("conn_id");
  var auth_code = req.param("auth_code");
  var get_user_id_url = req.param("get_user_info_url");
  request_lib(get_user_id_url + "?auth_code=" + auth_code, function (error, response, data_received) {
    if (!error && response.statusCode == 200) {
      try {
        var user_obj = JSON2.parse(data_received);
      } catch (e) {
        return;
      }
      var user_id = user_obj['user_id'];
      if (user_sock_id[user_id] == undefined) {
        user_sock_id[user_id] = []
      }
      if (sock_pool[conn_id] != undefined) {
        sock_pool[conn_id].user_id = user_id;
      }
      user_sock_id[user_id].push(conn_id);
    }
  })
  res.send('')
})
http_server = http.createServer(app).listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
server = engine.attach(http_server);
var sock_pool = {};
var user_sock_id = {};

function sendDataToUser(user_id, data) {
  if (typeof(data) != 'string') {
    data = JSON2.stringify(data);
  }

  var to_user_sock_ids = user_sock_id[user_id];
  if (to_user_sock_ids != undefined) {
    for (var i in to_user_sock_ids) {
      if (sock_pool[to_user_sock_ids[i]] != undefined) {
        sock_pool[to_user_sock_ids[i]].send(data)
      }
    }
    return true;
  }
  return false;
}

//TODO feature:subscribe privilege
var channel_connection_pool = {};
/**
 * subscribe a socket to a channel and receive all events in the channel
 * @param channel_id
 * @param socket
 */
function subscribeChannel(channel_id, socket) {
  var socket_id = socket.id;
  if (channel_connection_pool[channel_id] === undefined) {
    channel_connection_pool[channel_id] = {};
  }
  channel_connection_pool[channel_id][socket_id] = true;
}
/**
 * send json string as js object to channel_event in given channel
 * if the data is not valid json string, exception will be thrown
 * @param channel_id
 * @param event_name
 * @param data should be a json string
 * @returns {boolean}
 */
function publishDataToChannel(channel_id, event_name, data) {
  var channel_socket_ids = channel_connection_pool[channel_id];

  if (channel_socket_ids === undefined) {
    return false;
  }
  try {
    data = JSON2.parse(data);
  } catch (e) {
    throw "data should be a valid json string";
  }
  var publish_data = JSON2.stringify(
    {
      type: "channel",
      data: {
        id: channel_id,
        event: event_name,
        data: data
      }
    })
  for (var socket_id in channel_socket_ids) {
    var socket = sock_pool[socket_id];
    if (socket === undefined) {
      delete channel_socket_ids[socket_id];
      continue;
    }
    socket.send(publish_data)
  }
}
server.on('connection', function (socket) {
  sock_pool[socket.id] = socket;
  socket.on("close", function () {
    if (socket.user_id != undefined) {
      var index = user_sock_id[socket.user_id].indexOf(socket.id);
      user_sock_id[socket.user_id].splice(index, 1);

    }
    sock_pool[socket.id] = undefined;
  })
  socket.on("message", function (data) {
    try {
      data = JSON2.parse(data)
      if (data.type != undefined) {
        switch (data.type) {
          case "subscribe"://subscribe to a channel
            var channel_id = data.data;
            console.log('subscribe ' + channel_id)
            subscribeChannel(channel_id, socket);
            break;
        }
      }
    } catch (e) {
      return;
    }
  })
})
//TODO 每隔一段时间将sock_pool中的连接检查一遍连通性,删除僵尸连接
//TODO 每隔一段时间将user_sock_id中undefined的sock删掉