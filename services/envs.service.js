"use strict";

const generator = require('generate-password');

const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const FIELDS = require('../fields');

/**
 * Deployment enviroment variables service
 * 
 */
module.exports = {
	/**
	 * Service name
	 */
	name: "k8s.envs",

	/**
	 * Version number
	 */
	version: 1,

	/**
	 * Service mixins
	 */
	mixins: [
		DbService({
			permissions: 'k8s.envs'
		}),
		ConfigLoader(['k8s.**'])
	],

	/**
	 * Service dependencies
	 */
	dependencies: [],

	/**
	 * Service settings
	 */
	settings: {
		rest: "/v1/k8s/envs",// enable rest

		fields: {
			...FIELDS.ENVS_FIELDS.properties,// inject env fields

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
		/**
		 * Resolve an entity by key and scope
		 * 
		 * @actions
		 * @param {String} key - key of env
		 * @param {String} scope - scope of env
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * 
		 * @return {Promise} Found entity
		 */
		resolveENV: {
			params: {
				key: { type: 'string', empty: false, required: true, optional: false },
				scope: { type: 'enum', values: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'], default: 'RUN_TIME', required: false, optional: true },

				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.resolve'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// find entity
				let found = await this.findEntity(null, {
					query: {
						deployment: params.deployment,
						namespace: params.namespace,
						key: params.key,
						scope: params.scope
					}
				});

				if (found) {
					return found;
				}

				throw new MoleculerClientError(`Entity '${params.key}' not found!`, 404);
			}
		},
		/**
		 * Create a new entity.
		 * 
		 * @actions
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * @param {Boolean} called - if provition has been called
		 * @param {String} value - value of env
		 * @param {String} type - type of env
		 * @param {String} key - key of env
		 * @param {String} scope - scope of env
		 *  
		 * 
		 * @return {Promise} Created entity
		 */
		create: {
			params: {
				...FIELDS.ENV_FIELDS.properties,
				called: { type: "boolean", optional: true, default: false },
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				this.logger.info(`Creating ENV ${params.key} for ${params.deployment}`);

				let found = await this.findEntity(null, {
					query: {
						deployment: params.deployment,
						namespace: params.namespace,
						key: params.key,
						scope: params.scope
					}
				});

				// if found update
				if (found) {
					// if value is different update
					if (params.hasOwnProperty('value') && found.value != params.value) {

						this.logger.info(`Updating ENV ${params.key} for ${params.deployment}`)

						return this.updateEntity(ctx, {
							id: found.id,
							deployment: params.deployment,
							namespace: params.namespace,
							value: params.value
						})
					}

					// return found entity
					return found;
				}

				// if type is secret generate value
				if (params.type == 'secret') {

					// generate secret
					params.value = generator.generate({
						length: 20,
						numbers: true
					});

					this.logger.info(`Generating secret ENV ${params.key} for ${params.deployment}`);
				} else if (params.type == 'provision') {
					// if type is provision make the provitions call if not called
					const callCMD = `v1.${params.key}.provision`

					if (!params.called) {
						this.logger.info(`Provisioning ENV ${params.key} for ${params.deployment} at ${callCMD}`)

						// resolve namespace and deployment
						const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
							id: params.namespace,
							fields: ['name', 'cluster']
						});
						const deployment = await ctx.call('v1.k8s.deployments.resolve', {
							id: params.deployment,
							fields: ['name', 'zone', 'owner']
						});
						// call provition
						const entity = await ctx.call(callCMD, {
							id: params.value,
							prefix: namespace.name,
							zone: deployment.zone
						}, { meta: { userID: deployment.owner } });

						// set provtion id as value
						params.value = entity.id;

					}

				} else if (params.type == 'route') {
					// if type is route resolve the route

					//resolve deployment
					const deployment = await ctx.call('v1.k8s.deployments.resolve', {
						id: params.deployment,
						fields: ['name', 'zone', 'routes', 'vHosts', 'image', 'owner']
					});

					// resolve deployment image
					const image = await ctx.call('v1.k8s.images.resolve', {
						id: deployment.image,
						fields: ['ports']
					});

					// pick first vHost
					const vHost = deployment.vHosts[0];

					// filter out http routes
					const routePorts = image.ports.filter((p) => p.protocol == 'HTTP');

					//get subdomain
					const { subdomain } = routePorts[params.index];

					// if subdomain is set use it else use vHost
					if (subdomain) {
						params.value = `${params.value.replace('${VHOST}', `${subdomain}.${vHost}`)}`
					} else {
						params.value = `${params.value.replace('${VHOST}', `${vHost}`)}`
					}

				} else if (params.type == 'username') {
					//if type is username resolve the username
					const deployment = await ctx.call('v1.k8s.deployments.resolve', {
						id: params.deployment,
						namespace: params.namespace,
						fields: ['owner']
					});

					// resolve user from owners field
					const user = await ctx.call('v1.accounts.resolve', {
						id: deployment.owner,
						fields: ['username']
					});

					// set value as username
					params.value = user.username;
				} else if (params.type == 'namespace') {
					// if type is namespace resolve the namespace
					const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
						id: params.namespace,
						fields: ['name']
					});

					// set value as namespace name
					params.value = namespace.name;
				} else if (params.type == 'deployment') {
					// if type is deployment resolve the deployment
					const deployment = await ctx.call('v1.k8s.deployments.resolve', {
						id: params.deployment,
						fields: ['name']
					});

					// set value as deployment name
					params.value = deployment.name;
				}

				// create entity with params and return it
				return this.createEntity(ctx, params, { permissive: true });

			}
		},

		/**
		 * Clean the DB of all envs
		 * 
		 * @actions
		 * 
		 * @returns {Promise}
		 */
		clean: {
			params: {},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				// find all envs
				const entities = await this.findEntities(null, {});

				// remove all envs
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { scope: false, id: entity.id }))
				).then(() =>
					this.logger.info(`ROUTE clean`)
				);
			}
		},

		/**
		 * Patch a config map
		 * 
		 * @actions
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * 
		 * @returns {Promise} - config map
		 */
		rePatchConfigMap: {
			params: {
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				return this.patchConfigMap(ctx, {
					deployment: params.deployment,
					namespace: params.namespace
				});
			}
		},

		/**
		 * Patch a config map
		 * 
		 * @actions
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * 
		 * @returns {Promise} - config map
		 */
		patchConfigMap: {
			params: {
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				return this.patchConfigMap(ctx, params);
			}
		},

		/**
		 * Remove an entity by key and scope
		 * 
		 * @actions
		 * @param {String} key - key of env
		 * @param {String} scope - scope of env
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * 
		 * @return {Promise} Removed entity
		 */
		remove: {
			params: {
				key: { type: 'string', empty: false, required: true, optional: false },
				scope: { type: 'enum', values: ['RUN_TIME', 'BUILD_TIME', 'RUN_AND_BUILD_TIME'], default: 'RUN_TIME', required: false, optional: true },

				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// find entity
				let found = await this.findEntity(null, {
					query: {
						deployment: params.deployment,
						namespace: params.namespace,
						key: params.key,
						scope: params.scope
					}
				});

				if (found) {
					this.logger.info(`Removing ENV ${found.key} for ${found.deployment}`);
					// if type is provision call deprovision
					if (found.type == 'provision') {
						const callCMD = `v1.${found.key}.unprovision`

						this.logger.info(`Packing unprovisioned ENV ${found.key} for ${found.deployment} at ${callCMD}`)

						await ctx.call(callCMD, {
							id: found.value
						})
					}

					// remove the entity
					return this.removeEntity(ctx, found);
				}
			}
		},

		/**
		 * Pack envs for a deployment
		 * 
		 * @actions
		 * @param {String} deployment - Deployment id
		 * @param {String} namespace - Namespace id
		 * @param {String} scope - scope of env
		 * 
		 * @return {Promise} Packed envs
		 */
		pack: {
			params: {
				scope: { type: "enum", values: ["RUN_TIME", "BUILD_TIME", "RUN_AND_BUILD_TIME"], default: 'RUN_TIME', optional: true },
				deployment: { type: "string", min: 3, optional: false },
				namespace: { type: "string", min: 3, optional: false }
			},
			permissions: ['k8s.envs.create'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const entity = {};

				this.logger.info(`Packing ENV ${params.scope} for ${params.deployment}`)

				// find all envs for deployment
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

				// filter out provisioned envs
				let requestedScope = {}
				found.filter((env) => env.scope == params.scope && env.type != 'map' && env.type != 'provision')
					.forEach((env) => requestedScope[env.key] = env.value);

				// filter out build and run time envs
				let buildRunScope = {}
				found.filter((env) => env.scope == 'RUN_AND_BUILD_TIME' && env.type != 'map' && env.type != 'provision')
					.forEach((env) => buildRunScope[env.key] = env.value);

				const provisionScopeArray = [];
				const routesScopeArray = [];

				// filter out provisioned envs
				const provisions = found.filter((env) => env.type == 'provision')

				// loop over provisioned envs
				for (let index = 0; index < provisions.length; index++) {
					const element = provisions[index];

					const callCMD = `v1.${element.key}.pack`;
					this.logger.info(`Packing provisioned ENV ${element.key} for ${params.deployment} at ${callCMD}`)

					// call pack on provisioned env
					const entity = await ctx.call(callCMD, {
						id: element.value
					});

					provisionScopeArray.push(entity);
				}

				// packed env object
				const envs = Object.assign({ PACKED_AT: `${new Date()}` }, buildRunScope, requestedScope, ...provisionScopeArray)

				const mapScope = {};

				// filter out map envs
				const maps = found.filter((env) => env.type == 'map');

				// loop over map envs
				for (let index = 0; index < maps.length; index++) {
					const map = maps[index];

					// loop envs and replace map value with env value
					let value = map.value;

					for (const key in envs) {
						if (Object.hasOwnProperty.call(envs, key)) {
							const element = envs[key];
							value = value.replace(`${key}`, element);
						}
					}

					mapScope[map.key] = value;
				}

				const result= Object.assign({}, envs, mapScope);

				// convert all envs to string
				for (const key in result) {
					if (Object.hasOwnProperty.call(result, key)) {
						const element = result[key];
						result[key] = `${element}`;
					}
				}
				
				return result;
			}
		},

		/**
		 * Create ENVs for deployment and image
		 * 
		 * @actions
		 * @param {String} namespace - namespace id
		 * @param {String} deployment - deployment id
		 * @param {String} image - image id
		 * 
		 * @requires {Promise} - returns created ENVs
		 */
		createEnv: {
			description: "Create ENVs for deployment and image",
			params: {
				namespace: { type: "string", optional: false },
				deployment: { type: "string", optional: false },
				image: { type: "string", optional: false },
			},
			permissions: ['k8s.envs.createEnv'],
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: params.namespace,
					fields: ['id', 'name', 'cluster']
				});

				// resolve deployment
				const deployment = await ctx.call('v1.k8s.deployments.resolve', {
					id: params.deployment,
					fields: ['id', 'name', 'zone', 'env', 'ports']
				});

				// resolve image
				const image = await ctx.call('v1.k8s.images.resolve', {
					id: params.image,
					fields: ['id', 'name', 'env', 'ports']
				});

				// init deployment envs
				await this.initDeploymentEnvs(ctx, namespace, deployment, image);

				// return envs
				const result = await this.findEntities(ctx, {
					query: {
						namespace: namespace.id,
						deployment: deployment.id
					}
				});

				// patch config map if needed
				if (result.length == 0) {
					await this.actions.rePatchConfigMap({
						namespace: namespace.id,
						deployment: deployment.id
					});
				}

				return result;
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		/**
		 * ENV remove event. Patch config map and deprovision if needed
		 */
		async "k8s.envs.removed"(ctx) {
			const env = ctx.params.data;

			// patch config map
			await this.patchConfigMap(ctx, env);

			// if type is provision call deprovision
			if (env.type == 'provision') {
				const callCMD = `v1.${env.key}.deprovision`

				this.logger.info(`Deprovision ENV ${env.key} for ${env.deployment} at ${callCMD}`)

				await ctx.call(callCMD, {
					id: env.value
				});
			}
		},

		/**
		 * Create event, patch config map
		 */
		async "k8s.envs.created"(ctx) {
			const env = ctx.params.data;

			// patch config map
			await this.patchConfigMap(ctx, env);
		},

		/**
		 * Update event, patch config map
		 */
		async "envs.updated"(ctx) {
			const env = ctx.params.data;

			// patch config map
			await this.patchConfigMap(ctx, env);
		},

		/**
		 * Namedspace deployment create. Create config map
		 */
		async "k8s.deployments.created"(ctx) {
			const deployment = ctx.params.data;
			// init deployment envs 
			await this.actions.createEnv({
				namespace: deployment.namespace,
				deployment: deployment.id,
				image: deployment.image
			});
		},

		/**
		 * Namespace deployment removed event. Remove all envs for deployment
		 */
		async "k8s.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
				id: deployment.namespace
			});

			// find all envs for deployment
			const entities = await this.findEntities(ctx, {
				query: {
					namespace: namespace.id,
					deployment: deployment.id
				}
			});

			// remove all envs
			await Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`ROUTE namespace remove event for ${namespace.name}`))
		},
		async "k8s.namespaces.removed"(ctx) {
			const namespace = ctx.params.data;

			// find all envs for deployment
			const entities = await this.findEntities(ctx, {
				scope: false,
				query: { namespace: namespace.id }
			});

			// remove all envs
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

		/**
		 * init envs for deployment
		 * 
		 * @param {Context} ctx - context
		 * @param {Object} namespace - namespace Object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 * 
		 * @returns {Promise} - envs
		 */
		async initDeploymentEnvs(ctx, namespace, deployment, image) {
			// create env entries for deployment and image envs

			const entities = [];

			if (image.env) {
				entities.push(...image.env.map((env) => {
					return this.actions.create({
						deployment: deployment.id,
						namespace: namespace.id,
						...env,
					}, { parentCtx: ctx });
				}));
			}

			if (deployment.env) {
				entities.push(...deployment.env.map((env) => {
					return this.actions.create({
						deployment: deployment.id,
						namespace: namespace.id,
						...env,
					}, { parentCtx: ctx });
				}));
			}

			// return envs
			return Promise.allSettled(entities);
		},


		/**
		 * Patch a config map
		 * 
		 * @param {Context} ctx - context
		 * @param {Object} env - env object
		 * @param {Boolean} create - if config map should be created
		 */
		async patchConfigMap(ctx, env, create = false) {
			// resolve namespace and deployment
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
				scope: false,
				id: env.namespace,
				fields: ['name', 'cluster']
			});
			const deployment = await ctx.call('v1.k8s.deployments.resolve', {
				scope: false,
				id: env.deployment,
				fields: ['name']
			});

			// k8s ConfigMap object
			const configMap = {
				"apiVersion": "v1",
				"kind": "ConfigMap",
				"metadata": {
					"name": `${deployment.name}`
				},
				"data": await ctx.call('v1.k8s.envs.pack', {
					namespace: env.namespace,
					deployment: env.deployment
				})
			}

			console.log(configMap)

			if (create) {
				// create config map
				return ctx.call('v1.kube.createNamespacedConfigMap', {
					namespace: namespace.name,
					cluster: namespace.cluster,
					name: deployment.name,
					body: configMap
				});
			}

			// replace config map
			return ctx.call('v1.kube.replaceNamespacedConfigMap', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: deployment.name,
				body: configMap
			}).catch((err) => {
				// if config map not found create it
				return ctx.call('v1.kube.createNamespacedConfigMap', {
					namespace: namespace.name,
					cluster: namespace.cluster,
					name: deployment.name,
					body: configMap
				});
			});
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
