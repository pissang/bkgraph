define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var vec2 = require('zrender/tool/vector');
    var util = require('../util/util');
    var cookies = require('../util/cookies');

    var ops = ['entity', 'expand', 'relation', 'sidebar', 'circle'];

    var Intro = function () {

        Component.call(this);
    }

    Intro.prototype.type = 'INTRO';

    Intro.prototype.initialize = function (kg, data) {

        var self = this;

        this._kgraph = kg;

        this.el.className = 'bkg-intro';

        this._current = parseInt(cookies.get('BKGraph_intro_current_0')) || 0;

        if (this._current >= ops.length) {
            setTimeout(function () {
                kg.removeComponent(self);
            })
        } else {
            this.start();
        }

    }

    Intro.prototype.start = function () {
        var self = this;

        this._$mask2 = document.createElement('div');
        this._$mask2.className = 'bkg-mask';

        this._$tip = document.createElement('div');

        this._$nextBtn = document.createElement('button');
        this._$nextBtn.className = 'bkg-next-tip';

        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var maskLayer = zr.painter.getLayer(9);
        this._$mask = maskLayer.dom;
        util.addClass(this._$mask, 'bkg-mask');

        // 暂时禁止拖动和缩放
        zr.modLayer(0, {
            panable: false,
            zoomable: false
        });

        this.el.appendChild(this._$mask2);
        this.el.appendChild(this._$tip);

        this._$tip.appendChild(this._$nextBtn);

        this._step();

        util.addEventListener(this._$nextBtn, 'click', function () {
            if (self._finishPrevious) {
                self._finishPrevious();
            }
            self._step();
        });
    };

    Intro.prototype.stop = function () {
        var self = this;
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);
        var mainNode = graphMain.getMainNode();

        if (this._$mask) {
            zr.painter.delLayer(9);
            zr.painter.delLayer(10);
        }

        if (layer.position[0] !== 0 && layer.position[1] !== 0) {
            graphMain.moveToEntity(mainNode.id, finish);
        } else {
            finish();
        }

        function finish () {
            // 恢复拖动和缩放
            zr.modLayer(0, {
                panable: true,
                zoomable: true
            });

            // 移除自身
            self._kgraph.removeComponent(self);
        }
    };

    Intro.prototype._step = function () {
        var current = this._current++;
        var opName = ops[current];
        var self = this;

        cookies.set('BKGraph_intro_current_0', current);

        if (opName) {
            this._$nextBtn.innerHTML = '知道了(' + this._current + '/' + ops.length + ')';

            this._finishPrevious = this['_' + opName](function () {
                self._step();
            });
        } else {
            // Finish
            this.stop();
        }
    };

    Intro.prototype._expand = function (cb) {
        var self = this;
        var graphMain = this._kgraph.getComponentByType('GRAPH');

        var graph = graphMain.getGraph();
        var zr = graphMain.getZR();
        var width = zr.getWidth();
        var height = zr.getHeight();

        var availabelNode;
        var halfAvailableNode;
        // 查找合适的能够放引导的点
        graph.eachNode(function (node) {
            if (node.entity && node.data.layerCounter == 2) {
                var pos = node.entity.el.position;
                var x = pos[0], y = pos[1];
                halfAvailableNode = node;

                // 在主要视觉区域内
                if (x > 100 && x < width - 200 && y > 100 && y < height - 200) {
                    availabelNode = node;
                }
            }
        });

        if (!availabelNode) {
            if (!halfAvailableNode) {
                cb();
                return;
            }

            availabelNode = halfAvailableNode;
            graphMain.moveToEntity(availabelNode.id, showTip);
        } else {
            showTip();
        }

        availabelNode.entity.setZLevel(10);
        zr.refreshNextFrame();

        function showTip() {
            var pos = availabelNode.entity.el.position;
            var layer = zr.painter.getLayer(0);
            var x = pos[0] + layer.position[0], y = pos[1] + layer.position[1];
            self._$tip.style.display = 'block';
            self._$tip.className = 'bkg-tip bkg-tip-expand';
            self._$tip.style.left = x + 40 +'px';
            self._$tip.style.top = y + 40 +'px';
        }

        return function () {
            self._$tip.style.display = 'none';
            availabelNode.entity.setZLevel(1);
            zr.refreshNextFrame();
        }
    };

    Intro.prototype._entity = function (cb) {
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);
        var mainNode = graphMain.getMainNode();
        var self = this;

        if (layer.position[0] !== 0 && layer.position[1] !== 0) {
            graphMain.moveToEntity(mainNode.id, showTip);
        } else {
            showTip();
        }

        mainNode.entity.setZLevel(10);
        zr.refreshNextFrame();

        function showTip() {
            var pos = mainNode.entity.el.position;
            var x = pos[0] + layer.position[0], y = pos[1] + layer.position[1];
            self._$tip.style.display = 'block';
            self._$tip.className = 'bkg-tip bkg-tip-entity';
            self._$tip.style.left = x + 40 +'px';
            self._$tip.style.top = y - 40 - self._$tip.clientHeight +'px';
        }

        return function () {
            self._$tip.style.display = 'none';
            mainNode.entity.setZLevel(1);
            zr.refreshNextFrame();
        }
    };

    Intro.prototype._relation = function (cb) {
        var self = this;
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);
        var graph = graphMain.getGraph();
        var mainNode = graphMain.getMainNode();


        var e = mainNode.edges[0];
        e.entity.setZLevel(10);
        
        if (layer.position[0] !== 0 && layer.position[1] !== 0) {
            graphMain.moveToEntity(mainNode.id, showTip);
        } else {
            showTip();
        }

        zr.refreshNextFrame();

        function showTip() {
            var x = (e.entity.el.style.xStart + e.entity.el.style.xEnd) / 2;
            var y = (e.entity.el.style.yStart + e.entity.el.style.yEnd) / 2;

            self._$tip.style.display = 'block';
            self._$tip.className = 'bkg-tip bkg-tip-relation';
            self._$tip.style.left = x + 10 +'px';
            self._$tip.style.top = y + 10 +'px';
        }

        return function () {
            self._$tip.style.display = 'none';
            e.entity.setZLevel(0);
            zr.refreshNextFrame();
        }
    };

    Intro.prototype._sidebar = function (cb) {
        var self = this;
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        this._$tip.style.display = 'block';
        this._$tip.className = 'bkg-tip bkg-tip-relation';
        this._$tip.style.left = 20 + 'px';
        this._$tip.style.top = zr.getHeight() / 2 + 40 + 'px';

        return function () {
            self._$tip.style.display = 'none';
        }
    };

    Intro.prototype._circle = function (cb) {
        var self = this;
        var graphMain = this._kgraph.getComponentByType('GRAPH');
        var zr = graphMain.getZR();
        var layer = zr.painter.getLayer(0);
        var graph = graphMain.getGraph();
        var width = zr.getWidth();
        var height = zr.getHeight();

        var circles = graphMain.getCircles();
        if (!circles.length) {
            cb();
            return;
        }

        var circle = circles[0];
        var center = vec2.create();
        // 定位到circle中间
        for (var i = 0; i < circle.nodes.length; i++) {
            var pos = circle.nodes[i].entity.el.position;
            circle.nodes[i].entity.setZLevel(10);
            vec2.add(center, center, pos);
        }
        vec2.scale(center, center, 1 / circle.nodes.length);

        var edge;
        var rightMost = -Infinity;
        // 查找到定位最右的边
        for (var i = 0; i < circle.edges.length; i++) {
            var e = circle.edges[i];
            e.entity.setZLevel(10);

            var x = (e.entity.el.style.xStart + e.entity.el.style.xEnd) / 2;
            if (x > rightMost) {
                rightMost = x;
                edge = e;
            }
        }

        graphMain.moveTo(width / 2 - center[0], height / 2 - center[1], showTip);

        function showTip() {
            var y = (edge.entity.el.style.yStart + edge.entity.el.style.yEnd) / 2;

            self._$tip.style.display = 'block';
            self._$tip.className = 'bkg-tip bkg-tip-circle';
            self._$tip.style.left = rightMost + layer.position[0] + 10 +'px';
            self._$tip.style.top = y + layer.position[1] - self._$tip.clientHeight +'px';
        }

        return function () {
            self._$tip.style.display = 'none';
            for (var i = 0; i < circle.nodes.length; i++) {
                circle.nodes[i].entity.setZLevel(1);
            }
            for (var i = 0; i < circle.edges.length; i++) {
                circle.edges[i].entity.setZLevel(0);
            }
            zr.refreshNextFrame();
        }
    };


    zrUtil.inherits(Intro, Component);

    return Intro;
});