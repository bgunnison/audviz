/*
 Licensed under the Apache License, Version 2.0 (the "License");
 you may not use this file except in compliance with the License.
 You may obtain a copy of the License at

 http://www.apache.org/licenses/LICENSE-2.0

 Unless required by applicable law or agreed to in writing, software
 distributed under the License is distributed on an "AS IS" BASIS,
 WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 See the License for the specific language governing permissions and
 limitations under the License.

 Author: Brian Gunnison (bgunnison@gmail.com)
 */


"use strict";

// a database of center control config
var centerControlConfig = {
    div_id:             'center_control_vis',
    title_id:           'center_control_title_text',
    larrow_div:         'larrow',
    rarrow_div:         'rarrow',
    visibility:         'hidden',    // we start hidden
    height:             300,
    width:              300,
    max_range:          1000,
    fgColor:            'blue',
    defaultValue:       500,
    timeOutHide:        5000
};

// database for viz selectors
var vizControlConfig = {
    div_id:          'viz_selectors',
    selectLeft:      'viz_left_arrow',
    selectTitle:     'viz_title_arrow',
    selectRight:     'viz_right_arrow',
    visibility:      'visible'
};

function CenterControl(canvasCtx) {
    var that = this;
    this.canvasCtx = canvasCtx;
    this.centralControlId = document.getElementById(centerControlConfig.div_id);
    var isVisible = false;

    function Init() {
        // init gui visibility
        console.log('Control init');

        var myKnob = $(".dial").knob({
            'value':        centerControlConfig.defaultValue,
            'min':          0,
            'max':          centerControlConfig.max_range,
            'readOnly':     false,
            'width':        centerControlConfig.width,
            'height':       centerControlConfig.height,
            'fgColor':      centerControlConfig.fgColor,
            'dynamicDraw':  true,
            'thickness':    0.35,
            'skin':         'tron',
            'lineCap':      'round',
            'displayInput': false,
            'angleOffset':  -145,
            'angleArc':     290,
            change:         centralControlChangedParmValue
        });
    }


    // a vizualization control object that clients can register
    // example: {
    //      list:[]     // list of clients by name to iterate
    //      current:0   // current client
    //      'spectrum': // name of viz type
    //              {
    //                  cbSelected:cbSelect,    // callback to client when selected
    //                  cbTitle:clientTitle,    // callback from client to change title
    //                  parms:                  // parameters added by client
    //                      {
    //                          list:[],        //list of parm names to cycle through
    //                          current,        // current parm selected
    //                          'noiseFloor':   // a parameter type
    //                              {
    //                                  cbTitle:parmTitle,      //callback from client to change parm title
    //                                  cbValueChange:cbValue,  //callback to client when value changes
    //                                  cbSelected:cbParm,      //callback to client when parm type selected
    //                                  maxRange:range,         //set by client for control max range
    //                                  value:iValue,           //set by client to initial value
    //                              }
    //                      }
    //              }
    //          }
    var clients = {};
    clients.list = [];
    clients.current = 0;

    // clients add their info and get it back when the user changes to the client's view
    this.addClient = function(clientName, cbSelect) {
        var client = {};
        client.cbTitle = clientTitle;
        client.cbSelect = cbSelect;
        client.parms = {};
        client.parms.list = [];
        client.parms.current = 0;
        clients[clientName] = client;
        clients.list.push(clientName);
        if (clients.list.length == 1) {
            clientTitle(clientName);
        }
    }

    // clients add their parameter info and get it back when the user changes the controller
    this.addClientParm = function(clientName, parmName, iValue, maxRange, cbValue, cbSelect) {
        if (!clients[clientName]) {
            console.log('Unknown client: ' + clientName);
            return;
        }

        var parm = {};
        parm.cbTitle = centerControlTitle;
        parm.cbValueChange = cbValue;
        parm.cbSelect = cbSelect;
        parm.maxRange = maxRange;
        parm.value = iValue;

        var client = clients[clientName];
        client.parms[parmName] = parm;
        client.parms.list.push(parmName);
    }



    // user selected a new parm of current client
    function centralControlSelect(parm) {
        console.log('Parm selected: ' + parm);
        // tell client we changed to it
        parm.cbSelect(parm);
        centerControlMaxRangeValue(parm.maxRange, parm.value);
        //centerControlTitle(client.name); // client changes title
        controlTimeout();
    }

    // user changed value of current parm
    function centralControlChangedParmValue(value) {
        // call the value change callback of the current client's parm
        var clientName = clients.list[clients.current];
        var client = clients[clientName];
        if (client.parms.list.length == 0) {
            return;
        }
        var parm = client.parms[client.parms.list[client.parms.current]];
        if (client.parms.list.length == 0 || !parm.cbValueChange) {
            return;
        }

        parm.value = value;
        parm.cbValueChange(parm);

        controlTimeout();
    }


    // callback from client to set select title
    function clientTitle(title) {
        $("#" + vizControlConfig.selectTitle).text(title);
    }

    // callback from client to set control title
    function centerControlTitle(title) {
        $("#" + centerControlConfig.title_id).text(title);
    }

    // sets current control max and value
    function centerControlMaxRangeValue(max, value) {
        centerControlConfig.maxRange = max;
        $('.dial').trigger('configure', {
            "max": max
            //"fgColor":"#FF0000",
            //"skin":"tron",
            //"cursor":true
        })

        if (value > max) {
            value = max;
        }

        $('.dial').val(value).trigger('change');
    }

    function parmRightArrowClick() {
        var clientName = clients.list[clients.current];
        var client = clients[clientName];

        if (client.parms.list.length == 0) {
            return;
        }
        client.parms.current++;
        if (client.parms.current >= client.parms.list.length) {
            client.parms.current = 0;
        }
        centralControlSelect(client.parms[client.parms.list[client.parms.current]]);
    }

    function parmLeftArrowClick() {
        var clientName = clients.list[clients.current];
        var client = clients[clientName];

        if (client.parms.list.length == 0) {
            return;
        }
        client.parms.current--;
        if (client.parms.current < 0) {
            client.parms.current = client.parms.list.length - 1;
        }
        centralControlSelect(client.parms[client.parms.list[client.parms.current]]);
    }

    // user selected a new parm of current client
    function clientSelect(name) {
        // tell client we changed to it
        var client = clients[name];
        client.cbSelect(client);
        clientTitle(name);
        if (client.parms.list.length > 0) {
            centralControlSelect(client.parms[client.parms.list[client.parms.current]]);
        }
        makeHidden();
    }

    function clientRightArrowClick() {
        //console.log("r arrow");
        if (clients.list.length == 0) {
            return;
        }
        clients.current++;
        if (clients.current >= clients.list.length) {
            clients.current = 0;
        }
        clientSelect(clients.list[clients.current]);
    }

    function clientLeftArrowClick() {
        //console.log("l arrow");
        if (clients.list.length == 0) {
            return;
        }
        clients.current--;
        if (clients.current < 0) {
            clients.current = clients.list.length - 1;
        }
        clientSelect(clients.list[clients.current]);
    }

    this.centerOnCanvas = function () {
        var ew = this.centralControlId.offsetWidth;
        var ccHoriz = this.canvasCtx.canvas.offsetLeft + this.canvasCtx.canvas.width / 2;
        var ccVert =  this.canvasCtx.canvas.offsetTop + this.canvasCtx.canvas.height / 2;

        var lPos = ccHoriz - ew / 2 + 'px';
        this.centralControlId.style.marginLeft = lPos;
        var tPos = ccVert - this.centralControlId.offsetHeight / 2 + 'px';
        this.centralControlId.style.marginTop = tPos;

        /*
        // Arrows initial position is top left of central control
        var ra = document.getElementById(centerControlConfig.rarrow_div);
        var la = document.getElementById(centerControlConfig.larrow_div);
        ra.style.marginTop = tPos;
        la.style.marginTop = tPos;
       
        la.style.marginLeft = (la.style.marginLeft - 80) + 'px';
        ra.style.marginLeft = (ew + 20) + 'px';
        ra.onclick = parmRightArrowClick;
        la.onclick = parmLeftArrowClick;
        */

        var sb = document.getElementById(vizControlConfig.div_id);
        //sb.style.position = 'absolute';
        sb.style.marginLeft =  ccHoriz - sb.offsetWidth / 2 + 'px';
        sb.style.marginTop =  ccVert + (this.canvasCtx.canvas.height / 2) + 5 +  'px';
        document.getElementById(vizControlConfig.selectLeft).onclick = clientLeftArrowClick;
        //document.getElementById(vizControlConfig.selectTitle).onclick = vizSelectTitle;
        document.getElementById(vizControlConfig.selectRight).onclick = clientRightArrowClick;

    }

    var controlTimeoutObj = null;

     function controlTimeout() {
         clearTimeout(controlTimeoutObj);
         controlTimeoutObj = setTimeout(makeHidden, centerControlConfig.timeOutHide);
     }

     function makeVisible() {
        // the style is hidden so it does not flash at load
        that.centralControlId.style.visibility = 'visible';
        $(that.centralControlId).fadeIn('slow','swing');
        isVisible = true;
         that.centerOnCanvas();

        // hide control after 5 seconds uf no use
         controlTimeout();
     }

     function makeHidden() {
        $(that.centralControlId).fadeOut('slow','swing');
         isVisible = false;
        //this.centralControlId.style.visibility = 'hidden';
    }

    this.toggleVisible = function() {
        if (isVisible) {
            makeHidden();
        } else {
            makeVisible();
        }
    }

    /*
    // displays an image on the canvas
    function LoadImage(imageURL, images) {
        var imageObj = new Image();
        imageObj.onload = function() {
            images.push(this);
        };

        imageObj.src = imageURL;
    }

    var touchPanelImages = [];
    function TouchPanelInit() {
        LoadImage('../art/fporig.png',touchPanelImages)
    }

    this.draw = function() {

        // keep visible always for now,
        // implement visible when user touches canvas, then have it fade off after no use
        if (true) {
            var img = touchPanelImages[0];
            if (img) {
                var width = 50;
                // proportional
                var height = img.height * (width/img.width);
                var x = this.canvasCtx.canvas.width - width;
                this.canvasCtx.save();
                this.canvasCtx.globalAlpha = 0.7;
                this.canvasCtx.drawImage(img,
                    0,      //sx
                    0,      //sy
                    img.width,      //swidth
                    img.height,      //sheight
                    x,      //x
                    0,      //y
                    width,    //width
                    height);   //height

                this.canvasCtx.restore();
            }
        }
    }
    */

    Init();
    makeHidden();
    this.centerOnCanvas();
    //TouchPanelInit();
}



