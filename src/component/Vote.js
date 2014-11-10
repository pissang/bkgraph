define(function (require) {

    var Sizzle = require('Sizzle');
    var zrUtil = require('zrender/tool/util');
    var util = require('../util/util');
    var jsonp = require('../util/jsonp');
    var etpl = require('etpl');
    var bkgLog = require('../util/log');

    var ScrollList = require('../util/ScrollList');
    var ScrollBar = require('../util/ScrollBar');

    var config = require('../config');
    var api = config.voteAPI;
    var projectName = config.voteProjectHuoying;

    etpl.compile(require('text!../html/vote.html'));

    var Vote = function (flag, dom, data, scrollBar) {

        this._dom = dom;

        this._data = zrUtil.clone(data);

        if(scrollBar) {
            this._scrollbar = scrollBar;
        }

        if (flag == 'pk') {
            this.addPKBar();
        }
        else if (flag == 'list') {
            this.addRankingList();
        }

        var self = this;
        util.addEventListener(dom, 'click', function (e) {
            self._dispatchClick(e);
        });
    };

    Vote.prototype._dispatchClick = function (e) {
        var target = e.target || e.srcElement;

        var current = target;
        while (current && current.nodeName.toLowerCase() !== 'div') {
            current = current.parentNode;
        }

        if(util.hasClass(current, 'bkg-person-vote-default')) {

            var $voteList = Sizzle('.bkg-person-vote-list', this._dom)[0];

            var $arrow = Sizzle('.arrow', current)[0];
            
            if(util.hasClass($arrow, 'hide')) {
                util.removeClass($arrow, 'hide');
                util.removeClass($voteList, 'hide');

                var top = (this._data.index - 1) * 21;
                top = top > 0 ? top : 0;
                this._scrollList.scrollTo(top);

                bkgLog('votelist', this._data.name);
            } 
            else {
                util.addClass($arrow, 'hide');
                util.addClass($voteList, 'hide');
            }

        }

        if(util.hasClass(target, 'bkg-vote-icon')
            && !util.hasClass(target, 'disable')
        ) {
            util.addClass(target, 'disable');
            this.vote(target);
        }

    };

    Vote.prototype.addPKBar = function () {

        var self = this;

        var fromNameVoteTime = localStorage['BKGraph_person_' + this._data.fromName + '_voted_0'];
        var toNameVoteTime = localStorage['BKGraph_person_' + this._data.toName + '_voted_0'];

        if(fromNameVoteTime 
            && new Date(fromNameVoteTime).getDate() == new Date().getDate()
        ) {
            this._personFromVoted = 1;
        }
        if(toNameVoteTime 
            && new Date(toNameVoteTime).getDate() == new Date().getDate()
        ) {
            this._personToVoted = 1;
        }
        
        this._data.isPersonFromVoted = this._personFromVoted ? 'disable' : '';
        this._data.isPersonToVoted = this._personToVoted ? 'disable' : '';

        var renderPKBar = etpl.getRenderer('relationPKBar');

        var param = {
            flag: 'result',
            project: projectName,
            name: '["' + this._data.fromName + '","' + this._data.toName + '"]'
        };
        jsonp(api, param, 'cb', function (votedata) {

            var pkdata = votedata.data;
            var votingleft = 30;
            for(var i = 0, len = pkdata.length; i < len; i++) {
                if(self._data.fromName == pkdata[i].name) {
                    self._data.fromResult = pkdata[i].num;
                    votingleft = pkdata[i].num / votedata.sum * 300;
                }
                if(self._data.toName == pkdata[i].name) {
                    self._data.toResult = pkdata[i].num;
                }
            }

            var params = [{
                project: projectName,
                offset: 0,
                limit: 200
            }];

            var getListParam = {
                flag: 'list',
                params: JSON.stringify(params)
            };

            jsonp(api, getListParam, 'cb', function(listdata) {
                
                listdata = listdata.data[0];

                var votelist = self._getSortedList(listdata);

                for(var i = 0, len = votelist.length; i < len; i++) {
                    if(votelist[i].name == self._data.fromName) {
                        self._data.fromIndex = i + 1;
                    }
                    if(votelist[i].name == self._data.toName) {
                        self._data.toIndex = i + 1;
                    }
                }

                self._dom.innerHTML = renderPKBar(self._data);

                var $votingBg = Sizzle('.bkg-relation-pk-bg', self._dom)[0];
                var $votingleft = Sizzle('.bkg-relation-pk-active', self._dom)[0];
                if($votingBg) {
                    $votingBg.style.width = votingleft + 'px';
                }
                if($votingleft) {
                    $votingleft.style.left = votingleft + 'px';
                }
                
            });
        
        });
    };

    Vote.prototype.addRankingList = function () {

        var self = this;

        var personVoteTime = localStorage['BKGraph_person_' + this._data.name + '_voted_0']
        if(personVoteTime && new Date(personVoteTime).getDate() == new Date().getDate()) {
            this._personVoted = 1;
        }
        
        this._data.isPersonVoted = this._personVoted ? 'disable' : '';

        var renderPersonVote = etpl.getRenderer('personVote');

        var params = [{
            project: projectName,
            offset: 0,
            limit: 200
        }];

        var param = {
            flag: 'list',
            params: JSON.stringify(params)
        };

        jsonp(api, param, 'cb', function(votedata) {
            
            votedata = votedata.data[0];

            var votelist = self._getSortedList(votedata);

            for(var i = 0, len = votelist.length; i < len; i++) {
                if(votelist[i].name == self._data.name) {
                    self._data.index = i + 1;
                }
            }

            self._data.votelist = votelist;

            if(!self._data.result) {
                self._data.result = 0;
            }

            self._dom.innerHTML = renderPersonVote(self._data);

            var scrollList = new ScrollList("bkg-person-list", "bkg-person-list-pre", "bkg-person-list-next");

            self._scrollList = scrollList;

            if(self._scrollbar && self._scrollbar instanceof ScrollBar) {
                self._scrollbar.resize();
            }
            
        });
        
    };

    Vote.prototype.vote = function (dom) {

        var self = this;
        var name = dom.getAttribute('data-name');

        var param = {
            flag: 'vote',
            project: projectName,
            name: name
        };

        jsonp(api, param, 'cb', function(votedata) {

            if(votedata.status != 0) {
                return;
            }

            var parent = dom.parentNode.parentNode;

            if (util.hasClass(parent, 'bkg-person-vote')) {
                
                localStorage['BKGraph_person_' + name + '_voted_0'] = new Date();
                
                self.addRankingList();

            } 
            else if (util.hasClass(parent, 'bkg-relation-pk-voting')) {

                localStorage['BKGraph_person_' + name + '_voted_0'] = new Date();

                self.addPKBar();
                
            }

            bkgLog('personvote', name);
        });
        
    };

    Vote.prototype._getSortedList = function (data) {

        var self = this;

        var votelist = [];

        for(var item in data) {
            if(self._data.name == item) {
                self._data.result = data[item];
            }
            var voteItem = {
                name: item,
                num: data[item]
            };
            votelist.push(voteItem);
        }

        votelist.sort(function (a, b) {
            return parseInt(b.num, 0) - parseInt(a.num, 0);
        });

        for(var i = 0, len = votelist.length; i < len; i++) {
            votelist[i].index = i + 1;
        }

        return votelist;
    };

    return Vote;
});