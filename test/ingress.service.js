"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "ingress",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
		}),
		ConfigLoader(['ingress.**'])
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
		rest: "/v1/ingress/",

		fields: {
			id: {
				type: "string",
				primaryKey: true,
				secure: true,
				columnName: "_id"
			},

			namespace: {
				type: "string",
				required: false,
				populate: {
					action: "v1.namespaces.resolve",
					params: {
						scaope: false,
					}
				},
			},

			cluster: {
				type: "string",
				required: true
			},
			zone: {
				type: "string",
				required: true
			},
			fqdn: {
				type: "string",
				required: true
			},
			ipv4: {
				type: "string",
				required: true
			},
			ipv6: {
				type: "string",
				required: false
			},
			enabled: {
				type: "boolean",
				default: true,
				required: false
			},
			shared: {
				type: "boolean",
				default: false,
				required: false
			},

			ports: {
				type: 'array',
				required: false,
				default: [],
				items: {
					type: 'object',
					props: {
						targetPort: { type: 'number', required: true },
						port: { type: 'number', required: true },
						service: { type: 'string', required: true },
					}
				}
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
		shared: {
			params: {
				cluster: { type: "string", optional: false },
				zone: { type: "string", optional: false },
				namespace: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const found = await this.findEntity(ctx, {
					query: {
						cluster: params.cluster,
						zone: params.zone,
						namespace: params.namespace
					},
				});
				if (!found) {
					return this.findEntity(ctx, {
						query: {
							cluster: params.cluster,
							zone: params.zone,
							shared: true
						},
					});
				} else {
					return found
				}
			}
		},
		freePort: {
			params: {
				id: { type: "string", optional: false },
				service: { type: "string", optional: false },
				targetPort: { type: "number", convert: true, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const ingress = await this.resolveEntities(ctx, {
					id: params.id
				});
				const used = []
				console.log(ingress)
				for (let index = 0; index < ingress.ports.length; index++) {
					const element = ingress.ports[index];
					if (element.service == params.service && element.targetPort == params.targetPort) {
						return element
					}
					used.push(element.port)
				}


				for (let index = 24000; index < 27000; index++) {
					if (!used.includes(index)) {
						await this.updateEntity(ctx, {
							id: ingress.id,
							$addToSet: {
								ports: {
									targetPort: params.targetPort,
									port: index,
									service: params.service
								}
							},
						}, { raw: true });

						return {
							targetPort: params.targetPort,
							port: index
						}
					}
				}
			}
		},
		removePort: {
			params: {
				id: { type: "string", optional: false },
				service: { type: "string", optional: false },
				targetPort: { type: "number", convert: true, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const ingress = await this.resolveEntities(ctx, {
					id: params.id
				});


				for (let index = 0; index < ingress.ports.length; index++) {
					const element = ingress.ports[index];
					if (element.service == params.service && element.targetPort == params.targetPort) {
						return this.updateEntity(ctx, {
							id: ingress.id,
							$pull: {
								ports: {
									targetPort: element.targetPort,
									port: element.port,
									service: params.service
								}
							},
						}, { raw: true });
					}
				}


			}
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
