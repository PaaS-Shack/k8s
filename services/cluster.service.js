"use strict";

// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

/**
 * This service manages the kubernetes clusters and the avalable feature sets
 * that each cluster might have.
 * 
 * 
 */



module.exports = {
    // name of service
    name: "k8s.clusters",
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
        DbService({}),
        Membership({}),
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
        rest: "v1/k8s/clusters",

        fields: {

            // the name of the cluster
            name: {
                type: "string",
                required: true,
            },

            // the description of the cluster
            description: {
                type: "string",
                required: false,
                max: 255,
                trim: true,
            },

            // the kubernetes api endpoint
            endpoint: {
                type: "string",
                required: true,
            },

            // cluster zones (e.g. ca, usa etc)
            zones: {
                type: "array",
                required: false,
                default: [],
                items: "string",
            },

            // cluster routers
            routers: {
                type: "array",
                required: false,
                default: [],
                items: {
                    type: "object",
                    props: {
                        // the name of the router
                        name: {
                            type: "string",
                            required: true,
                        },
                        // the description of the router
                        description: {
                            type: "string",
                            required: false,
                            max: 255,
                            trim: true,
                        },
                        // the router ipv4 address
                        ipv4: {
                            type: "string",
                            required: true,
                        },
                        // the router ipv6 address
                        ipv6: {
                            type: "string",
                            required: false,
                        },
                        // the zone of the router (e.g. ca, usa etc)
                        zone: {
                            type: "string",
                            required: false,
                        },
                    }
                }
            },

            // cluster storage devices
            storage: {
                type: "array",
                required: false,
                default: [],
                items: "string",
                populate: {
                    action: "v1.storage.nfs.get",
                }
            },

            // cluster monitoring endpoint
            monitoring: {
                type: "string",
                required: false,
            },

            // cluster logging endpoint
            logging: {
                type: "string",
                required: false,
            },

            // cluster feature sets
            features: {
                type: "array",
                required: false,
                default: [],
                items: "string",
                enum: [
                    "k8s",
                    "router",
                    "storage",
                    "monitoring",
                    "logging",
                    "registry",
                    "dns",
                ]
            },



            ...DbService.FIELDS,// inject dbservice fields
        },

        // default database populates
        defaultPopulates: [],

        // database scopes
        scopes: {
            ...DbService.SCOPE,// inject dbservice scope
        },

        // default database scope
        defaultScopes: [
            ...DbService.DSCOPE,// inject dbservice dscope
        ],

        // default init config settings
        config: {

        }
    },

    /**
     * service actions
     */
    actions: {
        /**
         * add zone to cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} zone - zone name
         * 
         * @returns {Object} cluster
         */
        addZone: {
            rest: {
                method: "POST",
                path: "/:id/zone",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                zone: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, zone } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.zones.indexOf(zone) === -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $addToSet: {
                            zones: zone,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * remove zone from cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} zone - zone name
         * 
         * @returns {Object} cluster
         */
        removeZone: {
            rest: {
                method: "DELETE",
                path: "/:id/zone",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                zone: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, zone } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.zones.indexOf(zone) !== -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $pull: {
                            zones: zone,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * add router to cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {Object} router - router object
         * 
         * @returns {Object} cluster
         */
        addRouter: {
            rest: {
                method: "POST",
                path: "/:id/router",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                // the name of the router
                name: {
                    type: "string",
                    required: true,
                },
                // the description of the router
                description: {
                    type: "string",
                    required: false,
                    max: 255,
                    trim: true,
                },
                // the router ipv4 address
                ipv4: {
                    type: "string",
                    required: true,
                },
                // the router ipv6 address
                ipv6: {
                    type: "string",
                    required: false,
                },
                // the zone of the router (e.g. ca, usa etc)
                zone: {
                    type: "string",
                    required: false,
                },
            },
            async handler(ctx) {
                const { id, name, description, ipv4, ipv6, zone } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.routers.findIndex(r => r.name === router.name) === -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $addToSet: {
                            routers: {
                                name,
                                description,
                                ipv4,
                                ipv6,
                                zone,
                            },
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * remove router from cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} name - router name
         * 
         * @returns {Object} cluster
         */
        removeRouter: {
            rest: {
                method: "DELETE",
                path: "/:id/router",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                name: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, name } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.routers.findIndex(r => r.name === router.name) !== -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        routers: routers.filter(r => r.name !== name),
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * add storage to cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} storage - storage id
         * 
         * @returns {Object} cluster
         */
        addStorage: {
            rest: {
                method: "POST",
                path: "/:id/storage",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                storage: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, storage } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }

                const server = await ctx.call("v1.storage.nfs.resolve", { id: storage });

                // check if storage exists
                if (!server) {
                    throw new MoleculerClientError("Storage not found", 404);
                }

                if (cluster.storage.indexOf(storage) === -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $addToSet: {
                            storage,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * remove storage from cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} storage - storage id
         * 
         * @returns {Object} cluster
         */
        removeStorage: {
            rest: {
                method: "DELETE",
                path: "/:id/storage",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                storage: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, storage } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.storage.indexOf(storage) !== -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $pull: {
                            storage,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * add feature to cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} feature - feature name
         * 
         * @returns {Object} cluster
         */
        addFeature: {
            rest: {
                method: "POST",
                path: "/:id/feature",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                feature: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, feature } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.features.indexOf(feature) === -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $addToSet: {
                            features: feature,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * remove feature from cluster
         * 
         * @actions
         * @param {String} id - cluster id
         * @param {String} feature - feature name
         * 
         * @returns {Object} cluster
         */
        removeFeature: {
            rest: {
                method: "DELETE",
                path: "/:id/feature",
            },
            params: {
                id: {
                    type: "string",
                    required: true,
                },
                feature: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { id, feature } = ctx.params;
                const cluster = await this.getById(id);
                if (!cluster) {
                    throw new MoleculerClientError("Cluster not found", 404);
                }
                if (cluster.features.indexOf(feature) !== -1) {
                    return this.updateEntity(ctx, {
                        id: cluster.id,
                        $pull: {
                            features: feature,
                        }
                    }, { raw: true });
                }
                return cluster;
            },
        },

        /**
         * get cluster by name
         * 
         * @actions
         * @param {String} name - cluster name
         * 
         * @returns {Object} cluster
         */
        getByName: {
            rest: {
                method: "GET",
                path: "/name/:name",
            },
            params: {
                name: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { name } = ctx.params;
                return this.findByName(ctx, name);
            },
        },

        /**
         * get cluster by endpoint
         * 
         * @actions
         * @param {String} endpoint - cluster endpoint
         * 
         * @returns {Object} cluster
         */
        getByEndpoint: {
            rest: {
                method: "GET",
                path: "/endpoint/:endpoint",
            },
            params: {
                endpoint: {
                    type: "string",
                    required: true,
                },
            },
            async handler(ctx) {
                const { endpoint } = ctx.params;
                return this.findByEndpoint(ctx, endpoint);
            },
        },


    },

    /**
     * service events
     */
    events: {
        /**
         * node created event - enable node features
         * 
         * @param {Object} node - node object
         * 
         * @returns {Object} node
         */
        async "k8s.nodes.created"(ctx) {
            const node = ctx.params.data;

            // get cluster
            const cluster = await this.getById(node.cluster);

            // check if cluster exists
            if (!cluster) {
                throw new MoleculerClientError("Cluster not found", 404);
            }

            // check if node exists
            if (!node) {
                throw new MoleculerClientError("Node not found", 404);
            }

            // check if node has router feature
            const isEligible = await this.needsRouter(ctx, cluster, node);

            // check if node has router feature
            if (isEligible) {
                // assign router to cluster
                await ctx.call("v1.k8s.clusters.addRouter", {
                    id: cluster.id,
                    name: node.name,
                    description: "router",
                    ipv4: node.public.find(ip => ip.type === 'ipv4').address,
                    ipv6: node.public.find(ip => ip.type === 'ipv6').address,
                    zone: node.zone,
                });
            }

            // check if node has storage feature
            const isEligibleForStorage = await this.needsStorage(ctx, cluster, node);

            // check if node has storage feature
            if (isEligibleForStorage) {
                // assign storage to cluster
                await ctx.call("v1.k8s.clusters.addStorage", {
                    id: cluster.id,
                    storage: node.storage[0],
                });
            }

        }
    },

    /**
     * service methods
     */
    methods: {
        /**
         * porcess node eligiblity as feature node
         * 
         * @param {Context} ctx - context of request call
         * @param {Object} cluster - cluster object
         * @param {Object} node - node object
         * 
         * @returns {Boolean} true if node is eligible
         */
        async porcessEligible(ctx, cluster, node) {


        },

        /**
         * cluster needs
         * 
         * @param {Context} ctx - context of request call
         * @param {Object} cluster - cluster object
         * 
         * @returns {Array} features
         */
        async needs(ctx, cluster) {
            const features = [];
            if (cluster.features.indexOf("router") !== -1) {
                features.push("router");
            }
            if (cluster.features.indexOf("storage") !== -1) {
                features.push("storage");
            }
            return features;
        },
        /**
         * get by id
         * 
         * @param {String} id - cluster id
         * 
         * @returns {Object} cluster
         */
        async getById(id) {
            return this.resolveEntities(null, { id });
        },
        /**
         * find cluster by name
         * 
         * @param {Context} ctx - context of request call
         * @param {String} name - cluster name
         * 
         * @returns {Object} cluster
         */
        async findByName(ctx, name) {
            return this.findEntity(null, { query: { name } });
        },

        /**
         * find cluster by endpoint
         * 
         * @param {Context} ctx - context of request call
         * @param {String} endpoint - cluster endpoint
         * 
         * @returns {Object} cluster
         */
        async findByEndpoint(ctx, endpoint) {
            return this.findEntity(null, { query: { endpoint } });
        },

        /**
         * cluster needs router feature
         * only assign router to cluster if not already assigned and avalable
         * node has router public ip address
         * 
         * @param {Context} ctx - context of request call
         * @param {Object} cluster - cluster object
         * @param {Object} node - node object
         * 
         * @returns {Boolean} true if router assigned
         */
        async needsRouter(ctx, cluster, node) {
            if (cluster.features.indexOf("router") === -1) {
                return false;
            }
            const replicas = this.config['k8s.cluster.router.replicas'];
            if (cluster.routers.length >= replicas) {
                return false;
            }
            if (node.public.length === 0) {
                return false;
            }
            return true;
        },

        /**
         * cluster needs storage feature
         * only assign storage to cluster if not already assigned and avalable
         * node has storage devices
         * 
         * @param {Context} ctx - context of request call
         * @param {Object} cluster - cluster object
         * @param {Object} node - node object
         * 
         * @returns {Boolean} true if storage assigned
         */
        async needsStorage(ctx, cluster, node) {
            if (cluster.features.indexOf("storage") === -1) {
                return false;
            }
            const replicas = this.config['k8s.cluster.storage.replicas'];
            if (cluster.storage.length >= replicas) {
                return false;
            }
            if (node.storage.length === 0) {
                return false;
            }
            return true;
        }


    },
    created() {

    }


}



