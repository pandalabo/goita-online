/* Goita Client Class
   handles WebSocket messages */
var GoitaClient = function(){
  //private field
  this._eventDefined = false;

  //member field
  this.socket = null;  //socket.io
  //this.serverURI = server;
  this.isConnected = false;
  this.isInRobby = false;
  this.hasGoshi = false; // I have goshi;
  this.roomId = "";
  this.userName = "";
  this.userId = "";
  this.playerNo = null;
  this.userList = []; // {userid : UserInfo}
  this.roomInfo = null; //RoomInfo
  this.tegoma = {koma:[]}; //KomaInfo
  
  this.messageHistoryLimit = 1000;
  this.robbyMessage = []; // new Array(); enqueue => push(), dequeue => shift()
  this.roomMessage = [];
  this.privateMessage = [];

  //event - inject event handler
  this.connected = fnEmpty; //function()
  this.disconnected = fnEmpty; //function()
  this.robbyUserChanged = fnEmpty;  //function(userList)
  this.robbyMessageAdded = fnEmpty; //function(msg [, header[, type]])
  this.robbyJoined = fnEmpty; //function()
  this.robbyJoiningFailed = fnEmpty; //function(errorcode)
  this.gotError = fnEmpty;
  this.roomListReceived = fnEmpty; //function(roomlist)
  
  this.roomJoined = fnEmpty; //function({id : roomId})
  this.roomInfoChanged = fnEmpty;  //function(RoomInfo)
  this.roomMessageAdded = fnEmpty; //function(msg [, header[, type]])
  this.roomJoiningFailed = fnEmpty; //function(errorcode)
  this.gotPrivateGameInfo = fnEmpty; //function(KomaInfo)
  this.readyRequested = fnEmpty;  //function()
  this.playRequested = fnEmpty; //function()
  this.gameStarted = fnEmpty; //function()
  this.gameFinished = fnEmpty; //function()
  this.roundStarted = fnEmpty; //function()
  this.roundFinished = fnEmpty; //function(RoomInfo) //非公開情報含む
  this.komaDealedAgain = fnEmpty; //function(RoomInfo) //非公開情報含む
  this.gotCommandError = fnEmpty; //function(error)
  this.goshiDecisionRequested = fnEmpty; //function()
  this.goshiShown = fnEmpty; //function(player No.)

};

