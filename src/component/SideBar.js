define(function (require) {
    
    var Component = require('./Component');
    var zrUtil = require('zrender/tool/util');
    var etpl = require('etpl');
    var Sizzle = require('Sizzle');
    var util = require('../util/util');
    var bkgLog = require('../util/log');

    var ScrollBar = require('../util/ScrollBar');

    etpl.compile(require('text!../html/sideBarModule.html'));
    // var renderEntityDetail = etpl.compile(require('text!../html/entityDetail.html'));
    // var renderRelationDetail = etpl.compile(require('text!../html/relationDetail.html'));
    var renderSidebarData = etpl.compile(require('text!../html/sidebar.html'));

    var SideBar = function () {

        Component.call(this);

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._dispatchClick(e);
        });

        util.addEventListener(this.el, 'mouseenter', function (e) {
            bkgLog({
                type: 'zhishitupuhover',
                target: self._logParam,
                area: 'sidebar'
            });
        });
    }

    SideBar.prototype.type = 'SIDEBAR';

    SideBar.prototype.initialize = function (kg, rawData) {
        this.el.className = 'bkg-sidebar hidden';

        this._$wrapper = document.createElement('div');
        this._$wrapper.className = 'bkg-sidebar-wrapper';
        this.el.appendChild(this._$wrapper);

        this._$closeBtn = document.createElement('div');
        this._$closeBtn.className = 'bkg-sidebar-close';
        this.el.appendChild(this._$closeBtn);

        this._kgraph = kg;

        // 默认显示主要实体
        // var graphMain = this._kgraph.getComponentByType('GRAPH');
        // graphMain.showEntityDetail(rawData.mainEntity, false);

        // var headerBar = kg.getComponentByType('HEADERBAR');
        // if (headerBar) {
        //     this.el.style.top = headerBar.el.clientHeight + 'px';
        // }

        return this.el;
    }

    SideBar.prototype.resize = function (w, h) {

        var maxheight = h - this._$intro.clientHeight - 100;

        if (this._$viewport.clientHeight > maxheight) {
            if (this._scrollbar) {
                this._$viewport.style.height = maxheight + 'px';
            }
            else {

            }
        }
        else {
            if (this._scrollbar) {
                this._$viewport.style.height = maxheight + 'px';
            }
            else {

            }
        }
        this._scrollbar && this._scrollbar.resize();
    };

    SideBar.prototype.setData = function (data, isRelation) {
        this._fixData(data, isRelation);
        this.render(data, isRelation);
    };

    SideBar.prototype._fixData = function (data, isRelation) {
        if (data._isfixed) {
            return;
        }
        // add year data for mailuo
        if (isRelation && data.eventMaiLuo) {
            var year = 0;
            for (var i = 0, len = data.eventMaiLuo.length; i < len; i++) {
                var mailuo = data.eventMaiLuo[i];
                var time = mailuo.publishTime;
                var newyear = time.substring(0, time.indexOf('-'));
                mailuo.publishTime = time.substring(time.indexOf('-') + 1, time.length);
                if (year != newyear) {
                    year = newyear;
                    mailuo.year = newyear;
                }
            }
        }

        // tag auto layout handle
        var tagWordLen = linenum = 0;
        var lastLineNum = -1;
        var tagWordLenDic = {};
        var tagData;

        var tags = data.singleTag || data.pairTag;
        if (tags) {
            for (var i = 0, len = tags.length; i < len; i++) {
                tagData = tags[i];
                if (tagWordLen < 9) {
                    tagWordLen += tagData.text.length;
                }
                else {
                    linenum ++;
                    tagWordLen = tagData.text.length;
                }
                tagData.linenum = linenum;
                tagWordLenDic[linenum] = tagWordLen;
                if (linenum >= 3) {
                    break;
                }
            }
            for (var i = 0, len = tags.length; i < len; i++) {
                tagData = tags[i];
                if (tagData.linenum < 3) {
                    tagData.width = Math.floor(tagData.text.length * 298 / (tagWordLenDic[tagData.linenum])) + 'px';
                }
                if (tagData.linenum != lastLineNum) {
                    tagData.cls = ' no-left-border ';
                }
                if (tagData.linenum == 2 || linenum == tagData.linenum) {
                    tagData.cls = (tagData.cls || '') + ' no-bottom-border';
                }

                lastLineNum = tagData.linenum;
            }
        }

        // 关系推荐无图临时替代
        if (isRelation && data.recommendation) {
            tags = data.recommendation.content;
            tagWordLen = linenum = 0;
            lastLineNum = -1
            for (var i = 0, len = tags.length; i < len; i++) {
                tagData = tags[i];
                if (tagWordLen < 12) {
                    tagWordLen += tagData.fromName.length + tagData.toName.length + 1;
                }
                else {
                    linenum ++;
                    tagWordLen = tagData.fromName.length + tagData.toName.length + 1;
                }
                tagData.linenum = linenum;
                tagWordLenDic[linenum] = tagWordLen;
                if (linenum >= 3) {
                    break;
                }
            }
            for (var i = 0, len = tags.length; i < len; i++) {
                tagData = tags[i];
                if (tagData.linenum < 3) {
                    tagData.width = Math.floor((tagData.fromName.length + tagData.toName.length + 1) * 298 / (tagWordLenDic[tagData.linenum])) + 'px';
                }
                if (tagData.linenum != lastLineNum) {
                    tagData.cls = ' no-left-border ';
                }
                if (tagData.linenum == 2 || linenum == tagData.linenum) {
                    tagData.cls = (tagData.cls || '') + ' no-bottom-border';
                }
                lastLineNum = tagData.linenum;
            }
        }

        data._isfixed = true;
    };

    SideBar.prototype.render = function (data, isRelation) {
        if (isRelation) {
            // this._$content.innerHTML = renderRelationDetail(data);
            this._logParam = [
                                // from entity
                                data.fromID,
                                data.fromEntity.layerCounter,
                                // to entity
                                data.toID,
                                data.toEntity.layerCounter,
                                data.id,
                                data.isExtra ? 1 : 0,
                                data.isSpecial ? 1 : 0
                            ].join(',');
        } else {
            // this._$content.innerHTML = renderEntityDetail(data);
            this._logParam = data.id + ',' + data.layerCounter;
        }
        data.isRelation = isRelation;
        this._$wrapper.innerHTML = renderSidebarData(data);

        this._$intro = Sizzle('.bkg-sidebar-intro', this.el)[0];
        this._$introTag = Sizzle('.bkg-intro-tag', this.el)[0];
        this._$toggle = Sizzle('.bkg-toggle', this.el)[0];
        this._$fold = Sizzle('.bkg-sidebar-fold', this.el)[0];
        this._$viewport = Sizzle('.bkg-sidebar-viewport', this.el)[0];
        this._$content = Sizzle('.bkg-sidebar-content', this.el)[0];

        // TODO
        var $relationName = Sizzle('.bkg-relation-name span', this.el)[0];
        if ($relationName) {
            $relationName.style.top = - $relationName.clientHeight - 10 + 'px';
        }
    };

    /**
     * 显示边栏
     */
    SideBar.prototype.show = function (logParam) {
        if (util.hasClass(this.el, 'hidden')) {
            util.removeClass(this.el, 'hidden');

            // 图谱部分左移
            // var graphMain = this._kgraph.getComponentByType('GRAPH');
            // if (graphMain) {
            //     graphMain.el.style.left = -(this.el.clientWidth / 2) + 'px';
            // }

            // this._$toggleBtn.innerHTML = '隐<br />藏<br />>';

            // 搜索栏自动隐藏
            var searchBar = this._kgraph.getComponentByType('SEARCHBAR');
            if (searchBar) {
                searchBar.hide(logParam);
            }
        }

        bkgLog({
            type: 'zhishitupushow',
            target: logParam,
            area: 'sidebar'
        });
    };

    /**
     * 隐藏边栏
     */
    SideBar.prototype.hide = function (logParam) {
        if (!util.hasClass(this.el, 'hidden')) {
            util.addClass(this.el, 'hidden');

            // var graphMain = this._kgraph.getComponentByType('GRAPH');
            // if (graphMain) {
            //     graphMain.el.style.left = '0px';
            // }

            bkgLog({
                type: 'zhishitupuhide',
                target: logParam,
                area: 'sidebar'
            });

            // this._$toggleBtn.innerHTML = '显<br />示<br /><';
        }
    };

    /**
     * 切换边栏的显示隐藏
     */
    SideBar.prototype.toggle = function (logParam) {
        if (util.hasClass(this.el, 'hidden')) {
            this.show(logParam);
        }
        else {
            this.hide(logParam);
        }
    };

    /**
     * 收起边栏
     */
    SideBar.prototype.fold = function (logParam) {
        if (!util.hasClass(this._$fold, 'bkg-hidden')) {
            util.removeClass(this._$toggle, 'bkg-toggle-fold');
            util.addClass(this._$fold, 'bkg-hidden');

            this._forScroll(true);
        }
    };

    /**
     * 展开边栏
     */
    SideBar.prototype.unfold = function (logParam) {
        if (util.hasClass(this._$fold, 'bkg-hidden')) {
            util.addClass(this._$toggle, 'bkg-toggle-fold');
            util.removeClass(this._$fold, 'bkg-hidden');

            this._forScroll();
        }
    };

    SideBar.prototype._forScroll = function (isFold) {
        if (isFold && this._scrollbar) {
            this._scrollbar.scrollTo(0);
            if (this._$viewport.style.height) {
                this._$viewport.style.height = this._$content.clientHeight + 'px';
                this._scrollbar.destory();
            }
        }
        else {
            var maxheight = document.body.clientHeight - this._$intro.clientHeight - 100;

            if (this._$content.clientHeight > maxheight) {
                this._$viewport.style.height = maxheight + 'px';

                this._scrollbar = new ScrollBar(this._$content);
                this._scrollbar.scrollTo(0);
                this._scrollbar.resize();
            }
        }

    };

    /**
     * 切换边栏的展开与收起
     */
    SideBar.prototype.toggleFold = function (logParam) {
        if (util.hasClass(this._$fold, 'bkg-hidden')) {
            this.unfold(logParam);
        }
        else {
            this.fold(logParam);
        }
    };

    SideBar.prototype._dispatchClick = function (e) {
        var target = e.target || e.srcElement;
        if (Sizzle.matchesSelector(target, '.bkg-sidebar-close')) {
            this.toggle(this._logParam);
        }

        if (Sizzle.matchesSelector(target, '.bkg-toggle') || Sizzle.matchesSelector(target, '.bkg-toggle-btn')) {
            this.toggleFold(this._logParam);
        }

        var current = target;
        while (current && current.nodeName.toLowerCase() !== 'a') {
            current = current.parentNode;
        }

        if (current) {
            var linkArea = current.getAttribute('data-area');
            bkgLog({
                type: 'zhishitupulink',
                target: [
                            this._logParam,
                            current.getAttribute('title'),
                            current.getAttribute('href')
                        ].join(','),
                area: 'sidebar-' + linkArea
            });
        }
    };

    zrUtil.inherits(SideBar, Component);

    return SideBar;
});