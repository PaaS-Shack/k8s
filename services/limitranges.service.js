"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "limitranges",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
		}),
		ConfigLoader(['limitranges.**'])
	],

	/**
	 * Service dependencies
	 */
	dependencies: [

	],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/limitranges/",

		fields: {
			id: {
				type: "string",
				primaryKey: true,
				secure: true,
				columnName: "_id"
			},



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



			options: { type: "object" },
			createdAt: {
				type: "number",
				readonly: true,
				onCreate: () => Date.now(),
			},
			updatedAt: {
				type: "number",
				readonly: true,
				onUpdate: () => Date.now(),
			},
			deletedAt: {
				type: "number",
				readonly: true,
				hidden: "byDefault",
				onRemove: () => Date.now(),
			},
		},

		scopes: {

			// attachment the not deleted addons.attachments
			notDeleted: { deletedAt: null }
		},

		defaultScopes: ["notDeleted"]
	},

	/**
	 * Actions
	 */

	actions: {
		pack: {
			description: "Add members to the addon",
			params: {

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
					cpu: "800",
					memory: "2000"
				},
				min: {
					cpu: "50",
					memory: "64"
				},
				default: {
					cpu: "300",
					memory: "200",
					storage: "100",
					//   "ephemeral-storage": "100Mi"
				},
				defaultRequest: {
					cpu: "200",
					memory: "100",
					// "ephemeral-storage": "100Mi"
				},
				maxLimitRequestRatio: {
					cpu: 10
				},
				type: "Container"
			}, {
				max: {
					cpu: "800",
					memory: "2000",
					// "ephemeral-storage": "10Gi"
				},
				min: {
					cpu: "50",
					memory: "64"
				},
				default: {
					cpu: "300",
					memory: "200",
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
