"use strict";



const DbService = require("db-mixin");
const Membership = require("membership-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

/**
 * this service maanges k8s vhost routes for deployment services
 */
module.exports = {
    name: "k8s.routes",
    version: 1,

    mixins: [
        DbService({
            permissions: "k8s.routes"
        }),
        Membership({
            permissions: "k8s.routes"
        }),
        ConfigLoader(['k8s.**'])
    ],

    /**
     * Service dependencies
     */
    dependencies: [
        {
            name: "kube",
            version: 1
        }
    ],

    /**
     * Service settings
     */
    settings: {
        rest: "/v1/k8s/routes/",

        fields: {
            vHost: {
                type: "string",
                required: true,
            },
            namespace: {
                type: "string",
                required: true,
                populate: {
                    action: "v1.k8s.namespaces.resolve",
                },
            },
            deployment: {
                type: "string",
                required: true,
                populate: {
                    action: "v1.k8s.deployments.resolve",
                },
            },
            route: {
                type: "string",
                required: true,
                populate: {
                    action: "v1.routes.resolve",
                    params: {
                        scaope: false,
                    }
                },
            },
            record: {
                type: "string",
                required: false,
                populate: {
                    action: "v1.domains.records.resolve",
                    params: {
                        scaope: false,
                    }
                },
            },
            hosts: {
                type: 'array',
                items: "string",
                optional: true,
                default: [],
                populate: {
                    action: "v1.routes.hosts.resolve",
                    params: {
                        fields: ["id", "hostname", "port"]
                    }
                }
            },

            ...DbService.FIELDS,// inject dbservice fields
            ...Membership.FIELDS,// inject membership fields
        },
        defaultPopulates: [],

        scopes: {
            ...DbService.SCOPE,
            ...Membership.SCOPE,
        },

        defaultScopes: [...DbService.DSCOPE, ...Membership.DSCOPE],

        // default init config settings
        config: {
            "k8s.routes.router": "1.1.1.1"
        }
    },

    /**
     * Actions
     */

    actions: {

    },

    /**
     * Events
     */
    events: {
        /**
         * service created event
         */
        "k8s.routes.created": {
            async handler(ctx) {
                const service = ctx.params.data;
                await this.processRouteCreate(ctx, service);
            }
        },
        /**
         * service removed event
         */
        "k8s.routes.removed": {
            async handler(ctx) {
                const service = ctx.params.data;
                await this.processRouteRemove(ctx, service);
            }
        },

        /**
         * services created event 
         */
        "k8s.services.processed": {
            async handler(ctx) {
                const service = ctx.params;
                const options = { meta: { userID: service.owner } }

                const deploymant = await ctx.call('v1.k8s.deployments.resolve', {
                    id: service.deployment
                }, options);

                await this.processServiceCreate(ctx, deploymant, service);
            }
        },

        /**
         * services removed event
         */
        "k8s.services.removed": {
            async handler(ctx) {
                const service = ctx.params.data;

                const options = { meta: { userID: service.owner } }

                const deployment = await ctx.call('v1.k8s.deployments.resolve', {
                    id: service.deployment,
                    scope: '-notDeleted'
                }, options);

                await this.processServiceDelete(ctx, deployment, service);
            }
        },
    },

    /**
     * Methods
     */
    methods: {

        /**
         * process service create
         * 
         * @param {Object} ctx - context object
         * @param {Object} deployment - deployment object
         * 
         * @requires {Promise} - returns created deployment
         */
        async processServiceCreate(ctx, deployment, service) {
            const options = { meta: { userID: deployment.owner } }
            // resolve namespace
            const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
                id: deployment.namespace
            }, options);
            // resolve image
            const image = await ctx.call('v1.k8s.images.resolve', {
                id: deployment.image
            }, options);

            // resolve service ports
            const servicePorts = service.ports.filter(port => port.protocol === 'HTTP');
            // resolve clusterIP
            const hostname = await ctx.call('v1.k8s.services.spec', {
                id: service.id
            }, options).then((spec) => spec.clusterIP);

            for (let index = 0; index < deployment.vHosts.length; index++) {
                const vHost = deployment.vHosts[index];
                for (let index = 0; index < servicePorts.length; index++) {
                    const port = servicePorts[index];
                    let vertualHost = vHost;

                    // resolve subdomain if exists and add to vHost
                    if (port.subdomain) {
                        vertualHost = `${port.subdomain}.${vHost}`;
                    } else {
                        vertualHost = `${vHost}`;
                    }

                    await this.createOrUpdateRoute(ctx, deployment, vertualHost, options)
                        .then((route) => this.createOrUpdateHost(ctx, namespace, route, {
                            hostname: hostname,
                            port: port.port
                        }, options))
                }
            }
        },
        /**
         * process service delete
         * 
         * @param {Object} ctx - context object
         * @param {Object} deployment - deployment object
         * @param {Object} service - service object
         * 
         * @requires {Promise} - returns deleted deployment
         */
        async processServiceDelete(ctx, deployment, service) {
            const options = { meta: { userID: deployment.owner } };

            // resolve routes
            const routes = await this.findEntities(ctx, {
                query: {
                    deployment: deployment.id,
                    namespace: deployment.namespace
                }
            })


            for (let index = 0; index < routes.length; index++) {
                const { id, route } = routes[index];

                await ctx.call('v1.routes.remove', {
                    id: route
                }, options);

                await this.removeEntity(ctx, { id });

                this.logger.info(`Remove route ${route} id ${id} on deployment ${deployment.id}`)
            }
        },
        /**
         * create or update route
         * 
         * @param {Object} ctx - context object
         * @param {Object} deployment - deployment object
         * @param {String} vHost - vHost
         * 
         * @requires {Promise} - returns created or updated route
         */
        async createOrUpdateRoute(ctx, deployment, vHost, options) {

            //resolve route
            const found = await ctx.call('v1.routes.resolveRoute', {
                vHost
            }, options);

            if (found) {
                const entity = await ctx.call('v1.k8s.routes.create', {
                    vHost,
                    route: found.id,
                    deployment: deployment.id,
                    namespace: deployment.namespace
                }, options);
                this.logger.info(`Found route ${found.id} id ${entity.id} on deployment ${deployment.id}`)
                return entity;
            } else {
                const route = await ctx.call('v1.routes.create', {
                    vHost
                }, options);
                const entity = await ctx.call('v1.k8s.routes.create', {
                    vHost,
                    route: route.id,
                    deployment: deployment.id,
                    namespace: deployment.namespace
                }, options)
                this.logger.info(`Add new route ${route.id} id ${entity.id} on deployment ${deployment.id}`)
                return entity;
            }
        },
        /**
         * create or update host
         * 
         * 
         */
        async createOrUpdateHost(ctx, namespace, entity, port, options) {
            const query = {
                hostname: port.hostname,
                port: port.port,
                cluster: namespace.cluster,
                route: entity.route
            }

            return ctx.call('v1.routes.hosts.resolveHost', query, options)
                .then((found) => found ? found :
                    ctx.call('v1.routes.hosts.create', query, options)
                        .then((host) => this.updateEntity(ctx, {
                            id: entity.id,
                            $addToSet: {
                                hosts: host.id
                            },
                        }, { raw: true }))
                )
        },
        /**
         * process route create
         * 
         * @param {Object} ctx - context object
         * @param {Object} route - route object
         * 
         * @requires {Promise} - returns created route
         */
        async processRouteCreate(ctx, route) {

            const router = this.config['k8s.routes.router'];

            // create dns record
            const record = await ctx.call('v1.domains.records.create', {
                fqdn: route.vHost,
                type: 'A',
                data: router,
                ttl: 300
            }, { meta: { userID: route.owner } });

            // update route record
            await this.updateEntity(ctx, {
                id: route.id,
                record: record.id
            });

            this.logger.info(`Add new dns route ${route.id} id ${route.id} on deployment ${route.deployment}`)
        },

        /**
         * process route remove
         * 
         * @param {Object} ctx - context object
         * @param {Object} route - route object
         * 
         * @requires {Promise} - returns removed route
         */
        async processRouteRemove(ctx, route) {

            // remove dns record
            await ctx.call('v1.domains.records.remove', {
                id: route.record
            }, { meta: { userID: route.owner } });

            this.logger.info(`Remove dns route ${route.id} id ${route.id} on deployment ${route.deployment}`);
        },

        /**
         * resolve routes
         * 
         * @param {Object} ctx - context object
         * @param {Object} deployment - deployment object
         * 
         * @requires {Promise} - returns resolved routes
         */
        async resolveRoutes(ctx, deployment) {
            const options = { meta: { userID: deployment.owner } }
            const routes = [];

            // get routes
            for (const routeID of deployment.routes) {

                const route = await ctx.call('v1.routes.resolve', { id: routeID }, options);
                routes.push(route);

            }

            return routes;
        }
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
