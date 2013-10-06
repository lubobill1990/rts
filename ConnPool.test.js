var conn_pool=require('./ConnPool')
var init_status=[
  [1,1,[]],
  [2,1,[1]],
  [3,0,[2]],
  [4,0,[3]],
  [5,1,[1,4]],
  [6,1,[5,6]],
  [7,2,[8,3]],
  [8,3,[9]],
]

for(var i in init_status){
  var connection_setup=init_status[i];
  var socket={id:connection_setup[0]}
  conn_pool.socket_pool.connect(socket)
}
console.log(conn_pool.socket_pool.size()==init_status.length);
for(var i in init_status){
  var connection_setup=init_status[i];
  if(connection_setup[1]!=0){
    conn_pool.user_pool.add(connection_setup[1],connection_setup[0])
  }
}
for(var i in init_status){
  var connection_setup=init_status[i];
  var channels=connection_setup[2];
  for(var i in channels){
    conn_pool.channel_pool.subscribe(channels[i],connection_setup[0])
  }
}
for(var i in init_status){
  var connection_setup=init_status[i];
  var socket={id:connection_setup[0]}
  conn_pool.socket_pool.close(socket.id)
}
console.log('finish')