


var drawSpinner = function(ctx, lines, date, cbFunc) {
    var cW = ctx.canvas.width/4,
        cH = ctx.canvas.height/4;
    var rotation = parseInt(((new Date() - date) / 1000) * lines) / lines;
    ctx.save();
    ctx.fillStyle = "#000000";
    ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (cbFunc != null) {
        cbFunc();
    }
    ctx.translate(ctx.canvas.width / 2, ctx.canvas.height / 2);
    ctx.rotate(Math.PI * 2 * rotation);
    ctx.lineCap = "round";
    for (var i = 0; i < lines; i++) {

        ctx.beginPath();
        ctx.rotate(Math.PI * 2 / lines);
        ctx.moveTo(cW / 10, 0);
        ctx.lineTo(cW / 4.5, 0);
        ctx.lineWidth = cW / 20;
        ctx.strokeStyle = "rgba(255, 255, 255," + i / lines + ")";
        ctx.stroke();
    }
    ctx.restore();
};

function StartSpinner(canvasCtx, cbFunc) {
    var date = new Date();
    return window.setInterval(function() { drawSpinner(canvasCtx, 12, date, cbFunc);}, 1000 / 30);
}

function StopSpinner(timerId) {
    window.clearInterval(timerId);
}

function PlayControls(ctx) {

    this.ctx = ctx;


    /*
    ctx.canvas.addEventListener('mouseover', function(e) {
        if (this.playing) {
            this.drawPauseButton(STROKE_AND_FILL);
        } else {
            this.drawPlayButton(STROKE_AND_FILL);
        }
        ctx.save();
        ctx.lineWidth += 3;
        ctx.circle(R, R, R - ctx.lineWidth + 1);
        ctx.restore();
    }, true);

    ctx.canvas.addEventListener('mouseout', function(e) {
        if (this.playing) {
            this.drawPauseButton(STROKE_AND_FILL);
        } else {
            this.drawPlayButton(STROKE_AND_FILL);
        }
    }, true);

    ctx.canvas.addEventListener('click', function(e) {

        if (this.playing) {
            this.drawPauseButton();
            this.playing = false;
        } else {
            this.drawPlayButton();
            this.playing = true;
        }
    }, true);
*/
    function line(obj, x1, y1, x2, y2) {
        obj.ctx.lineCap = 'round';
        obj.ctx.beginPath();
        obj.ctx.moveTo(x1, y1);
        obj.ctx.lineTo(x2, y2);
        obj.ctx.closePath();
        obj.ctx.stroke();
    }


    function circle(obj, x, y, r, lineWidth, fill) {
        obj.ctx.beginPath();
        obj.ctx.arc(x, y, r, 0, Math.PI * 2, true);
        ctx.lineWidth = lineWidth;
        ctx.strokeStyle = "rgba(255, 255, 255, 1)";
        obj.ctx.closePath();
        if (fill) {
            obj.ctx.fillStyle = 'rgba(255,255,255,1)';
            obj.ctx.fill();
            obj.ctx.stroke();
        } else {
            obj.ctx.stroke();
        }
    }

    function rectangle(obj, x, y, w, h) {
        obj.ctx.beginPath();
        obj.ctx.rect(x, y, w, h);
        obj.ctx.closePath();
        if (obj.opt_fill) {
            obj.ctx.fillStyle = 'rgba(255,255,255,1)';
            obj.ctx.fill();
        } else {
            obj.ctx.stroke();
        }
    }

    function triangle (obj, x, y, width, rotate, fill) {
        // Stroked triangle.
        var h = 0.866 * width;
        obj.ctx.rotate(Math.PI * rotate/180.0);
        obj.ctx.beginPath();
        obj.ctx.moveTo(x, y + (0.5 * h));
        obj.ctx.lineTo(x + (0.5 * width), y - (0.5 * h));
        obj.ctx.lineTo(x - (0.5 * width), y - (0.5 * h));
        obj.ctx.closePath();

        if (fill) {
            obj.ctx.fillStyle = 'rgba(255,255,255,1)';
            obj.ctx.fill();
        } else {
            obj.ctx.stroke();
        }

    }

    function clear(obj) {
        obj.ctx.fillStyle = "#000000";
        obj.ctx.fillRect(0, 0, obj.ctx.canvas.width, obj.ctx.canvas.height);
    }


    this.drawPlayButton = function() {
        cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height)/4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, 0, 0, cSize - this.ctx.lineWidth + 1, 20, false);
        triangle(this, 0, 0 + 20, 120, 30 , true);

        this.ctx.restore();
    }

    this.drawPauseButton = function() {
        cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height)/4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, cSize, cSize, cSize - this.ctx.lineWidth + 1);
        this.ctx.save();
        this.ctx.lineWidth += 4;
        line(this, cSize * 0.8, cSize/2, cSize * 0.8, cSize * 1.5);
        line(this, cSize + (cSize/5), cSize/2, cSize + (cSize/5), cSize * 1.5);
        this.ctx.restore();
        this.ctx.restore();
    }
}