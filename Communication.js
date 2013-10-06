/**
 * Created with JetBrains WebStorm.
 * User: 勃
 * Date: 13-10-7
 * Time: 上午1:59
 * To change this template use File | Settings | File Templates.
 */
var conn_pool = require('./ConnPool')
var JSON2 = require('JSON2');

function sendDataToSocketIdArray(socket_id_array, data) {
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
function sendToUser(user_id, data) {
  sendDataToSocketIdArray(conn_pool.user_pool.getUserSocketIdArray(user_id));
}

/**
 * publish data string in the format of json to channel
 * @param channel_id
 * @param data
 */
function publishToChannel(channel_id, data) {
  sendDataToSocketIdArray(conn_pool.channel_pool.getChannelSocketIdArray(channel_id));
}

function publishToUserOnChannel(channel_id, user_id, data) {
  if (conn_pool.channel_pool.isUserExistsOnChannel(channel_id, user_id)) {
    sendToUser(user_id, data);
  }
}

function publishToUsersOnChannel(channel_id, user_id_array, data) {
  var user_id_array = conn_pool.channel_pool.existUsersOnChannel(channel_id, user_id_array);
  for (var user_id in user_id_array) {
    sendToUser(user_id, data);
  }
}