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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getType = void 0;
var lezer_promql_1 = require("lezer-promql");
var path_finder_1 = require("./path-finder");
var function_1 = require("../types/function");
// Based on https://github.com/prometheus/prometheus/blob/d668a7efe3107dbdcc67bf4e9f12430ed8e2b396/promql/parser/ast.go#L191
function getType(node) {
    var _a;
    if (!node) {
        return function_1.ValueType.none;
    }
    switch (node.type.id) {
        case lezer_promql_1.Expr:
            return getType(node.firstChild);
        case lezer_promql_1.AggregateExpr:
            return function_1.ValueType.vector;
        case lezer_promql_1.VectorSelector:
            return function_1.ValueType.vector;
        case lezer_promql_1.OffsetExpr:
            return getType(node.firstChild);
        case lezer_promql_1.StringLiteral:
            return function_1.ValueType.string;
        case lezer_promql_1.NumberLiteral:
            return function_1.ValueType.scalar;
        case lezer_promql_1.MatrixSelector:
            return function_1.ValueType.matrix;
        case lezer_promql_1.SubqueryExpr:
            return function_1.ValueType.matrix;
        case lezer_promql_1.ParenExpr:
            return getType(path_finder_1.walkThrough(node, lezer_promql_1.Expr));
        case lezer_promql_1.UnaryExpr:
            return getType(path_finder_1.walkThrough(node, lezer_promql_1.Expr));
        case lezer_promql_1.BinaryExpr:
            var lt = getType(node.firstChild);
            var rt = getType(node.lastChild);
            if (lt === function_1.ValueType.scalar && rt === function_1.ValueType.scalar) {
                return function_1.ValueType.scalar;
            }
            return function_1.ValueType.vector;
        case lezer_promql_1.FunctionCall:
            var funcNode = (_a = node.firstChild) === null || _a === void 0 ? void 0 : _a.firstChild;
            if (!funcNode) {
                return function_1.ValueType.none;
            }
            return function_1.getFunction(funcNode.type.id).returnType;
        case lezer_promql_1.StepInvariantExpr:
            return getType(path_finder_1.walkThrough(node, lezer_promql_1.Expr));
        default:
            return function_1.ValueType.none;
    }
}
exports.getType = getType;
//# sourceMappingURL=type.js.map