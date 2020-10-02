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

import chai from 'chai';
import { ContextKind, HybridComplete } from './hybrid';
import { createEditorState } from '../../test/utils';

describe('analyzeCompletion test', () => {
  const testSuites = [
    {
      title: 'simple metric autocompletion',
      expr: 'go_',
      pos: 3, // cursor is at the end of the expr
      expectedContext: [{ kind: ContextKind.MetricName }, { kind: ContextKind.Function }, { kind: ContextKind.Aggregation }],
    },
    {
      title: 'autocomplete binOp modifier',
      expr: 'metric_name / ignor',
      pos: 19,
      expectedContext: [
        { kind: ContextKind.MetricName },
        { kind: ContextKind.Function },
        { kind: ContextKind.Aggregation },
        { kind: ContextKind.BinOpModifier },
      ],
    },
    {
      title: 'starting to autocomplete labelName in aggregate modifier',
      expr: 'sum by ()',
      pos: 8, // cursor is between the bracket
      expectedContext: [{ kind: ContextKind.LabelName }],
    },
    {
      title: 'continue to autocomplete labelName in aggregate modifier',
      expr: 'sum by (myL)',
      pos: 11, // cursor is between the bracket after the string myL
      expectedContext: [{ kind: ContextKind.LabelName }],
    },
    {
      title: 'autocomplete labelName in a list',
      expr: 'sum by (myLabel1, myLab)',
      pos: 23, // cursor is between the bracket after the string myLab
      expectedContext: [{ kind: ContextKind.LabelName }],
    },
    {
      title: 'autocomplete labelName associated to a metric',
      expr: 'metric_name{}',
      pos: 12, // cursor is between the bracket
      expectedContext: [{ kind: ContextKind.LabelName, metricName: 'metric_name' }],
    },
    {
      title: 'autocomplete labelName that defined a metric',
      expr: '{}',
      pos: 1, // cursor is between the bracket
      expectedContext: [{ kind: ContextKind.LabelName, metricName: '' }],
    },
    {
      title: 'continue to autocomplete labelName associated to a metric',
      expr: 'metric_name{myL}',
      pos: 15, // cursor is between the bracket after the string myL
      expectedContext: [{ kind: ContextKind.LabelName, metricName: 'metric_name' }],
    },
    {
      title: 'continue autocomplete labelName that defined a metric',
      expr: '{myL}',
      pos: 4, // cursor is between the bracket after the string myL
      expectedContext: [{ kind: ContextKind.LabelName, metricName: '' }],
    },
  ];
  testSuites.forEach((value) => {
    it(value.title, () => {
      const hybridComplete = new HybridComplete();
      const state = createEditorState(value.expr);
      const node = state.tree.resolve(value.pos, -1);
      const result = hybridComplete.analyzeCompletion(state, node);
      chai.expect(value.expectedContext).to.deep.equal(result);
    });
  });
});
