"use strict";

const C = require("../constants");

const generator = require('generate-password');

const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "envs",
	version: 1,

	mixins: [
		DbService({
			cache: {

			},
		}),
		ConfigLoader(['envs.**'])
	],

	/**
	 * Service dependencies
	 */
	dependencies: [],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/envs",

		fields: {
			id: {
				type: "string",
				primaryKey: true,
				secure: true,
				columnName: "_id"
			},

			deployment: {
				type: "string",
				empty: false,
				readonly: false,
				required: true,
				onCreate: ({ ctx }) => ctx.params.deployment,
			},

			namespace: {
				type: "string",
				empty: false,
				readonly: false,
				required: true,
				onCreate: ({ ctx }) => ctx.params.namespace,
			},

			linked: { type: 'array', items: 'string', default: [], required: false, optional: true },

			...C.env.props,

			options: { type: "object" },
			...C.TIMESTAMP_FIELDS
		},
		scopes: {
			notDeleted: { deletedAt: null }
		},
		defaultScopes: ["notDeleted"]
	},

	/**
	 * Actions
	 */

	actions: {
		list: {
			permissions: ['domains.records.list'],
			permissionsTarget: 'domain',
			params: {
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			}
		},
		find: {
			rest: "GET /find",
			permissions: ['domains.records.find'],
			params: {
				//deployment: { type: "string", min: 3, optional: false },
				//namespace: { type: "string", min: 3, optional: false }
			}
		},
		count: {
			rest: "GET /count",
			permissions: ['domains.records.count'],
			params: {
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			}
		},
		get: {
			needEntity: true,
			permissions: ['domains.records.get']
		},
		update: {
			needEntity: true,
			permissions: ['domains.records.update']
		},
		replace: false,
		create: {
			params: {
				...C.env.props,
				called: { type: "boolean", optional: true, default: false },
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['teams.create'],
			async handler(ctx) {

				const params = Object.assign({}, ctx.params);

				this.logger.info(`Creating ENV ${params.key} for ${params.deployment}`)
				let found = await this.findEntity(null, {
					deployment: params.deployment,
					namespace: params.namespace,
					query: {
						deployment: params.deployment,
						namespace: params.namespace,
						key: params.key,
						scope: params.scope
					}
				});
				if (found) {
					if (params.hasOwnProperty('value') && found.value != params.value) {

						this.logger.info(`Updating ENV ${params.key} for ${params.reference}`)

						return this.updateEntity(ctx, {
							id: found.id,
							deployment: params.deployment,
							namespace: params.namespace,
							value: params.value
						})
					}
					return found
				}
				if (params.type == 'secret') {
					params.value = generator.generate({
						length: 20,
						numbers: true
					})

					this.logger.info(`Generating secret ENV ${params.key} for ${params.reference}`)
				} else if (params.type == 'provision') {

					const callCMD = `v1.${params.key}.provision`

					if (!params.called) {
						this.logger.info(`Provisioning ENV ${params.key} for ${params.reference} at ${callCMD}`)

						const namespace = await ctx.call('v1.namespaces.resolve', { id: params.namespace, fields: ['name', 'cluster'] })
						const deployment = await ctx.call('v1.namespaces.deployments.resolve', { id: params.deployment, fields: ['name', 'zone'] })


						const entity = await ctx.call(callCMD, {
							id: params.value,
							prefix: namespace.name,
							zone: deployment.zone
						})

						params.value = entity.id
					}

				} else if (params.type == 'route') {

					const deployment = await ctx.call('v1.namespaces.deployments.resolve', { id: params.deployment, fields: ['name', 'zone', 'vHosts', 'image', 'owner'] })
					const image = await ctx.call('v1.images.resolve', { id: deployment.image, fields: ['ports'] })
					const vHost = deployment.vHosts[0];
					const routePorts = image.ports.filter((p) => p.type == 'http' || p.type == 'https')
					const { subdomain } = routePorts[params.index];
					if (subdomain) {
						params.value = `${params.value.replace('${VHOST}', `${subdomain}.${vHost}`)}`
					} else {
						params.value = `${params.value.replace('${VHOST}', `${vHost}`)}`
					}

				} else if (params.type == 'username') {
					const deployment = await ctx.call('v1.namespaces.deployments.resolve', { id: params.deployment, namespace: params.namespace, fields: ['owner'] })
					const user = await ctx.call('v1.accounts.resolve', { id: deployment.owner, fields: ['username'] })
					params.value = user.username
				} else if (params.type == 'namespace') {
					const namespace = await ctx.call('v1.namespaces.resolve', { id: params.namespace, fields: ['name'] })
					params.value = namespace.name
				} else if (params.type == 'deployment') {
					const deployment = await ctx.call('v1.namespaces.deployments.resolve', { id: params.deployment, namespace: params.namespace, fields: ['name'] })
					params.value = deployment.name
				}
				return this.createEntity(ctx, params, { permissive: true });

			}
		},
		clean: {
			params: {},
			permissions: ['teams.create'],
			async handler(ctx) {
				const entities = await this.findEntities(ctx, { scope: false })
				console.log(entities)
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { scope: false, id: entity.id })))
			}
		},

		rePatchConfigMap: {
			params: {
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['teams.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				return this.patchConfigMap(ctx, {
					deployment: params.deployment,
					namespace: params.namespace
				})
			}
		},
		patchConfigMap: {
			params: {},
			permissions: ['teams.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				return this.patchConfigMap(ctx, params)
			}
		},
		remove: {
			params: {
				key: { type: 'string', empty: false, required: true, optional: false },
				scope: { type: 'enum', values: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'], default: 'RUN_TIME', required: false, optional: true },

				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['teams.create'],
			async handler(ctx) {

				const params = Object.assign({}, ctx.params);

				let found = await this.findEntity(null, {
					deployment: params.deployment,
					namespace: params.namespace,
					query: {
						deployment: params.deployment,
						namespace: params.namespace,
						key: params.key,
						scope: params.scope
					}
				});
				if (found) {
					console.log(found)
					this.logger.info(`Removing ENV ${found.key} for ${found.deployment}`)
					if (found.type == 'provision') {
						const callCMD = `v1.${found.key}.unprovision`

						this.logger.info(`Packing unprovisioned ENV ${found.key} for ${found.deployment} at ${callCMD}`)

						await ctx.call(callCMD, {
							id: found.value
						})
					}
					return this.removeEntity(ctx, found);
				}
			}
		},
		pack: {
			params: {
				scope: { type: "enum", values: ["RUN_TIME", "BUILD_TIME", "RUN_AND_BUILD_TIME"], default: 'RUN_TIME', optional: true },
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['teams.create'],
			async handler(ctx) {

				const params = Object.assign({}, ctx.params);
				const entity = {};

				this.logger.info(`Packing ENV ${params.scope} for ${params.reference}`)

				let found = await this.findEntities(null, {
					query: {
						$or: [
							{
								deployment: params.deployment,
								namespace: params.namespace,
								scope: params.scope
							}
						]
					}
				}, { raw: true });

				let requestedScope = {}
				found.filter((env) => env.scope == params.scope && env.type != 'map' && env.type != 'provision')
					.forEach((env) => requestedScope[env.key] = env.value);
				let buildRunScope = {}
				found.filter((env) => env.scope == 'RUN_AND_BUILD_TIME' && env.type != 'map' && env.type != 'provision')
					.forEach((env) => buildRunScope[env.key] = env.value);

				const provisionScopeArray = [];
				const routesScopeArray = [];

				const provisions = found.filter((env) => env.type == 'provision')

				for (let index = 0; index < provisions.length; index++) {
					const element = provisions[index];

					const callCMD = `v1.${element.key}.pack`

					this.logger.info(`Packing provisioned ENV ${element.key} for ${params.reference} at ${callCMD}`)

					const entity = await ctx.call(callCMD, {
						id: element.value
					})
					provisionScopeArray.push(entity)
				}


				const envs = Object.assign({ PACKED_AT: `${new Date()}` }, buildRunScope, requestedScope, ...provisionScopeArray)

				const mapScope = {}

				const maps = found.filter((env) => env.type == 'map')
				for (let index = 0; index < maps.length; index++) {
					const map = maps[index];

					const split = map.value.split(',')

					if (split.length > 1) {

						mapScope[map.key] = split.map((key) => envs[key]).join(':')
					} else {

						mapScope[map.key] = envs[map.value]
					}

				}

				return Object.assign({}, envs, mapScope)
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		async "envs.removed"(ctx) {
			const env = ctx.params.data;
			await this.patchConfigMap(ctx, env);
			if (env.type == 'provision') {

				const callCMD = `v1.${env.key}.deprovision`

				this.logger.info(`Packing provisioned ENV ${env.key} for ${env.reference} at ${callCMD}`)

				const entity = await ctx.call(callCMD, {
					id: env.value
				})

			}
		},
		async "envs.created"(ctx) {
			const env = ctx.params.data;
			await this.patchConfigMap(ctx, env, true);
		},
		async "envs.updated"(ctx) {
			const env = ctx.params.data;
			await this.patchConfigMap(ctx, env);
		},
		async "namespaces.deployments.created"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', { id: deployment.namespace })
			const configMap = {
				"apiVersion": "v1",
				"kind": "ConfigMap",
				"metadata": {
					"name": `${deployment.name}`
				},
				"data": {}
			}
			await ctx.call('v1.kube.createNamespacedConfigMap', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: deployment.name,
				body: configMap
			})
		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', { id: deployment.namespace })

			const entities = await this.findEntities(ctx, {
				query: {
					namespace: namespace.id,
					deployment: deployment.id
				}
			})
			await Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`ROUTE namespace remove event for ${namespace.name}`))
		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { namespace: namespace.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`ROUTE namespace remove event for ${namespace.name}`))
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async patchConfigMap(ctx, env, create = false) {
			const namespace = await ctx.call('v1.namespaces.resolve', { scope: false, id: env.namespace, fields: ['name', 'cluster'] })
			const deployment = await ctx.call('v1.namespaces.deployments.resolve', { scope: false, id: env.deployment, fields: ['name'] })

			const configMap = {
				"apiVersion": "v1",
				"kind": "ConfigMap",
				"metadata": {
					"name": `${deployment.name}`
				},
				"data": await ctx.call('v1.envs.pack', {
					namespace: env.namespace,
					deployment: env.deployment
				})
			}



			await ctx.call('v1.kube.replaceNamespacedConfigMap', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: deployment.name,
				body: configMap
			})

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
