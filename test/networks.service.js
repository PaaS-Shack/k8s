"use strict";
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;

/**
 * Addons service
 */
module.exports = {
	name: "k8s.networks",
	version: 1,

	mixins: [
		DbService({
			permissions: "k8s.networks",
		})
	],

	/**
	 * Service dependencies
	 */
	dependencies: [],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/k8s/networks",


		fields: {

			node: {
				type: "string",
				required: true
			},

			fqdn: {
				type: "string",
				required: true
			},

			address: {
				type: "string",
				required: false
			},
			mac: {
				type: "string",
				required: false
			},

			internal: {
				type: "boolean",
				default: false,
				required: false
			},
			public: {
				type: "boolean",
				default: false,
				required: false
			},
			tunnel: {
				type: "boolean",
				default: false,
				required: false
			},
			gateway: {
				type: "boolean",
				default: false,
				required: false
			},
		},
		defaultPopulates: [],

		scopes: {

		},

		defaultScopes: []
	},

	/**
	 * Actions
	 */
	actions: {
		create: {
			permissions: ['domains.create'],
			params: {}
		},
		list: {
			permissions: ['domains.list'],
			params: {}
		},
		find: {
			rest: "GET /find",
			permissions: ['domains.find'],
			params: {}
		},
		count: {
			rest: "GET /count",
			permissions: ['domains.count'],
			params: {}
		},
		get: {
			needEntity: true,
			permissions: ['domains.get'],
			params: {}
		},
		update: {
			needEntity: true,
			permissions: ['domains.update'],
			params: {}
		},
		replace: false,
		remove: {
			needEntity: true,
			permissions: ['domains.remove'],
			params: {}
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