define(function (require) {

    var Component = require('./Component');
    var util = require('../util/util');
    var Sizzle = require('Sizzle');

    var Feedback = function (el) {

        Component.call(this);

        this.el = el;

        this.resize = function (w, h) {
            var _$wizard = Sizzle('.fb-baidu-wizard')[0];
            var _$dialog = Sizzle('.fb-feedback-right-dialog')[0];
            
            if (_$wizard) {
                _$wizard.style.width = w + 'px';
                _$wizard.style.height = h + 'px';
            }
            if (_$dialog) {
                _$dialog.style.top = (h - 450) / 2 + 'px';
                _$dialog.style.left = (w - 450) / 2 + 'px';
            }
        };

        var self = this;
        util.addEventListener(this.el, 'click', function (e) {
            self._loadRightBar();
        });
    };

    /**
      * @function :第一次加载插件，之后调用插件
      */
    Feedback.prototype._init_feedback = function () {

        if (bds && bds.qa && bds.qa.ShortCut && bds.qa.ShortCut.initRightBar) {
            //初始化反馈插件的样式参数（可以参考样式定制的api）
            var fb_options = {
                // product_id: 0,
                plugintitle: '意见反馈',
                issueTips: '请反馈您的问题或者建议',
                issuePlaceholder: '欢迎提出您在使用过程中遇到的问题或宝贵建议(400字以内)',
                emailPlaceholder: '留下您的邮箱，便于我们及时回复您。',
                guide: '',
                cutFileTips: '上传问题图片，图片大小不超过3M',
                cutCanvasTips: '点我可以在当前页面标记问题哦',
                emailTips: '联系方式',

                needIssueTips: true,
                needIssue: true,
                needCut: true,
                needEmail: true,
                needGuide: false,

                showPosition: 'center',     // right ,center ,top 三种样式可供选择。
                onlyUpFile: false,

                // cutImg: 'biaoji_tupu.png',     //上传和截图的图标样式定制
                upImg: 'upload_btn.png',

                skinStyle: 'tupu'
            };
            bds.qa.ShortCut.initRightBar(fb_options);

            //初始化产品线需要获取的参数（具体参数定义参见数据定制api）
            //注意：json的标题必须是规范json写法，双引号，最后无逗号
            var pro_data = {
                'product_id': '129', //必填
                'username': '',
                'query': '',
                'version': '1.0'
            };
            bds.qa.ShortCut._getProData(pro_data);
        }
    };

    /**
      * @function :校验js加载完成
      * @returns :{boolean}
      */
    Feedback.prototype._loadRightBar = function () {
        if (window.bds && window.bds.qa && window.bds.qa.ShortCut) {
            this._init_feedback();
        } else {
            //注意：如果页面编码是gbk ，调用插件的地址为http://f3.baidu.com/feedback/js/feedback/feedback-gbk.js
            var self = this;
            this._loadScript('http://f3.baidu.com/feedback/js/feedback/feedback0.0.2.js', function () {
                self._init_feedback();
            }, {
                charset: 'utf-8',    //根据自己的编码做出相应的变化
                id: 'feedback_script'
            });
        }
    };

    /**
      * @function :页面加载脚本判定函数，如果自身有则不用加载
      */
    Feedback.prototype._loadScript = function (url, callback, opt) {
        var script = document.createElement('script');
        var opt = opt || {};
        script.type = 'text/javascript';
        if (opt.charset) {
            script.charset = opt.charset;
        }
        if (opt.id) {
            script.id = opt.id;
        }

        if (script.readyState) {
            script.onreadystatechange = function () {
                if (script.readyState == 'loaded' || script.readyState == 'complete') {
                    script.onreadystatechange = null;
                    callback();
                }
            };
        } else {
            script.onload = function () {
                callback();
            };
        }
        script.src = url;
        document.body.appendChild(script);
    };

    return Feedback;
});
