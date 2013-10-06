/**
 * Created with JetBrains WebStorm.
 * User: 勃
 * Date: 13-10-7
 * Time: 上午1:59
 * To change this template use File | Settings | File Templates.
 */
var conn_pool = require('./ConnPool')
var JSON2 = require('JSON2');
var _ = require('underscore');

function sendDataToSocketIdArray(socket_id_array, data) {
  if (typeof data == 'object') {
    try {
      data = JSON2.stringify(data);
    } catch (e) {

    }
  }
  var socket_array = conn_pool.socket_pool.mget(socket_id_array);
  for (var i in socket_array) {
    socket_array[i].send(data);
  }
}
/**
 * send data string in the format of json to user
 * @param user_id
 * @param data
 */
exports.sendToUser = function (user_id, data) {
  sendDataToSocketIdArray(conn_pool.user_pool.getUserSocketIdArray(user_id), data);
}

/**
 * publish data string in the format of json to channel
 * @param channel_id
 * @param data
 */
exports.publishToChannel = function (channel_id, data) {
  sendDataToSocketIdArray(conn_pool.channel_pool.getChannelSocketIdArray(channel_id), data);
}
/**
 * send data string in the format of json to sockets of user subscribe to channel
 * @param channel_id
 * @param user_id
 * @param data
 */
exports.publishToUserOnChannel = function (channel_id, user_id, data) {
  sendDataToSocketIdArray(conn_pool.channel_pool.getUserSocketIdArrayOnChannel(channel_id, user_id), data)
}
/**
 * send data string in the format of json to sockets of users subscribe to channel
 * @param channel_id
 * @param user_id_array
 * @param data
 */
exports.publishToUsersOnChannel = function (channel_id, user_id_array, data) {
  user_id_array = _.uniq(user_id_array)
  sendDataToSocketIdArray(conn_pool.channel_pool.getUsersSocketIdArrayOnChannel(channel_id, user_id_array), data)
}
