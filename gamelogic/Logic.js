var Ball = require('./Ball');
var Player = require('./Player');


function Logic(isSingleplayer) {
    this.enemySpeed = 11;
    this.canvasHeight = 500;
    this.canvasWidth = 853;
    this.ballStartSpeed = 9;
    this.counter = 0;
    this.player1 = null;
    this.player2 = null;
    this.isSingleplayer = isSingleplayer;
    this.maxScore = 16;
    this.collided = false;
}

Logic.prototype.init = function () {
    if (this.player1 == null) {
        this.player1 = new Player(0, 150);
        this.player2 = new Player((this.canvasWidth - 10), 150);
        this.ball = new Ball(10, 30, 150, this.getBallStartSpeed(), 0, this.canvasWidth, this.canvasHeight);
    } else {
        this.player1.setY(150);
        this.player2.setY(150);
        this.ball.setX(30);
        this.ball.setY(150);
        this.ball.setVy(0);
        this.ball.setVx(this.getBallStartSpeed());
    }
};


Logic.prototype.isCollided = function () {
    return this.collided;
}

Logic.prototype.increaseBallSpeed = function () {
    if (this.ball.getVx() < 0) {
        this.ball.setVx(this.ball.getVx() - 1);
    } else {
        this.ball.setVx(this.ball.getVx() + 1);
    }
};

Logic.prototype.setPlayer1Y = function (y) {
    this.player1.setY(y);
};

Logic.prototype.setPlayer2Y = function (y) {
    this.player2.setY(y);
};

Logic.prototype.getEnemySpeed = function () {
    return this.enemySpeed;
};

Logic.prototype.getBall = function () {
    return this.ball;
};

Logic.prototype.getPlayer1 = function () {
    return this.player1;
};

Logic.prototype.getPlayer2 = function () {
    return this.player2;
};

Logic.prototype.getCanvasHeight = function () {
    return this.canvasHeight;
};

Logic.prototype.getCanvasWidth = function () {
    return this.canvasWidth;
};

Logic.prototype.getBallStartSpeed = function () {
    return this.ballStartSpeed;
};

Logic.prototype.calculate = function () {
    this.counter++;
    this.collided=false;
    if (this.ball.isMovingRight()) {
        if (this.ball.collidesWith(this.player2)) {
            this.collided=true;
            this.ball.alternateXSpeed();
            this.ball.calculateYSpeed(this.player2);
        } else if (this.ball.getX() >= this.canvasWidth) {
            this.player1.addScore();
            return false;
        }
    } else {
        if (this.ball.collidesWith(this.player1)) {
            this.collided=true;
            this.ball.alternateXSpeed();
            this.ball.calculateYSpeed(this.player2);
        } else if (this.ball.getX() <= 0) {
            this.player2.addScore();
            return false;
        }
    }

    if (this.ball.isTouchingTop() || this.ball.isTouchingBottom()) {
        this.ball.alternateYSpeed();
    }

    this.ball.setX(this.ball.getX() + this.ball.getVx());
    this.ball.setY(this.ball.getY() + this.ball.getVy());

    if (this.isSingleplayer) {
        this.calculateAIMovement();
    }

    return true;
};

Logic.prototype.calculateAIMovement = function () {
    // Вычисляем центр весла
    var real_y_pos = this.player2.getY() + (this.player2.getHeight() / 2);
    var y_pos = this.player2.getY();


    /* Когда мяч отходит от весла, весло возвращается в центр. */
    if (this.ball.getVx() < 0) {
    // Весло над центром
        if (real_y_pos < ((this.canvasHeight / 2) - 10)) {
            y_pos += this.getEnemySpeed();
        } // Весло ниже центра
        else if (real_y_pos > ((this.canvasHeight / 2) + 10)) {
            y_pos -= this.getEnemySpeed();
        }
    } else if (this.ball.getVx() > 0) {
    // Пока весло не находится на одном уровне с мячом, оно перемещается
        if (real_y_pos != this.ball.getY()) {
    // Мяч над веслом
            if (this.ball.getY() < (real_y_pos - 10)) {
                y_pos -= this.getEnemySpeed();
            } // Мяч под ракеткой
            else if (this.ball.getY() > (real_y_pos + 10)) {
                y_pos += this.getEnemySpeed();
            }
        }
    }
    this.player2.setY(y_pos);
};

Logic.prototype.hasWon = function () {
    if (this.player1.getScore() >= this.maxScore || this.player2.getScore() >= this.maxScore) {
        return true;
    } else {
        return false;
    }
};

module.exports = Logic;
