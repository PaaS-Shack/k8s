"use strict";

// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

const PrometheusDriver = require("prometheus-query").PrometheusDriver;

/**
 * This service manages the kubernetes metrics
 * 
 * 
 */



module.exports = {
    // name of service
    name: "k8s.metrics",
    // version of service
    version: 1,

    /**
     * Service Mixins
     * 
     * @type {Array}
     * @property {DbService} DbService - Database mixin
     * @property {Membership} Membership - Membership mixin
     * @property {ConfigLoader} ConfigLoader - Config loader mixin
     */
    mixins: [
        ConfigLoader(['k8s.**']),
    ],

    /**
     * Service dependencies
     */
    dependencies: [

    ],

    /**
     * Service settings
     * 
     * @type {Object}
     */
    settings: {
        rest: "v1/k8s/metrics",

        // default init config settings
        config: {
            "k8s.metrics.enabled": true,
            "k8s.metrics.endpoint": "https://prom.one-host.ca",
        }
    },

    /**
     * service actions
     */
    actions: {
        /**
         * Get the metrics top for deployment
         * 
         * @actions
         * @param {String} deployment - the id of the deployment
         * 
         * @returns {Promise} - the metrics
         */
        top: {
            rest: {
                method: "GET",
                path: "/deployments/:deployment/top",
            },
            params: {
                deployment: { type: "string", optional: false },
            },
            async handler(ctx) {
                const deployment = ctx.params.deployment;
                console.log(deployment)
                // resolve deployment pods
                const pods = await ctx.call("v1.k8s.deployments.pods", {
                    id: deployment
                });

                // get the metrics for each pod
                const metrics = [];

                for (let i = 0; i < pods.length; i++) {
                    const pod = pods[i];
                    const top = {
                        cpu: await this.instant(`sum(rate(container_cpu_usage_seconds_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`),
                        memory: await this.instant(`sum(container_memory_working_set_bytes{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}) by (pod,namespace)`)
                            .then((res) => {// convert to MB
                                return res.map((item) => {
                                    item.value = item.value / 1024 / 1024;
                                    return item;
                                });
                            }),
                        tx: await this.instant(`sum(rate(container_network_transmit_bytes_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`),
                        rx: await this.instant(`sum(rate(container_network_receive_bytes_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`),

                    }
                    metrics.push(top);
                }

                return metrics;
            }
        },

        /**
         * deployment pod memory usage
         * 
         * @actions
         * @param {String} deployment - the id of the deployment
         * 
         * @returns {Promise} - the metrics
         */
        deploymentMemory: {
            rest: {
                method: "GET",
                path: "/deployments/:deployment/memory",
            },
            params: {
                deployment: { type: "string", optional: false },
            },
            async handler(ctx) {
                const deployment = ctx.params.deployment;

                // resolve deployment pods
                const pods = await ctx.call("v1.k8s.deployments.pods", {
                    id: deployment
                });

                // get the metrics for each pod
                const metrics = [];

                for (let i = 0; i < pods.length; i++) {
                    const pod = pods[i];
                    const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                    const end = new Date();
                    const step = 1 * 60 * 60; // 1 point every 6 hours
                    // query avrage memory usage
                    const query = `avg(container_memory_working_set_bytes{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}) by (pod,namespace)`;
                    const result = await this.prom.rangeQuery(query, start, end, step)
                        .then((res) => res.result[0])
                    if (!result) {
                        continue;
                    }
                    const memory = {
                        metric: result.metric.labels,
                        value: result.values.map(this.toMB)
                    }
                    metrics.push(memory);
                }

                return metrics;
            }
        },

        /**
         * deployment pod cpu usage
         * 
         * @actions
         * @param {String} deployment - the id of the deployment
         * 
         * @returns {Promise} - the metrics
         */
        deploymentCPU: {
            rest: {
                method: "GET",
                path: "/deployments/:deployment/cpu",
            },
            params: {
                deployment: { type: "string", optional: false },
            },
            async handler(ctx) {
                const deployment = ctx.params.deployment;

                // resolve deployment pods
                const pods = await ctx.call("v1.k8s.deployments.pods", {
                    id: deployment
                });

                // get the metrics for each pod
                const metrics = [];

                for (let i = 0; i < pods.length; i++) {
                    const pod = pods[i];
                    const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                    const end = new Date();
                    const step = 1 * 60 * 60; // 1 point every 6 hours
                    // query avrage memory usage
                    const query = `avg(rate(container_cpu_usage_seconds_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`;
                    const result = await this.prom.rangeQuery(query, start, end, step)
                        .then((res) => res.result[0])
                    if (!result) {
                        continue;
                    }
                    const cpu = {
                        metric: result.metric.labels,
                        value: result.values.map(this.toPercent)
                    }
                    metrics.push(cpu);
                }

                return metrics;
            }
        },




        /**
         * deployment pod network usage
         * 
         * @actions
         * @param {String} deployment - the id of the deployment
         * 
         * @returns {Promise} - the metrics
         */
        deploymentNetwork: {
            rest: {
                method: "GET",
                path: "/deployments/:deployment/network",
            },
            params: {
                deployment: { type: "string", optional: false },
            },
            async handler(ctx) {
                const deployment = ctx.params.deployment;

                // resolve deployment pods
                const pods = await ctx.call("v1.k8s.deployments.pods", {
                    id: deployment
                });

                // get the metrics for each pod
                const metrics = [];

                for (let i = 0; i < pods.length; i++) {
                    const pod = pods[i];
                    const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                    const end = new Date();
                    const step = 1 * 60 * 60; // 1 point every 6 hours
                    // query avrage memory usage
                    const txQuery = `avg(rate(container_network_transmit_bytes_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`;
                    const rxQuery = `avg(rate(container_network_receive_bytes_total{pod="${pod.metadata.name}",namespace="${pod.metadata.namespace}"}[1m])) by (pod,namespace)`;
                    const txResult = await this.prom.rangeQuery(txQuery, start, end, step)
                        .then((res) => res.result[0])
                    const rxResult = await this.prom.rangeQuery(rxQuery, start, end, step)
                        .then((res) => res.result[0])
                    if (!txResult || !rxResult) {
                        continue;
                    }
                    const tx = {
                        metric: txResult.metric.labels,
                        value: txResult.values.map(this.toKB)
                    };
                    const rx = {
                        metric: rxResult.metric.labels,
                        value: rxResult.values.map(this.toKB)
                    };
                    metrics.push({ tx, rx });
                }

                return metrics;
            }
        },

        /**
         * namespace memory usage over time
         * 
         * @actions
         * @param {String} namespace - the id of the namespace
         * 
         * @returns {Promise} - the metrics
         */
        namespaceMemory: {
            rest: {
                method: "GET",
                path: "/namespaces/:namespace/memory",
            },
            params: {
                namespace: { type: "string", optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // resolve namespace
                const namespace = await ctx.call("v1.k8s.namespaces.get", {
                    id: params.namespace
                });

                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query avrage memory usage
                const query = `avg(container_memory_working_set_bytes{namespace="${namespace.name}"}) by (namespace)`;
                const result = await this.prom.rangeQuery(query, start, end, step)
                    .then((res) => {
                        console.log(res)

                        return res.result[0]
                    })
                if (!result) {
                    return [];
                }
                const memory = {
                    metric: result.metric.labels,
                    value: result.values.map(this.toMB)
                }

                return memory;
            }
        },

        /**
         * namespace cpu usage over time
         * 
         * @actions
         * @param {String} namespace - the id of the namespace
         * 
         * @returns {Promise} - the metrics
         */
        namespaceCPU: {
            rest: {
                method: "GET",
                path: "/namespaces/:namespace/cpu",
            },
            params: {
                namespace: { type: "string", optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // resolve namespace
                const namespace = await ctx.call("v1.k8s.namespaces.get", {
                    id: params.namespace
                });

                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query avrage memory usage
                const query = `avg(rate(container_cpu_usage_seconds_total{namespace="${namespace.name}"}[1m])) by (namespace)`;
                const result = await this.prom.rangeQuery(query, start, end, step)
                    .then((res) => res.result[0])
                if (!result) {
                    return [];
                }
                const cpu = {
                    metric: result.metric.labels,
                    value: result.values.map(this.toPercent)
                }

                return cpu;
            }
        },

        /**
         * namespace network usage over time
         * 
         * @actions
         * @param {String} namespace - the id of the namespace
         * 
         * @returns {Promise} - the metrics
         */
        namespaceNetwork: {
            rest: {
                method: "GET",
                path: "/namespaces/:namespace/network",
            },
            params: {
                namespace: { type: "string", optional: false },
            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                // resolve namespace
                const namespace = await ctx.call("v1.k8s.namespaces.get", {
                    id: params.namespace
                });

                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query network usage tx rx
                const txQuery = `avg(rate(container_network_transmit_bytes_total{namespace="${namespace.name}"}[1m])) by (namespace)`;
                const rxQuery = `avg(rate(container_network_receive_bytes_total{namespace="${namespace.name}"}[1m])) by (namespace)`;
                const txResult = await this.prom.rangeQuery(txQuery, start, end, step)
                    .then((res) => res.result[0]);
                const rxResult = await this.prom.rangeQuery(rxQuery, start, end, step)
                    .then((res) => res.result[0]);
                if (!txResult || !rxResult) {
                    return [];
                }
                const tx = {
                    metric: txResult.metric.labels,
                    value: txResult.values.map(this.toKB)
                };
                const rx = {
                    metric: rxResult.metric.labels,
                    value: rxResult.values.map(this.toKB)
                };

                return { tx, rx };
            }
        },


        /**
         * cluster metric memory
         * 
         * @actions
         * 
         * @returns {Promise} - the metrics
         */
        clusterMemory: {
            rest: {
                method: "GET",
                path: "/cluster/memory",
            },
            async handler(ctx) {
                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query avrage memory usage
                const query = `sum(container_memory_working_set_bytes)`;
                const result = await this.prom.rangeQuery(query, start, end, step)
                    .then((res) => {
                        console.log(res)

                        return res.result[0]
                    })
                if (!result) {
                    return [];
                }
                const memory = {
                    metric: result.metric.labels,
                    value: result.values.map(this.toMB)
                }

                return memory;
            }
        },

        /**
         * cluster metric cpu
         * 
         * @actions
         * @param {String} namespace - the id of the namespace
         * 
         * @returns {Promise} - the metrics
         */
        clusterCPU: {
            rest: {
                method: "GET",
                path: "/cluster/cpu",
            },
            async handler(ctx) {
                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query avrage memory usage
                const query = `sum(rate(container_cpu_usage_seconds_total[1m]))`;
                const result = await this.prom.rangeQuery(query, start, end, step)
                    .then((res) => res.result[0])
                if (!result) {
                    return [];
                }
                const cpu = {
                    metric: result.metric.labels,
                    value: result.values.map(this.toPercent)
                }

                return cpu;
            }
        },

        /**
         * cluster metric network
         * 
         * @actions
         * 
         * @returns {Promise} - the metrics
         */
        clusterNetwork: {
            rest: {
                method: "GET",
                path: "/cluster/network",
            },
            async handler(ctx) {
                const start = new Date().getTime() - 24 * 60 * 60 * 1000;
                const end = new Date();
                const step = 1 * 60 * 60; // 1 point every 6 hours
                // query network usage tx rx
                const txQuery = `sum(rate(container_network_transmit_bytes_total[1m]))`;
                const rxQuery = `sum(rate(container_network_receive_bytes_total[1m]))`;
                const txResult = await this.prom.rangeQuery(txQuery, start, end, step)
                    .then((res) => res.result[0]);
                const rxResult = await this.prom.rangeQuery(rxQuery, start, end, step)
                    .then((res) => res.result[0]);
                if (!txResult || !rxResult) {
                    return [];
                }
                const tx = {
                    metric: txResult.metric.labels,
                    value: txResult.values.map(this.toKB)
                };
                const rx = {
                    metric: rxResult.metric.labels,
                    value: rxResult.values.map(this.toKB)
                };

                return { tx, rx };
            }
        },
    },

    /**
     * service events
     */
    events: {

    },

    /**
     * service methods
     */
    methods: {
        /**
         * convert to MB
         * 
         * @param {Number} value - the value to convert
         * 
         * @returns {Number} - the converted value
         */
        toMB(item) {
            return {
                time: item.time,
                value: Number((item.value / 1024 / 1024).toFixed(2))
            };
        },

        /**
         * convert to KB
         * 
         * @param {Number} value - the value to convert
         * 
         * @returns {Number} - the converted value
         */
        toKB(item) {
            return {
                time: item.time,
                value: Number((item.value / 1024).toFixed(2))// convert to KB
            };
        },

        /**
         * convert to percent
         * 
         * @param {Number} value - the value to convert
         * 
         * @returns {Number} - the converted value
         */
        toPercent(item) {
            return {
                time: item.time,
                value: Number((item.value * 100).toFixed(2))// convert to percent
            }
        },

        /**
         * Get the metrics for the given instant query
         * 
         * @param {String} query - the query to run
         * 
         * @returns {Promise} - the metrics
         */
        async instant(query) {
            if (!this.prom) {
                throw new MoleculerClientError("Prometheus is not enabled", 400, "PROMETHEUS_NOT_ENABLED");
            }

            return await this.prom.instantQuery(query)
                .then((res) => {
                    // loop through the results and format them
                    let results = [];
                    for (let i = 0; i < res.result.length; i++) {
                        let result = res.result[i];
                        let metric = result.metric.labels;
                        let value = result?.value.value
                        results.push({
                            metric: metric,
                            value: value,
                        });
                    }
                    return results;
                })
        },
    },

    started() {
        if (this.config["k8s.metrics.enabled"]) {
            this.prom = new PrometheusDriver({
                endpoint: this.config["k8s.metrics.endpoint"],
            });
        }
    }


}



