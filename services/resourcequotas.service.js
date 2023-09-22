"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * Kubernetes resourcequotas service
 */
module.exports = {
	/**
	 * Service name
	 */
	name: "k8s.resourcequotas",

	/**
	 * Service version
	 * 1.0.0
	 */
	version: 1,

	/**
	 * Mixins
	 * 
	 * More info: https://moleculer.services/docs/0.14/services.html#Mixins
	 */
	mixins: [
		DbService({}),
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
		rest: "/v1/k8s/resourcequotas/", //  Rest api path

		fields: {// db fields for resourcequotas
			// resourcequota name
			name: {
				type: "string",
				empty: false,
				required: true
			},

			// resourcequota requests
			"requests.cpu": {
				type: "number",
				required: true
			},
			"requests.memory": {
				type: "number",
				required: true
			},
			"requests.storage": {
				type: "number",
				required: true
			},
			// resourcequota limits
			"limits.cpu": {
				type: "number",
				required: true
			},
			"limits.memory": {
				type: "number",
				required: true
			},

			"pods": {
				type: "number",
				required: true
			},
			"secrets": {
				type: "number",
				required: true
			},
			"persistentvolumeclaims": {
				type: "number",
				required: true
			},
			"services.loadbalancers": {
				type: "number",
				required: true
			},
			"services.nodeports": {
				type: "number",
				required: true
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
		defaultScopes: [...DbService.DSCOPE],// inject dbservice dscope

		// default init config settings
		config: {

		}
	},

	/**
	 * Actions
	 */

	actions: {
		clean: {
			params: {},
			async handler(ctx) {
				const entities = await this.findEntities(ctx, { scope: false })
				console.log(entities)
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { scope: false, id: entity.id })))
			}
		},
		/**
		 * Seed the database with resourcequotas
		 * 
		 * @returns {Promise} - returns seeded resourcequotas
		 */
		seed: {
			rest: "POST /seed",
			async handler(ctx) {
				return this.seedDB();
			}
		},

		/**
		 *	Find resourcequotas by name 
		 * 
		 * @actions
		 * @param {String} name - resourcequota name
		 * 
		 * @returns {Promise} resourcequota
		 */
		findByName: {
			rest: "GET /:name",
			params: {
				name: {
					type: "string",
					empty: false,
					required: true
				}
			},
			async handler(ctx) {
				const { name } = ctx.params;
				return this.findByName(name);
			}
		},

		/**
		 * Pack resourcequota entity 
		 * 
		 * @actions
		 * @param {String} id - resourcequota entity id
		 * 
		 * @returns {Promise} - returns packed resourcequota entity
		 */
		pack: {
			rest: "GET /:id/pack",
			params: {
				id: {
					type: "string",
					empty: false,
					required: true
				}
			},
			permissions: ['k8s.resourcequotas.pack'],
			async handler(ctx) {
				const { id } = ctx.params;
				const entity = await this.getById(id);
				return this.packEntity(entity);
			}
		}
	},

	/**
	 * Events
	 */
	events: {
		/**
		 * On namespace created create corresponding resourcequota
		 */

		"k8s.namespaces.created": {
			async handler(ctx) {
				const namespace = ctx.params.data;
				this.logger.info(`Creating namespace resource quota ${namespace.name} on cluster ${namespace.cluster}`);
				// create resourcequota
				return this.createResourceQuota(ctx, namespace);
			}
		},

		/**
		 * On namespace deleted delete corresponding resourcequota
		 */
		"k8s.namespaces.removed": {
			async handler(ctx) {
				const namespace = ctx.params.data;
				this.logger.info(`Deleting namespace resource quota ${namespace.name} on cluster ${namespace.cluster}`);
				// delete resourcequota
				return this.deleteResourceQuota(ctx, namespace);
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {

		/**
		 * Create namedspace resource quota
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise}
		 */
		async createResourceQuota(ctx, namespace) {
			const name = namespace.name;

			// resource quota schema
			const ResourceQuota = {
				apiVersion: "v1",
				kind: "ResourceQuota",
				metadata: {
					name: `${name}-resourcequota`
				},
				spec: {
					hard: await ctx.call('v1.k8s.resourcequotas.pack', { id: namespace.resourceQuota })
				}
			};

			// create resource quota
			return ctx.call('v1.kube.createNamespacedResourceQuota', {
				namespace: name,
				body: ResourceQuota,
				cluster: namespace.cluster
			});
		},

		/**
		 * Delete namedspace resource quota
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace entity
		 * 
		 * @returns {Promise}
		 */
		async deleteResourceQuota(ctx, namespace) {
			const name = namespace.name;

			// delete resource quota
			return ctx.call('v1.kube.deleteNamespacedResourceQuota', {
				namespace: name,
				name: `${name}-resourcequota`,
				cluster: namespace.cluster
			});
		},
		/**
		 * Get resourcequota by id
		 * 
		 * @param {String} id - resourcequota id
		 * 
		 * @requires {Promise} - returns resourcequota
		 */
		async getById(id) {
			return this.actions.get({ id });
		},

		/**	
		 * Pack resourcequota entity
		 * 
		 * @param {Object} entity - resourcequota entity
		 * 
		 * @returns {Object} - returns packed resourcequota entity
		 */
		async packEntity(entity) {

			return this.flattenObj({
				...entity,
				createdAt: undefined,
				updatedAt: undefined,
				id: undefined
			});
		},

		/**
		 * Flatten resourcequota object
		 * 
		 * @param {Object} obj - resourcequota object
		 * @param {String} parent - parent name
		 * @param {Object} res - result object
		 * 
		 * @returns {Object} - returns flattened resourcequota object
		 */
		flattenObj(obj, parent, res = {}) {
			for (let key in obj) {
				let propName = parent ? parent + '.' + key : key;
				if (key == 'name' || key == 'group')
					continue;
				if (typeof obj[key] == 'object') {
					this.flattenObj(obj[key], propName, res);
				} else if (obj[key] != undefined) {
					res[propName] = obj[key];
					switch (key) {
						case 'cpu':
							res[propName] = `${obj[key]}m`
							break;
						case 'memory':
						case 'storage':
							res[propName] = `${obj[key]}Mi`
							break;
						default:
							res[propName] = `${obj[key]}`
							break;
					}
				}
			}
			return res;
		},

		/**
		 * find resourcequota by name
		 * 
		 * @param {String} name - resourcequota name
		 * 
		 * @returns {Promise} - returns resourcequota
		 */
		async findByName(name) {
			return this.findEntity(null, { query: { name } });
		},

		/**
		 * Seed the database with resourcequotas 
		 * Each entity incresses limits and requests
		 * 
		 * @requires {Promise} - returns seeded resourcequotas
		 */
		async seedDB() {

			// generated list of resourcequotas names
			const names = [
				"basic",
				"medium",
				"large",
				"extra-large"
			];

			const resourcequotas = [];

			//base values
			let storageBase = 10;
			let memBase = 25;
			let cpuBase = 50;


			// generated list of resourcequotas limits and requests
			for (let index = 0; index < names.length; index++) {
				const name = names[index];
				const multiplire = index + 1;
				// resourcequota limits and requests are base*index
				const resourcequota = {
					name: name,
					"requests.cpu": cpuBase * multiplire,
					"requests.memory": memBase * multiplire,
					"requests.storage": storageBase * multiplire,
					"limits.cpu": cpuBase * multiplire * 2,
					"limits.memory": memBase * multiplire * 2,
					"pods": 10 * multiplire,
					"secrets": 10 * multiplire,
					"persistentvolumeclaims": 10 * multiplire,
					"services.loadbalancers": 10 * multiplire,
					"services.nodeports": 10 * multiplire,
				};
				//create new resourcequota
				resourcequotas.push(resourcequota);

			}

			// insert resourcequotas into database
			return Promise.all(resourcequotas.map((entity) => this.actions.create(entity)))
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
