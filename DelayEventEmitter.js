/**
 * Created with JetBrains WebStorm.
 * User: 勃
 * Date: 13-10-7
 * Time: 下午2:33
 * To change this template use File | Settings | File Templates.
 */
function DelayEventEmitter(event_name, opposite_event_name, delay_time, flush_period) {
  this.opposite_event_map = {}
  this.opposite_event_map[event_name] = opposite_event_name;
  this.opposite_event_map[opposite_event_name] = event_name;
  this.param_array = {}
  this.param_array[event_name] = {};
  this.param_array[opposite_event_name] = {};
  this.callback_array = [];
  var self = this;

  function flush_frequently() {
    setInterval(function () {
      var current_time = Date.now();
      var param_obj = {};
      param_obj[event_name] = [];
      param_obj[opposite_event_name] = [];
      for (var i in self.param_array[event_name]) {
        var param = self.param_array[event_name][i];
        if (current_time - param.timestamp > delay_time) {
          param_obj[event_name].push(param);
          delete self.param_array[event_name][i];
        }
      }
      for (var i in self.param_array[opposite_event_name]) {
        var param = self.param_array[opposite_event_name][i];
        if (current_time - param.timestamp > delay_time) {
          param_obj[opposite_event_name].push(param);
          delete self.param_array[opposite_event_name][i];
        }
      }
      if (param_obj[event_name].length > 0 || param_obj[opposite_event_name].length > 0) {
        for (var i in self.callback_array) {
          self.callback_array[i](param_obj)
        }
      }
    }, flush_period == undefined ? 1000 : flush_period)
  }

  flush_frequently();
}
/**
 * if there exists given key in the param array of opposite event name
 *   delete that param
 * else
 *   add to param array of given event name with timestamp
 * @param event_name
 * @param key
 * @param value
 */
DelayEventEmitter.prototype.emit = function (event_name, key, value) {
  var opposite_event_name = this.opposite_event_map[event_name];
  if (this.param_array[opposite_event_name][key] != undefined) {
    console.log('delete ' + opposite_event_name + " " + key + " " + value)
    delete this.param_array[opposite_event_name][key];
  } else {
    this.param_array[event_name][key] = {
      timestamp: Date.now(),
      params: value
    }
  }
}
DelayEventEmitter.prototype.on = function (callback) {
  this.callback_array.push(callback)
}
exports.DelayEventEmitter = DelayEventEmitter;