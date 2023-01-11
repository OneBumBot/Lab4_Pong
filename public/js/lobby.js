websocket = io.connect({'sync disconnect on unload': true});

//Добавление пользователя
websocket.on('useradded', function (data) {
    $('#userlist').empty();
    for (var i = 0, max = data.users.length; i < max; i++) {
        if (data.users[i].ongame == true) {
            continue;
        }

        if (data.users[i].user == sessionStorage.getItem('user')) {
            $('#userlist').append('<li class="list-group-item active">' + data.users[i].user + '</li>');
        } else if (data.users[i].ongame == true) {
            continue;
        } else {
            $('#userlist').append('<li class="list-group-item">' + data.users[i].user + '</li>');
        }
    }
});

//Приветствие сервером
websocket.on('serverhandshake', function (data) {
    if (typeof (Storage) !== "undefined") {
        sessionStorage.setItem('user', data.user);
        sessionStorage.setItem('connectionId', data.connectionId);
    } else {
        alert('Извините, поддержка веб хранилища отсутствует...');
    }
});

//Приглашение игрока
websocket.on('serverinvitation', function (data) {
    var confirmed = confirm(data.host + 'Вы приглашены!');
    if (confirmed) {
        websocket.emit('initiatemultiplayer', {p1: data.host, p2: sessionStorage.user});
    }
});

//Игра началась
websocket.on('gamestart', function (data) {
    $('#btn_leftgame').show();
    $('#gamearea').show();
    $('#sidebar_container').hide();
});

//Игра закончилась
websocket.on('gameend', function (data) {
    $('#btn_leftgame').hide();
    $('#btn_invite').attr('disabled', 'true');
    $('#gamearea').hide();
    $('#sidebar_container').show();
    $('#sp_p1score').text('');
    $('#sp_p2score').text('');
});

//Синглплеер
websocket.on('gametick', function (data) {
    gameTick(data);
});

websocket.on('opponentleft', function () {
    alert('Ваш оппонент вышел из игры');
});




$('document').ready(function () {
    $('#gamearea').hide();
    $('#btn_leftgame').hide();

    var username = '';
    while (username == '') {
        username = prompt('Введите никнейм!', '');
    }
    sessionStorage.setItem('username', username);

    websocket.emit('clienthandshake', {username: username});

    //Выделение участника при нажатии на его никнейм и разблокировка кнопки приглашения в игру
    $('#userlist').on('click', 'li', function (data) {
        $('#userlist li').removeClass('selected');
        if ($(this).text() == sessionStorage.getItem('user')) {
            $('#btn_invite').attr('disabled', 'true');
        } else {
            $('#btn_invite').removeAttr('disabled');
            $(this).addClass('selected');
            sessionStorage.setItem('lastSelectedUser', $(this).text());
        }
    });

    //Нажатие на кнопку "Пригласить"
    $('#btn_invite').on('click', function () {
        var guest = sessionStorage.getItem('lastSelectedUser');
        websocket.emit('clientinvitation', {host: sessionStorage.getItem('user'), guest: guest});
    });

    //Нажатие на кнопку "Одиночная игра"
    $('#btn_singleplayer').on('click', function () {
        websocket.emit('initiatesingleplayer');
    });

    //Нажатие на кнопку "Покинуть игру"
    $('#btn_leftgame').on('click', function (e) {
        websocket.emit('cancelgame');
    });
});