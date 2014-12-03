define(function (require) {
    
    var supportCanvas = document.createElement('canvas').getContext;
    
    var util = {
        indexOf: function (array, value) {
            if (array.indexOf) {
                return array.indexOf(value);
            }
            for (var i = 0, len = array.length; i < len; i++) {
                if (array[i] === value) {
                    return i;
                }
            }
            return -1;
        },

        bind: function (func, context) {
            if (func.bind) {
                return func.bind(context);
            }
            else {
                return function () {
                    func.apply(context, arguments);
                }
            }
        },

        _mouseFn: {}, //保存“onmouseenter”和“onmouseleave”所绑定的方法

        _mouseHandle: function (fn) {
            // 转换方法，符合条件时才会执行
            var func = function (event) {
                var target = event.target;
                var parent = event.relatedTarget;
                while(parent && parent != this){
                    try {
                        parent = parent.parentNode;
                    }
                    catch (e) {
                        break;
                    }
                }
                // 只有当相关节点跟绑定节点不是父子关系时才调用fn
                ( parent != this ) && (fn.call(target, event));
            };
            return func;
        },

        addEventListener: function (el, name, func, useCapture) {
            if (window.addEventListener) {

                if (el.onmouseenter !== undefined){
                    //for opera11，firefox10
                    el.addEventListener(name, func, useCapture);
                    return;
                }
                if (name == "mouseenter" || name == "mouseleave"){
                    var ename = (name == "mouseenter") ? "mouseover" : "mouseout";
                    var fnNew = this._mouseHandle(func);
                    el.addEventListener(ename, fnNew, useCapture);
                     /* 将方法存入this._mouseFn，以便以后remove */
                    if(!this._mouseFn[el]) this._mouseFn[el] = {};
                    if(!this._mouseFn[el][ename]) this._mouseFn[el][ename] = {};
                    this._mouseFn[el][ename][func] = fnNew;
                }
                else {
                    el.addEventListener(name, func, useCapture);
                }
            }
            else {
                el.attachEvent('on' + name, func);
            }
        },

        removeEventListener: function (el, name, func, useCapture) {
            if (window.removeEventListener) {
                if (el.onmouseenter !== undefined) {
                    el.removeEventListener(name, fn, useCapture);
                    return;
                }
                if (name == "mouseenter" || name == "mouseleave" ) {
                    var ename = (name == "mouseenter") ? "mouseover" : "mouseout";
                    if(!events._mouseFn[el][ename][fn]) return;
                    el.removeEventListener(ename, events._mouseFn[el][ename][fn], useCapture);
                    events._mouseFn[el][ename][fn] = null;
                }
                else {
                    el.removeEventListener(name, fn, useCapture);
                }
            }
            else {
                el.detachEvent('on' + name, func);
            }
        },

        getStyle: function (el, name) {
            var style;
            if (window.getComputedStyle) {
                style = window.getComputedStyle(el, null);
            }
            else if (document.documentElement.currentStyle) {
                style = el.currentStyle;
            }
            if (name) {
                return style[name];
            }
            else {
                return style;
            }
        },

        addClass: function (el, className) {
            if (el.classList) {
                el.classList.add(className);
            }
            else {
                if (el.className.indexOf(className) < 0) {
                    el.className += ' ' + className;
                }
            }
        },

        removeClass: function (el, className) {
            if (el.classList) {
                el.classList.remove(className);
            }
            else {
                el.className = el.className.replace(className, '');
            }
        },

        hasClass: function (el, className) {
            if (el.classList) {
                return el.classList.contains(className);
            }
            else {
                return el.className.indexOf(className) >= 0;
            }
        },

        debounce: function (func, wait) {
            var timeout;

            return function () {
                var context = this, args = arguments;
                var later = function () {
                    timeout = null;
                    func.apply(context, args);
                }
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            }
        },

        truncate: function (str, len, tail) {
            if (str.length > len) {
                tail = tail == null ? '…' : tail;
                return str.substring(0, len - tail.length) + tail;
            }
            return str;
        },

        trim: function (str) {
            return str.replace(/^\s+|\s+$/g, '');
        },

        supportCanvas: function () {
            return supportCanvas;
        },

        getURLSearch: function() {
            var search = window.location.search;
            var obj = {};
            if (search) {
                search = search.slice(util.indexOf(search, '?') + 1);
                var params = search.split('&');
                for (var i = 0; i < params.length; i++) {
                    var keyValue = params[i].split('=');
                    var key = decodeURIComponent(keyValue[0]);
                    var value = decodeURIComponent(keyValue[1]);
                    obj[key] = value;
                }
            }

            return obj;
        }
    }

    return util;
});