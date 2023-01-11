var canvas = document.getElementById("mycanvas"); //Канва
var context2D = canvas.getContext("2d");
var ball = null;
var player1 = null;
var player2 = null;
var player = null;


$(function () { // Отслеживаем движение мыши
    $('#mycanvas').on('mousemove', function (e) {

        websocket.emit('move', {ypos: e.pageY - 25});
    });
});

function gameTick(data) { //Игровой тик
    player1 = data.player1;
    player2 = data.player2;
    ball = data.ball;
    $('#sp_p1score').text(player1.score);
    $('#sp_p2score').text(player2.score);
    draw();
}

function draw() {
    context2D.clearRect(0, 0, canvas.width, canvas.height);

    //Поле
    var padding = 10; //отступ
    context2D.lineWidth = 1;
    context2D.strokeStyle = 'white';

    context2D.beginPath();
    context2D.lineWidth = 2;
    context2D.moveTo((canvas.width / 2) + (padding / 2), padding);
    context2D.lineTo((canvas.width / 2) + (padding / 2), canvas.height - padding);
    context2D.stroke();

    //мяч
    context2D.beginPath();
    context2D.arc(ball.x, ball.y, ball.radius, 0, 2 * Math.PI, false);
    context2D.fillStyle = 'white';
    context2D.fill();
    context2D.stroke();

    //игрок
    context2D.fillStyle = 'white';
    context2D.fillRect(player1.x, player1.y, player1.width, player1.height);
    context2D.fillRect(player2.x, player2.y, player2.width, player2.height);

}
