EventEmitter = require('events').EventEmitter
/**
 * socketid socket map is used to save socket id's socket object
 * size is the socket count
 * @constructor
 */
function SocketPool() {
  this.sockid_socket_map = {};
  this._size = 0;
}
SocketPool.prototype.__proto__ = EventEmitter.prototype;
/**
 * userid sockid map is used to save user's sockids
 * sockid userid map is used to find which user is refered to given a sock id
 * both sockid userid map and userid sock count is used to accelerate the data access
 * size is the user count in user pool
 * @constructor
 */
function UserPool() {
  this.userid_sockid_map = {};
  this.userid_sock_count = {};
  this.sockid_userid_map = {};
  this._size = 0;
}
UserPool.prototype.__proto__ = EventEmitter.prototype;
/**
 * channelid sockid map to know which sockets are connected to a given channel
 * channelid userid map to know which users are connected to a given channel
 * both userid channelid map and sockid channel map to accelerate data access
 * and they are one to many relationship
 * size is the channel count in the channel pool
 * @constructor
 */
function ChannelPool() {
  this.channelid_sockid_map = {};
  this.channelid_sock_count = {};
  this.sockid_channelid_map = {};
  this.sockid_channel_count = {};
  this.channelid_userid_map = {};
  this.channelid_userid_socket_count = {};
  this.channelid_user_count = {};
  this.userid_channelid_map = {};
  this.userid_channel_count = {};
  this._size = 0;
}
ChannelPool.prototype.__proto__ = EventEmitter.prototype;

var socket_pool = new SocketPool();
var user_pool = new UserPool();
var channel_pool = new ChannelPool();
exports.socket_pool = socket_pool;
exports.user_pool = user_pool;
exports.channel_pool = channel_pool;
/**
 * add socket to socket id to socket map
 * should be invoked when socket connects the server on server connection event
 * if socket is valid
 *   if socket id not exist
 *     incr pool size
 *     if the added socket is the first socket, invoke onFirstSocketConnect
 *   else if socket exist
 *     delete existed socket
 *   set socket
 * @param socket
 */
SocketPool.prototype.connect = function (socket) {
  if (socket != undefined) {
    if (this.sockid_socket_map[socket.id] == undefined) {
      ++this._size;
      if (this._size == 1) {
        this.onFirstSocketConnect(socket.id);
      }
    } else {
      delete this.sockid_socket_map[socket.id];
    }
    this.sockid_socket_map[socket.id] = socket;
  }
}

/**
 * invoked when socket is disconnected from server
 * if socket exist
 *   decr pool size
 *   if the socket is binded with a logged in user
 *     delete socket from user socket pool
 *   delete socket
 * @param sockid
 */
SocketPool.prototype.close = function (sockid) {
  if (this.sockid_socket_map[sockid] != undefined) {
    --this._size;
    user_pool.delSocket(sockid)
    channel_pool.delSocket(sockid);
    delete this.sockid_socket_map[sockid]
    if (this._size == 0) {
      this.onAllSocketsDisconnected(sockid);
    }
  }
}
/**
 * invoked by UserPool add method when a user's identification is confirmed
 * @param socket_id
 * @param user_id
 */
SocketPool.prototype.setUserInfo = function (socket_id, user_id) {

}
SocketPool.prototype.get = function (sockid) {
  return this.sockid_socket_map[sockid];
}
/**
 * get an array of socket given socketid array
 * @param sockid_array
 * @returns {*}
 */
SocketPool.prototype.mget = function (sockid_array) {
  var ret_val = [];
  for (var i in sockid_array) {
    ret_val.push(this.sockid_socket_map[sockid_array[i]]);
  }
  return ret_val;
}

SocketPool.prototype.size = function () {
  return this._size;
}
SocketPool.prototype.onFirstSocketConnect = function (socket_id) {
  this.emit('onFirstSocketConnect ', socket_id)
}
/**
 * invoked when all socket is closed
 * size is 0 at this moment
 */
