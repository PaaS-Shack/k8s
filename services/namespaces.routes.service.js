"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
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
		Cron,
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

			name: {
				type: "string",
				required: true,
			},
			namespace: {
				type: "string",
				required: true,
			},
			route: {
				type: "string",
				required: true,
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

	crons: [
		{
			name: "Starting all services",
			cronTime: "*/30 * * * *",
			onTick: {
				//action: "v1.services.startAll"
			}
		}
	],
	/**
	 * Actions
	 */

	actions: {
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

				const deployment = await ctx.call('v1.namespaces.deployments.resolve', {
					namespace: params.namespace,
					id: params.deployment,
					populate: ['routes', 'image']
				})
				const envSchema = deployment.image.envs.find((env) => env.key == params.key)

				return `${envSchema.value.replace('${VHOST}', deployment.routes[params.index].vHost)}`
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
		async "pods.containers.running"(ctx) {
			const container = ctx.params;
			if (container.annotations && container.annotations['k8s.one-host.ca/routes']) {
				await this.containerStateProcess(ctx, 'running', container)
			}
		},
		async "pods.containers.terminated"(ctx) {
			const container = ctx.params;
			if (container.annotations && container.annotations['k8s.one-host.ca/routes']) {
				await this.containerStateProcess(ctx, 'terminated', container)
			}
		}
	},

	/**
	 * Methods
	 */
	methods: {
		async containerStateProcess(ctx, state, container) {

			const routeIDs = container.annotations['k8s.one-host.ca/routes'].split(',')
			const promises = []
			const options = { meta: { userID: container.annotations['k8s.one-host.ca/owner'] } }

			await this.lock.acquire()

			for (let index = 0; index < routeIDs.length; index++) {
				const route = routeIDs[index];
				for (let i = 0; i < container.ports.length; i++) {
					const port = container.ports[i];

					const query = {
						route,
						hostname: port.hostname,
						port: port.port,
						cluster: 'cloud1'
					}

					if (state == 'terminated') {
						promises.push(ctx.call('v1.routes.hosts.resolveHost', query, options)
							.then((host) => {
								if (host) {
									return ctx.call('v1.routes.hosts.remove', {
										route,
										id: host.id
									}, options)
								}
								return host
							}))
					} else if (state == 'running') {
						promises.push(ctx.call('v1.routes.hosts.resolveHost', query, options)
							.then((found) => found ? found :
								ctx.call('v1.routes.hosts.create', query, options)
							))
					}
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
