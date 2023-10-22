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
		},

		/**
		 * apply resourcequota
		 * 
		 * @actions
		 * @param {String} name - resourcequota name
		 * @param {String} namespace - namespace id
		 * 
		 * @returns {Promise} - returns applyed resourcequota
		 */
		apply: {
			rest: "POST /:name/apply",
			params: {
				name: {
					type: "string",
					empty: false,
					required: true
				},
				namespace: {
					type: "string",
					empty: false,
					required: true
				}
			},
			permissions: ['k8s.resourcequotas.apply'],
			async handler(ctx) {
				const { name } = ctx.params;
				const entity = await this.findByName(name);
				if (!entity)
					throw new MoleculerClientError(`Resourcequota ${name} not found`, 404, "RESOURCEQUOTA_NOT_FOUND", { name });
				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', { id: ctx.params.namespace });
				if (!namespace)
					throw new MoleculerClientError(`Namespace ${ctx.params.namespace} not found`, 404, "NAMESPACE_NOT_FOUND", { namespace: ctx.params.namespace });
				// resource quota schema
				const ResourceQuota = {
					apiVersion: "v1",
					kind: "ResourceQuota",
					metadata: {
						name: `${namespace.name}-resourcequota`
					},
					spec: {
						hard: await ctx.call('v1.k8s.resourcequotas.pack', { id: namespace.resourceQuota })
					}
				};

				// create resource quota
				return ctx.call('v1.kube.createNamespacedResourceQuota', {
					namespace: namespace.name,
					body: ResourceQuota,
					cluster: namespace.cluster
				}).catch((err) => {
					// if resourcequota already exists update it
					if (err.code == 409)
						return ctx.call('v1.kube.replaceNamespacedResourceQuota', {
							namespace: namespace.name,
							name: ResourceQuota.metadata.name,
							body: ResourceQuota,
							cluster: namespace.cluster
						});
					else
						throw err;
				});
			}
		},
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
					switch (key) {
						case 'cpu':
							res[propName] = `${Math.floor(obj[key])}m`
							break;
						case 'memory':
						case 'storage':
							console.log(key, obj[key])
							res[propName] = `${Math.floor(obj[key])}Mi`
							break;
						default:
							res[propName] = `${Math.floor(obj[key])}`
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

			const resourcequotas = [
				{
					name: "free",
					"requests.cpu": 100,
					"requests.memory": 128,
					"requests.storage": 10 * 1024,
					"limits.cpu": 120,// 20% more than requests
					"limits.memory": 153.6,// 20% more than requests
					"pods": 2,
					"secrets": 2,
					"persistentvolumeclaims": 2,
					"services.loadbalancers": 2,
					"services.nodeports": 2,
				},
				{
					name: "basic",
					"requests.cpu": 200,
					"requests.memory": 256,
					"requests.storage": 20 * 1024,
					"limits.cpu": 240,// 20% more than requests
					"limits.memory": 307.2,// 20% more than requests
					"pods": 4,
					"secrets": 4,
					"persistentvolumeclaims": 4,
					"services.loadbalancers": 4,
					"services.nodeports": 4,
				},
				{
					name: "standard",
					"requests.cpu": 400,
					"requests.memory": 512,
					"requests.storage": 40 * 1024,
					"limits.cpu": 480,// 20% more than requests
					"limits.memory": 614.4,// 20% more than requests
					"pods": 8,
					"secrets": 8,
					"persistentvolumeclaims": 8,
					"services.loadbalancers": 8,
					"services.nodeports": 8,
				},
				{
					name: "premium",
					"requests.cpu": 800,
					"requests.memory": 1024,
					"requests.storage": 80 * 1024,
					"limits.cpu": 960,// 20% more than requests
					"limits.memory": 1228.8,// 20% more than requests
					"pods": 16,
					"secrets": 16,
					"persistentvolumeclaims": 16,
					"services.loadbalancers": 16,
					"services.nodeports": 16,
				},
				{
					name: "ultimate",
					"requests.cpu": 1600,
					"requests.memory": 2048,
					"requests.storage": 160 * 1024,
					"limits.cpu": 1920,// 20% more than requests
					"limits.memory": 2457.6,// 20% more than requests
					"pods": 32,
					"secrets": 32,
					"persistentvolumeclaims": 32,
					"services.loadbalancers": 32,
					"services.nodeports": 32,
				},
				{
					name: "small-business",
					"requests.cpu": 3200,
					"requests.memory": 4096,
					"requests.storage": 320 * 1024,
					"limits.cpu": 3840,// 20% more than requests
					"limits.memory": 4915.2,// 20% more than requests
					"pods": 64,
					"secrets": 64,
					"persistentvolumeclaims": 64,
					"services.loadbalancers": 64,
					"services.nodeports": 64,
				},
				{
					name: "business",
					"requests.cpu": 6400,
					"requests.memory": 8192,
					"requests.storage": 640 * 1024,
					"limits.cpu": 7680,// 20% more than requests
					"limits.memory": 9830.4,// 20% more than requests
					"pods": 128,
					"secrets": 128,
					"persistentvolumeclaims": 128,
					"services.loadbalancers": 128,
					"services.nodeports": 128,
				},
				{
					name: "enterprise",
					"requests.cpu": 12800,
					"requests.memory": 16384,
					"requests.storage": 1280 * 1024,
					"limits.cpu": 15360,// 20% more than requests
					"limits.memory": 19660.8,// 20% more than requests
					"pods": 256,
					"secrets": 256,
					"persistentvolumeclaims": 256,
					"services.loadbalancers": 256,
					"services.nodeports": 256,
				},
				{
					name: "enterprise-plus",
					"requests.cpu": 25600,
					"requests.memory": 32768,
					"requests.storage": 2560 * 1024,
					"limits.cpu": 30720,// 20% more than requests
					"limits.memory": 39321.6,// 20% more than requests
					"pods": 512,
					"secrets": 512,
					"persistentvolumeclaims": 512,
					"services.loadbalancers": 512,
					"services.nodeports": 512,
				},
			];


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