SocketPool.prototype.onAllSocketsDisconnected = function (socket_id) {
  this.emit('onAllSocketsDisconnected ', socket_id)
}
/**
 * invoked when user identity is confirmed
 * add a socket id to user pool
 * the socket id is guaranteed to be valid
 * if the added socket is the first socket of the user
 *   add userid key to pool
 *   init userid sock count to zero
 *   incr user pool size
 *   if the added user is the first in user pool, invoke onFirstUserLogin
 *   invoke user login function
 * if socket id exists under this user
 *   delete existed socket id
 * else socket id not exists
 *   incr user sock count by one
 * set user id to sockid map
 * and set sockid to user id map
 * invoke ChannelPool setSocketUserInfo to make the socket previously subscribed
 *   channels without identification identified
 * @param user_id
 * @param socket_id
 */
UserPool.prototype.add = function (user_id, socket_id) {
  if (this.userid_sockid_map[user_id] == undefined) {
    this.userid_sockid_map[user_id] = {};
    this.userid_sock_count[user_id] = 0;
    ++this._size;
    if (this._size == 1) {
      this.onFirstUserLogin(user_id);
    }
    this.onUserLogin(user_id);
  }
  if (this.userid_sockid_map[user_id][socket_id] == undefined) {
    ++this.userid_sock_count[user_id];
  }
  this.sockid_userid_map[socket_id] = user_id;
  this.userid_sockid_map[user_id][socket_id] = true;
  channel_pool.setSocketUserInfo(socket_id, user_id);
}

/**
 * private method, invoked when a socket with user identity closed
 * if socket exists in the user socket map
 *   delete socket of the user
 *   delete user of the socket
 *   decr socket count of the user
 *   if the deleted one is the last socket of the user
 *     delete socket pool of the user
 *     delete socket count of the user
 *     decr user pool size
 *     if user pool size is decreased to zero, invoke onAllUsersLogout
 *     invoke onUserLogout
 * @param user_id
 * @param socket_id
 */
UserPool.prototype._del = function (user_id, socket_id) {
  if (this.userid_sockid_map[user_id] != undefined && this.userid_sockid_map[user_id][socket_id] != undefined) {
    delete this.sockid_userid_map[socket_id];
    delete this.userid_sockid_map[user_id][socket_id];
    --this.userid_sock_count[user_id];
    if (this.userid_sock_count[user_id] == 0) {
      delete this.userid_sockid_map[user_id];
      delete this.userid_sock_count[user_id];
      --this._size;
      this.onUserLogout(user_id);
      if (this._size == 0) {
        this.onAllUsersLogout(user_id);
      }
    }
  }
}

/**
 * invoked by SocketPool close method
 * delete a socket
 * if socket is correspond to a user, delete the socket from the user
 * @param socket_id
 */
UserPool.prototype.delSocket = function (socket_id) {
  if (this.sockid_userid_map[socket_id] != undefined) {
    this._del(this.sockid_userid_map[socket_id], socket_id);
  }
}

UserPool.prototype.getSocketUserId = function (socket_id) {
  return this.sockid_userid_map[socket_id];
}

UserPool.prototype.getUserSocketIdArray = function (user_id) {
  var sockid_obj = this.userid_sockid_map[user_id];
  if (sockid_obj != undefined) {
    return Object.keys(sockid_obj)
  }
  return [];
}

UserPool.prototype.size = function () {
  return this._size;
}

UserPool.prototype.onUserLogin = function (user_id) {
  this.emit('userLogin', user_id)
}

UserPool.prototype.onUserLogout = function (user_id) {
  this.emit('userLogout', user_id)
}

UserPool.prototype.onAllUsersLogout = function (user_id) {
  this.emit('onAllUsersLogout ', user_id)
}
UserPool.prototype.onFirstUserLogin = function (user_id) {
  this.emit('onFirstUserLogin ', user_id)
}

/**
 * invoked on socket message event with subscribe type
 * subscribe a socket to a channel
 * if this socket is the first on this channel, invoke onChannelOpen
 *   incr channel pool size
 *   if the added channel is the first one, invoke onFirstChannelOpen
 * if this socket is not exist in this channel
 *   incr channelid sock count
 *   if this channel is the first of the socket, invoke onSocketFirstChannel
 *   incr sock channel id count
 *   add channel to this socket
 *   add socketid to this channel
 *
 * if this socket is bind to a user
 * $the following is done by _subscribeUserSocket
 *   if this is the first user of the channel, invoke onChannelFirstUser
 *   if current user not exists in the channel
 *     incr channel user count
 *     if current channel first channel of the user, invoke onUserFirstChannel
 *     incr user channel count
 *     add channel to this user
 *     add user to this channel
 *
 * @param channel_id
 * @param socket_id
 */
