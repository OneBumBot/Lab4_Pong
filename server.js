var express = require('express');// импортируем фреймворк express
var app = express(); //Создаём приложение express
var server = require('http').createServer(app);//Создаём http сервер
var io = require('socket.io')(server)// подключаем библиотеку
var port=process.env.PORT || 8080 // устанавливаем порт

var Ball = require('./gamelogic/Ball');
var Player = require('./gamelogic/Player');
var Logic = require('./gamelogic/Logic');

server.listen(port); //Подключаем сервер к порту для прослушивания

// доставлять статические файлы
app.use(express.static(__dirname + '/public'));

//Если запрос осуществляется к корневой папке то выводим index.html
app.get('/', function (req, res) {
    // так выводится файл index.html
    res.sendFile(__dirname + '/public/index.html');
});


var gameloop, ballloop; //Игровой цикл и цикл мяча
var lobbyUsers = new Array(); //Пользователи в лобби
var pairs = new Array(); //Пары игроков

//Подключение к сокету
io.on('connection', function (socket) {

    // Пользователь входит в лобби
    socket.on('clienthandshake', function (data) {
        //Добавляем нового пользователя в массив пользователей, подключенных к сокету
        lobbyUsers.push({
            user: data.username,
            connectionId: socket.id,
            ongame: false
        });

        //Отправка на клиент данных о подключении и пользователе
        socket.emit('serverhandshake', {connectionId: socket.id, user: data.username});

        lobbyUsers.forEach(function (lobbyUser) {
            var sock = getSocketById(lobbyUser.connectionId);
            sock.emit('useradded', {users: lobbyUsers});//Отправлем на клиент сообщение, что пользователь добавлен
        });
    });

    //Движение вёсел
    socket.on('move', function (data) {
        for (var i = 0, max = pairs.length; i < max; i++) {
            var logic = pairs[i].logic;
            if (pairs[i].p1 == socket.id) {
                logic.setPlayer1Y(data.ypos);
                break;
            } else if (pairs[i].p2 == socket.id) {
                logic.setPlayer2Y(data.ypos);
                break;
            }
        }
    });

    //Дисконнект из лобби
    socket.on('disconnect', function () {
        cancel(socket);
        for (var i = 0, max = lobbyUsers.length; i < max; i++) {
            if (lobbyUsers[i].connectionId === socket.id) {
                lobbyUsers.splice(i, 1);
                break;
            }
        }
    });

    //Отмена игры
    socket.on('cancelgame', function () {
        cancel(socket);
    });

    //Приглашение от клиента
    socket.on('clientinvitation', function (data) {
        for (var i = 0, max = lobbyUsers.length; i < max; i++) {
            if (lobbyUsers[i].user === data.guest) {
                var guestSocket = getSocketById(lobbyUsers[i].connectionId);
                guestSocket.emit('serverinvitation', {host: data.host});
                break;
            }
        }
    });

    //Инициация мультиплеера
    socket.on('initiatemultiplayer', function (data) {
        var p1Socket = null;
        var p2Socket = null;
        for (var i = 0, max = lobbyUsers.length; i < max; i++) {
            if (lobbyUsers[i].user === data.p1) {
                p1Socket = getSocketById(lobbyUsers[i].connectionId);
                lobbyUsers[i].ongame = true;
                continue;
            } else if (lobbyUsers[i].user === data.p2) {
                p2Socket = getSocketById(lobbyUsers[i].connectionId);
                lobbyUsers[i].ongame = true;
                continue;
            }
            if (p1Socket != null && p2Socket != null) {
                break;
            }
        }
        lobbyUsers.forEach(function (lobbyUser) {
            var sock = getSocketById(lobbyUser.connectionId);
            sock.emit('useradded', {users: lobbyUsers});
        });

        p1Socket.emit('gamestart', {player: 'Player 1'});
        p2Socket.emit('gamestart', {player: 'Player 2'});
        var sockets = new Array();
        sockets.push(p1Socket);
        sockets.push(p2Socket);
        var logic = new Logic(false);
        logic.init();
        var loops = startGameLoop(sockets, logic);
        pairs.push({
            p1: p1Socket.id,
            p2: p2Socket.id,
            logic: logic,
            loops: loops
        });
    });
    //Инициация одиночной игры
    socket.on('initiatesingleplayer', function (data) {
        socket.emit('gamestart');
        var sockets = new Array();
        var logic = new Logic(true);
        sockets.push(socket);
        logic.init();
        var loops = startGameLoop(sockets, logic);

        for (var i = 0, max = lobbyUsers.length; i < max; i++) {
            console.log(lobbyUsers[i].connectionId + " " + socket.id);
            if (lobbyUsers[i].connectionId == socket.id) {
                lobbyUsers[i].ongame = true;
                break;
            }
        }
        lobbyUsers.forEach(function (lobbyUser) {
            var sock = getSocketById(lobbyUser.connectionId);
            sock.emit('useradded', {users: lobbyUsers});
        });

        pairs.push({
            p1: socket.id,
            p2: null,
            logic: logic,
            loops: loops
        });
    });
});

