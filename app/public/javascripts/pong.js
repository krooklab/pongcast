//=============================================================================
// PONG
//=============================================================================

Pong = {

	cfg: {
		ballSpeed:    2     // in pixels per milliseconds
	},

	//-----------------------------------------------------------------------------

	init: function(runner) {
		this.runner      = runner;

		this.courtEl     = document.getElementById('court');
		this.width       = $(this.courtEl).width();
		this.height      = $(this.courtEl).height();

		this.scores      = [0, 0];

		this.court       = Object.create(Pong.Court);

		this.paddle      = [null, null];

		this.paddle[0]   = Object.create(Pong.Paddle);
		this.paddle[0].init(this, 0);

		this.paddle[1]   = Object.create(Pong.Paddle);
		this.paddle[1].init(this, 1);

		this.ball        = Object.create(Pong.Ball);
		this.ball.init(this);


		this.reset();
	},

	reset: function () {
		this.scores = [0, 0];
		this.playing = false;
		this.ball.reset();
		this.court.reset();
		this.ended = false;
	},

	play: function() {
		if (this.playing) return;

		if(this.ended) this.reset();
		this.playing = true;

		this.ball.startMoving();
	},

	pause: function() {
		this.playing = false;
	},

	end: function () {
		this.pause();
		this.ended = true;
	},

	goal: function(playerNo) {
		this.scores[playerNo] += 1;
		if (this.scores[playerNo] == 4) {
			this.court.declareWinner(playerNo);
			this.end();
		}
		else {
			this.ball.reset(playerNo);
			this.pause();
		}
		this.court.updatePlayerScore(playerNo, this.scores[playerNo]);
	},

	update: function(dt) {
		if (!this.playing) return;

		if (this.ball.left > this.cfg.width)
			this.goal(0);
		else if (this.ball.right < 0)
			this.goal(1);
	},

	//=============================================================================
	// COURT
	//=============================================================================

	Court: {

		updatePlayerScore: function (playerNo, score) {
			$("#score"+playerNo).html(score);
		},

		declareWinner: function(playerNo) {
			$("#winner"+playerNo).show();
		},

		reset: function () {
			$("#score0").html('0');
			$("#score1").html('0');
			$("#winner0").hide();
			$("#winner1").hide();
		}

	},

	//=============================================================================
	// PADDLE
	//=============================================================================

	Paddle: {

		init: function(pong, playerNo) {
			this.playerNo = playerNo;
			this.paddleEl = document.getElementById('paddle'+this.playerNo);

			this.pong   = pong;
			this.width  = $(this.paddleEl).width();
			this.height = $(this.paddleEl).height();
			this.minY   = 0;
			this.maxY   = pong.height - this.height;

			this.setpos( (playerNo == 1) ? this.pong.width - this.width : 0, (this.pong.height - this.height)/2 );
		},

		setpos: function(x, y) {
			this.x      = x;
			this.y      = y;
			this.left   = this.x;
			this.right  = this.left + this.width;
			this.top    = this.y;
			this.bottom = this.y + this.height;

			this.updatePosition();
		},

		updatePosition: function() {
			//console.log(this.playerNo);
			this.paddleEl.style.webkitTransform = 'translate3d('+(this.x)+'px,'+(this.y)+'px,0) scale3d(1,1,1)';
		}
	},

	//=============================================================================
	// BALL
	//=============================================================================

	Ball: {

		init: function(pong) {
			this.pong    = pong;
			this.ballEl  = document.getElementById('ball');

			this.size    = $(this.ballEl).width();
			this.radius  = this.size/2;

			this.minX    = 0;
			this.maxX    = this.pong.width - this.size;
			this.minY    = 0;
			this.maxY    = this.pong.height - this.size;
			this.speed   = (this.maxX - this.minX) / pong.cfg.ballSpeed;
			this.accel   = pong.cfg.ballAccel;

			this.reset(0);
		},

		reset: function(playerNo) {
			if(!playerNo) playerNo = 0;

			this.goToPosition( playerNo == 0 ?  this.minX+this.pong.paddle[0].width : this.maxX-this.pong.paddle[1].width , Pong.Helper.random( this.pong.paddle[playerNo].y , this.pong.paddle[playerNo].y + this.pong.paddle[playerNo].height - this.size) );

			this.setdir( playerNo == 0 ?  this.speed : -this.speed ,  -this.speed );

			this.lastintersection = '';
		},

		setdir: function(dirX, dirY) {
			this.dirX = dirX;
			this.dirY = dirY;
		},

		startMoving: function () {
			this.ballEl.addEventListener("webkitTransitionEnd", this.move.bind(this), true); // move after every transition
			this.move();
		},

		move: function (argument) {
			// console.log('ball move');

			// y = rico*x + b
			// b = y - rico*x

			var rico = this.dirY/this.dirX;
			var b    = this.y - rico*this.x;

			// upper wall: y = this.minY
			// lower wall: y = this.maxY;

			//  left bounder (paddle 0): x = this.minX + this.pong.paddle[0].width
			// right bounder (paddle 1): x = this.maxX - this.pong.paddle[1].width


			// intersection with upper wall:
			var y_upperwall = this.minY;
			var x_upperwall = (y_upperwall-b)/rico;

			// intersection with lower wall:
			var y_lowerwall = this.maxY;
			var x_lowerwall = (y_lowerwall-b)/rico;

			// intersection with paddle 0:
			var x_paddle0 = this.minX + this.pong.paddle[0].width;
			var y_paddle0 = rico*x_paddle0 + b;

			// intersection with paddle 1:
			var x_paddle1 = this.maxX - this.pong.paddle[1].width;
			var y_paddle1 = rico*x_paddle1 + b;


			// find out which intersection layes inside the court:
			if( this.lastintersection != 'upperwall' && Pong.Helper.isInRect(x_upperwall, y_upperwall, x_paddle0, x_paddle1, y_upperwall, y_lowerwall) ) {

				console.log("x_upperwall: " + x_upperwall + ", this.minX: " + x_paddle0);

				console.log('upperwall');
				this.lastintersection = 'upperwall';
				this.dirY = -this.dirY;
				this.goToPosition(x_upperwall, y_upperwall, true);
				return;
			}

			if( this.lastintersection != 'lowerwall' && Pong.Helper.isInRect(x_lowerwall, y_lowerwall, x_paddle0, x_paddle1, y_upperwall, y_lowerwall) ) {
				console.log('lowerwall');
				this.lastintersection = 'lowerwall';
				this.dirY = -this.dirY;
				this.goToPosition(x_lowerwall, y_lowerwall, true);
				return;
			}

			if( this.lastintersection != 'paddle0' && Pong.Helper.isInRect(x_paddle0, y_paddle0, x_paddle0, x_paddle1, y_upperwall, y_lowerwall) ) {
				console.log('paddle0');
				this.lastintersection = 'paddle0';
				this.dirX = -this.dirX;
				this.goToPosition(x_paddle0, y_paddle0, true);
				return;
			}

			if( this.lastintersection != 'paddle1' && Pong.Helper.isInRect(x_paddle1, y_paddle1, x_paddle0, x_paddle1, y_upperwall, y_lowerwall) ) {
				console.log('paddle1');
				this.lastintersection = 'paddle1';
				this.dirX = -this.dirX;
				this.goToPosition(x_paddle1, y_paddle1, true);
				return;
			}
		},


		goToPosition: function (x, y, animate) {
			if(animate){
				this.ballEl.style.webkitTransitionProperty = '-webkit-transform';
				this.ballEl.style.webkitTransitionTimingFunction = 'linear';
			}else{
				this.ballEl.style.webkitTransitionProperty = 'none';
				this.ballEl.style.webkitTransitionTimingFunction = '';
			}

			var distance = Math.sqrt( (y-this.y)*(y-this.y) + (x-this.x)*(x-this.x) );
			var time = distance/this.pong.cfg.ballSpeed;
			this.ballEl.style.webkitTransitionDuration = time/1000 + 's';
			this.ballEl.style.webkitTransform = 'translate3d('+x+'px,'+y+'px,0) scale3d(1,1,1)';
			this.x = x;
			this.y = y;
		}

	},

	//=============================================================================
	// HELPER
	//=============================================================================

	Helper: {

		random: function(min, max) {
			return (min + (Math.random() * (max - min)));
		},

		isInRect: function (x, y, rectMinX, rectMaxX, rectMinY, rectMaxY) {
			if(x < rectMinX) return false;
			if(x > rectMaxX) return false;
			if(y < rectMinY) return false;
			if(y > rectMaxY) return false;
			return true;
		}

	}

	//=============================================================================

}; // Pong