ChannelPool.prototype.subscribe = function (channel_id, socket_id) {
  if (this.channelid_sockid_map[channel_id] == undefined) {
    this.channelid_sockid_map[channel_id] = {};
    this.channelid_sock_count[channel_id] = 0;
    ++this._size;
    if (this._size == 1) {
      this.onFirstChannelOpen(channel_id);
    }
    this.onChannelOpen(channel_id);
  }
  if (this.channelid_sockid_map[channel_id][socket_id] == undefined) {
    ++this.channelid_sock_count[channel_id];

    if (this.sockid_channelid_map[socket_id] == undefined) {
      this.sockid_channelid_map[socket_id] = {};
      this.sockid_channel_count[socket_id] = 0;
      this.onSocketFirstChannel(socket_id, channel_id);
    }
    ++this.sockid_channel_count[socket_id];
    this.sockid_channelid_map[socket_id][channel_id] = true;
    this.channelid_sockid_map[channel_id][socket_id] = true;
  }
  var user_id = user_pool.getSocketUserId(socket_id);
  if (user_id != undefined) {
    this._subscribeUserSocket(channel_id, user_id, socket_id);
  }
}
/**
 * invoked by UserPool add method when a socket's user identification is confirmed
 * if the socket is connected to channels
 *   for each channel, subscribe the user
 * @param socket_id
 * @param user_id
 */
ChannelPool.prototype.setSocketUserInfo = function (socket_id, user_id) {
  var socket_channels = this.sockid_channelid_map[socket_id];
  if (socket_channels != undefined) {
    for (var channel_id in socket_channels) {
      this._subscribeUserSocket(channel_id, user_id, socket_id);
    }
  }
}
/**
 * private method
 * if this is the first user of the channel, invoke onChannelFirstUser
 * if current user not exists in the channel
 *   incr channel user count
 *   if current channel first channel of the user, invoke onUserFirstChannel
 *   incr user channel count
 *   add channel to this user
 *   add user to this channel
 *   add socket to this user's connection pool of this channel
 *   if this socket is the first one of this user's connection of this channel
 *     invoke onUserSubscribeChannel
 * @param channel_id
 * @param user_id
 * @param socket_id
 * @private
 */
ChannelPool.prototype._subscribeUserSocket = function (channel_id, user_id, socket_id) {
  //add user to this channel
  if (this.channelid_userid_map[channel_id] == undefined) {
    this.channelid_userid_map[channel_id] = {};
    this.channelid_userid_socket_count[channel_id] = {};
    this.channelid_user_count[channel_id] = 0;
    this.onChannelFirstUser(channel_id, user_id);
  }
  if (this.channelid_userid_map[channel_id][user_id] == undefined) {
    ++this.channelid_user_count[channel_id];

    //add channel to user
    if (this.userid_channelid_map[user_id] == undefined) {
      this.userid_channelid_map[user_id] = {};
      this.userid_channel_count[user_id] = 0;
      this.onUserFirstChannel(user_id, channel_id);
    }
    ++this.userid_channel_count[user_id];
    this.channelid_userid_map[channel_id][user_id] = {};
    this.channelid_userid_socket_count[channel_id][user_id] = 0;
    this.userid_channelid_map[user_id][channel_id] = true;
  }
  if (this.channelid_userid_map[channel_id][user_id][socket_id] == undefined) {
    ++this.channelid_userid_socket_count[channel_id][user_id];
    if (this.channelid_userid_socket_count[channel_id][user_id] == 1) {
      this.onUserSubscribeChannel(channel_id, user_id);
    }
  }
  this.channelid_userid_map[channel_id][user_id][socket_id] = true;
}
/**
 * invoked when a socket need to unsubscribe a channel
 * if ths socket id exists in the channel
 *   delete socket id from this channel
 *   delete channel from this socket
 *   decr socket count of this channel
 *   decr channel count of this socket
 *   if the deleted one is the last channel of the socket, invoke onSocketDisconnectAllChannels
 *   if the deleted one is the last socket of the channel, invoke onAllSocketsDisconnectFromChannel
 *     if the deleted socket is the last socket, invoke onChannelsAllClosed
 * if this socket correspond to a user
 *   unsubscribe the user socket from channel
 * @param channel_id
 * @param socket_id
 */
