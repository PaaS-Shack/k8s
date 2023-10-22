"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const FIELDS = require("../fields");

/**
 * attachments of addons service
 */
module.exports = {
	name: "k8s.namespaces",
	version: 1,

	mixins: [
		DbService({
			permissions: 'k8s.namespaces'
		}),
		Membership({
			permissions: 'k8s.namespaces'
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
		rest: "/v1/k8s/namespaces/",

		fields: {
			...FIELDS.NAMESPACE_FIELDS.properties,


			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},
		defaultPopulates: [],

		scopes: {
			...DbService.SCOPE,
			...Membership.SCOPE,
		},

		defaultScopes: [...DbService.DSCOPE, ...Membership.DSCOPE]
	},

	/**
	 * Actions
	 */

	actions: {


		clean: {
			params: {},
			async handler(ctx) {
				const entities = await this.findEntities(ctx, { scope: false })
				console.log(entities)
				return Promise.allSettled(entities.map((entity) =>
					this.removeEntity(ctx, { scope: false, id: entity.id })))
			}
		},

		resolveName: {
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const namespace = await this.findEntity(null, {
					query: { name: params.name },
					scope: ["-membership"],
					fields: ['id', 'name', 'owner', 'members', 'uid', 'createdAt', 'updatedAt'],
				});

				return namespace
			}
		},

		/**
		 * test for name availability
		 * 
		 * @actions
		 * @param {String} name - namespace name
		 * 
		 * @returns {Promise} availability
		 */
		available: {
			rest: {
				method: "GET",
				path: "/available/:name"
			},
			permissions: ['k8s.namespaces.available'],
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// find namespace by name
				const namespace = await this.findByName(params.name);

				// if namespace found, return false
				if (namespace)
					return false;

				// return true
				return true;
			}
		},

		/**
		 * Get namespace status
		 * 
		 * @actions
		 * @param {String} id - namespace id
		 * 
		 * @returns {Promise} namespace status
		 */
		status: {
			rest: {
				method: "GET",
				path: "/:id/status"
			},
			permissions: ['k8s.namespaces.status'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// resolve namespace
				const namespace = await this.resolveEntities(ctx, {
					id: params.id,
					fields: ['id', 'name', 'uid', 'cluster']
				});

				if (namespace.uid == null) {

					// get namespace status
					const resource = await ctx.call("v1.kube.readNamespace", {
						name: namespace.name,
						cluster: namespace.cluster
					});

					return this.transformResource(ctx, resource);
				}

				// lookup namespace uid with v1.kube.findOne
				const resource = await ctx.call("v1.kube.findOne", {
					_id: namespace.uid,
					fields: ['spec', 'status']
				});

				return this.transformResource(ctx, resource);
			}
		},

		/**
		 * Get namespace resourcequota
		 * 
		 * @actions
		 * @param {String} id - namespace id
		 * 
		 * @returns {Promise} namespace resourcequota
		 */
		resourcequota: {
			rest: {
				method: "GET",
				path: "/:id/resourcequota"
			},
			permissions: ['k8s.namespaces.resourcequota'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				// resolve namespace
				const namespace = await this.resolveEntities(ctx, {
					id: params.id,
					fields: ['id', 'name', 'uid', 'cluster']
				});

				if (namespace.uid == null) {

					// get namespace resourcequota
					const resource = await ctx.call("v1.kube.readNamespacedResourceQuota", {
						name: `${namespace.name}-resourcequota`,
						namespace: namespace.name,
						cluster: namespace.cluster
					});

					return this.transformResource(ctx, resource);
				}

				// lookup namespace uid with v1.kube.findOne
				const resource = await ctx.call("v1.kube.findOne", {
					_id: namespace.uid,
					fields: ['spec', 'status']
				});

				return this.transformResource(ctx, resource);
			}
		},

	},

	/**
	 * Events
	 */
	events: {
		async "k8s.namespaces.created"(ctx) {
			const namespace = ctx.params.data;
			return this.createNamespace(ctx, namespace)
				.then((resource) => {
					this.logger.info(`Creating namespace ${namespace.name} on cluster ${namespace.cluster} with uid ${resource.metadata.uid}`);
				})
				.catch((err) => {
					this.logger.error(`Creating namespace ${namespace.name} on cluster ${namespace.cluster} failed with error ${err.message}`);
				});

		},
		async "k8s.namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			return this.deleteNamespace(ctx, namespace)
				.then((resource) => {
					this.logger.info(`Deleting namespace ${namespace.name} on cluster ${namespace.cluster} with uid ${resource.metadata.uid}`);
				}).catch((err) => {
					this.logger.error(`Deleting namespace ${namespace.name} on cluster ${namespace.cluster} failed with error ${err.message}`);
				});

		},
		async "kube.namespaces.added"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event
			return this.getIdFromAnnotation(ctx, resource)
				.then(async (id) => {
					await this.updateUid(ctx, { id }, resource.metadata.uid);
					this.logger.info(`Kube has created namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`);
				}).catch((err) => {
					this.logger.error(`Kube has created namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} failed with error ${err.message}`);
				});
		},
		async "kube.namespaces.deleted"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event
			return this.getIdFromAnnotation(ctx, resource)
				.then(async (id) => {
					await this.updateUid(ctx, { id }, null);
					this.logger.info(`Kube has deleted namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`)
				}).catch((err) => {
					this.logger.error(err.message)
				});
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * Transform resource to spec and status
		 * 
		 * @param {Object} ctx
		 * @param {Object} resource
		 */
		async transformResource(ctx, resource) {
			return resource.status;
			return {
				spec: resource.spec,
				status: resource.status,
			};
		},

		/**
		 * Get ID from annotation
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async getIdFromAnnotation(ctx, namespace) {
			const annotations = namespace.metadata.annotations;
			return new Promise((resolve, reject) => {
				// if no annotations, ignore
				if (!annotations)
					throw new MoleculerClientError("No annotations found", 400, "NO_ANNOTATIONS");

				// if no id, ignore
				if (!annotations['k8s.one-host.ca/id'])
					throw new MoleculerClientError("No id found", 400, "NO_ID");

				resolve(annotations['k8s.one-host.ca/id']);
			});

		},

		/**
		 * Create k8s namespace
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async createNamespace(ctx, namespace) {

			const name = namespace.name;

			// generate annotations
			const annotations = await this.generateAnnotations(ctx, namespace);
			// generate labels
			const labels = await this.generateLabels(ctx, namespace);

			// naamespace schema
			const Namespace = {
				apiVersion: "v1",
				kind: "Namespace",
				metadata: {
					name,
					annotations,
					labels
				}
			};

			// create namespace
			return ctx.call('v1.kube.createNamespace', { body: Namespace, cluster: namespace.cluster });
		},

		/**
		 * Delete k8s namespace
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Promise} 
		 */
		async deleteNamespace(ctx, namespace) {
			const name = namespace.name;

			// sleep for 10 secons
			await new Promise((resolve) => setTimeout(resolve, 10000));

			// delete namespace
			return ctx.call('v1.kube.deleteNamespace', {
				name,
				cluster: namespace.cluster
			});
		},

		/**
		 * generate namespace annotations
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Object}
		 */
		async generateAnnotations(ctx, namespace) {
			const annotations = {
				'k8s.one-host.ca/owner': namespace.owner,
				'k8s.one-host.ca/name': namespace.name,
				'k8s.one-host.ca/id': namespace.id,
			};

			// loop over namespace annotations
			for (const [key, value] of Object.entries(namespace.annotations)) {
				annotations[key] = value;
			}

			return annotations;
		},

		/**
		 * Generate namespace lables
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace
		 * 
		 * @returns {Object}
		 */
		async generateLabels(ctx, namespace) {
			const labels = {
				name: namespace.name
			};

			// loop over namespace labels
			for (const [key, value] of Object.entries(namespace.labels)) {
				labels[key] = value;
			}

			return labels;
		},

		/**
		 * find namespace by name
		 * 
		 * @param {String} name - namespace name
		 */
		async findByName(name) {
			return this.findEntity(null, {
				query: { name },
				scope: ["-membership"],
			});
		},

		/**
		 * find namespace by id
		 * 
		 * @param {String} id - namespace id
		 */
		async findById(id) {
			return this.findEntity(null, {
				query: { id },
				scope: ["-membership"],
			});
		},

		/**
		 * update namespace k8s uid
		 * 
		 * @param {Object} ctx - context
		 * @param {Object} namespace - namespace entity
		 * @param {String} uid - k8s uid
		 */
		async updateUid(ctx, namespace, uid) {
			return this.updateEntity(ctx, {
				id: namespace.id,
				uid,
				scope: false,
			}).catch((err) => {
				// if not found ignore
				if (err.code == 404)
					return;
				throw err;
			});
		},

		async validateDomain({ ctx, value, params, id, entity }) {
			return ctx.call("v1.domains.resolve", { id: params.domain })
				.then((res) => res ? true : `No permissions '${value} not found'`)
		},
		async validateName({ ctx, value, params, id, entity }) {
			return ctx.call("v1.namespaces.find", {
				query: { name: params.name },
				scope: '-membership'
			}).then((res) => res.length ? `Name already used` : true)
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() {

	},

	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() {

	}
};
