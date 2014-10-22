define(function (require) {
'use strict';

    var cookies = function (key, value, options) {
        return arguments.length === 1 ?
            cookies.get(key) : cookies.set(key, value, options);
    };

    // Allows for setter injection in unit tests
    cookies._document = document;
    cookies._navigator = navigator;

    cookies.defaults = {
        path: '/'
    };

    cookies.get = function (key) {
        if (cookies._cachedDocumentCookie !== cookies._document.cookie) {
            cookies._renewCache();
        }

        return cookies._cache[key];
    };

    cookies.set = function (key, value, options) {
        options = cookies._getExtendedOptions(options);
        options.expires = cookies._getExpiresDate(value === undefined ? -1 : options.expires);

        cookies._document.cookie = cookies._generateCookieString(key, value, options);

        return cookies;
    };

    cookies.expire = function (key, options) {
        return cookies.set(key, undefined, options);
    };

    cookies._getExtendedOptions = function (options) {
        return {
            path: options && options.path || cookies.defaults.path,
            domain: options && options.domain || cookies.defaults.domain,
            expires: options && options.expires || cookies.defaults.expires,
            secure: options && options.secure !== undefined ?  options.secure : cookies.defaults.secure
        };
    };

    cookies._isValidDate = function (date) {
        return Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date.getTime());
    };

    cookies._getExpiresDate = function (expires, now) {
        now = now || new Date();
        switch (typeof expires) {
            case 'number': expires = new Date(now.getTime() + expires * 1000); break;
            case 'string': expires = new Date(expires); break;
        }

        if (expires && !cookies._isValidDate(expires)) {
            throw new Error('`expires` parameter cannot be converted to a valid Date instance');
        }

        return expires;
    };

    cookies._generateCookieString = function (key, value, options) {
        key = key.replace(/[^#$&+\^`|]/g, encodeURIComponent);
        key = key.replace(/\(/g, '%28').replace(/\)/g, '%29');
        value = (value + '').replace(/[^!#$&-+\--:<-\[\]-~]/g, encodeURIComponent);
        options = options || {};

        var cookieString = key + '=' + value;
        cookieString += options.path ? ';path=' + options.path : '';
        cookieString += options.domain ? ';domain=' + options.domain : '';
        cookieString += options.expires ? ';expires=' + options.expires.toUTCString() : '';
        cookieString += options.secure ? ';secure' : '';

        return cookieString;
    };

    cookies._getCookieObjectFromString = function (documentCookie) {
        var cookieObject = {};
        var cookiesArray = documentCookie ? documentCookie.split('; ') : [];

        for (var i = 0; i < cookiesArray.length; i++) {
            var cookieKvp = cookies._getKeyValuePairFromCookieString(cookiesArray[i]);

            if (cookieObject[cookieKvp.key] === undefined) {
                cookieObject[cookieKvp.key] = cookieKvp.value;
            }
        }

        return cookieObject;
    };

    cookies._getKeyValuePairFromCookieString = function (cookieString) {
        // "=" is a valid character in a cookie value according to RFC6265, so cannot `split('=')`
        var separatorIndex = cookieString.indexOf('=');

        // IE omits the "=" when the cookie value is an empty string
        separatorIndex = separatorIndex < 0 ? cookieString.length : separatorIndex;

        return {
            key: decodeURIComponent(cookieString.substr(0, separatorIndex)),
            value: decodeURIComponent(cookieString.substr(separatorIndex + 1))
        };
    };

    cookies._renewCache = function () {
        cookies._cache = cookies._getCookieObjectFromString(cookies._document.cookie);
        cookies._cachedDocumentCookie = cookies._document.cookie;
    };

    cookies._areEnabled = function () {
        var testKey = 'cookies.js';
        var areEnabled = cookies.set(testKey, 1).get(testKey) === '1';
        cookies.expire(testKey);
        return areEnabled;
    };

    cookies.enabled = cookies._areEnabled();

    return cookies;
});