// Disable cyclomatic complexity checking for this file
// jshint -W074

var xpath = require('../src/xpath-range/xpath');

var util = require('../src/util');
var $ = util.$;

function contains(parent, child) {
    var node;
    node = child;
    while (node !== null) {
        if (node === parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
}

function MockSelection(fixElem, data) {
    this.rangeCount = 0;
    this.isCollapsed = false;
    this.root = fixElem;
    this.rootXPath = xpath.fromNode($(fixElem))[0];
    this.startContainer = this.resolvePath(data[0]);
    this.startOffset = data[1];
    this.endContainer = this.resolvePath(data[2]);
    this.endOffset = data[3];
    this.expectation = data[4];
    this.description = data[5];
    this.commonAncestor = this.startContainer;

    while (!contains(this.commonAncestor, this.endContainer)) {
        this.commonAncestor = this.commonAncestor.parentNode;
    }
    this.commonAncestorXPath = xpath.fromNode($(this.commonAncestor))[0];

    this.ranges = [];
    this.addRange({
        startContainer: this.startContainer,
        startOffset: this.startOffset,
        endContainer: this.endContainer,
        endOffset: this.endOffset,
        commonAncestorContainer: this.commonAncestor
    });
}

MockSelection.prototype.getRangeAt = function (i) {
    return this.ranges[i];
};

MockSelection.prototype.removeAllRanges = function () {
    this.ranges = [];
    this.rangeCount = 0;
};

MockSelection.prototype.addRange = function (r) {
    this.ranges.push(r);
    this.rangeCount += 1;
};

MockSelection.prototype.resolvePath = function (path) {
    var xpath = this.rootXPath + path;
    return document.evaluate(xpath, document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
};


var fixtureElem = $('<div id="fixtures"></div>').appendTo('body')[0];
var fixtureMemo = {};

function setFixtureElem(elem) {
    fixtureElem = elem;
}

function fix() {
    return fixtureElem;
}

function getFixture(fname) {
    if (!(fname in fixtureMemo)) {
        fixtureMemo[fname] = $.ajax({
            url: "/base/test/fixtures/" + fname + ".html",
            async: false
        }).responseText;
    }
    return fixtureMemo[fname];
}

function addFixture(fname) {
    $(getFixture(fname)).appendTo(fixtureElem);
}

function clearFixtures() {
    $(fixtureElem).remove();
    fixtureElem = $('<div id="fixtures"></div>').appendTo('body')[0];
}


exports.MockSelection = MockSelection;
exports.addFixture = addFixture;
exports.clearFixtures = clearFixtures;
exports.fix = fix;
exports.getFixture = getFixture;
exports.setFixtureElem = setFixtureElem;
