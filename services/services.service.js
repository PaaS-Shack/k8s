"use strict";



const DbService = require("db-mixin");
const Membership = require("membership-mixin");
const ConfigLoader = require("config-mixin");

const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

/**
 * this service maanges k8s services
 */
module.exports = {
	name: "k8s.services",
	version: 1,

	mixins: [
		DbService({
			permissions: "k8s.services"
		}),
		Membership({
			permissions: "k8s.services"
		}),
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
		rest: "/v1/k8s/services/",

		fields: {
			...FIELDS.SERVICE_FIELDS.properties,

			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},
		defaultPopulates: [],

		scopes: {
			...DbService.SCOPE,
			...Membership.SCOPE,
		},

		defaultScopes: [...DbService.DSCOPE, ...Membership.DSCOPE],

		// default init config settings
		config: {

		}
	},

	/**
	 * Actions
	 */

	actions: {
		/**
		 * Get volume spec
		 * 
		 * @actions
		 * @params {String} id - volume ID
		 * 
		 * @returns {Object} Volume status
		 */
		spec: {
			rest: {
				method: "GET",
				path: "/:id/status"
			},
			permissions: ['k8s.services.status'],
			params: {
				id: { type: "string" }
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// resolve service
				const service = await ctx.call('v1.k8s.services.resolve', { id: params.id });
				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: service.namespace,
					fields: ['name', 'cluster']
				});
				// resolve deployment
				const deployment = await ctx.call('v1.k8s.deployments.resolve', {
					id: service.deployment,
					fields: ['name']
				});

				// get service status
				const status = await ctx.call('v1.kube.readNamespacedServiceStatus', {
					namespace: namespace.name,
					name: `${deployment.name}-service`,
					cluster: namespace.cluster
				});

				return status.spec;
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		/**
		 * service created event
		 */
		"k8s.services.created": {
			async handler(ctx) {
				const service = ctx.params.data;

				await this.createService(ctx, service);

			}
		},
		/**
		 * service removed event
		 */
		"k8s.services.removed": {
			async handler(ctx) {
				const service = ctx.params.data;

				await this.processServiceRemove(ctx, service);

			}
		},

		/**
		 * On namespace created create corresponding resourcequota
		 */
		"k8s.deployments.created": {
			async handler(ctx) {
				const deployment = ctx.params.data;

				await this.processDeploymentCreate(ctx, deployment);

			}
		},

		/**
		 * On namespace deleted delete corresponding resourcequota
		 */
		"k8s.deployments.removed": {
			async handler(ctx) {
				const deployment = ctx.params.data;

				await this.processDeploymentDelete(ctx, deployment)

			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * process deployment delete event
		 * 
		 * @param {Object} ctx - context object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise} - returns processed deployment
		 */
		async processDeploymentDelete(ctx, deployment) {

			// resolve namespace
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', { id: deployment.namespace });
			// resolve image
			const image = await ctx.call('v1.k8s.images.resolve', { id: deployment.image });

			// resolve service
			const service = await this.findEntity(ctx, {
				query: {
					name: `${deployment.name}-service`,
					namespace: namespace.id,
					deployment: deployment.id,
				}
			});

			// check if service exists
			if (!service) {
				this.logger.info(`service ${deployment.name}-service in namespace ${namespace.name} for deployment ${deployment.name} does not exist`)
				return;
			}

			// create entity
			await this.removeEntity(ctx, {
				id: service.id
			});
			this.logger.info(`deleted service ${service.name} in namespace ${namespace.name} for deployment ${deployment.name}`)
		},

		/**
		 * process deployment create event
		 * 
		 * @param {Object} ctx - context object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise} - returns processed deployment
		 */
		async processDeploymentCreate(ctx, deployment) {
			const options = { meta: { userID: deployment.owner } }
			// resolve namespace
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', { id: deployment.namespace }, options);
			// resolve image
			const image = await ctx.call('v1.k8s.images.resolve', { id: deployment.image }, options);

			// create entity
			const service = await ctx.call('v1.k8s.services.create', {
				name: `${deployment.name}-service`,
				namespace: namespace.id,
				deployment: deployment.id,
				ports: [...image.ports, ...deployment.ports],
				selector: [...image.labels, ...deployment.labels],
			}, options);
			this.logger.info(`created service ${service.name} in namespace ${namespace.name} for deployment ${deployment.name}`)
		},
		/**
		 * generate service lables
		 * 
		 * @param {Object} ctx - context object
		 * @param {Object} namespace - namespace object
		 * @param {Object} deployment - deployment object
		 * @param {Object} image - image object
		 * 
		 * @returns {Object} - returns generated labels
		 */
		generateServiceLabels(ctx, namespace, deployment, image) {
			// create a deployment labels spec

			const labels = {

			};

			// loop over image labels
			for (const label of image.labels) {
				// add the label to the labels
				labels[label.key] = label.value;
			}

			labels.app = deployment.name;

			// loop over deployment labales
			for (const label of deployment.labels) {
				// add the label to the labels
				labels[label.key] = label.value;
			}

			// return the labels
			return labels;
		},

		/**
		 * create kubernetes service
		 * 
		 * @param {Object} ctx - context object
		 * @param {Object} service - service object
		 * 
		 * @returns {Promise} - returns created service
		 */
		async createService(ctx, service) {

			// keep track of user id for ownership
			const options = { meta: { userID: service.owner } };

			// resolve namespace
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
				id: service.namespace
			}, options);

			// resolve deployment
			const deployment = await ctx.call('v1.k8s.deployments.resolve', {
				id: service.deployment
			}, options);

			// resolve image
			const image = await ctx.call('v1.k8s.images.resolve', { id: deployment.image }, options);

			// generate lables
			const labels = this.generateServiceLabels(ctx, namespace, deployment, image);


			// loop over image ports and create corresponding container ports
			const ports = service.ports.map(port => {
				return {
					targetPort: port.port,
					port: port.port,
					protocol: port.protocol == 'UDP' ? 'UDP' : 'TCP',
					name: port.name
				}
			});

			const serviceSpec = {
				apiVersion: "v1",
				kind: "Service",
				metadata: {
					name: `${deployment.name}-service`,
					namespace: namespace.name,
					labels: labels
				},
				spec: {
					ports: ports,
					selector: labels,
					type: service.type,
					clustersIP: service.clustersIP,
					externalIPs: service.externalIPs,

				}
			};

			// create the service
			const createdService = await ctx.call('v1.kube.createNamespacedService', {
				namespace: namespace.name,
				body: serviceSpec,
				cluster: namespace.cluster
			});

			//update service uid
			const updated = await this.updateEntity(ctx, {
				id: service.id,
				uid: createdService.metadata.uid
			});

			this.logger.info(`created service ${service.name} in namespace ${namespace.name} for deployment ${deployment.name}`)

			ctx.emit('k8s.services.processed', updated);

			return updated;
		},
		/**
		 * process service remove event
		 * 
		 * @param {Object} ctx - context object
		 * @param {Object} service - service object
		 * 
		 * @returns {Promise} - returns processed service
		 */
		async processServiceRemove(ctx, service) {
			// keep track of user id for ownership
			const options = { meta: { userID: service.owner } };

			// resolve namespace
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
				id: service.namespace,
				fields: ['name', 'cluster']
			}, options);

			// resolve deployment
			const deployment = await ctx.call('v1.k8s.deployments.resolve', {
				id: service.deployment,
				//fields: ['name']
				scope: '-notDeleted'
			}, options);

			await ctx.call('v1.kube.deleteNamespacedService', {
				namespace: namespace.name,
				name: `${deployment.name}-service`,
				cluster: namespace.cluster
			}, options);

			this.logger.info(`deleted service ${service.name} in namespace ${namespace.name} for deployment ${deployment.name}`)
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
