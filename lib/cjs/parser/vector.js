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
exports.buildVectorMatching = void 0;
var lezer_promql_1 = require("lezer-promql");
var vector_1 = require("../types/vector");
var path_finder_1 = require("./path-finder");
function buildVectorMatching(state, binaryNode) {
    var e_1, _a, e_2, _b;
    if (!binaryNode || binaryNode.type.id !== lezer_promql_1.BinaryExpr) {
        return null;
    }
    var result = {
        card: vector_1.VectorMatchCardinality.CardOneToOne,
        matchingLabels: [],
        on: false,
        include: [],
    };
    var binModifiers = binaryNode.getChild(lezer_promql_1.BinModifiers);
    if (binModifiers) {
        var onOrIgnoring = binModifiers.getChild(lezer_promql_1.OnOrIgnoring);
        if (onOrIgnoring) {
            result.on = onOrIgnoring.getChild(lezer_promql_1.On) !== null;
            var labels = path_finder_1.retrieveAllRecursiveNodes(onOrIgnoring.getChild(lezer_promql_1.GroupingLabels), lezer_promql_1.GroupingLabelList, lezer_promql_1.GroupingLabel);
            if (labels.length > 0) {
                try {
                    for (var labels_1 = __values(labels), labels_1_1 = labels_1.next(); !labels_1_1.done; labels_1_1 = labels_1.next()) {
                        var label = labels_1_1.value;
                        result.matchingLabels.push(state.sliceDoc(label.from, label.to));
                    }
                }
                catch (e_1_1) { e_1 = { error: e_1_1 }; }
                finally {
                    try {
                        if (labels_1_1 && !labels_1_1.done && (_a = labels_1.return)) _a.call(labels_1);
                    }
                    finally { if (e_1) throw e_1.error; }
                }
            }
        }
        var groupLeft = binModifiers.getChild(lezer_promql_1.GroupLeft);
        var groupRight = binModifiers.getChild(lezer_promql_1.GroupRight);
        if (groupLeft || groupRight) {
            result.card = groupLeft ? vector_1.VectorMatchCardinality.CardManyToOne : vector_1.VectorMatchCardinality.CardOneToMany;
            var includeLabels = path_finder_1.retrieveAllRecursiveNodes(binModifiers.getChild(lezer_promql_1.GroupingLabels), lezer_promql_1.GroupingLabelList, lezer_promql_1.GroupingLabel);
            if (includeLabels.length > 0) {
                try {
                    for (var includeLabels_1 = __values(includeLabels), includeLabels_1_1 = includeLabels_1.next(); !includeLabels_1_1.done; includeLabels_1_1 = includeLabels_1.next()) {
                        var label = includeLabels_1_1.value;
                        result.include.push(state.sliceDoc(label.from, label.to));
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (includeLabels_1_1 && !includeLabels_1_1.done && (_b = includeLabels_1.return)) _b.call(includeLabels_1);
                    }
                    finally { if (e_2) throw e_2.error; }
                }
            }
        }
    }
    var isSetOperator = path_finder_1.containsAtLeastOneChild(binaryNode, lezer_promql_1.And, lezer_promql_1.Or, lezer_promql_1.Unless);
    if (isSetOperator && result.card === vector_1.VectorMatchCardinality.CardOneToOne) {
        result.card = vector_1.VectorMatchCardinality.CardManyToMany;
    }
    return result;
}
exports.buildVectorMatching = buildVectorMatching;
//# sourceMappingURL=vector.js.map