ChannelPool.prototype.unsubscribe = function (channel_id, socket_id) {
  if (this.channelid_sockid_map[channel_id] != undefined && this.channelid_sockid_map[channel_id][socket_id] != undefined) {
    delete this.channelid_sockid_map[channel_id][socket_id];
    delete this.sockid_channelid_map[socket_id][channel_id];
    --this.channelid_sock_count[channel_id];
    --this.sockid_channel_count[socket_id];
    if (this.sockid_channel_count[socket_id] == 0) {
      delete this.sockid_channelid_map[socket_id];
      delete this.sockid_channel_count[socket_id];
      this.onSocketDisconnectAllChannels(socket_id);
    }
    if (this.channelid_sock_count[channel_id] == 0) {
      delete this.channelid_sockid_map[channel_id];
      delete this.channelid_sock_count[channel_id];
      --this._size;
      this.onAllSocketsDisconnectFromChannel(channel_id, socket_id);
      if (this._size == 0) {
        this.onChannelsAllClosed(channel_id);
      }
    }
  }
  var user_id = user_pool.getSocketUserId(socket_id);
  if (user_id != undefined) {
    this._unsubscribeUserSocket(channel_id, user_id, socket_id);
  }
}
/**
 * private method, unsubscribe a user socket from a channel
 * if user id exists in the channel and socket exists in this user of this channel
 *   delete socket from user socket pool of this channel
 *   decr user socket count of this channel
 *   if the deleted one is the last socket of user socket pool of this channel
 *     unsubscribe user from this channel
 *     invoke onUserUnsubscribeChannel
 * @param channel_id
 * @param user_id
 * @param socket_id
 * @private
 */
ChannelPool.prototype._unsubscribeUserSocket = function (channel_id, user_id, socket_id) {
  if (this.channelid_userid_map[channel_id] != undefined && this.channelid_userid_map[channel_id][user_id] != undefined && this.channelid_userid_map[channel_id][user_id][socket_id]) {
    delete this.channelid_userid_map[channel_id][user_id][socket_id];
    --this.channelid_userid_socket_count[channel_id][user_id];
    if (this.channelid_userid_socket_count[channel_id][user_id] == 0) {
      this._unsubscribeUser(channel_id, user_id);
      this.onUserUnsubscribeChannel(channel_id, user_id);
    }
  }
}
/**
 * private method, delete user from channel and delete channel from user, if condition is met, invoke event
 * delete user from this channel
 * delete channel from this user
 * decr user count of this channel
 * decr channel count of this user
 * if the deleted one is the last user of the channel, invoke onAllUsersDisconnectFromChannel
 * if the deleted one is the last channel of the user, invoke onUserDisconnectAllChannels
 * @param channel_id
 * @param user_id
 * @private
 */
ChannelPool.prototype._unsubscribeUser = function (channel_id, user_id) {
  delete this.channelid_userid_map[channel_id][user_id];
  delete this.userid_channelid_map[user_id][channel_id];
  --this.channelid_user_count[channel_id];
  --this.userid_channel_count[user_id];
  if (this.channelid_user_count[channel_id] == 0) {
    delete this.channelid_user_count[channel_id];
    delete this.channelid_userid_map[channel_id];
    this.onAllUsersDisconnectFromChannel(channel_id, user_id);
  }
  if (this.userid_channel_count[user_id] == 0) {
    delete this.userid_channel_count[user_id];
    delete this.userid_channelid_map[user_id];
    this.onUserDisconnectAllChannels(user_id);
  }
}
/**
 * invoke by SocketPool close method when a socket closes
 * delete given socket from all channels
 * @param socket_id
 */
ChannelPool.prototype.delSocket = function (socket_id) {
  if (this.sockid_channelid_map[socket_id] != undefined) {
    var channels = this.sockid_channelid_map[socket_id];
    for (var i in channels) {
      this.unsubscribe(i, socket_id)
    }
  }
}

