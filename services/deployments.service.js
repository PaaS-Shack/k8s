"use strict";

// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

/**
 * This service manages the lifecycle of kubernetes deployments
 * 
 * @name k8s.deployments
 * 
 * Deployments are based of a image and are namespaced
 * This service is used to managed the k8s kind Deployment spec
 * https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#deployment-v1-apps
 * 
 * 
 */

const DeploymentSchemaMixin = require('../mixins/deployment-schema.mixin');


module.exports = {
	// name of service
	name: "k8s.deployments",
	// version of service
	version: 1,

	/**
	 * Service Mixins
	 * 
	 * @type {Array}
	 * @property {DbService} DbService - Database mixin
	 * @property {Membership} Membership - Membership mixin
	 * @property {ConfigLoader} ConfigLoader - Config loader mixin
	 */
	mixins: [
		DbService({
			permissions: "k8s.deployments"
		}),
		Membership({
			permissions: "k8s.deployments"
		}),
		ConfigLoader(['k8s.**']),
		DeploymentSchemaMixin
	],

	/**
	 * Service dependencies
	 */
	dependencies: [

	],

	/**
	 * Service settings
	 * 
	 * @type {Object}
	 */
	settings: {
		rest: "v1/k8s/deployments",

		fields: {

			...FIELDS.DEPLOYMENT_FIELDS.properties,


			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},

		// default database populates
		defaultPopulates: [],

		// database scopes
		scopes: {
			...DbService.SCOPE,// inject dbservice scope
			...Membership.SCOPE,// inject membership scope
		},

		// default database scope
		defaultScopes: [
			...DbService.DSCOPE,// inject dbservice dscope
			...Membership.DSCOPE,// inject membership dscope
		],

		// default init config settings
		config: {
			"k8s.deployments.prometheus": true,
			"k8s.deployments.prometheus.url": "https://prom.one-host.ca",
			"k8s.deployments.affinity": true
		}
	},

	/**
	 * service actions
	 */
	actions: {
		...Membership.ACTIONS,// inject membership actions
		//...DbService.ACTIONS,// inject dbservice actions

		/**
		 * Generate a deployment schema from id
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment schema
		 */
		generate: {
			rest: {
				method: "GET",
				path: "/:id/generate"
			},
			permissions: ['k8s.deployments.generate'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				return this.createDeploymentSchema(ctx, namespace, deployment, image)//.then((resource) => resource.spec.template.spec);
			}
		},

		/**
		 * Apply a deployment schema from id
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment schema
		 */
		apply: {
			rest: {
				method: "POST",
				path: "/:id/apply"
			},
			permissions: ['k8s.deployments.apply'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				return this.applyDeployment(ctx, namespace, deployment, image);
			}
		},

		/**
		 * Get namespace status
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment status
		 */
		status: {
			rest: {
				method: "GET",
				path: "/:id/status"
			},
			permissions: ['k8s.deployments.status'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace },);
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				const resource = await ctx.call("v1.kube.readNamespacedDeployment", {
					name: deployment.name,
					namespace: namespace.name,
					cluster: namespace.cluster,
				});

				return resource.status;
			}
		},

		/**
		 * Get deployment logs
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment logs
		 */
		logs: {
			rest: {
				method: "GET",
				path: "/:id/logs"
			},
			permissions: ['k8s.deployments.logs'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				const query = {
					kind: 'Pod',
					'metadata.namespace': namespace.name,
					fields: ['metadata.name', 'metadata.namespace', 'metadata.labels', 'metadata.uid'],
				}

				// deploymant lables
				const labales = await this.generateDeploymentLabels(ctx, namespace, deployment, image);

				// add the lables to the query
				for (const key in labales) {
					query[`metadata.labels.${key}`] = labales[key];
				}

				const Pod = await ctx.call('v1.kube.findOne', query);

				return ctx.call('v1.kube.logs', {
					name: Pod.metadata.name,
					namespace: Pod.metadata.namespace,
					cluster: namespace.cluster
				}).then((res) => {
					return res.join('').split('\n');
				});
			}
		},

		/**
		 * Get deployment events
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment events
		 */
		events: {
			rest: {
				method: "GET",
				path: "/:id/events"
			},
			permissions: ['k8s.deployments.events'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				const query = {
					kind: 'Event',
					'metadata.namespace': namespace.name,

				}

				return ctx.call('v1.kube.find', query)
					.then((res) => {
						// filter events by deployment
						return res.filter((event) => {
							return event.involvedObject.name.includes(deployment.name);
						});
					});
			}
		},

		/**
		 * Get deployment pods
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment pods
		 */
		pods: {
			rest: {
				method: "GET",
				path: "/:id/pods"
			},
			permissions: ['k8s.deployments.pods'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				// check if the deployment exists
				if (!deployment) {
					throw new MoleculerClientError("Deployment not found", 404, "", [{ field: "id", message: "not found" }]);
				}

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				const query = {
					kind: 'Pod',
					'metadata.namespace': namespace.name,
					fields: ['status', 'metadata.name', 'metadata.namespace', 'metadata.labels', 'metadata.uid'],
				}

				// deploymant lables
				const labales = await this.generateDeploymentLabels(ctx, namespace, deployment, image);

				// add the lables to the query
				for (const key in labales) {
					query[`metadata.labels.${key}`] = labales[key];
				}

				return ctx.call('v1.kube.find', query);
			}
		},

		/**
		 * Get deployment state by pod status of the deployment
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment state
		 */
		state: {
			rest: {
				method: "GET",
				path: "/:id/state"
			},
			permissions: ['k8s.deployments.state'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				// get pods and thier state
				const pods = await this.actions.pods({
					id: deployment.id
				});
				const podStates = await this.getPodStates(ctx, pods);

				// get deployment status
				const status = await this.actions.status({
					id: deployment.id
				});

				return {
					state: podStates.find((pod) => pod.state == 'Running') ? 'Running' : 'Pending',
					pods: podStates,
					...status
				};
			}
		},

		/**
		 * Scale a deployment up or down
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * @param {Number} replicas - number of replicas
		 * 
		 * @returns {Promise} deployment pods
		 */
		scale: {
			rest: {
				method: "POST",
				path: "/:id/scale"
			},
			permissions: ['k8s.deployments.scale'],
			params: {
				id: { type: "string", optional: false },
				replicas: { type: "number", min: 0, max: 100, optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				return this.updateEntity(ctx, {
					id: deployment.id,
					replicas: params.replicas
				});
			}
		},

		/**
		 * Rolling restart a deployment by patching the deployment annotation with a new timestamp
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment pods
		 */
		restart: {
			rest: {
				method: "POST",
				path: "/:id/restart"
			},
			permissions: ['k8s.deployments.restart'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				return ctx.call('v1.kube.patchNamespacedDeployment', {
					name: deployment.name,
					namespace: namespace.name,
					cluster: namespace.cluster,
					body: {
						spec: {
							template: {
								metadata: {
									annotations: {
										'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
									}
								}
							}
						}
					}
				}).then((res) => {
					return res;
				});
			}
		},

		/**
		 * stop a deployment by scaling it to 0
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment pods
		 */
		stop: {
			rest: {
				method: "POST",
				path: "/:id/stop"
			},
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				return this.actions.scale({
					id: params.id,
					replicas: 0
				});
			}
		},

		/**
		 * get pod top metrics
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} pod top metrics
		 */
		top: {
			rest: {
				method: "GET",
				path: "/:id/top"
			},
			permissions: ['k8s.deployments.top'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// resolve eployment
				const deployment = await this.resolveEntities(ctx, { id: params.id });

				// get pods uid
				const pods = await this.actions.pods({
					id: deployment.id
				});

				const metrics = [];

				// get top metrics
				for (const pod of pods) {
					const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: pod.metadata.namespace });
					const top = await ctx.call('v1.kube.top', {
						uid: pod.metadata.uid
					});
					metrics.push({
						name: pod.metadata.name,
						top
					});
				}

				return metrics;
			}
		},

		/**
		 * Describe the depmloment
		 * 
		 * @actions
		 * @param {String} id - deployment id
		 * 
		 * @returns {Promise} deployment discrioption 
		 */
		createDeployment: {
			rest: {
				method: "POST",
				path: "/:id/create"
			},
			permissions: ['k8s.deployments.describe'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, { id: params.id });

				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				return this.createDeployment(ctx, namespace, deployment, image);
			}
		},
	},

	/**
	 * service events
	 */
	events: {
		"k8s.deployments.created": {
			async handler(ctx) {
				const deployment = ctx.params.data;

				const options = { meta: { userID: deployment.owner } };
				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace }, options);
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				// after deployment is created create setup all the k8s resources
				await this.createDeployment(ctx, namespace, deployment, image);

				await this.createTailsLogs(ctx, namespace, deployment, image);
			}
		},
		"k8s.deployments.updated": {
			async handler(ctx) {
				const deployment = ctx.params.data;

				const options = { meta: { userID: deployment.owner } };
				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace }, options);
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				// updated the deployment schema
				await this.applyDeployment(ctx, namespace, deployment, image);
			}
		},
		"k8s.deployments.removed": {
			async handler(ctx) {
				const deployment = ctx.params.data;

				const options = { meta: { userID: deployment.owner } };
				const namespace = await ctx.call("v1.k8s.namespaces.resolve", { id: deployment.namespace }, options);
				const image = await ctx.call("v1.k8s.images.resolve", { id: deployment.image });

				// remove the deployment
				await this.removeDeployment(ctx, namespace, deployment, image);

				// remove tails logs
				await ctx.call("v1.tails.remove", { id: deployment.tails });
			}
		},
	},

	/**
	 * service methods
	 */
	methods: {
		/**
		 * Get pod states
		 * 
		 * @param {Object} ctx - context
		 * @param {Array} pods - array of pods
		 * 
		 * @returns {Promise} pod states
		 */
		async getPodStates(ctx, pods) {
			const states = [];

			// loop pods and determin its state
			for (const pod of pods) {
				states.push({
					name: pod.metadata.name,
					state: pod.status.phase,
				});
			}

			return states;
		},

		/**
		 * Apply a kubernetes deployment schema
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace Object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 * 
		 * @returns {Promise} - returns a promise
		 */
		async applyDeployment(ctx, namespace, deployment, image) {

			const schema = await this.createDeploymentSchema(ctx, namespace, deployment, image);

			// apply the schema
			const resource = await ctx.call("v1.kube.replaceNamespacedDeployment", {
				name: deployment.name,
				namespace: namespace.name,
				cluster: namespace.cluster,
				body: schema
			});

			return resource;
		},

		/**
		 * create a kubernetes deployment
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace Object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 * 
		 * @returns {Promise} - returns a promise
		 */
		async createDeployment(ctx, namespace, deployment, image) {
			// create required resources for a deployment
			const schema = await this.createDeploymentSchema(ctx, namespace, deployment, image);

			// apply the schema
			const result = await ctx.call("v1.kube.createNamespacedDeployment", {
				name: deployment.name,
				namespace: namespace.name,
				cluster: namespace.cluster,
				body: schema
			});
			// update deployment with uid
			return this.updateEntity(ctx, {
				id: deployment.id,
				uid: result.metadata.uid
			});
		},

		/**
		 * create tails logs for a deployment
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace Object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 */
		async createTailsLogs(ctx, namespace, deployment, image) {

			// create tails logs for deployment
			const tails = await ctx.call("v1.tails.create", {
				type: 'log',
				status: 'active',
				title: `${deployment.name} logs`,
				user: deployment.owner,
				idel: false,
				log: {
					query: `{app="${deployment.name}",namespace="${namespace.name}"}`,
					start: deployment.createdAt,
				},
			});

			// update deployment with tails logs
			return this.updateEntity(ctx, {
				id: deployment.id,
				tails: tails.id
			});
		},

		/**
		 * remove a kubernetes deployment
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace Object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 * 
		 * @returns {Promise} - returns a promise
		 */
		async removeDeployment(ctx, namespace, deployment, image) {
			// remove a deployment
			await ctx.call("v1.kube.deleteNamespacedDeployment", {
				name: deployment.name,
				namespace: namespace.name,
				cluster: namespace.cluster,
			});
		},


	},

	/**
	 * service created lifecycle event handler
	 */
	created() { },

	/**
	 * service started lifecycle event handler
	 */
	async started() { },

	/**
	 * service stopped lifecycle event handler
	 */
	async stopped() { },
}



