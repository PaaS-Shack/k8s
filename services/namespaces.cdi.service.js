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
	name: "namespaces.cdi",
	version: 1,

	mixins: [
		DbService({}),
		Cron,
		Membership({
			permissions: 'namespaces.cdi'
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
		rest: "/v1/namespaces/:namespace/deployments/:deployment/cdi",

		fields: {

			name: {
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
			repo: {
				type: "string",
				required: true,
				populate: {
					action: "v1.repos.resolve",
					params: {
						scaope: false,
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			branch: {
				type: "string",
				default: 'master',
				required: false,
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
					this.logger.info(`CDI namespace remove event for ${namespace.name}`))
		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { deployment: deployment.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`CDI deployment remove event for ${deployment.name}`))
		},
		async "repos.commits.created"(ctx) {
			const commit = ctx.params.data;
			const repo = await ctx.call('v1.repos.resolve', { id: commit.repo })
			const entities = await this.findEntities(null, {
				query: {
					repo: commit.repo,
					deletedAt: null
				}, scope: false
			});


			for (let index = 0; index < entities.length; index++) {
				const entity = entities[index];
				console.log(repo,commit,entity)
				continue;
				const token = await ctx.call('v1.repos.git.agent.gitRequestToken', {
					name: repo.name
				})


				console.log(entity)
				console.log(await ctx.call('v1.namespaces.deployments.buildRemote', {
					id: entity.deployment,
					remote: token.path,
					branch: entity.branch,
					commit: commit.hash,
				}))
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
						cluster: 'cluster-0'
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
						promises.push(ctx.call('v1.routes.hosts.create', query, options))
					}
				}
			}

			const result = await Promise.allSettled(promises)

			await this.lock.release()

			this.logger.info(`Container state change "${state}" routes sysnced`, result.map((res) => res.status))

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