function startGameLoop(sockets, logic) {
    var gameloop = setInterval(function () {
            var ok = logic.calculate();

            if (logic.hasWon()) {
                cancel(sockets[0]);
            }

            if (!ok) {
                console.log('Game end');
                setTimeout(function () {
                    logic.init();
                }, 3000);
            }
            for (var i = 0, max = sockets.length; i < max; i++) {
                sockets[i].emit('gametick', {
                    player1: logic.getPlayer1(),
                    player2: logic.getPlayer2(),
                    ball: logic.getBall(),
		            collided: logic.isCollided()
                });
            }
    }, 33);

    var ballloop = setInterval(function () {
        logic.increaseBallSpeed();
        console.log("Ballspeed: " + logic.getBall().getVx());
    }, 10000);
    return {ballloop: ballloop, gameloop: gameloop};
}

//Функция отмены
function cancel(socket) {
    for (var i = 0, max = pairs.length; i < max; i++) {
        var p1 = pairs[i].p1;
        var p2 = pairs[i].p2;

        if (p1 == socket.id && p2 == null) { //Синглплеер

            clearInterval(pairs[i].loops.ballloop);
            clearInterval(pairs[i].loops.gameloop);
            pairs.splice(i, 1);
            socket.emit('gameend');
            for (var i = 0, max = lobbyUsers.length; i < max; i++) {
                if (lobbyUsers[i].connectionId == socket.id) {
                    lobbyUsers[i].ongame = false;
                    break;
                }
            }
            break;
        }


        if (p1 == socket.id) {
            console.log('1');
            //Ищет другого игрока и отправляет ему сообщение
            for (var k = 0, max = lobbyUsers.length; k < max; k++) {
                var lobbySocket = getSocketById(lobbyUsers[k].connectionId);

                if (lobbyUsers[k].connectionId == p2) {
                    console.log('1.1');
                    lobbySocket.emit('opponentleft');
                    lobbySocket.emit('gameend');
                    lobbyUsers[k].ongame = false;
                } else if (lobbyUsers[k].connectionId == p1) {
                    console.log('1.2');
                    lobbySocket.emit('gameend');
                    lobbyUsers[k].ongame = false;
                }
            }
            console.log('Clearing intervals 1');
            console.log(pairs[i].loops.ballloop);
            console.log(pairs[i].loops.gameloop);
            clearInterval(pairs[i].loops.ballloop);
            clearInterval(pairs[i].loops.gameloop);
            pairs.splice(i, 1);
            break;
        } else if (p2 == socket.id) {
            console.log('2');
            for (var k = 0, max = lobbyUsers.length; k < max; k++) {
                var lobbySocket = getSocketById(lobbyUsers[k].connectionId);

                if (lobbyUsers[k].connectionId == p1) {
                    console.log('2.1');
                    lobbySocket.emit('opponentleft');
                    lobbySocket.emit('gameend');
                    lobbyUsers[k].ongame = false;
                } else if (lobbyUsers[k].connectionId == p2) {
                    console.log('2.2');
                    lobbySocket.emit('gameend');
                    lobbyUsers[k].ongame = false;
                }
            }
            console.log('Clearing intervals 2');
            console.log(pairs[i].loops.ballloop);
            console.log(pairs[i].loops.gameloop);
            clearInterval(pairs[i].loops.ballloop);
            clearInterval(pairs[i].loops.gameloop);
            pairs.splice(i, 1);
            break;
        }
    }


    lobbyUsers.forEach(function (lobbyUser) {
        var sock = getSocketById(lobbyUser.connectionId);
        if (typeof sock === 'undefined') {
            return;
        }
        sock.emit('useradded', {users: lobbyUsers});
    });
}

/*Получаем сокет по ID сокета
    Из массива сокетов в текущем лобби получаем нужный
*/
function getSocketById(socketId) {
    return io.of("/").sockets.get(socketId);
}

//Отправляем в консоль сообщение, что сервер запущен
console.log('Server runs on http://127.0.0.1:' + port + '/ now');