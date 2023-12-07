
// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { Context } = require("moleculer");
const { MoleculerClientError } = require("moleculer").Errors;

/** def
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
        DbService({}),
        ConfigLoader(['k8s.**']),
    ],

    /**
     * Service dependencies
     */
    dependencies: [
        {
            name: "k8s.clusters",
            version: 1
        }
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
                description: "The cluster id that this node belongs to.",
                populate: {
                    action: "v1.k8s.clusters.get"
                }
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
            enabled: {
                type: "boolean",
                description: "True if the node is enabled.",
                default: false
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

            // network addresses
            addresses: {
                type: "array",
                description: "The network addresses of the node.",
                default: [],
                required: false,
                items: {
                    type: "object",
                    props: {
                        type: {
                            type: "string",
                            description: "The type of the address.",
                            enum: ["ipv4", "ipv6", "wireguard"],
                        },
                        address: {
                            type: "string",
                            description: "The address."
                        }
                    }
                }
            },


            // cluster cidr addresses
            cidr: {
                type: "string",
                description: "The cluster cidr address of the node.",
                default: "",
                required: false,
            },

            // node storage devices
            storage: {
                type: "array",
                description: "The storage devices or folders of the node.",
                default: [],
                required: false,
                items: {
                    type: "object",
                    props: {
                        name: {
                            type: "string",
                            description: "The name of the device."
                        },
                        path: {
                            type: "string",
                            description: "The path of the device."
                        },
                        size: {
                            type: "number",
                            description: "The size of the device.",
                            default: 0,
                            required: false,
                        },
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
            "k8s.nodes.zones": [
                "ca",
                "usa",
                "europe",
                "asia",
                "africa",
                "oceania",
                "southamerica",
            ],
            "k8s.nodes.roles": [
                "compute",
                "database",
                "emails-inbound",
                "emails-outbound",
                "ftp",
                "git",
                "dns",
                "proxy",
                "storage",
                "vpn",
                "frontends"
            ],
            "k8s.nodes.label": "k8s.one-host.ca/roles-"
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
            rest: {
                method: "POST",
                path: "/:id/role",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                role: {
                    type: "string",
                    description: "The role to add to the node.",
                    empty: false
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
            rest: {
                method: "DELETE",
                path: "/:id/role/:role",
            },
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
            rest: {
                method: "POST",
                path: "/:id/cordon",
            },
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
                const cluster = await ctx.call("v1.k8s.clusters.get", { id: node.cluster });

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
            rest: {
                method: "POST",
                path: "/:id/uncordon",
            },
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
                const cluster = await ctx.call("v1.k8s.clusters.get", { id: node.cluster });

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
        },

        /**
         * add storage to node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} name - The name of the storage device.
         * @param {String} path - The path of the storage device.
         * @param {Number} size - The size of the storage device.
         * 
         * @returns {Object} - The updated node.
         */
        addStorage: {
            rest: {
                method: "POST",
                path: "/:id/storage",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                name: {
                    type: "string",
                    description: "The name of the storage device."
                },
                path: {
                    type: "string",
                    description: "The path of the storage device."
                },
                size: {
                    type: "number",
                    description: "The size of the storage device."
                }
            },
            async handler(ctx) {
                // get node
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                const storage = {
                    name: ctx.params.name,
                    path: ctx.params.path,
                    size: ctx.params.size
                }

                // update node
                return this.updateEntity(ctx, {
                    id: node.id,
                    $addToSet: {
                        storage
                    }
                }, { raw: true });
            }
        },

        /**
         * remove storage from node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} name - The name of the storage device.
         * 
         * @returns {Object} - The updated node.
         */
        removeStorage: {
            rest: {
                method: "DELETE",
                path: "/:id/storage/:name",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                name: {
                    type: "string",
                    description: "The name of the storage device."
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
                    storage: node.storage.filter(s => s.name !== ctx.params.name)
                }, { raw: true });
            }
        },

        /**
         * add address to node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} type - address type
         * @param {String} address - ip addres to add
         * 
         * @returns {Object} - The updated node.
         */
        addAddress: {
            rest: {
                method: "POST",
                path: "/:id/address",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                type: {
                    type: "string",
                    description: "The type of the address."
                },
                address: {
                    type: "string",
                    description: "The address."
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
                        addresses: {
                            type: ctx.params.type,
                            address: ctx.params.address
                        }
                    }
                }, { raw: true });
            }
        },

        /**
         * remove address from node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * @param {String} type - address type
         * @param {String} address - ip addres to remove
         * 
         * @returns {Object} - The updated node.
         */
        removeAddress: {
            rest: {
                method: "DELETE",
                path: "/:id/address/:type/:address",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                },
                type: {
                    type: "string",
                    description: "The type of the address."
                },
                address: {
                    type: "string",
                    description: "The address."
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
                    addresses: node.addresses.filter(a => a.type !== ctx.params.type && a.address !== ctx.params.address)
                });
            }
        },

        /**
         * get node labels
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The node labels.
         */
        getLabels: {
            rest: {
                method: "GET",
                path: "/:id/labels",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }

                const cluster = await ctx.call("v1.k8s.clusters.get", { id: node.cluster });

                const result = await ctx.call("v1.kube.findOne", {
                    metadata: { name: node.name },
                    kind: "Node",
                    cluster: cluster.name,
                    fields: ["metadata.labels"]
                });

                return result?.metadata?.labels;
            }
        },

        /**
         * apply labels to node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The node labels.
         */
        applyLabels: {
            rest: {
                method: "POST",
                path: "/:id/labels",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                const node = await this.getById(ctx, ctx.params.id);

                // check if node exists
                if (!node) {
                    throw new MoleculerClientError("Node not found.", 404);
                }
                const cluster = await ctx.call("v1.k8s.clusters.get", { id: node.cluster });

                const nodeLabels = await this.actions.getLabels({
                    id: ctx.params.id
                });

                // strip node labels
                for (const key in nodeLabels) {
                    if (key.startsWith(this.settings.config["k8s.nodes.label"])) {
                        delete nodeLabels[key];
                    }
                }

                const labels = await this.getLabels(node.roles);
                
                const result = await ctx.call("v1.kube.patchNode", {
                    name: node.name,
                    body: {
                        metadata: {
                            labels: {
                                ...nodeLabels,
                                ...labels
                            }
                        }
                    },
                    cluster: cluster.name
                });

                return result?.metadata?.labels;
            }
        },

        /**
         * enable node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The updated node.
         */
        enable: {
            rest: {
                method: "POST",
                path: "/:id/enable",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                return this.updateEntity(ctx, {
                    id: ctx.params.id,
                    enabled: true
                }, { raw: true });
            }
        },

        /**
         * disable node
         * 
         * @actions
         * @param {String} id - The id of the node.
         * 
         * @returns {Object} - The updated node.
         */
        disable: {
            rest: {
                method: "POST",
                path: "/:id/disable",
            },
            params: {
                id: {
                    type: "string",
                    description: "The id of the node."
                }
            },
            async handler(ctx) {
                return this.updateEntity(ctx, {
                    id: ctx.params.id,
                    enabled: false
                }, { raw: true });
            }
        },

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
                   // this.logger.info(`Node ${node.name} modified.`);
                })
                .catch(err => {
                    this.logger.error(err);
                });

        },
        async "kube.nodes.deleted"(ctx) {
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
         * get node labels from features
         * 
         * @param {Object} features - The features of the node.
         * 
         * @returns {Object} - The node labels.
         */
        getLabels(features) {
            const labels = {};

            // loop over roles
            for (const role of this.settings.config["k8s.nodes.roles"]) {
                const key = this.settings.config["k8s.nodes.label"] + role;
                // check if role is in features
                if (features.includes(role)) {
                    labels[key] = "true";
                } else {
                    labels[key] = "false";
                }
            }

            return labels;
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
            const cluster = await ctx.call("v1.k8s.clusters.getByName", { name: node.cluster });

            // check if cluster exists
            if (!cluster) {
                throw new MoleculerClientError("Cluster not found.", 404);
            }

            // get node zone from node name
            let zone = node.metadata.name.split(".")[1];

            // validate node zone
            if (!zone) {
                zone = "default";
            } else if (![
                "ca",
                "usa",
                "europe",
                "asia",
                "africa",
                "oceania",
                "southamerica",
            ].includes(zone)) {
                zone = cluster.zone;
            }

            const address = node.status.addresses.find(a => a.type === "InternalIP").address;

            // create node
            return this.createEntity(ctx, {
                cluster: cluster.id,
                uid: node.metadata.uid,
                name: node.metadata.name,
                zone: zone,
                cidr: node.spec.podCIDR,
                addresses: [
                    {
                        type: "wireguard",
                        address: address
                    }
                ],
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
            return this.removeEntity(ctx, {
                id: entity.id,
            });
        },
    },


    created() { },

    async started() {

    },

    async stopped() { },

}

