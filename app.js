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
var _ = require('underscore');
var request_lib = require('request');
var conn_pool = require('./ConnPool');
var communication = require('./Communication');
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
function isInt(value) {
  return !isNaN(parseInt(value, 10)) && (parseFloat(value, 10) == parseInt(value, 10));
}
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
  if (isInt(to_user_id)) {
    communication.sendToUser(to_user_id, {
      type: 'chat',
      data: {
        from_user_id: user_id,
        content: content,
        timestamp: timestamp
      }
    })
  }

  res.end();
})
/**
 * required param
 * 1. data
 */
app.all("/publish/:channel_id/:event_name", checkSenderPermission, function (req, res) {
  var channel_id = req.param("channel_id");
  var event_name = req.param("event_name");
  var data = req.param('data')
  try {
    data = JSON2.parse(data);
  } catch (e) {
    console.log("published data should be a valid json string");
    data = "";
  }
  communication.publishToChannel(channel_id, {
    type: "channel",
    data: {
      id: channel_id,
      event: event_name,
      data: data
    }
  })
  res.end();
});

/**
 * in request data, there should contain:
 * 1. user_id_list: int string split by comma, example: 1,2,46,23
 * 2. data in json string format
 */
app.all("/publishToUsers/:channel_id/:event_name", checkSenderPermission, function (req, res) {
  var user_id_array = req.param('user_id_list');
  var channel_id = req.param('channel_id');
  var event_name = req.param('event_name');
  var data = req.param('data');
  if (user_id_array != undefined) {
    try {
      data = JSON2.parse(data);
    } catch (e) {
      console.log("published data should be a valid json string");
      data = "";
    }
    data = {
      type: "channel",
      data: {
        id: channel_id,
        event: event_name,
        data: data
      }
    }
    user_id_array = user_id_array.split(',');
    var user_id_array_purified = [];
    for (var i in user_id_array) {
      if (isInt(user_id_array[i])) {
        user_id_array_purified.push(user_id_array[i])
      }
    }
    communication.publishToUsersOnChannel(channel_id, user_id_array_purified, data)
  }

  res.end();
})
app.all("/sendTo", checkSenderPermission, function (req, res) {
  var user_id;
  var user_id_list;
  var data = req.param('data')

  if (data == undefined) {
    data = ''
  }
  if ((user_id = req.param('user_id')) != undefined) {
    user_id = parseInt(user_id)
    communication.sendToUser(user_id, data)
  } else if ((user_id_list = req.param('user_id_list')) != undefined) {
  }
  res.end();
})

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
      conn_pool.user_pool.add(user_id, conn_id);
    }
  })
  res.send('')
})
http_server = http.createServer(app).listen(app.get('port'), function () {
  console.log("Express server listening on port " + app.get('port'));
});
server = engine.attach(http_server);

server.on('connection', function (socket) {
  conn_pool.socket_pool.connect(socket);
  socket.on("close", function () {
    conn_pool.socket_pool.close(socket.id);
  })
  socket.on("message", function (data) {
    try {
      data = JSON2.parse(data)
      if (data.type != undefined) {
        switch (data.type) {
          case "subscribe"://subscribe to a channel
            //check subscribe permission
            conn_pool.channel_pool.subscribe(data.data, socket.id)
            break;
        }
      }
    } catch (e) {
      return;
    }
  })
})
conn_pool.user_pool.on('userLogin',function(user_id){
  console.log(user_id)
})