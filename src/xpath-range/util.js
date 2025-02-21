"use strict";

var util = require('../util');
var $ = util.$;

var NodeTypes = {
  ELEMENT_NODE: 1,
  ATTRIBUTE_NODE: 2,
  TEXT_NODE: 3,
  CDATA_SECTION_NODE: 4,
  ENTITY_REFERENCE_NODE: 5,
  ENTITY_NODE: 6,
  PROCESSING_INSTRUCTION_NODE: 7,
  COMMENT_NODE: 8,
  DOCUMENT_NODE: 9,
  DOCUMENT_TYPE_NODE: 10,
  DOCUMENT_FRAGMENT_NODE: 11,
  NOTATION_NODE: 12
};

function getFirstTextNodeNotBefore(n) {
  var result;
  switch (n.nodeType) {
    case NodeTypes.TEXT_NODE:
      return n;
    case NodeTypes.ELEMENT_NODE:
      if (n.firstChild != null) {
        result = getFirstTextNodeNotBefore(n.firstChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.nextSibling;
  if (n != null) {
    return getFirstTextNodeNotBefore(n);
  } else {
    return null;
  }
};

function getLastTextNodeUpTo(n) {
  var result;
  switch (n.nodeType) {
    case NodeTypes.TEXT_NODE:
      return n;
    case NodeTypes.ELEMENT_NODE:
      if (n.lastChild != null) {
        result = getLastTextNodeUpTo(n.lastChild);
        if (result != null) {
          return result;
        }
      }
      break;
  }
  n = n.previousSibling;
  if (n != null) {
    return getLastTextNodeUpTo(n);
  } else {
    return null;
  }
};

function getTextNodes(jq) {
  var getTextNodes;
  getTextNodes = function(node) {
    var nodes;
    if (node && node.nodeType !== NodeTypes.TEXT_NODE) {
      nodes = [];
      if (node.nodeType !== NodeTypes.COMMENT_NODE) {
        node = node.lastChild;
        while (node) {
          nodes.push(getTextNodes(node));
          node = node.previousSibling;
        }
      }
      return nodes.reverse();
    } else {
      return node;
    }
  };
  return jq.map(function() {
    return flatten(getTextNodes(this));
  });
};

function getGlobal() {
  return (function() {
    return this;
  })();
};

function contains(parent, child) {
  var node;
  node = child;
  while (node != null) {
    if (node === parent) {
      return true;
    }
    node = node.parentNode;
  }
  return false;
};

function flatten(array) {
  var flatten;
  flatten = function(ary) {
    var el, flat, _i, _len;
    flat = [];
    for (_i = 0, _len = ary.length; _i < _len; _i++) {
      el = ary[_i];
      flat = flat.concat(el && $.isArray(el) ? flatten(el) : el);
    }
    return flat;
  };
  return flatten(array);
};

exports.NodeTypes = NodeTypes;
exports.getFirstTextNodeNotBefore = getFirstTextNodeNotBefore;
exports.getLastTextNodeUpTo = getLastTextNodeUpTo;
exports.getTextNodes = getTextNodes;
exports.getGlobal = getGlobal;
exports.contains = contains;
exports.flatten = flatten;
