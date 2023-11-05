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
        DbService({
            permissions: "k8s.clusters"
        }),
        Membership({
            permissions: "k8s.clusters"
        }),
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
                enum:[
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

    },
    created() {

    }


}



