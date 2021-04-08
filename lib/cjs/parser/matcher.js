"use strict";
// The MIT License (MIT)
//
// Copyright (c) 2020 The Prometheus Authors
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.
var __values = (this && this.__values) || function(o) {
    var s = typeof Symbol === "function" && Symbol.iterator, m = s && o[s], i = 0;
    if (m) return m.call(o);
    if (o && typeof o.length === "number") return {
        next: function () {
            if (o && i >= o.length) o = void 0;
            return { value: o && o[i++], done: !o };
        }
    };
    throw new TypeError(s ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.labelMatchersToString = exports.buildLabelMatchers = void 0;
var lezer_promql_1 = require("lezer-promql");
var matcher_1 = require("../types/matcher");
function createMatcher(labelMatcher, state) {
    var matcher = new matcher_1.Matcher(0, '', '');
    var cursor = labelMatcher.cursor;
    if (!cursor.next()) {
        // weird case, that would mean the labelMatcher doesn't have any child.
        return matcher;
    }
    do {
        switch (cursor.type.id) {
            case lezer_promql_1.LabelName:
                matcher.name = state.sliceDoc(cursor.from, cursor.to);
                break;
            case lezer_promql_1.MatchOp:
                var ope = cursor.node.firstChild;
                if (ope) {
                    matcher.type = ope.type.id;
                }
                break;
            case lezer_promql_1.StringLiteral:
                matcher.value = state.sliceDoc(cursor.from, cursor.to).slice(1, -1);
                break;
        }
    } while (cursor.nextSibling());
    return matcher;
}
function buildLabelMatchers(labelMatchers, state) {
    var matchers = [];
    labelMatchers.forEach(function (value) {
        matchers.push(createMatcher(value, state));
    });
    return matchers;
}
exports.buildLabelMatchers = buildLabelMatchers;
function labelMatchersToString(metricName, matchers, labelName) {
    var e_1, _a;
    if (!matchers || matchers.length === 0) {
        return metricName;
    }
    var matchersAsString = '';
    try {
        for (var matchers_1 = __values(matchers), matchers_1_1 = matchers_1.next(); !matchers_1_1.done; matchers_1_1 = matchers_1.next()) {
            var matcher = matchers_1_1.value;
            if (matcher.name === labelName || matcher.value === '') {
                continue;
            }
            var type = '';
            switch (matcher.type) {
                case lezer_promql_1.EqlSingle:
                    type = '=';
                    break;
                case lezer_promql_1.Neq:
                    type = '!=';
                    break;
                case lezer_promql_1.NeqRegex:
                    type = '!~';
                    break;
                case lezer_promql_1.EqlRegex:
                    type = '=~';
                    break;
                default:
                    type = '=';
            }
            var m = "" + matcher.name + type + "\"" + matcher.value + "\"";
            if (matchersAsString === '') {
                matchersAsString = m;
            }
            else {
                matchersAsString = matchersAsString + "," + m;
            }
        }
    }
    catch (e_1_1) { e_1 = { error: e_1_1 }; }
    finally {
        try {
            if (matchers_1_1 && !matchers_1_1.done && (_a = matchers_1.return)) _a.call(matchers_1);
        }
        finally { if (e_1) throw e_1.error; }
    }
    return metricName + "{" + matchersAsString + "}";
}
exports.labelMatchersToString = labelMatchersToString;
//# sourceMappingURL=matcher.js.map