获取用户身份
===========
在浏览rts-client网页时，页面产生iframe向rts发送请求，当时rts不知道该请求身份
rts根据url中的请求来源，让浏览器重定向到请求来源网站
请求来源网站确认身份，向rts重定向
rts获取auth_code，通过该code向rts-client获取用户身份

1. 浏览rts-client网页
2. 产生向rts的实时连接，将该连接放入该site下的未知身份conn_pool
{conn_id:socket
}
2. rts-client网页中iframe请求rts，http://rts/identity?conn_id=xxx&from_site=ooo
3. rts/identity收到请求，重定向到http://from_site/rts_authorize_url?conn_id=xxx&rts_receive_auth_code_url=ooo
4. rts-client/rts_authorize_url重定向到http://rts/receive_auth_code?conn_id=xxx&auth_code=xxx&get_user_info_url=xxx
5. rts/receive_auth_code得到auth_code，向http://client_rts_identity_url?auth_code=xxx请求，得到用户id
6. 将conn_id的socket放入对应user下

数据结构
=================
所有未确定身份的连接都保存在unidentified_sock_pool中
var unidentified_sock_pool={
    <site_domain>:{
        <socket_id>:socket
    }
}

所有已确定身份的连接都保存在identified_sock_pool中
var identified_sock_pool={
    <site_domain>:{
        <user_id>:{
            <socket_id>:socket
        }
    }
}
rts只负责建立和用户浏览器的实时连接，不负责数据的保存