//class method
GoitaClient.prototype = {
  
  //connect to server
  connect : function(callback){
    //already isConnected
    if(this.isConnected) return this.socket;

    var self = this;  //capture a client instance

    var socket = io.connect(); //.connect(this.serverURI);
    this.socket = socket;
    
    //socketが無事取得できていればこの時点で接続確立しているはず。
    if(socket != null || socket != undefined)
    {
      this.isConnected = true;
    }

    //for reconnecting, no need to define events again
    if(this._eventDefined) return socket;

    //------------define events ------------------
    
    // 接続できたというメッセージを受け取ったら
    socket.on("connect", function() {
      self.isConnected = true;
      console.log("client connected!");
      self.connected();
    });
    
    //切断した場合
    socket.on('disconnect', function(){
      self.isConnected = false;
      console.log("client disconnected");
      self.disconnected();
    });

    //unhandled error
    socket.on("error", function(error){
      console.log("happend error: " + error);
      self.gotError(error);
    });

    // ロビーに入ったというメッセージを受け取ったら
    socket.on("robby joined", function(data){
      console.log("joined in robby");
      socket.id = data.id; //特に使う場面がないが一応
      self.userId = data.id;
      self.userName = data.username;
      self.isInRobby = true;
      self.robbyJoined();
    });

    //ロビーに入れなかった場合
    socket.on("robby joining failed", function(error){
      console.log(error);
      self.robbyJoiningFailed(error);
    });

    //ロビーから抜けた場合
    socket.on("robby left", function(){
      console.log("left robby");
    });

    // 他のユーザが接続を解除したら
    socket.on("user left robby", function(data) {
      console.log("user left:" + data.id);
      self.robbyMessageAdded("user left:" + data.username, "system", "i");
    });

    // 他のユーザが接続したら
    socket.on("user joined robby", function(data) {
      console.log("user joined:" + data.id);
      self.robbyMessageAdded("user joined:" + data.username, "system", "i");
    });

    // ロビーのユーザ一覧を受け取ったら
    socket.on("robby info", function(userList) {
      console.log("received robby info");
      //self.playerNo = userList[self.userId].playerNo; //不要なはず
      self.userList = userList;
      self.robbyUserChanged(self.userList);
    });

    //ロビーメッセージを受け取ったら
    socket.on("push robby msg", function(msg) {
      console.log("received robby msg:" + msg);
      self.robbyMessage.push(new Message(msg.text, msg.username));
      self.deleteExcessedMessage();
      self.robbyMessageAdded(msg.text, msg.username, "m");
    });
    
    //ルームメッセージを受け取ったら
    socket.on("push room msg", function(msg) {
      console.log("received room msg:" + msg);
      self.roomMessage.push(new Message(msg.text, msg.username));
      self.deleteExcessedMessage();
      self.roomMessageAdded(msg.text, msg.username, "m");
    });

    //ルームリストを受け取ったら
    socket.on("room list", function(roomList){
      console.log("received room list");
      self.roomListReceived(roomList);
    });

    //ルーム関連-----------------------------------------------
    // ルームに入ったというメッセージを受け取ったら
    socket.on("room joined", function(data){
      console.log("joined in room");
      self.roomJoined(data);
    });

    //ルームに入れなかった場合
    socket.on("room joining failed", function(error){
      console.log(error);
      self.roomJoiningFailed(error);
    });

    //ルームから抜けた場合
    socket.on("room left", function(){
      console.log("left room");
      self.roomInfo = null;
      self.playerNo = null;
    });

    // ルームの他のユーザが接続を解除したら
    socket.on("user left room", function(data) {
      console.log("user left:" + data.username);
      self.roomMessageAdded("user left:" + data.username);
    });

    // ルームに他のユーザが接続したら
    socket.on("user joined room", function(data) {
      console.log("user joined:" + data.username);
      self.roomMessageAdded("user joined:" + data.username);
    });

    // ルームのユーザ一覧を受け取ったら
    socket.on("room info", function(roomInfo) {
      //clientのプロパティを更新
      self.roomInfo = roomInfo;
      self.playerNo = null;
      if(roomInfo !== null){
        for(var i=0;i<4;i++){
          if(roomInfo.player[i] !== null && roomInfo.player[i].id == self.userId){
            self.playerNo = i;
          }
        }
      }
      //画面にルーム情報変化を通知
      self.roomInfoChanged(self.roomInfo);
    });

    // game started    全員がreadyするとゲーム開始したことが通知される
    socket.on("game started",function(){
      console.log("game started");
      self.gameStarted();
    });
    // public game info
    socket.on("public game info",function(){
      //this infomation is included in room info
    });

    // private game info ゲーム状態情報通知（各プレイヤーの秘匿情報を渡す。公開情報はとりあえずRoomInfoで渡す）
    socket.on("private game info",function(tegoma){
      console.log("received private game info");
      self.tegoma = tegoma;
      self.gotPrivateGameInfo(tegoma);
    });

    // error command   '無効なプレイを受け取ったときの通知
    socket.on("error command",function(error){
      self.gotCommandError(error);
    });

    // game finished     規定点数に達した時に終了を通知
    socket.on("game finished",function(){
      self.gameFinished();
    });

    // game aborted      途中でだれかが抜けた場合
    //（※回線切断の場合などの復帰処理は認証機能がないと無理なので、今は考えない）
    socket.on("game aborted",function(){
    });

    // played          プレイヤーの手を通知
    socket.on("played",function(koma){
      self.roomInfoChanged(self.roomInfo);
    });

    // passed      パス
    socket.on("passed",function(turn){
      self.roomInfoChanged(self.roomInfo);
    });

    // req play    手番プレイヤーへの通知（処理しなくてもいい）
    socket.on("req play",function(){
      self.playRequested();
    });

    // round started   次ラウンド開始の通知（一定時間で次ラウンド強制開始もありかも）
    socket.on("round started",function(){
      self.roundStarted();
    });

    // round finished  場の非公開情報もついでに送る。//ろくし、ななし、はちし、相ごし、対ごしを含む
    socket.on("round finished",function(room){
      self.roundFinished(room);
    });

    // deal again 配りなおし
    socket.on("deal again",function(room){
      self.komaDealedAgain(room);
    });

    // goshi ごしの決断を求める（その他のプレイヤーにはgoshi waitを送る)
    socket.on("goshi",function(){
      self.hasGoshi = true;
      self.goshiDecisionRequested();
    });

    // goshi wait ごしの決断をしないその他のプレイヤーは判断を待つ
    socket.on("goshi wait",function(no){
      self.goshiShown(no);
    });

    // time up     手番プレイヤーが時間切れ（ランダムで処理される）
    socket.on("time up",function(){
      //not implemented
      //ランダム処理の内容や、処理後の次手番への移動はサーバーがやるので、
      //クライアントにはあくまで時間切れを伝えるのみ。
    });
    // kifu  ラウンド終了ごとに対戦の棋譜を通知
    socket.on("kifu",function(){
      //not implemented
    });

    //to avoid overloading event
    this._eventDefined = true;
    return socket;
  },

  //close connection
  disconnect : function(){
    this.socket.close();
    //this.isConnected = false;
    console.log("client disconnected...");
  },

  joinRobby : function(username){
    this.socket.emit("join robby",username);
  },

  //ロビーチャットで発言
  sendRobbyMessage : function(msg){
    this.socket.emit("send robby msg", {text: msg, username: this.userName});
  },

  //ロビー情報の再要求
  requestRobbyInfo : function(){
    this.socket.emit("req robby info");
  },

  //ロビーから抜けるだけ。※名称変更して入りなおすときに使えるかも？
  leaveRobby : function(){
    this.socket.emit("leave robby");
  },

  joinRoom : function(id){
    this.socket.emit("join room",id);
  },

  //ルームチャットで発言
  sendRoomMessage : function(msg){
    this.socket.emit("send room msg", {text: msg, username: this.userName});
  },

  //ルーム情報の再要求
  requestRoomInfo : function(){
    this.socket.emit("req room info");
  },

  //ルームから抜ける
  leaveRoom : function(){
    this.socket.emit("leave room");
    this.roomInfo = null;
  },

  sitOn : function(n){
    this.socket.emit("sit on", n);
  },

  standUp : function(){
    this.socket.emit("stand up");
  },
  
  swapSeats : function(){
    this.socket.emit("swap seats");
  },

  setReady : function(){
    this.socket.emit("set ready");
  },

  cancelReady : function(){
    this.socket.emit("cancel ready");
  },

  // req game info   ゲーム状態情報を要求
  requestGameInfo : function(){
    this.socket.emit("req game info");
  },

  // play  駒を出す。ゲーム状況で自動的に出し方を判断させる。ゲーム終了処理まで行って結果を返す。
  play : function(koma){
    this.socket.emit("play", koma);
  },

  // pass    'なし
  pass : function(){
    this.socket.emit("pass");
  },

  // goshi proceed 'ごしのまま続行
  goshiProceed : function(){
    this.hasGoshi = false;
    this.socket.emit("goshi proceed");
  },

  // goshi deal again '配りなおし
  goshiDealAgain : function(){
    this.hasGoshi = false;
    this.socket.emit("goshi deal again");
  },
  
  deleteExcessedMessage : function(){
    while(this.robbyMessage.length > this.messageHistoryLimit)
    {
      this.robbyMessage.shift();
    }
    
    while(this.roomMessage.length > this.messageHistoryLimit)
    {
      this.roomMessage.shift();
    }
    
    while(this.privateMessage.length > this.messageHistoryLimit)
    {
      this.privateMessage.shift();
    }
  }
};

//chat message
var Message = function(msg, from)
{
  this.text = msg;
  this.from = from;
};

//empty method
var fnEmpty = function(){
  var callerName = fnEmpty.caller != null ? fnEmpty.caller.name : "root";
  console.log("unhandled event raised, caller name:" + callerName); 
};

// The .bind method from Prototype.js
if (!Function.prototype.bind) { // check if native implementation available
  Function.prototype.bind = function(){
    var fn = this, args = Array.prototype.slice.call(arguments),
        object = args.shift();
    return function(){
      return fn.apply(object,
        args.concat(Array.prototype.slice.call(arguments)));
    };
  };
}