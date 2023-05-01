"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
    name: "k8s",
    version: 1,

    mixins: [
        ConfigLoader(['k8s.**'])
    ],

    /**
     * Service dependencies
     */
    dependencies: [

    ],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/k8s/",

    },

    /**
     * Actions
     */

    actions: {

        listNodes: {
            rest: 'GET /nodes',
            params: {

            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return ctx.call('v1.kube.find', {
                    kind: 'Node'
                })
            }
        },
        nodeMetrics: {
            rest: 'GET /nodes-metrics',
            params: {

            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);
                return ctx.call('v1.kube.find', {
                    kind: 'Node',
                    fields:['metadata.name']
                })
            }
        },
        billing: {
            rest: 'GET /billing',
            params: {

            },
            async handler(ctx) {
                const params = Object.assign({}, ctx.params);

                const bills = []
                const namespaces = await ctx.call('v1.namespaces.find')


                for (let index = 0; index < namespaces.length; index++) {
                    const namespace = namespaces[index];
                    const deployments = await ctx.call('v1.namespaces.deployments.find', {
                        namespace: namespace.id
                    })

                    for (let i = 0; i < deployments.length; i++) {
                        const deployment = deployments[i];
                        const time = Date.now() - deployment.createdAt
                        const hours = time / 1000 / 60 / 60

                        bills.push({
                            name: `bill-${deployment.id}-${deployment.name}`,
                            hours,
                            cost: hours * 0.015
                        })
                        console.log(deployments)
                    }


                }

                return bills
            }
        },
    },

    /**
     * Events
     */
    events: {

    },

    /**
     * Methods
     */
    methods: {

    },

    /**
     * Service created lifecycle event handler
     */
    created() { },

    /**
     * Service started lifecycle event handler
     */
    started() { },


    /**
     * Service stopped lifecycle event handler
     */
    stopped() { }
};