// implements a canvas based play, pause control
// also exports basic shapes
function PlayControls(ctx) {

    this.ctx = ctx;

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
        ctx.strokeStyle = 'rgba(255, 255, 255, 1)';
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

    this.triangle = function (x, y, width, rotate, fill) {
        // Stroked triangle.
        var h = 0.866 * width;
        this.ctx.rotate(Math.PI * rotate / 180.0);
        this.ctx.beginPath();
        this.ctx.moveTo(x, y + (0.5 * h));
        this.ctx.lineTo(x + (0.5 * width), y - (0.5 * h));
        this.ctx.lineTo(x - (0.5 * width), y - (0.5 * h));
        this.ctx.closePath();

        if (fill) {
            this.ctx.fillStyle = 'rgba(255,255,255,1)';
            this.ctx.fill();
        } else {
            this.ctx.stroke();
        }

    }

    function clear(obj) {
        obj.ctx.fillStyle = '#000000';
        obj.ctx.fillRect(0, 0, obj.ctx.canvas.width, obj.ctx.canvas.height);
    }


    this.drawPlayButton = function () {
        var cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height) / 4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, 0, 0, cSize - this.ctx.lineWidth + 1, 20, false);
        this.triangle(0, 0 + 20, 120, 30, true);

        this.ctx.restore();
    }

    this.drawPauseButton = function () {
        var cSize = Math.min(this.ctx.canvas.width, this.ctx.canvas.height) / 4;
        this.ctx.save();
        this.ctx.translate(this.ctx.canvas.width / 2, this.ctx.canvas.height / 2);
        //clear(this);
        circle(this, cSize, cSize, cSize - this.ctx.lineWidth + 1);
        this.ctx.save();
        this.ctx.lineWidth += 4;
        line(this, cSize * 0.8, cSize / 2, cSize * 0.8, cSize * 1.5);
        line(this, cSize + (cSize / 5), cSize / 2, cSize + (cSize / 5), cSize * 1.5);
        this.ctx.restore();
        this.ctx.restore();
    }
}


