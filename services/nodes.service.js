
// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { Context } = require("moleculer");
const { MoleculerClientError } = require("moleculer").Errors;

/**
 * k8s cluster node service manages the nodes in a cluster.
 */

module.exports = {
    // name of service
    name: "k8s.nodes",
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
        DbService({
            permissions: "k8s.nodes"
        }),
        ConfigLoader(['k8s.**']),
    ],

    /**
     * Service dependencies
     */
    dependencies: [
        "k8s.cluster"
    ],

    /**
     * Service settings
     * 
     * @type {Object}
     */
    settings: {
        rest: "v1/k8s/nodes",

        fields: {
            cluster: {
                type: "string",
                required: true,
                description: "The cluster id that this node belongs to."
            },
            uid: {
                type: "string",
                required: true,
                description: "The unique id of the node."
            },
            name: {
                type: "string",
                required: true,
                description: "The name of the node."
            },
            online: {
                type: "boolean",
                description: "True if the node is online.",
                default: false
            },
            zone: {
                type: "string",
                description: "The zone of the node.",
                default: "default",
                required: false,
            },
            roles: {
                type: "array",
                description: "The roles of the node.",
                default: [],
                required: false,
                items: "string"
            },
            cordon: {
                type: "boolean",
                description: "True if the node is cordoned.",
                default: false,
                required: false,
                readonly: true,
            },
            addresses: {
                type: "array",
                description: "The addresses for the node.",
                default: [],
                required: false,
                items: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            description: "The type of address.",
                            enum: ["InternalIP", "ExternalIP", "Hostname"]
                        },
                        address: {
                            type: "string",
                            description: "The address."
                        }
                    }
                }
            },
            status: {
                type: "object",
                description: "The status of the node.",
                readonly: true,
                populate: {
                    action: function (ctx, values, entities, field) {
                        return Promise.all(entities.map(async (entity) => {
                            return ctx.call("v1.kube.findOne", {
                                metadata: {
                                    uid: entity.uid
                                },
                                fields: ["status"]
                            });
                        }));
                    }
                }
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
         * add role to node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} role - The role to add to the node.
         * 
         * @returns {Object} - The updated node.
         */
        addRole: {
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                role: {
                    type: "string",
                    description: "The role to add to the node."
                }
            },
            async handler(ctx) {
                // get node
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                // update node
                return this.updateEntity(ctx, {
                    id: node.id,
                    $addToSet: {
                        roles: ctx.params.role
                    }
                }, { raw: true });
            }
        },

        /**
         * remove role from node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} role - The role to remove from the node.
         * 
         * @returns {Object} - The updated node.
         */
        removeRole: {
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                role: {
                    type: "string",
                    description: "The role to remove from the node."
                }
            },
            async handler(ctx) {
                // get node
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                // update node
                return this.updateEntity(ctx, {
                    id: node.id,
                    $pull: {
                        roles: ctx.params.role
                    }
                }, { raw: true });
            }
        },

        /**
         * cordoned node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The updated node.
         */
        cordon: {
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                // get node
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                // check if node is online
                if (!node.online) {
                    throw new MoleculerClientError("Node is offline.", 409);
                }

                // check if node is already cordoned
                if (node.cordon) {
                    throw new MoleculerClientError("Node is already cordoned.", 409);
                }

                // get cluster
                const cluster = await ctx.call("v1.k8s.cluster.get", { id: node.cluster });

                // patch node
                await ctx.call("v1.kube.patchNode", {
                    name: node.name,
                    body: {
                        spec: {
                            unschedulable: true
                        }
                    },
                    cluster: cluster.name
                });

                // update node
                return this.updateEntity(ctx, {
                    id: node.id,
                    cordon: true
                }, { raw: true });
            }
        },

        /**
         * uncordoned node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The updated node.
         */
        uncordon: {
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                // get node
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                // check if node is online
                if (!node.online) {
                    throw new MoleculerClientError("Node is offline.", 409);
                }

                // check if node is already uncordoned
                if (!node.cordon) {
                    throw new MoleculerClientError("Node is already uncordoned.", 409);
                }

                // get cluster
                const cluster = await ctx.call("v1.k8s.cluster.get", { id: node.cluster });

                // patch node
                await ctx.call("v1.kube.patchNode", {
                    name: node.name,
                    body: {
                        spec: {
                            unschedulable: false
                        }
                    },
                    cluster: cluster.name
                });

                // update node
                return this.updateEntity(ctx, {
                    id: node.id,
                    cordon: false
                }, { raw: true });
            }
        }
    },

    /**
     * service events
     */
    events: {
        async "kube.nodes.added"(ctx) {
            const node = ctx.params;
            // check if node exists
            await this.updateNode(ctx, node)
                .then(node => {
                    this.logger.info(`Node ${node.name} added.`);
                })
                .catch(err => {
                    this.logger.error(err);
                });

        },
        async "kube.nodes.modified"(ctx) {
            const node = ctx.params;
            // check if node exists
            await this.updateNode(ctx, node)
                .then(node => {
                    this.logger.info(`Node ${node.name} modified.`);
                })
                .catch(err => {
                    this.logger.error(err);
                });

        },
        async "kube.nodes.deleted"(node) {
            const node = ctx.params;
            // check if node exists
            await this.deleteNode(ctx, node)
                .then(node => {
                    this.logger.info(`Node ${node.name} added.`);
                })
                .catch(err => {
                    this.logger.error(err);
                });

        },
    },

    /**
     * service methods
     */
    methods: {
        /**
         * Get the node by id.
         * 
         * @param {Context} ctx - The context of the request.
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The node.
         */
        async getById(ctx, id) {
            return this.resolveEntities(null, { id: id });
        },
        /**
         * Get the node by uid.
         * 
         * @param {String} uid - The uid of the node.
         * 
         * @returns {Object} - The node.
         */
        async getByUID(uid) {
            return this.findEntity(null, { query: { uid: uid } });
        },

        /**
         * Get the node by name.
         * 
         * @param {String} name - The name of the node.
         * 
         * @returns {Object} - The node.
         */
        async getByName(name) {
            return this.findEntity(null, { query: { name: name } });
        },

        /**
         * Check if the node exists.
         * 
         * @param {String} uid - The uid of the node.
         * 
         * @returns {Boolean} - True if the node exists.
         */
        async exists(uid) {
            return this.getByUID(uid).then(node => {
                return !!node;
            });
        },

        /**
         * create new node
         * 
         * @param {Context} ctx - The context of the request.s
         * @param {Object} node - The node to create.
         * 
         * @returns {Object} - The created node.
         */
        async createNode(ctx, node) {
            // check if node exists
            const exists = await this.exists(node.metadata.uid);
            if (exists) {
                throw new MoleculerClientError("Node already exists.", 409);
            }

            // lookup cluster
            const cluster = await ctx.call("k8s.cluster.lookup", { name: node.cluster });

            // check if cluster exists
            if (!cluster) {
                throw new MoleculerClientError("Cluster not found.", 404);
            }

            // create node
            return this.createEntity(ctx, {
                cluster: cluster.id,
                uid: node.metadata.uid,
                name: node.metadata.name
            });
        },

        /**
         * update node
         * 
         * @param {Context} ctx - The context of the request.
         * @param {Object} node - The node to update.
         * 
         * @returns {Object} - The updated node.
         */
        async updateNode(ctx, node) {
            // check if node exists
            const exists = await this.exists(node.metadata.uid);
            if (!exists) {
                await this.createNode(ctx, node);
            }
            const entity = await this.getByUID(node.metadata.uid);

            // update node
            return this.updateEntity(ctx, {
                id: entity.id,
                addresses: node.status.addresses,
                online: node.status.conditions.filter(c => c.type === "Ready").every(c => c.status === "True")
            });
        },

        /**
         * delete node
         * 
         * @param {Context} ctx - The context of the request.
         * @param {Object} node - The node to delete.
         * 
         * @returns {Object} - The deleted node.
         */
        async deleteNode(ctx, node) {
            // check if node exists
            const exists = await this.exists(node.metadata.uid);
            if (!exists) {
                throw new MoleculerClientError("Node not found.", 404);
            }

            const entity = await this.getByUID(node.metadata.uid);

            // delete node
            return this.deleteEntity(ctx, {
                id: entity.id,
            });
        },
    },

    created() { },

    async started() {
        return this.broker.call('v1.kube.find', {
            kind: "Node",
            fields: ["metadata.uid", "metadata.name", "status.addresses", "status.conditions"],
        })
            .then(async (nodes) => {
                await Promise.all(nodes.map(async (node) =>
                    this.updateNode(this.broker, node)
                ));
            });
    },

    async stopped() { },

}

