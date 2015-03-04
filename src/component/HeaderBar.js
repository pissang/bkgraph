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

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });
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

        util.addEventListener(this._$input, 'keyup', util.debounce(function (e) {
            var _$list = Sizzle('.bkg-search-list', this.el)[0];
            var _$items = Sizzle('.bkg-search-list li', this.el);

            var _$active = Sizzle('.bkg-search-list .bkg-active', this.el)[0];
            var index = 0;
            for (var i = 0, len = _$items.length; i < len; i++) {
                if (util.hasClass(_$items[i], 'bkg-active')) {
                    index = i;
                    break;
                }
            }
            switch(e.keyCode) {
                case 13: // enter
                    var _$activeLink = Sizzle('.bkg-search-list .bkg-active a', this.el)[0];
                    if (_$activeLink) {
                        window.open(_$activeLink.getAttribute('href'));
                    }
                    break;
                case 38: //up arrow
                    _$active && util.removeClass(_$active, 'bkg-active');
                    index--;
                    if (index < 0) {
                        index = len - 1;
                    }
                    util.addClass(_$items[index], 'bkg-active');
                    break;
                case 40: //down arrow
                    _$active && util.removeClass(_$active, 'bkg-active');
                    index++;
                    if (index > len - 1) {
                        index = 0;
                    }
                    util.addClass(_$items[index], 'bkg-active');
                    break;
                default:
                    self.filter(self._$input.value);
            }
        }, 200));

        util.addEventListener(Sizzle('body')[0], 'click', function (e) {
            var target = e.target || e.srcElement;
            var current = target;
            while (current && current.nodeName.toLowerCase() !== 'a') {
                current = current.parentNode;
            }
            if (!current) {
                self._$input.value = '';
                self._$searchResult.innerHTML = '';
                util.removeClass(self._$share, 'bkg-share-btn-active');
                util.addClass(self._$shareList, 'hidden');
                setTimeout(function () {
                    util.addClass(self._$shareList, 'bkg-hidden');
                }, 300);
            }
        });

        util.addEventListener(this._$searchResult, 'mouseover', function (e) {
            var target = e.target || e.srcElement;
            var current = target;
            while (current && current.nodeName.toLowerCase() !== 'li') {
                current = current.parentNode;
            }

            var _$active = Sizzle('.bkg-search-list .bkg-active', this.el)[0];
            if (_$active && current !== _$active) {
                util.removeClass(_$active, 'bkg-active');
                util.addClass(current, 'bkg-active');
            }
        });

        // share
        util.addEventListener(this._$share, 'click', function (e) {
            e.cancelBubble = true;
            e.stopPropagation && e.stopPropagation();

            if (util.hasClass(self._$shareList, 'hidden')) {
                util.removeClass(self._$shareList, 'bkg-hidden');
                setTimeout(function () {
                    util.removeClass(self._$shareList, 'hidden');
                }, 100);
                util.addClass(self._$share, 'bkg-share-btn-active');
            }
            else {
                util.addClass(self._$shareList, 'hidden');
                setTimeout(function () {
                    util.addClass(self._$shareList, 'bkg-hidden');
                }, 300);
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
        var nodata = '';
        if (name) {
            var url = this._kgraph.getDetailAPI();
            jsonp(url, { act: 'tpuser', mt: 'use', 'ver': 'v1', q: name }, 'callback', function (data) {
                renderData = {
                    entities: data.data || [],
                    name: name
                };
                self._$searchResult.innerHTML = renderSearchResult(renderData);

                if (!data.data) {
                    nodata = 'nodata';
                }

                bkgLog({
                    type: 'zhishitupusearch',
                    target: name,
                    area: 'headerbar',
                    extend: nodata
                });
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
    };

    HeaderBar.prototype._dispatchClick = function (e) {
        var target = e.target || e.srcElement;

        var current = target;
        while (current && current.nodeName.toLowerCase() !== 'a') {
            current = current.parentNode;
        }

        var fromid = this._kgraph.getRawData() && this._kgraph.getRawData().mainEntity.id;
        if (current) {
            var linkArea = current.getAttribute('data-area');
            bkgLog({
                type: 'zhishitupulink',
                target: [
                            fromid,
                            current.getAttribute('title'),
                            current.getAttribute('href')
                        ].join(','),
                area: 'headerbar-' + linkArea
            });
        }
    };

    zrUtil.inherits(HeaderBar, Component);

    return HeaderBar;
});