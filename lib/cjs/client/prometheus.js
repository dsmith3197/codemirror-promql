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
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CachedPrometheusClient = exports.HTTPPrometheusClient = void 0;
var matcher_1 = require("../parser/matcher");
var lru_cache_1 = __importDefault(require("lru-cache"));
var apiPrefix = '/api/v1';
var labelsEndpoint = apiPrefix + '/labels';
var labelValuesEndpoint = apiPrefix + '/label/:name/values';
var seriesEndpoint = apiPrefix + '/series';
var metricMetadataEndpoint = apiPrefix + '/metadata';
// These are status codes where the Prometheus API still returns a valid JSON body,
// with an error encoded within the JSON.
var badRequest = 400;
var unprocessableEntity = 422;
var serviceUnavailable = 503;
// HTTPPrometheusClient is the HTTP client that should be used to get some information from the different endpoint provided by prometheus.
var HTTPPrometheusClient = /** @class */ (function () {
    function HTTPPrometheusClient(config) {
        this.lookbackInterval = 60 * 60 * 1000 * 12; //12 hours
        // For some reason, just assigning via "= fetch" here does not end up executing fetch correctly
        // when calling it, thus the indirection via another function wrapper.
        this.fetchFn = function (input, init) { return fetch(input, init); };
        this.url = config.url;
        this.errorHandler = config.httpErrorHandler;
        if (config.lookbackInterval) {
            this.lookbackInterval = config.lookbackInterval;
        }
        if (config.fetchFn) {
            this.fetchFn = config.fetchFn;
        }
    }
    HTTPPrometheusClient.prototype.labelNames = function (metricName) {
        var _this = this;
        var end = new Date();
        var start = new Date(end.getTime() - this.lookbackInterval);
        if (metricName === undefined || metricName === '') {
            var params = new URLSearchParams({
                start: start.toISOString(),
                end: end.toISOString(),
            });
            // See https://prometheus.io/docs/prometheus/latest/querying/api/#getting-label-names
            return this.fetchAPI(labelsEndpoint + "?" + params).catch(function (error) {
                if (_this.errorHandler) {
                    _this.errorHandler(error);
                }
                return [];
            });
        }
        return this.series(metricName).then(function (series) {
            var e_1, _a, e_2, _b;
            var labelNames = new Set();
            try {
                for (var series_1 = __values(series), series_1_1 = series_1.next(); !series_1_1.done; series_1_1 = series_1.next()) {
                    var labelSet = series_1_1.value;
                    try {
                        for (var _c = (e_2 = void 0, __values(Object.entries(labelSet))), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var _e = __read(_d.value, 1), key = _e[0];
                            if (key === '__name__') {
                                continue;
                            }
                            labelNames.add(key);
                        }
                    }
                    catch (e_2_1) { e_2 = { error: e_2_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_2) throw e_2.error; }
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (series_1_1 && !series_1_1.done && (_a = series_1.return)) _a.call(series_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            return Array.from(labelNames);
        });
    };
    // labelValues return a list of the value associated to the given labelName.
    // In case a metric is provided, then the list of values is then associated to the couple <MetricName, LabelName>
    HTTPPrometheusClient.prototype.labelValues = function (labelName, metricName, matchers) {
        var _this = this;
        var end = new Date();
        var start = new Date(end.getTime() - this.lookbackInterval);
        if (!metricName || metricName.length === 0) {
            var params = new URLSearchParams({
                start: start.toISOString(),
                end: end.toISOString(),
            });
            // See https://prometheus.io/docs/prometheus/latest/querying/api/#querying-label-values
            return this.fetchAPI(labelValuesEndpoint.replace(/:name/gi, labelName) + "?" + params).catch(function (error) {
                if (_this.errorHandler) {
                    _this.errorHandler(error);
                }
                return [];
            });
        }
        return this.series(metricName, matchers, labelName).then(function (series) {
            var e_3, _a, e_4, _b;
            var labelValues = new Set();
            try {
                for (var series_2 = __values(series), series_2_1 = series_2.next(); !series_2_1.done; series_2_1 = series_2.next()) {
                    var labelSet = series_2_1.value;
                    try {
                        for (var _c = (e_4 = void 0, __values(Object.entries(labelSet))), _d = _c.next(); !_d.done; _d = _c.next()) {
                            var _e = __read(_d.value, 2), key = _e[0], value = _e[1];
                            if (key === '__name__') {
                                continue;
                            }
                            if (key === labelName) {
                                labelValues.add(value);
                            }
                        }
                    }
                    catch (e_4_1) { e_4 = { error: e_4_1 }; }
                    finally {
                        try {
                            if (_d && !_d.done && (_b = _c.return)) _b.call(_c);
                        }
                        finally { if (e_4) throw e_4.error; }
                    }
                }
            }
            catch (e_3_1) { e_3 = { error: e_3_1 }; }
            finally {
                try {
                    if (series_2_1 && !series_2_1.done && (_a = series_2.return)) _a.call(series_2);
                }
                finally { if (e_3) throw e_3.error; }
            }
            return Array.from(labelValues);
        });
    };
    HTTPPrometheusClient.prototype.metricMetadata = function () {
        var _this = this;
        return this.fetchAPI(metricMetadataEndpoint).catch(function (error) {
            if (_this.errorHandler) {
                _this.errorHandler(error);
            }
            return {};
        });
    };
    HTTPPrometheusClient.prototype.series = function (metricName, matchers, labelName) {
        var _this = this;
        var end = new Date();
        var start = new Date(end.getTime() - this.lookbackInterval);
        var params = new URLSearchParams({
            start: start.toISOString(),
            end: end.toISOString(),
            'match[]': matcher_1.labelMatchersToString(metricName, matchers, labelName),
        });
        // See https://prometheus.io/docs/prometheus/latest/querying/api/#finding-series-by-label-matchers
        return this.fetchAPI(seriesEndpoint + "?" + params).catch(function (error) {
            if (_this.errorHandler) {
                _this.errorHandler(error);
            }
            return [];
        });
    };
    HTTPPrometheusClient.prototype.metricNames = function () {
        return this.labelValues('__name__');
    };
    HTTPPrometheusClient.prototype.fetchAPI = function (resource) {
        return this.fetchFn(this.url + resource)
            .then(function (res) {
            if (!res.ok && ![badRequest, unprocessableEntity, serviceUnavailable].includes(res.status)) {
                throw new Error(res.statusText);
            }
            return res;
        })
            .then(function (res) { return res.json(); })
            .then(function (apiRes) {
            if (apiRes.status === 'error') {
                throw new Error(apiRes.error !== undefined ? apiRes.error : 'missing "error" field in response JSON');
            }
            if (apiRes.data === undefined) {
                throw new Error('missing "data" field in response JSON');
            }
            return apiRes.data;
        });
    };
    return HTTPPrometheusClient;
}());
exports.HTTPPrometheusClient = HTTPPrometheusClient;
var Cache = /** @class */ (function () {
    function Cache(maxAge) {
        this.completeAssociation = new lru_cache_1.default(maxAge);
        this.metricMetadata = {};
        this.labelValues = new lru_cache_1.default(maxAge);
        this.labelNames = [];
    }
    Cache.prototype.setAssociations = function (metricName, series) {
        var _this = this;
        series.forEach(function (labelSet) {
            var e_5, _a;
            var currentAssociation = _this.completeAssociation.get(metricName);
            if (!currentAssociation) {
                currentAssociation = new Map();
                _this.completeAssociation.set(metricName, currentAssociation);
            }
            try {
                for (var _b = __values(Object.entries(labelSet)), _c = _b.next(); !_c.done; _c = _b.next()) {
                    var _d = __read(_c.value, 2), key = _d[0], value = _d[1];
                    if (key === '__name__') {
                        continue;
                    }
                    var labelValues = currentAssociation.get(key);
                    if (labelValues === undefined) {
                        currentAssociation.set(key, new Set([value]));
                    }
                    else {
                        labelValues.add(value);
                    }
                }
            }
            catch (e_5_1) { e_5 = { error: e_5_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) _a.call(_b);
                }
                finally { if (e_5) throw e_5.error; }
            }
        });
    };
    Cache.prototype.setMetricMetadata = function (metadata) {
        this.metricMetadata = metadata;
    };
    Cache.prototype.getMetricMetadata = function () {
        return this.metricMetadata;
    };
    Cache.prototype.setLabelNames = function (labelNames) {
        this.labelNames = labelNames;
    };
    Cache.prototype.getLabelNames = function (metricName) {
        if (!metricName || metricName.length === 0) {
            return this.labelNames;
        }
        var labelSet = this.completeAssociation.get(metricName);
        return labelSet ? Array.from(labelSet.keys()) : [];
    };
    Cache.prototype.setLabelValues = function (labelName, labelValues) {
        this.labelValues.set(labelName, labelValues);
    };
    Cache.prototype.getLabelValues = function (labelName, metricName) {
        if (!metricName || metricName.length === 0) {
            var result = this.labelValues.get(labelName);
            return result ? result : [];
        }
        var labelSet = this.completeAssociation.get(metricName);
        if (labelSet) {
            var labelValues = labelSet.get(labelName);
            return labelValues ? Array.from(labelValues) : [];
        }
        return [];
    };
    return Cache;
}());
var CachedPrometheusClient = /** @class */ (function () {
    function CachedPrometheusClient(client, maxAge) {
        if (maxAge === void 0) { maxAge = 5 * 60 * 1000; }
        this.client = client;
        this.cache = new Cache(maxAge);
    }
    CachedPrometheusClient.prototype.labelNames = function (metricName) {
        var _this = this;
        var cachedLabel = this.cache.getLabelNames(metricName);
        if (cachedLabel && cachedLabel.length > 0) {
            return Promise.resolve(cachedLabel);
        }
        if (metricName === undefined || metricName === '') {
            return this.client.labelNames().then(function (labelNames) {
                _this.cache.setLabelNames(labelNames);
                return labelNames;
            });
        }
        return this.series(metricName).then(function () {
            return _this.cache.getLabelNames(metricName);
        });
    };
    CachedPrometheusClient.prototype.labelValues = function (labelName, metricName) {
        var _this = this;
        var cachedLabel = this.cache.getLabelValues(labelName, metricName);
        if (cachedLabel && cachedLabel.length > 0) {
            return Promise.resolve(cachedLabel);
        }
        if (metricName === undefined || metricName === '') {
            return this.client.labelValues(labelName).then(function (labelValues) {
                _this.cache.setLabelValues(labelName, labelValues);
                return labelValues;
            });
        }
        return this.series(metricName).then(function () {
            return _this.cache.getLabelValues(labelName, metricName);
        });
    };
    CachedPrometheusClient.prototype.metricMetadata = function () {
        var _this = this;
        var cachedMetadata = this.cache.getMetricMetadata();
        if (cachedMetadata && Object.keys(cachedMetadata).length > 0) {
            return Promise.resolve(cachedMetadata);
        }
        return this.client.metricMetadata().then(function (metadata) {
            _this.cache.setMetricMetadata(metadata);
            return _this.cache.getMetricMetadata();
        });
    };
    CachedPrometheusClient.prototype.series = function (metricName) {
        var _this = this;
        return this.client.series(metricName).then(function (series) {
            _this.cache.setAssociations(metricName, series);
            return series;
        });
    };
    CachedPrometheusClient.prototype.metricNames = function () {
        return this.labelValues('__name__');
    };
    return CachedPrometheusClient;
}());
exports.CachedPrometheusClient = CachedPrometheusClient;
//# sourceMappingURL=prometheus.js.map