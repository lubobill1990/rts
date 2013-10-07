DelayEventEmitter=require('./DelayEventEmitter').DelayEventEmitter
login_logout_event_emitter=new DelayEventEmitter('login','logout',2000,1000);
login_logout_event_emitter.on(function(param_obj){
  console.log(param_obj)
})
login_logout_event_emitter.emit('login','1','lubo')
login_logout_event_emitter.emit('login','1','lubo')
login_logout_event_emitter.emit('login','2','npeasy')
login_logout_event_emitter.emit('login','3','highperf')
login_logout_event_emitter.emit('login','3','highperf')
login_logout_event_emitter.emit('logout','1','lubo')
login_logout_event_emitter.emit('logout','1','lubo')
login_logout_event_emitter.emit('login','3','highperf')
login_logout_event_emitter.emit('login','4','pre140')
login_logout_event_emitter.emit('logout','4','pre140')