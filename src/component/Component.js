define(function (require) {

    var Component = function () {
        this.el = document.createElement('div');
    };

    Component.prototype.type = 'COMPONENT';

    Component.prototype.initialize = function (kg) {
    }

    Component.prototype.resize = function (w, h) {
        // Not implemented
    }

    return Component;
});