"use strict";

var
  __hasProp = {}.hasOwnProperty,
  __extends = function(child, parent) { for (var key in parent) { if (__hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; };

var xpath = require('./xpath');

var Util = require('./util');

var util = require('../util');
var $ = util.$;

function sniff(r) {
  if (r.commonAncestorContainer != null) {
    return new BrowserRange(r);
  } else if (typeof r.start === "string") {
    return new SerializedRange(r);
  } else if (r.start && typeof r.start === "object") {
    return new NormalizedRange(r);
  } else {
    console.error("Could not sniff range type");
    return false;
  }
};

var RangeError = (function(_super) {
  __extends(RangeError, _super);

  function RangeError(type, message, parent) {
    this.type = type;
    this.message = message;
    this.parent = parent != null ? parent : null;
    RangeError.__super__.constructor.call(this, this.message);
  }

  return RangeError;

})(Error);

var BrowserRange = (function() {
  function BrowserRange(obj) {
    this.commonAncestorContainer = obj.commonAncestorContainer;
    this.startContainer = obj.startContainer;
    this.startOffset = obj.startOffset;
    this.endContainer = obj.endContainer;
    this.endOffset = obj.endOffset;
  }

  BrowserRange.prototype.normalize = function(root) {
    var nr, r;
    if (this.tainted) {
      console.error("You may only call normalize() once on a BrowserRange!");
      return false;
    } else {
      this.tainted = true;
    }
    r = {};
    this._normalizeStart(r);
    this._normalizeEnd(r);
    nr = {};
    if (r.startOffset > 0) {
      if (r.start.nodeValue.length > r.startOffset) {
        nr.start = r.start.splitText(r.startOffset);
      } else {
        nr.start = r.start.nextSibling;
      }
    } else {
      nr.start = r.start;
    }
    if (r.start === r.end) {
      if (nr.start.nodeValue.length > (r.endOffset - r.startOffset)) {
        nr.start.splitText(r.endOffset - r.startOffset);
      }
      nr.end = nr.start;
    } else {
      if (r.end.nodeValue.length > r.endOffset) {
        r.end.splitText(r.endOffset);
      }
      nr.end = r.end;
    }
    nr.commonAncestor = this.commonAncestorContainer;
    while (nr.commonAncestor.nodeType !== Util.NodeTypes.ELEMENT_NODE) {
      nr.commonAncestor = nr.commonAncestor.parentNode;
    }
    return new NormalizedRange(nr);
  };

  BrowserRange.prototype._normalizeStart = function(r) {
    if (this.startContainer.nodeType === Util.NodeTypes.ELEMENT_NODE) {
      r.start = Util.getFirstTextNodeNotBefore(this.startContainer.childNodes[this.startOffset]);
      return r.startOffset = 0;
    } else {
      r.start = this.startContainer;
      return r.startOffset = this.startOffset;
    }
  };

  BrowserRange.prototype._normalizeEnd = function(r) {
    var n, node;
    if (this.endContainer.nodeType === Util.NodeTypes.ELEMENT_NODE) {
      node = this.endContainer.childNodes[this.endOffset];
      if (node != null) {
        n = node;
        while ((n != null) && (n.nodeType !== Util.NodeTypes.TEXT_NODE)) {
          n = n.firstChild;
        }
        if (n != null) {
          r.end = n;
          r.endOffset = 0;
        }
      }
      if (r.end == null) {
        if (this.endOffset) {
          node = this.endContainer.childNodes[this.endOffset - 1];
        } else {
          node = this.endContainer.previousSibling;
        }
        r.end = Util.getLastTextNodeUpTo(node);
        return r.endOffset = r.end.nodeValue.length;
      }
    } else {
      r.end = this.endContainer;
      return r.endOffset = this.endOffset;
    }
  };

  BrowserRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  return BrowserRange;

})();

var NormalizedRange = (function() {
  function NormalizedRange(obj) {
    this.commonAncestor = obj.commonAncestor;
    this.start = obj.start;
    this.end = obj.end;
  }

  NormalizedRange.prototype.normalize = function(root) {
    return this;
  };

  NormalizedRange.prototype.limit = function(bounds) {
    var nodes, parent, startParents, _i, _len, _ref;
    nodes = $.grep(this.textNodes(), function(node) {
      return node.parentNode === bounds || $.contains(bounds, node.parentNode);
    });
    if (!nodes.length) {
      return null;
    }
    this.start = nodes[0];
    this.end = nodes[nodes.length - 1];
    startParents = $(this.start).parents();
    _ref = $(this.end).parents();
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      parent = _ref[_i];
      if (startParents.index(parent) !== -1) {
        this.commonAncestor = parent;
        break;
      }
    }
    return this;
  };

  NormalizedRange.prototype.serialize = function(root, ignoreSelector) {
    var end, serialization, start;
    serialization = function(node, isEnd) {
      var n, nodes, offset, origParent, path, textNodes, _i, _len;
      if (ignoreSelector) {
        origParent = $(node).parents(":not(" + ignoreSelector + ")").eq(0);
      } else {
        origParent = $(node).parent();
      }
      path = xpath.fromNode(origParent, root)[0];
      textNodes = Util.getTextNodes(origParent);
      nodes = textNodes.slice(0, textNodes.index(node));
      offset = 0;
      for (_i = 0, _len = nodes.length; _i < _len; _i++) {
        n = nodes[_i];
        offset += n.nodeValue.length;
      }
      if (isEnd) {
        return [path, offset + node.nodeValue.length];
      } else {
        return [path, offset];
      }
    };
    start = serialization(this.start);
    end = serialization(this.end, true);
    return new SerializedRange({
      start: start[0],
      end: end[0],
      startOffset: start[1],
      endOffset: end[1]
    });
  };

  NormalizedRange.prototype.text = function() {
    var node;
    return ((function() {
      var _i, _len, _ref, _results;
      _ref = this.textNodes();
      _results = [];
      for (_i = 0, _len = _ref.length; _i < _len; _i++) {
        node = _ref[_i];
        _results.push(node.nodeValue);
      }
      return _results;
    }).call(this)).join('');
  };

  NormalizedRange.prototype.textNodes = function() {
    var end, start, textNodes, _ref;
    textNodes = Util.getTextNodes($(this.commonAncestor));
    _ref = [textNodes.index(this.start), textNodes.index(this.end)], start = _ref[0], end = _ref[1];
    return $.makeArray(textNodes.slice(start, +end + 1 || 9e9));
  };

  return NormalizedRange;

})();

var SerializedRange = (function() {
  function SerializedRange(obj) {
    this.start = obj.start;
    this.startOffset = obj.startOffset;
    this.end = obj.end;
    this.endOffset = obj.endOffset;
  }

  SerializedRange.prototype.normalize = function(root) {
    var contains, e, length, node, p, range, targetOffset, tn, _i, _j, _len, _len1, _ref, _ref1;
    range = {};
    _ref = ['start', 'end'];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      p = _ref[_i];
      try {
        node = xpath.toNode(this[p], root);
      } catch (_error) {
        e = _error;
        throw new RangeError(p, ("Error while finding " + p + " node: " + this[p] + ": ") + e, e);
      }
      if (!node) {
        throw new RangeError(p, "Couldn't find " + p + " node: " + this[p]);
      }
      length = 0;
      targetOffset = this[p + 'Offset'];
      if (p === 'end') {
        targetOffset -= 1;
      }
      _ref1 = Util.getTextNodes($(node));
      for (_j = 0, _len1 = _ref1.length; _j < _len1; _j++) {
        tn = _ref1[_j];
        if (length + tn.nodeValue.length > targetOffset) {
          range[p + 'Container'] = tn;
          range[p + 'Offset'] = this[p + 'Offset'] - length;
          break;
        } else {
          length += tn.nodeValue.length;
        }
      }
      if (range[p + 'Offset'] == null) {
        throw new RangeError("" + p + "offset", "Couldn't find offset " + this[p + 'Offset'] + " in element " + this[p]);
      }
    }
    contains = document.compareDocumentPosition != null ? function(a, b) {
      return a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_CONTAINED_BY;
    } : function(a, b) {
      return a.contains(b);
    };
    $(range.startContainer).parents().each(function() {
      var endContainer;
      if (range.endContainer.nodeType === Util.NodeTypes.TEXT_NODE) {
        endContainer = range.endContainer.parentNode;
      } else {
        endContainer = range.endContainer;
      }
      if (contains(this, endContainer)) {
        range.commonAncestorContainer = this;
        return false;
      }
    });
    return new BrowserRange(range).normalize(root);
  };

  SerializedRange.prototype.serialize = function(root, ignoreSelector) {
    return this.normalize(root).serialize(root, ignoreSelector);
  };

  SerializedRange.prototype.toObject = function() {
    return {
      start: this.start,
      startOffset: this.startOffset,
      end: this.end,
      endOffset: this.endOffset
    };
  };

  return SerializedRange;

})();

exports.sniff = sniff;
exports.RangeError = RangeError;
exports.BrowserRange = BrowserRange;
exports.NormalizedRange = NormalizedRange;
exports.SerializedRange = SerializedRange;
