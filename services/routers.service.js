"use strict";

const DbService = require("db-mixin");

const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;
const crypto = require("crypto");

/**
 * Addons service
 */
module.exports = {
	name: "routers",
	version: 1,

	mixins: [
		DbService({})
	],

	/**
	 * Service dependencies
	 */
	dependencies: [],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/routers",


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

			priority: {
				type: "number",
				default: 5,
				required: false
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

			options: { type: "object" },
			createdAt: {
				type: "number",
				readonly: true,
				onCreate: () => Date.now()
			},
			updatedAt: {
				type: "number",
				readonly: true,
				onUpdate: () => Date.now()
			},
			deletedAt: {
				type: "number",
				readonly: true,
				hidden: "byDefault",
				onRemove: () => Date.now()
			}

		},
		defaultPopulates: [],

		scopes: {
			notDeleted: { deletedAt: null },
		},

		defaultScopes: ["notDeleted"]
	},
	/**
	 * Actions
	 */
	actions: {
		create: {
			permissions: ['routes.create']
		},
		list: {
			permissions: ['routes.list']
		},
		find: {
			rest: "GET /find",
			permissions: ['routes.find']
		},
		count: {
			rest: "GET /count",
			permissions: ['routes.count']
		},
		get: {
			needEntity: true,
			permissions: ['routes.get']
		},
		update: {
			needEntity: true,
			permissions: ['routes.update']
		},
		replace: false,
		remove: {
			needEntity: true,
			permissions: ['routes.remove']
		},
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
		addvHost: {
			params: {
				vHost: { type: "string", optional: true },
				owner: { type: "string", optional: true },
				zone: { type: "string", optional: true },
			},
			permissions: ['routes.resolveRoute'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const options = { meta: { userID: params.owner } }

				const query = {
					query: {
						enabled: true
					}
				}
				if (params.zone) {
					query.query.zone = params.zone
				}

				const routers = await this.findEntities(null, query)

				for (let index = 0; index < routers.length; index++) {
					const router = routers[index];
					let record = await ctx.call(`v1.domains.addRecord`, {
						fqdn: params.vHost,
						type: 'A',
						data: router.ipv4
					}, options);
					this.logger.info(`Added record ${record.id}(${router.ipv4}) for vHost ${params.vHost}`)
				}
			},
		},
		removevHost: {
			params: {
				vHost: { type: "string", optional: true },
				owner: { type: "string", optional: true },
				zone: { type: "string", optional: true },
			},
			permissions: ['routes.resolveRoute'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const options = { meta: { userID: params.owner } }


				const query = {
					query: {
						enabled: true
					}
				}
				if (params.zone) {
					query.query.zone = params.zone
				}

				const routers = await this.findEntities(null, query)


				for (let index = 0; index < routers.length; index++) {
					const router = routers[index];
					let record = await ctx.call(`v1.domains.removeRecord`, {
						fqdn: params.vHost,
						type: 'A',
						data: router.ipv4
					}, options);
					this.logger.info(`Removed record ${record?.id}(${router.ipv4}) for vHost ${params.vHost}`)
				}
			},
		},
	},


	/**
	 * Events
	 */
	events: {
		"namespaces.routes.created": {
			async handler(ctx) {
				const route = Object.assign({}, ctx.params.data);


				const options = { meta: { userID: route.owner } };
				const deployment = await ctx.call('v1.namespaces.deployments.resolve', {
					id: route.deployment,
					//fields: ['router']
				}, options)

				console.log(deployment)
				const router = await this.resolveEntities(ctx, {
					id: deployment.router
				})

				let record = await ctx.call(`v1.domains.addRecord`, {
					fqdn: route.vHost,
					type: 'A',
					data: router.ipv4
				}, options);
				await ctx.call('v1.namespaces.routes.update', {
					id: route.id,
					record: record.id
				}, options)

			}
		},
		"namespaces.routes.removed": {
			async handler(ctx) {
				const route = Object.assign({}, ctx.params.data);
				const options = { meta: { userID: route.owner } };

				if (route.record) {
					await ctx.call(`v1.domains.records.remove`, {
						id: route.record
					}, options);
				}

			}
		},
		"routers.created": {
			async handler(ctx) {
				const router = Object.assign({}, ctx.params.data);
				if (false && router.enabled) {
					const routes = await ctx.call('v1.routes.vHosts', { zone: router.zone })
					for (let index = 0; index < routes.length; index++) {
						const route = routes[index];
						const options = { meta: { userID: route.owner } }
						let record = await ctx.call(`v1.domains.addRecord`, {
							fqdn: route.vHost,
							type: 'A',
							data: router.ipv4
						}, options);
						this.logger.info(`Added record ${record?.id}(${router.ipv4}) for vHost ${route.vHost}`)
					}
				}
			}
		},
		"routers.removed": {
			async handler(ctx) {
				const router = Object.assign({}, ctx.params.data);
				if (false && router.enabled) {
					const routes = await ctx.call('v1.routes.vHosts', { zone: router.zone })
					for (let index = 0; index < routes.length; index++) {
						const route = routes[index];
						const options = { meta: { userID: route.owner } }
						let record = await ctx.call(`v1.domains.removeRecord`, {
							fqdn: route.vHost,
							type: 'A',
							data: router.ipv4
						}, options);
						this.logger.info(`Removed record ${record?.id}(${router.ipv4}) for vHost ${route.vHost}`)
					}
				}
			}
		}
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