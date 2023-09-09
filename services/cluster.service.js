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
                unique: true,
                min: 3,
                max: 255,
                trim: true,
                lowercase: true,
                index: true,
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
                unique: true,
                min: 3,
                max: 255,
                trim: true,
                lowercase: true,
                index: true,
            },

            // cluster feature set
            features: {
                type: "array",
                required: false,
                default: [],
                items: {
                    type: "string",
                    enum: [
                        
                    ]
                }
            },

            


            ...DbService.FIELDS,// inject dbservice fields
            //...Membership.FIELDS,// inject membership fields
        },

        // default database populates
        defaultPopulates: [],

        // database scopes
        scopes: {
            ...DbService.SCOPE,// inject dbservice scope
            //...Membership.SCOPE,// inject membership scope
        },

        // default database scope
        defaultScopes: [
            ...DbService.DSCOPE,// inject dbservice dscope
            //...Membership.DSCOPE,// inject membership dscope
        ],

        // default init config settings
        config: {

        }
    },

    /**
     * service actions
     */
    actions: {
        //...Membership.ACTIONS,// inject membership actions


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



