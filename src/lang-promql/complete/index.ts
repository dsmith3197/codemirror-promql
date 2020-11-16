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

import { HybridComplete } from './hybrid';
import { CachedPrometheusClient, HTTPPrometheusClient, PrometheusClient } from '../client/prometheus';
import { FetchFn } from '../client';
import { CompletionContext, CompletionResult } from '@codemirror/next/autocomplete';
// Complete is the interface that defines the simple method that returns a CompletionResult.
// Every different completion mode must implement this interface.
export interface CompleteStrategy {
  promQL(context: CompletionContext): Promise<CompletionResult> | CompletionResult | null;
}

// CompleteConfiguration should be used to customize the autocompletion.
export interface CompleteConfiguration {
  remote: {
    // Provide these settings when not using a custom PrometheusClient.
    url?: string;
    lookbackInterval?: number;
    httpErrorHandler?: (error: any) => void;
    fetchFn?: FetchFn;
    // When providing this custom PrometheusClient, the settings above will not be used.
    prometheusClient?: PrometheusClient;
  };
  // maxMetricsMetadata is the maximum limit of the number of metrics in Prometheus.
  // Under this limit, it allows the completion to get the metadata of the metrics.
  maxMetricsMetadata?: number;
}

export function newCompleteStrategy(conf?: CompleteConfiguration): CompleteStrategy {
  if (conf?.remote.prometheusClient) {
    return new HybridComplete(conf.remote.prometheusClient, conf.maxMetricsMetadata);
  }
  if (conf?.remote.url) {
    return new HybridComplete(
      new CachedPrometheusClient(
        new HTTPPrometheusClient(conf.remote.url, conf.remote.httpErrorHandler, conf.remote.lookbackInterval, conf.remote.fetchFn)
      ),
      conf.maxMetricsMetadata
    );
  }
  return new HybridComplete();
}