ChannelPool.prototype.getChannelSocketIdArray = function (channel_id) {
  var socketid_obj = this.channelid_sockid_map[channel_id];
  if (socketid_obj != undefined) {
    return Object.keys(socketid_obj);
  }
  return [];
}
ChannelPool.prototype.isUserExistsOnChannel = function (channel_id, user_id) {
  if (this.channelid_userid_map[channel_id] != undefined && this.channelid_userid_map[channel_id][user_id] != undefined) {
    return true;
  } else {
    return false;
  }
}
ChannelPool.prototype.getUserSocketIdArrayOnChannel = function (channel_id, user_id) {
  if (this.isUserExistsOnChannel(channel_id, user_id)) {
    return Object.keys(this.channelid_userid_map[channel_id][user_id]);
  }
}
ChannelPool.prototype.getUsersSocketIdArrayOnChannel = function (channel_id, user_id_array) {
  var ret_val = [];
  var channel_user_socket_id_object = this.channelid_userid_map[channel_id];
  if (channel_user_socket_id_object != undefined) {
    for (var i in user_id_array) {
      var user_id = user_id_array[i];
      if (channel_user_socket_id_object[user_id] != undefined) {
        ret_val.apply(ret_val, Object.keys(channel_user_socket_id_object[user_id]))
      }
    }
  }
  return ret_val;
}

ChannelPool.prototype.size = function () {
  return this._size;
}
/**
 * invoked when the created channel is the first one
 */
ChannelPool.prototype.onFirstChannelOpen = function (channel_id) {
  this.emit('firstChannelOpen ', channel_id)
}
/**
 * invoked when the deleted channel is the last one
 */
ChannelPool.prototype.onChannelsAllClosed = function (channel_id) {
  this.emit('channelsAllClosed ', channel_id)
}
/**
 * invoked when the subscribed channel is the first one of the socket
 * @param socket_id
 * @param channel_id
 */
ChannelPool.prototype.onSocketFirstChannel = function (socket_id, channel_id) {
  this.emit('socketFirstChannel ', socket_id, channel_id)
}
/**
 * invoked when the unsubcribed channel is the last one of the socket
 * @param socket_id
 */
ChannelPool.prototype.onSocketDisconnectAllChannels = function (socket_id) {
  this.emit('onSocketDisconnectAllChannels ', socket_id)
}
/**
 * invoked when the subscribed channel is the first one of the user
 * @param user_id
 * @param channel_id
 */
ChannelPool.prototype.onUserFirstChannel = function (user_id, channel_id) {
  this.emit('onUserFirstChannel ', user_id, channel_id)
}
/**
 * invoked when the unsubcribed channel is the last one of the user
 * @param user_id
 */
ChannelPool.prototype.onUserDisconnectAllChannels = function (user_id) {
  this.emit('onUserDisconnectAllChannels ', user_id)
}
/**
 * invoked when the subscribed user is the first one of the channel
 * @param channel_id
 * @param user_id
 */
ChannelPool.prototype.onChannelFirstUser = function (channel_id, user_id) {
  this.emit('onChannelFirstUser ', channel_id, user_id)
}
/**
 * invoked when the unsubscribed user is the last one of the channel
 * @param channel_id
 * @param user_id
 */
ChannelPool.prototype.onAllUsersDisconnectFromChannel = function (channel_id, user_id) {
  this.emit('onAllUsersDisconnectFromChannel ', channel_id, user_id);
}
/**
 * invoked when the channel is created, and the subscribed socket is the first one of the channel
 * @param channel_id
 */
ChannelPool.prototype.onChannelOpen = function (channel_id) {
  this.emit('onChannelOpen ', channel_id)
}
/**
 * invoked when all sockets unsubscribe the channel, and the channel is deleted
 * @param channel_id
 * @param socket_id
 */
ChannelPool.prototype.onAllSocketsDisconnectFromChannel = function (channel_id, socket_id) {
  this.emit('onAllSocketsDisconnectFromChannel ', channel_id, socket_id)
}

ChannelPool.prototype.onUserSubscribeChannel = function (channel_id, user_id) {
  this.emit('onUserSubscribeChannel ', channel_id, user_id)
}

ChannelPool.prototype.onUserUnsubscribeChannel = function (channel_id, user_id) {
  this.emit('onUserUnsubscribeChannel ', channel_id, user_id)
}