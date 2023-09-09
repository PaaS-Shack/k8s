"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "k8s.limitranges",
	version: 1,

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
		rest: "/v1/k8s/limitranges/",

		fields: {

			max: {
				cpu: {
					type: "number",
					required: false
				},
				memory: {
					type: "number",
					required: false
				}
			},
			min: {
				cpu: {
					type: "number",
					required: false
				},
				memory: {
					type: "number",
					required: false
				}
			},
			default: {
				cpu: {
					type: "number",
					required: false
				},
				memory: {
					type: "number",
					required: false
				},
				storage: {
					type: "number",
					required: false
				},
				//   "ephemeral-storage": "100Mi"
			},
			defaultRequest: {
				cpu: {
					type: "number",
					required: false
				},
				memory: {
					type: "number",
					required: false
				},
				// "ephemeral-storage": "100Mi"
			},
			maxLimitRequestRatio: {
				cpu: {
					type: "number",
					required: false
				}
			},
			type: {
				type: "string",
				required: true,
				empty: false,
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
		pack: {
			description: "pack limitranges",
			params: {
				id: {
					type: "string",
					optional: true,
				},
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				function mapValues(obj) {
					const keys = Object.keys(obj)
					const res = {}
					for (let index = 0; index < keys.length; index++) {
						const key = keys[index];
						switch (key) {
							case 'cpu':
								res[key] = `${obj[key]}m`
								break;
							case 'memory':
							case 'storage':
								res[key] = `${obj[key]}Mi`
								break;
							default:
								res[key] = `${obj[key]}`
								break;
						}
					}

					return res;
				}

				return this.findEntities(null, {
					id: params.id
				}).then((res) => res.map((limit) => {

					const entity = {
						type: limit.type
					}

					if (limit.max) {
						entity.max = mapValues(limit.max)
					}
					if (limit.min) {
						entity.min = mapValues(limit.min)
					}
					if (limit.default) {
						entity.default = mapValues(limit.default)
					}
					if (limit.defaultRequest) {
						entity.defaultRequest = mapValues(limit.defaultRequest)
					}
					if (limit.maxLimitRequestRatio) {
						entity.maxLimitRequestRatio = limit.maxLimitRequestRatio
					}

					return entity
				}));
			}
		},
		async seedDB() {
			const limits = [{
				max: {
					cpu: "3800",
					memory: "7000",
				},
				min: {
					cpu: "10",
					memory: "10"
				},
				default: {
					cpu: "300",
					memory: "200",
					storage: "100",
					//   "ephemeral-storage": "100Mi"
				},
				defaultRequest: {
					cpu: "50",
					memory: "50",
					// "ephemeral-storage": "100Mi"
				},
				maxLimitRequestRatio: {
					cpu: 10
				},
				type: "Container"
			}, {
				max: {
					cpu: "3800",
					memory: "7000",
					// "ephemeral-storage": "10Gi"
				},
				min: {
					cpu: "10",
					memory: "10"
				},
				default: {
					cpu: "50",
					memory: "50",
					storage: "100",
					// "ephemeral-storage": "100Mi"
				},
				type: "Pod"
			}, {
				type: "PersistentVolumeClaim",
				min: {
					storage: "100",
					//  "ephemeral-storage": "100Mi"
				},
				max: {
					storage: "50000",
					// "ephemeral-storage": "50Gi"
				}
			}]


			return Promise.all(limits.map((entity) => this.actions.create(entity)))
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
				this.logger.info(`Creating namespace limit range ${namespace.name} on cluster ${namespace.cluster}`);
				// create resourcequota
				return this.createLimitRange(ctx, namespace);
			}
		},

		/**
		 * On namespace deleted delete corresponding resourcequota
		 */
		"k8s.namespaces.deleted": {
			async handler(ctx) {
				const namespace = ctx.params.data;
				this.logger.info(`Deleting namespace limit range ${namespace.name} on cluster ${namespace.cluster}`);
				// delete resourcequota
				return this.deleteLimitRange(ctx, namespace);
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Create namedspace limit range
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async createLimitRange(ctx, namespace) {
			const name = namespace.name;

			// limit range schema
			const LimitRange = {
				apiVersion: "v1",
				kind: "LimitRange",
				metadata: {
					name: `${name}-limitrange`,
					labels: {
						name: `${name}-limitrange`
					}
				},
				spec: {
					limits: await ctx.call('v1.k8s.limitranges.pack')
				}
			};

			// create limit range
			return ctx.call('v1.kube.createNamespacedLimitRange', {
				namespace: name,
				body: LimitRange,
				cluster: namespace.cluster
			});
		},

		/**
		 * Delete namedspace limit range
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise}
		 */
		async deleteLimitRange(ctx, namespace) {
			const name = namespace.name;

			// delete limit range
			return ctx.call('v1.kube.deleteNamespacedLimitRange', {
				namespace: name,
				name: `${name}-limitrange`,
				cluster: namespace.cluster
			});
		},
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
