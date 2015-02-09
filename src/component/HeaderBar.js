define(function (require) {

    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var util = require('../util/util');
    var bkgLog = require('../util/log');
    var Sizzle = require('Sizzle');
    var jsonp = require('../util/jsonp');

    var renderSearchResult = etpl.compile(require('text!../html/searchResult.html'));
    var renderHeaderBar = etpl.compile(require('text!../html/headerBar.html'));

    var config = require('../config');
    var levels = config.levels;

    var HeaderBar = function () {

        Component.call(this);

        this._graphCollapsed = true;
    };

    HeaderBar.prototype.type = 'HEADERBAR';

    HeaderBar.prototype.initialize = function (kg, rawData) {

        var el = this.el;
        el.className = 'bkg-headerbar';

        this._kgraph = kg;

        this.setData(rawData);

        // var graphMain = kg.getComponentByType('GRAPH');
        // if (graphMain) {
        //     this.setExplorePercent(graphMain.getExplorePercent());
        // }

        // var sideBar = kg.getComponentByType('SIDEBAR');
        // if (sideBar) {
        //     sideBar.el.style.top = this.el.clientHeight + 'px';
        // }

        var self = this;

        // search
        util.addEventListener(this._$inputArea, 'click', function (e) {
            e.cancelBubble = true;
            e.stopPropagation && e.stopPropagation();

            self.filter(self._$input.value);
        });

        util.addEventListener(this._$input, 'keydown', util.debounce(function () {
            self.filter(self._$input.value);
        }, 200));

        util.addEventListener(Sizzle('body')[0], 'click', function (e) {
            self._$input.value = '';
            self._$searchResult.innerHTML = '';
            util.removeClass(self._$share, 'bkg-share-btn-active');
            util.addClass(self._$shareList, 'bkg-hidden');
        });

        // share
        util.addEventListener(this._$share, 'click', function (e) {
            e.cancelBubble = true;
            e.stopPropagation && e.stopPropagation();

            if (util.hasClass(self._$shareList, 'bkg-hidden')) {
                util.removeClass(self._$shareList, 'bkg-hidden');
                util.addClass(self._$share, 'bkg-share-btn-active');
            }
            else {
                util.addClass(self._$shareList, 'bkg-hidden');
                util.removeClass(self._$share, 'bkg-share-btn-active');
            }
        });

        var $wbShareBtn = Sizzle('.bkg-share', this.el);
        util.addEventListener(this._$shareList, 'click', function (e) {
            var target = e.target || e.srcElement;

            if (target.nodeName.toLowerCase() == 'li') {
                var type = target.getAttribute('data-type');
                switch (type) {
                    case 'weibo':
                        self.weiboShare(e);
                        break;
                }
            }
        });
    };

    HeaderBar.prototype.setData = function (data) {
        // var mainEntity = data.mainEntity;
        // for (var i = 0; i < levels.length - 1; i++) {
        //     levels[i].interval = levels[i + 1].position - levels[i].position;
        // }

        this.render({
            name: document.title,
            levels: levels
        });
    };

    HeaderBar.prototype.render = function (data) {
        this.el.innerHTML = renderHeaderBar(data);

        this._$levels = Sizzle('.bkg-level', this.el);
        this._$inputArea = Sizzle('.bkg-search-input', this.el)[0];
        this._$input = Sizzle('.bkg-search-input input', this.el)[0];
        this._$searchResult = Sizzle('.bkg-search-result', this.el)[0];

        this._$share = Sizzle('.bkg-share', this.el)[0];
        this._$shareList = Sizzle('.bkg-share-area', this.el)[0];

    };

    HeaderBar.prototype.setExplorePercent = function (percent) {
        percent = Math.max(percent * 100, 1);
        Sizzle('.bkg-explore-percent-bar-inner', this.el)[0].style.width = percent + '%';

        for (var i = 0; i < levels.length; i++) {
            util.removeClass(this._$levels[i], 'bkg-active');
        }
        for (var i = 0; i < levels.length; i++) {
            if (levels[i].position <= percent && (!levels[i+1] || levels[i + 1].position > percent)) {
                util.addClass(this._$levels[i], 'bkg-active');
            }
        }
    }

    HeaderBar.prototype.filter = function (name) {
        var self = this;
        var renderData = {};
        if (name) {
            var url = this._kgraph.getDetailAPI();
            url = 'http://cp01-rdqa-dev395.cp01.baidu.com:8006/tupu/api/graph/v2/?id=340391';
            jsonp(url, { act: 'tpuser', mt: 'use', 'ver': 'v1', q: name }, 'callback', function (data) {
                renderData = {
                    entities: data.data || [],
                    name: name
                };
                self._$searchResult.innerHTML = renderSearchResult(renderData);
            });
        }
        else {
            renderData = {
                interests: this._kgraph.getRawData() && this._kgraph.getRawData().interests,
                name: name
            };
            this._$searchResult.innerHTML = renderSearchResult(renderData);
        }
    };

    HeaderBar.prototype.weiboShare = function (e) {
        var _$levels = this._$levels;
        for (var idx = 0, len = _$levels.length; idx < len; idx++) {
            if (Sizzle.matchesSelector(_$levels[idx], '.bkg-active')) {
                break;
            }
        }
        if(idx < 0) return;

        var _param = {
            url: document.URL,
            appkey: '',
            ralateUid: '', //关联用户的id，自动@
            title: levels[idx].content,
            pic: '',
            language: 'zh_cn'
        }
        var paramArr = [];
        for (var i in _param) {
            if (_param[i]) {
                paramArr.push(i + '=' + encodeURIComponent(_param[i]));
            }
        }
        var url = "http://service.weibo.com/share/share.php?" + paramArr.join('&');
        var height = 100;
        var width = 400;
        var left = (screen.width - width) / 2;
        var top = (screen.height - height) / 2;
        window.open(url, 'newwindow', 'height=' + height + ',width=' + width + ',left=' + left + ',top=' + top); 

        // Log weibo level
        bkgLog({
            type: 'zhishitupuweibo',
            target: idx.toString()
        });
    }

    zrUtil.inherits(HeaderBar, Component);

    return HeaderBar;
});