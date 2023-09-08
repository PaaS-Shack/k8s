"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

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

			name: {
				type: "string",
				required: true,
				trim: true,
				pattern: /^[a-z0-9]([-a-z0-9]*[a-z0-9])?$/,
				validate: "validateName",
			},
			description: {
				type: "string",
				required: false,
				trim: true,
			},
			uid: {
				type: "string",
				default: null,
				required: false,
			},
			resourcequota: {
				type: "string",
				required: true,
				populate: {
					action: "v1.resourcequotas.resolve",
				},
			},
			domain: {
				type: "string",
				required: true,
				populate: {
					action: "v1.domains.resolve",
				},
				validate: "validateDomain",
			},
			ingress: {
				type: "array",
				virtual: true,
				populate: {
					action: "v1.ingress.list",
				}
			},
			zone: {
				type: "string",
				required: true,
			},
			cluster: {
				type: "string",
				required: true,
			},
			status: {
				type: "boolean",
				virtual: true,
				populate(ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							if (entity.uid) {
								return ctx.call('v1.kube.findOne', { _id: entity.uid, fields: ['status.phase'] })
									.then((namespace) => namespace.status.phase)
									.catch((err) => err.type)
							}
							return (ctx || this.broker)
								.call("v1.kube.readNamespace", { name: entity.name, cluster: entity.cluster })
								.then((namespace) => namespace.status.phase)
								.catch((err) => err.type)
						})
					);
				}
			},
			quota: {
				type: "object",
				virtual: true,
				populate(ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							if (entity.uid) {
								return ctx.call('v1.kube.findOne', {
									kind: 'ResourceQuota',
									'metadata.namespace': entity.name,
									fields: ['status']
								}).then((res) => {
									return res.status
								}).catch((err) => err.type)
							}
							return (ctx || this.broker)
								.call('v1.kube.readNamespacedResourceQuota', { namespace: entity.name, name: `${entity.name}-resourcequota`, cluster: entity.cluster })
								.then((namespace) => namespace.status)
								.catch((err) => err.type)
						})
					);
				}
			},


			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},
		defaultPopulates: ['quota', 'status'],

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
	},

	/**
	 * Events
	 */
	events: {
		async "namespaces.created"(ctx) {
			const namespace = ctx.params.data;

			this.logger.info(`Creating namespace ${namespace.name} on cluster ${namespace.cluster}`);
			await this.createNamespace(ctx, namespace);

		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;

			this.logger.info(`Deleting namespace limit range ${namespace.name} on cluster ${namespace.cluster}`);
			await this.deleteLimitRange(ctx, namespace);

		},
		async "kube.namespaces.added"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event

			//if no annotation, ignore
			if (!resource.metadata.annotations)
				return;

			// namespace id is stored in annotation
			const id = resource.metadata.annotations['k8s.one-host.ca/id'];

			// if no id, ignore
			if (!id)
				return;

			// find namespace by id	
			await this.updateUid(ctx, { id }, resource.metadata.uid);
			this.logger.info(`Kube has created namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`)

		},
		async "kube.namespaces.deleted"(ctx) {
			const resource = ctx.params;
			// k8s resource watcher will trigger this event

			//if no annotation, ignore
			if (!resource.metadata.annotations)
				return;

			// namespace id is stored in annotation
			const id = resource.metadata.annotations['k8s.one-host.ca/id'];

			// if no id, ignore
			if (!id)
				return;

			await this.updateUid(ctx, { id }, null);
			this.logger.info(`Kube has deleted namespace ${resource.metadata.name} on cluster ${resource.metadata.cluster} ${resource.metadata.uid}`)
		},
	},

	/**
	 * Methods
	 */
	methods: {
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

			// naamespace schema
			const Namespace = {
				apiVersion: "v1",
				kind: "Namespace",
				metadata: {
					name,
					annotations: {
						'k8s.one-host.ca/owner': namespace.owner,
						'k8s.one-host.ca/name': namespace.name,
						'k8s.one-host.ca/id': namespace.id,
					},
					labels: {
						name
					}
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

			// delete namespace
			return ctx.call('v1.kube.deleteNamespace', {
				name,
				cluster: namespace.cluster
			});
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
				scope: ["-membership"],
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
