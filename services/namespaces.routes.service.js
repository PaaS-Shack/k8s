"use strict";

const DbService = require("db-mixin");
const Membership = require("membership-mixin");

const Lock = require('../lib/lock')

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "namespaces.routes",
	version: 1,

	mixins: [
		DbService({}),
		Membership({
			permissions: 'namespaces.routes'
		})
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
		rest: "/v1/namespaces/:namespace/routes",

		fields: {

			vHost: {
				type: "string",
				required: true,
			},
			namespace: {
				type: "string",
				required: true,
				populate: {
					action: "v1.namespaces.resolve",
					params: {
						scaope: false,
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			deployment: {
				type: "string",
				required: true,
				populate: {
					action: "v1.namespaces.deployments.resolve",
					params: {
						scaope: false,
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			route: {
				type: "string",
				required: true,
				populate: {
					action: "v1.routes.resolve",
					params: {
						scaope: false,
					}
				},
			},
			record: {
				type: "string",
				required: false,
				populate: {
					action: "v1.domains.records.resolve",
					params: {
						scaope: false,
					}
				},
			},
			hosts: {
				type: 'array',
				items: "string",
				optional: true,
				default: [],
				populate: {
					action: "v1.routes.hosts.resolve",
					params: {
						fields: ["id", "vHost", "strategy"]
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
			...Membership.FIELDS,
		},
		defaultPopulates: ['status'],

		scopes: {
			notDeleted: { deletedAt: null },
			...Membership.SCOPE,
		},

		defaultScopes: ["notDeleted", ...Membership.DSCOPE]
	},

	/**
	 * Actions
	 */

	actions: {
		stats: {
			params: {
				namespace: { type: "string", optional: false },
				deployment: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const routes = await this.findEntities(ctx, {
					query: {
						deployment: params.deployment,
						namespace: params.namespace
					}
				})
				const statsObjects = await ctx.call('v1.routes.stats').then((res) => res.map(({ info }) => info))

				const keys = ['hits', 'hitsTotal', 'missesTotal', 'misses', 'latencyAvg']

				const stats = {}
				for (let i = 0; i < routes.length; i++) {
					const route = routes[i];

					const obj = {}
					for (let index = 0; index < keys.length; index++) {
						const key = keys[index];
						obj[key] = 0
					}

					stats[route.vHost] = obj
				}


				for (let index = 0; index < statsObjects.length; index++) {
					const statsObject = statsObjects[index];

					for (let i = 0; i < routes.length; i++) {
						const route = routes[i];
						if (statsObject.routes && statsObject.routes[route.vHost]) {
							for (let j = 0; j < keys.length; j++) {
								const key = keys[j];
								if (typeof statsObject.routes[route.vHost][key] == 'number')
									stats[route.vHost][key] += statsObject.routes[route.vHost][key]
							}
						}
					}
				}

				return stats
			}
		},
		resolveOrCreate: {
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const found = await this.findEntity(ctx, {
					query: { ...params }
				})
				if (found)
					return found
				return this.createEntity(ctx, {
					...params
				});
			}
		},
		getENVvHost: {
			params: {
				namespace: { type: "string", optional: false },
				deployment: { type: "string", optional: false },
				index: { type: "number", optional: false },
				key: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);


				const routes = await this.findEntities(ctx, {
					query: {
						deployment: params.deployment,
						namespace: params.namespace
					}
				})
				const deployment = await ctx.call('v1.namespaces.deployments.resolve', {
					namespace: params.namespace,
					id: params.deployment,
					populate: ['image']
				})
				const envSchema = deployment.image.envs.find((env) => env.key == params.key)

				return `${envSchema.value.replace('${VHOST}', routes[params.index].vHost)}`
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { namespace: namespace.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`ROUTE namespace remove event for ${namespace.name}`))
		},
		async "namespaces.deployments.created"(ctx) {
			const deployment = ctx.params.data;

			const options = { meta: { userID: deployment.owner } };

			const image = await ctx.call('v1.images.resolve', { id: deployment.image, fields: ['ports'] })

			const routes = []

			for (let index = 0; index < deployment.vHosts.length; index++) {
				const vHost = deployment.vHosts[index];

				const routePorts = image.ports.filter((p) => p.type == 'http' || p.type == 'https')
				for (let index = 0; index < routePorts.length; index++) {
					const { subdomain } = routePorts[index];
					if (subdomain) {
						await this.createOrUpdateRoute({ vHost: `${subdomain}.${vHost}`, deployment, options, ctx })
					} else {
						await this.createOrUpdateRoute({ vHost: `${vHost}`, deployment, options, ctx })
					}
				}

			}

		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;

			const options = { meta: { userID: deployment.owner } };


			const routes = await this.findEntities(ctx, {
				query: {
					deployment: deployment.id,
					namespace: deployment.namespace
				}
			})

			for (let index = 0; index < routes.length; index++) {
				const { id, route } = routes[index];
				await ctx.call('v1.routes.remove', {
					id: route
				}, options);
				await this.removeEntity(ctx, { id })
				this.logger.info(`Remove route ${route} id ${id} on deployment ${deployment.id}`)
			}

		},
		async "pods.containers.running"(ctx) {
			const container = ctx.params;
			if (container.annotations && container.annotations['k8s.one-host.ca/deployment']) {
				await this.containerStateProcess(ctx, 'running', container)
			}
		},
		async "pods.containers.terminated"(ctx) {
			const container = ctx.params;
			if (container.annotations && container.annotations['k8s.one-host.ca/deployment']) {
				await this.containerStateProcess(ctx, 'terminated', container)
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		async createOrUpdateRoute({ vHost, deployment, options, ctx }) {
			const found = await ctx.call('v1.routes.resolveRoute', {
				vHost
			}, options);

			if (found) {
				const entity = await ctx.call('v1.namespaces.routes.create', {
					vHost,
					route: found.id,
					deployment: deployment.id,
					namespace: deployment.namespace
				}, options)
				this.logger.info(`Add found route ${found.id} id ${entity.id} on deployment ${deployment.id}`)
			} else {
				const route = await ctx.call('v1.routes.create', {
					vHost
				}, options);
				const entity = await ctx.call('v1.namespaces.routes.create', {
					vHost,
					route: route.id,
					deployment: deployment.id,
					namespace: deployment.namespace
				}, options)
				this.logger.info(`Add new route ${route.id} id ${entity.id} on deployment ${deployment.id}`)
			}
		},
		async createOrUpdateHost({ state, containerPort, namespace, route, id, options, ctx }) {
			const query = {
				hostname: containerPort.hostname,
				port: containerPort.port,
				cluster: namespace.cluster,
				route: route
			}
			const promises = []

			if (state == 'terminated') {

				promises.push(ctx.call('v1.routes.hosts.resolveHost', query, options)
					.then((host) => {
						if (host) {
							return ctx.call('v1.routes.hosts.remove', {
								route,
								id: host.id
							}, options)
								.then((hostID) => this.updateEntity(ctx, {
									id,
									$pull: {
										hosts: hostID
									},
								}, { raw: true }))
						}
						return host
					}))
			} else if (state == 'running') {
				promises.push(ctx.call('v1.routes.hosts.resolveHost', query, options)
					.then((found) => found ? found :
						ctx.call('v1.routes.hosts.create', query, options)
							.then((host) => this.updateEntity(ctx, {
								id,
								$addToSet: {
									hosts: host.id
								},
							}, { raw: true }))
					))
			}
			return promises
		},
		async containerStateProcess(ctx, state, container) {

			const promises = []
			const options = { meta: { userID: container.annotations['k8s.one-host.ca/owner'] } };

			const namespace = await ctx.call('v1.namespaces.resolve', {
				id: container.annotations['k8s.one-host.ca/namespace'],
				fields: ['cluster', 'id']
			}, options)
			const deployment = await ctx.call('v1.namespaces.deployments.resolve', {
				id: container.annotations['k8s.one-host.ca/deployment'],
				namespace: namespace.id,
				fields: ['vHosts', 'id'],
				scope: '-notDeleted'
			}, options)
			const image = await ctx.call('v1.images.resolve', {
				id: container.annotations['k8s.one-host.ca/image']
			}, options)
			const routes = await ctx.call('v1.namespaces.routes.find', {
				query: {
					namespace: namespace.id,
					deployment: deployment.id,
				}
			}, options)

			await this.lock.acquire()

			const routePorts = image.ports.filter((p) => p.type == 'http' || p.type == 'https')


			for (let index = 0; index < deployment.vHosts.length; index++) {
				const vHost = deployment.vHosts[index];

				for (let index = 0; index < routePorts.length; index++) {
					const { subdomain, internal } = routePorts[index];

					const containerPort = container.ports.find((pp) => pp.port == internal)

					const route = routes.find((route) => {
						return route.vHost == (subdomain != undefined ? `${subdomain}.${vHost}` : `${vHost}`)
					})
					if (route)
						promises.push(...(await this.createOrUpdateHost({ state, containerPort, namespace, route: route.route, id: route.id, options, ctx })))
				}

			}


			const result = await Promise.allSettled(promises)

			await this.lock.release()

			this.logger.info(`Container state change "${state}" routes sysnced`, result)

			return result
		}
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.lock = new Lock()
	},

	/**
	 * Service started lifecycle event handler
	 */
	async started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
