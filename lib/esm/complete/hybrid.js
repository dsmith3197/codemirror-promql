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
import { Add, AggregateExpr, And, BinaryExpr, BinModifiers, Bool, Div, Duration, Eql, EqlRegex, EqlSingle, Expr, FunctionCallBody, GroupingLabel, GroupingLabels, Gte, Gtr, Identifier, LabelMatcher, LabelMatchers, LabelMatchList, LabelName, Lss, Lte, MatchOp, MatrixSelector, MetricIdentifier, Mod, Mul, Neq, NeqRegex, NumberLiteral, OffsetExpr, Or, Pow, StepInvariantExpr, StringLiteral, Sub, SubqueryExpr, Unless, VectorSelector, } from 'lezer-promql';
import { containsAtLeastOneChild, containsChild, retrieveAllRecursiveNodes, walkBackward, walkThrough } from '../parser/path-finder';
import { aggregateOpModifierTerms, aggregateOpTerms, atModifierTerms, binOpModifierTerms, binOpTerms, durationTerms, functionIdentifierTerms, matchOpTerms, snippets, } from './promql.terms';
import { buildLabelMatchers } from '../parser/matcher';
import { syntaxTree } from '@codemirror/language';
const autocompleteNodes = {
    matchOp: matchOpTerms,
    binOp: binOpTerms,
    duration: durationTerms,
    binOpModifier: binOpModifierTerms,
    atModifier: atModifierTerms,
    functionIdentifier: functionIdentifierTerms,
    aggregateOp: aggregateOpTerms,
    aggregateOpModifier: aggregateOpModifierTerms,
};
// ContextKind is the different possible value determinate by the autocompletion
export var ContextKind;
(function (ContextKind) {
    // dynamic autocompletion (required a distant server)
    ContextKind[ContextKind["MetricName"] = 0] = "MetricName";
    ContextKind[ContextKind["LabelName"] = 1] = "LabelName";
    ContextKind[ContextKind["LabelValue"] = 2] = "LabelValue";
    // static autocompletion
    ContextKind[ContextKind["Function"] = 3] = "Function";
    ContextKind[ContextKind["Aggregation"] = 4] = "Aggregation";
    ContextKind[ContextKind["BinOpModifier"] = 5] = "BinOpModifier";
    ContextKind[ContextKind["BinOp"] = 6] = "BinOp";
    ContextKind[ContextKind["MatchOp"] = 7] = "MatchOp";
    ContextKind[ContextKind["AggregateOpModifier"] = 8] = "AggregateOpModifier";
    ContextKind[ContextKind["Duration"] = 9] = "Duration";
    ContextKind[ContextKind["Offset"] = 10] = "Offset";
    ContextKind[ContextKind["Bool"] = 11] = "Bool";
    ContextKind[ContextKind["AtModifiers"] = 12] = "AtModifiers";
})(ContextKind || (ContextKind = {}));
function getMetricNameInVectorSelector(tree, state) {
    // Find if there is a defined metric name. Should be used to autocomplete a labelValue or a labelName
    // First find the parent "VectorSelector" to be able to find then the subChild "MetricIdentifier" if it exists.
    let currentNode = walkBackward(tree, VectorSelector);
    if (!currentNode) {
        // Weird case that shouldn't happen, because "VectorSelector" is by definition the parent of the LabelMatchers.
        return '';
    }
    currentNode = walkThrough(currentNode, MetricIdentifier, Identifier);
    if (!currentNode) {
        return '';
    }
    return state.sliceDoc(currentNode.from, currentNode.to);
}
function arrayToCompletionResult(data, from, to, includeSnippet = false, span = true) {
    const options = data;
    if (includeSnippet) {
        options.push(...snippets);
    }
    return {
        from: from,
        to: to,
        options: options,
        span: span ? /^[a-zA-Z0-9_:]+$/ : undefined,
    };
}
// computeStartCompleteLabelPositionInLabelMatcherOrInGroupingLabel calculates the start position only when the node is a LabelMatchers or a GroupingLabels
function computeStartCompleteLabelPositionInLabelMatcherOrInGroupingLabel(node, pos) {
    // Here we can have two different situations:
    // 1. `metric{}` or `sum by()` with the cursor between the bracket
    // and so we have increment the starting position to avoid to consider the open bracket when filtering the autocompletion list.
    // 2. `metric{foo="bar",} or `sum by(foo,)  with the cursor after the comma.
    // Then the start number should be the current position to avoid to consider the previous labelMatcher/groupingLabel when filtering the autocompletion list.
    let start = node.from + 1;
    if (node.firstChild !== null) {
        // here that means the LabelMatchers / GroupingLabels has a child, which is not possible if we have the expression `metric{}`. So we are likely trying to autocomplete the label list after a comma
        start = pos;
    }
    return start;
}
// computeStartCompletePosition calculates the start position of the autocompletion.
// It is an important step because the start position will be used by CMN to find the string and then to use it to filter the CompletionResult.
// A wrong `start` position will lead to have the completion not working.
// Note: this method is exported only for testing purpose.
export function computeStartCompletePosition(node, pos) {
    var _a, _b, _c, _d, _e, _f;
    let start = node.from;
    if (node.type.id === LabelMatchers || node.type.id === GroupingLabels) {
        start = computeStartCompleteLabelPositionInLabelMatcherOrInGroupingLabel(node, pos);
    }
    else if (node.type.id === FunctionCallBody || (node.type.id === StringLiteral && ((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type.id) === LabelMatcher)) {
        // When the cursor is between bracket, quote, we need to increment the starting position to avoid to consider the open bracket/ first string.
        start++;
    }
    else if (node.type.id === OffsetExpr ||
        (node.type.id === NumberLiteral && ((_b = node.parent) === null || _b === void 0 ? void 0 : _b.type.id) === 0 && ((_c = node.parent.parent) === null || _c === void 0 ? void 0 : _c.type.id) === SubqueryExpr) ||
        (node.type.id === 0 &&
            (((_d = node.parent) === null || _d === void 0 ? void 0 : _d.type.id) === OffsetExpr ||
                ((_e = node.parent) === null || _e === void 0 ? void 0 : _e.type.id) === MatrixSelector ||
                (((_f = node.parent) === null || _f === void 0 ? void 0 : _f.type.id) === SubqueryExpr && containsAtLeastOneChild(node.parent, Duration))))) {
        start = pos;
    }
    return start;
}
// analyzeCompletion is going to determinate what should be autocompleted.
// The value of the autocompletion is then calculate by the function buildCompletion.
// Note: this method is exported for testing purpose only. Do not use it directly.
export function analyzeCompletion(state, node) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
    const result = [];
    switch (node.type.id) {
        case 0: // 0 is the id of the error node
            if (((_a = node.parent) === null || _a === void 0 ? void 0 : _a.type.id) === OffsetExpr) {
                // we are likely in the given situation:
                // `metric_name offset 5` that leads to this tree:
                // `Expr(OffsetExpr(Expr(VectorSelector(MetricIdentifier(Identifier))),Offset,⚠))`
                // Here we can just autocomplete a duration.
                result.push({ kind: ContextKind.Duration });
                break;
            }
            if (((_b = node.parent) === null || _b === void 0 ? void 0 : _b.type.id) === LabelMatcher) {
                // In this case the current token is not itself a valid match op yet:
                //      metric_name{labelName!}
                result.push({ kind: ContextKind.MatchOp });
                break;
            }
            if (((_c = node.parent) === null || _c === void 0 ? void 0 : _c.type.id) === MatrixSelector) {
                // we are likely in the given situation:
                // `metric_name{}[5]`
                // We can also just autocomplete a duration
                result.push({ kind: ContextKind.Duration });
                break;
            }
            if (((_d = node.parent) === null || _d === void 0 ? void 0 : _d.type.id) === StepInvariantExpr) {
                // we are likely in the given situation:
                //   `expr @ s`
                // we can autocomplete start / end
                result.push({ kind: ContextKind.AtModifiers });
                break;
            }
            if (((_e = node.parent) === null || _e === void 0 ? void 0 : _e.type.id) === SubqueryExpr && containsAtLeastOneChild(node.parent, Duration)) {
                // we are likely in the given situation:
                //    `rate(foo[5d:5])`
                // so we should autocomplete a duration
                result.push({ kind: ContextKind.Duration });
                break;
            }
            // when we are in the situation 'metric_name !', we have the following tree
            // Expr(VectorSelector(MetricIdentifier(Identifier),⚠))
            // We should try to know if the char '!' is part of a binOp.
            // Note: as it is quite experimental, maybe it requires more condition and to check the current tree (parent, other child at the same level ..etc.).
            const operator = state.sliceDoc(node.from, node.to);
            if (binOpTerms.filter((term) => term.label.includes(operator)).length > 0) {
                result.push({ kind: ContextKind.BinOp });
            }
            break;
        case Identifier:
            // sometimes an Identifier has an error has parent. This should be treated in priority
            if (((_f = node.parent) === null || _f === void 0 ? void 0 : _f.type.id) === 0) {
                if (((_g = node.parent.parent) === null || _g === void 0 ? void 0 : _g.type.id) === AggregateExpr) {
                    // it matches 'sum() b'. So here we can autocomplete:
                    // - the aggregate operation modifier
                    // - the binary operation (since it's not mandatory to have an aggregate operation modifier)
                    result.push({ kind: ContextKind.AggregateOpModifier }, { kind: ContextKind.BinOp });
                    break;
                }
                if (((_h = node.parent.parent) === null || _h === void 0 ? void 0 : _h.type.id) === VectorSelector) {
                    // it matches 'sum b'. So here we also have to autocomplete the aggregate operation modifier only
                    // if the associated metricIdentifier is matching an aggregation operation.
                    // Note: here is the corresponding tree in order to understand the situation:
                    // Expr(
                    // 	VectorSelector(
                    // 		MetricIdentifier(Identifier),
                    // 		⚠(Identifier)
                    // 	)
                    // )
                    const operator = getMetricNameInVectorSelector(node, state);
                    if (aggregateOpTerms.filter((term) => term.label === operator).length > 0) {
                        result.push({ kind: ContextKind.AggregateOpModifier });
                    }
                    // It's possible it also match the expr 'metric_name unle'.
                    // It's also possible that the operator is also a metric even if it matches the list of aggregation function.
                    // So we also have to autocomplete the binary operator.
                    //
                    // The expr `metric_name off` leads to the same tree. So we have to provide the offset keyword too here.
                    result.push({ kind: ContextKind.BinOp }, { kind: ContextKind.Offset });
                    break;
                }
            }
            // As the leaf Identifier is coming for a lot of different case, we have to take a bit time to analyze the tree
            // in order to know what we have to autocomplete exactly.
            // Here is some cases:
            // 1. metric_name / ignor --> we should autocomplete the BinOpModifier + metric/function/aggregation
            // 2. http_requests_total{method="GET"} off --> offset or binOp should be autocompleted here
            // 3. rate(foo[5m]) un --> offset or binOp should be autocompleted
            // 4. sum(http_requests_total{method="GET"} off) --> offset or binOp should be autocompleted
            // 5. sum(http_requests_total{method="GET"} / o) --> BinOpModifier + metric/function/aggregation
            // All examples above gives a different tree each time but ends up to be treated in this case.
            // But they all have the following common tree pattern:
            // Parent( Expr(...),
            //         ... ,
            //         Expr(VectorSelector(MetricIdentifier(Identifier)))
            //       )
            //
            // So the first things to do is to get the `Parent` and to determinate if we are in this configuration.
            // Otherwise we would just have to autocomplete the metric / function / aggregation.
            const parent = (_l = (_k = (_j = node.parent) === null || _j === void 0 ? void 0 : _j.parent) === null || _k === void 0 ? void 0 : _k.parent) === null || _l === void 0 ? void 0 : _l.parent;
            if (!parent) {
                // this case is normally impossible since by definition, the identifier has 3 parents,
                // and in Lexer, there is always a default parent in top of everything.
                result.push({ kind: ContextKind.MetricName, metricName: state.sliceDoc(node.from, node.to) }, { kind: ContextKind.Function }, { kind: ContextKind.Aggregation });
                break;
            }
            // now we have to know if we have two Expr in the direct children of the `parent`
            const containExprTwice = containsChild(parent, Expr, Expr);
            if (containExprTwice) {
                if (parent.type.id === BinaryExpr && !containsAtLeastOneChild(parent, 0)) {
                    // We are likely in the case 1 or 5
                    result.push({ kind: ContextKind.MetricName, metricName: state.sliceDoc(node.from, node.to) }, { kind: ContextKind.Function }, { kind: ContextKind.Aggregation }, { kind: ContextKind.BinOpModifier });
                    // in  case the BinaryExpr is a comparison, we should autocomplete the `bool` keyword. But only if it is not present.
                    // When the `bool` keyword is NOT present, then the expression looks like this:
                    // 			BinaryExpr( Expr(...), Gtr , BinModifiers, Expr(...) )
                    // When the `bool` keyword is present, then the expression looks like this:
                    //      BinaryExpr( Expr(...), Gtr , BinModifiers(Bool), Expr(...) )
                    // To know if it is not present, we just have to check if the Bool is not present as a child of the BinModifiers.
                    if (containsAtLeastOneChild(parent, Eql, Gte, Gtr, Lte, Lss, Neq) && !walkThrough(parent, BinModifiers, Bool)) {
                        result.push({ kind: ContextKind.Bool });
                    }
                }
                else if (parent.type.id !== BinaryExpr || (parent.type.id === BinaryExpr && containsAtLeastOneChild(parent, 0))) {
                    result.push({ kind: ContextKind.BinOp }, { kind: ContextKind.Offset });
                }
            }
            else {
                result.push({ kind: ContextKind.MetricName, metricName: state.sliceDoc(node.from, node.to) }, { kind: ContextKind.Function }, { kind: ContextKind.Aggregation });
            }
            break;
        case GroupingLabels:
            // In this case we are in the given situation:
            //      sum by ()
            // So we have to autocomplete any labelName
            result.push({ kind: ContextKind.LabelName });
            break;
        case LabelMatchers:
            // In that case we are in the given situation:
            //       metric_name{} or {}
            // so we have or to autocomplete any kind of labelName or to autocomplete only the labelName associated to the metric
            result.push({ kind: ContextKind.LabelName, metricName: getMetricNameInVectorSelector(node, state) });
            break;
        case LabelName:
            if (((_m = node.parent) === null || _m === void 0 ? void 0 : _m.type.id) === GroupingLabel) {
                // In this case we are in the given situation:
                //      sum by (myL)
                // So we have to continue to autocomplete any kind of labelName
                result.push({ kind: ContextKind.LabelName });
            }
            else if (((_o = node.parent) === null || _o === void 0 ? void 0 : _o.type.id) === LabelMatcher) {
                // In that case we are in the given situation:
                //       metric_name{myL} or {myL}
                // so we have or to continue to autocomplete any kind of labelName or
                // to continue to autocomplete only the labelName associated to the metric
                result.push({ kind: ContextKind.LabelName, metricName: getMetricNameInVectorSelector(node, state) });
            }
            break;
        case StringLiteral:
            if (((_p = node.parent) === null || _p === void 0 ? void 0 : _p.type.id) === LabelMatcher) {
                // In this case we are in the given situation:
                //      metric_name{labelName=""}
                // So we can autocomplete the labelValue
                // Get the labelName.
                // By definition it's the firstChild: https://github.com/promlabs/lezer-promql/blob/0ef65e196a8db6a989ff3877d57fd0447d70e971/src/promql.grammar#L250
                let labelName = '';
                if (((_q = node.parent.firstChild) === null || _q === void 0 ? void 0 : _q.type.id) === LabelName) {
                    labelName = state.sliceDoc(node.parent.firstChild.from, node.parent.firstChild.to);
                }
                // then find the metricName if it exists
                const metricName = getMetricNameInVectorSelector(node, state);
                // finally get the full matcher available
                const labelMatchers = buildLabelMatchers(retrieveAllRecursiveNodes(walkBackward(node, LabelMatchList), LabelMatchList, LabelMatcher), state);
                result.push({ kind: ContextKind.LabelValue, metricName: metricName, labelName: labelName, matchers: labelMatchers });
            }
            break;
        case NumberLiteral:
            if (((_r = node.parent) === null || _r === void 0 ? void 0 : _r.type.id) === 0 && ((_s = node.parent.parent) === null || _s === void 0 ? void 0 : _s.type.id) === SubqueryExpr) {
                // Here we are likely in this situation:
                //     `go[5d:4]`
                // and we have the given tree:
                // Expr( SubqueryExpr(
                // 		Expr(VectorSelector(MetricIdentifier(Identifier))),
                // 		Duration, Duration, ⚠(NumberLiteral)
                // ))
                // So we should continue to autocomplete a duration
                result.push({ kind: ContextKind.Duration });
            }
            break;
        case Duration:
        case OffsetExpr:
            result.push({ kind: ContextKind.Duration });
            break;
        case FunctionCallBody:
            // In this case we are in the given situation:
            //       sum() or in rate()
            // with the cursor between the bracket. So we can autocomplete the metric, the function and the aggregation.
            result.push({ kind: ContextKind.MetricName, metricName: '' }, { kind: ContextKind.Function }, { kind: ContextKind.Aggregation });
            break;
        case Neq:
            if (((_t = node.parent) === null || _t === void 0 ? void 0 : _t.type.id) === MatchOp) {
                result.push({ kind: ContextKind.MatchOp });
            }
            else if (((_u = node.parent) === null || _u === void 0 ? void 0 : _u.type.id) === BinaryExpr) {
                result.push({ kind: ContextKind.BinOp });
            }
            break;
        case EqlSingle:
        case EqlRegex:
        case NeqRegex:
        case MatchOp:
            result.push({ kind: ContextKind.MatchOp });
            break;
        case Pow:
        case Mul:
        case Div:
        case Mod:
        case Add:
        case Sub:
        case Eql:
        case Gte:
        case Gtr:
        case Lte:
        case Lss:
        case And:
        case Unless:
        case Or:
        case BinaryExpr:
            result.push({ kind: ContextKind.BinOp });
            break;
    }
    return result;
}
// HybridComplete provides a full completion result with or without a remote prometheus.
export class HybridComplete {
    constructor(prometheusClient, maxMetricsMetadata = 10000) {
        this.prometheusClient = prometheusClient;
        this.maxMetricsMetadata = maxMetricsMetadata;
    }
    getPrometheusClient() {
        return this.prometheusClient;
    }
    promQL(context) {
        const { state, pos } = context;
        const tree = syntaxTree(state).resolve(pos, -1);
        const contexts = analyzeCompletion(state, tree);
        let asyncResult = Promise.resolve([]);
        let completeSnippet = false;
        let span = true;
        for (const context of contexts) {
            switch (context.kind) {
                case ContextKind.Aggregation:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.aggregateOp);
                    });
                    break;
                case ContextKind.Function:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.functionIdentifier);
                    });
                    break;
                case ContextKind.BinOpModifier:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.binOpModifier);
                    });
                    break;
                case ContextKind.BinOp:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.binOp);
                    });
                    break;
                case ContextKind.MatchOp:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.matchOp);
                    });
                    break;
                case ContextKind.AggregateOpModifier:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.aggregateOpModifier);
                    });
                    break;
                case ContextKind.Duration:
                    span = false;
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.duration);
                    });
                    break;
                case ContextKind.Offset:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat([{ label: 'offset' }]);
                    });
                    break;
                case ContextKind.Bool:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat([{ label: 'bool' }]);
                    });
                    break;
                case ContextKind.AtModifiers:
                    asyncResult = asyncResult.then((result) => {
                        return result.concat(autocompleteNodes.atModifier);
                    });
                    break;
                case ContextKind.MetricName:
                    asyncResult = asyncResult.then((result) => {
                        completeSnippet = true;
                        return this.autocompleteMetricName(result, context);
                    });
                    break;
                case ContextKind.LabelName:
                    asyncResult = asyncResult.then((result) => {
                        return this.autocompleteLabelName(result, context);
                    });
                    break;
                case ContextKind.LabelValue:
                    asyncResult = asyncResult.then((result) => {
                        return this.autocompleteLabelValue(result, context);
                    });
            }
        }
        return asyncResult.then((result) => {
            return arrayToCompletionResult(result, computeStartCompletePosition(tree, pos), pos, completeSnippet, span);
        });
    }
    autocompleteMetricName(result, context) {
        if (!this.prometheusClient) {
            return result;
        }
        const metricCompletion = new Map();
        return this.prometheusClient
            .metricNames(context.metricName)
            .then((metricNames) => {
            var _a;
            for (const metricName of metricNames) {
                metricCompletion.set(metricName, { label: metricName, type: 'constant' });
            }
            // avoid to get all metric metadata if the prometheus server is too big
            if (metricNames.length <= this.maxMetricsMetadata) {
                // in order to enrich the completion list of the metric,
                // we are trying to find the associated metadata
                return (_a = this.prometheusClient) === null || _a === void 0 ? void 0 : _a.metricMetadata();
            }
        })
            .then((metricMetadata) => {
            if (metricMetadata) {
                for (const [metricName, node] of metricCompletion) {
                    // For histograms and summaries, the metadata is only exposed for the base metric name,
                    // not separately for the _count, _sum, and _bucket time series.
                    const metadata = metricMetadata[metricName.replace(/(_count|_sum|_bucket)$/, '')];
                    if (metadata) {
                        if (metadata.length > 1) {
                            // it means the metricName has different possible helper and type
                            for (const m of metadata) {
                                if (node.detail === '') {
                                    node.detail = m.type;
                                }
                                else if (node.detail !== m.type) {
                                    node.detail = 'unknown';
                                    node.info = 'multiple different definitions for this metric';
                                }
                                if (node.info === '') {
                                    node.info = m.help;
                                }
                                else if (node.info !== m.help) {
                                    node.info = 'multiple different definitions for this metric';
                                }
                            }
                        }
                        else if (metadata.length === 1) {
                            let { type, help } = metadata[0];
                            if (type === 'histogram' || type === 'summary') {
                                if (metricName.endsWith('_count')) {
                                    type = 'counter';
                                    help = `The total number of observations for: ${help}`;
                                }
                                if (metricName.endsWith('_sum')) {
                                    type = 'counter';
                                    help = `The total sum of observations for: ${help}`;
                                }
                                if (metricName.endsWith('_bucket')) {
                                    type = 'counter';
                                    help = `The total count of observations for a bucket in the histogram: ${help}`;
                                }
                            }
                            node.detail = type;
                            node.info = help;
                        }
                    }
                }
            }
            return result.concat(Array.from(metricCompletion.values()));
        });
    }
    autocompleteLabelName(result, context) {
        if (!this.prometheusClient) {
            return result;
        }
        return this.prometheusClient.labelNames(context.metricName).then((labelNames) => {
            return result.concat(labelNames.map((value) => ({ label: value, type: 'constant' })));
        });
    }
    autocompleteLabelValue(result, context) {
        if (!this.prometheusClient || !context.labelName) {
            return result;
        }
        return this.prometheusClient.labelValues(context.labelName, context.metricName, context.matchers).then((labelValues) => {
            return result.concat(labelValues.map((value) => ({ label: value, type: 'text' })));
        });
    }
}
//# sourceMappingURL=hybrid.js.map