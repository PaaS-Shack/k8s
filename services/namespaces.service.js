"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "namespaces",
	version: 1,

	mixins: [
		DbService({}),
		Membership({
			permissions: 'namespaces'
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
		rest: "/v1/namespaces/",

		fields: {

			name: {
				type: "string",
				required: true,
				validate: "validateName",
			},
			description: {
				type: "string",
				required: false,
				trim: true,
			},
			uid: {
				type: "string",
				required: false,
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
								})
									.catch((err) => err.type)
							}
							return (ctx || this.broker)
								.call('v1.kube.readNamespacedResourceQuota', { namespace: entity.name, name: `${entity.name}-resourcequota`, cluster: entity.cluster })
								.then((namespace) => namespace.status)
								.catch((err) => err.type)
						})
					);
				}
			},
			resourcequota: {
				type: "string",
				required: true,
				populate: {
					action: "v1.resourcequotas.resolve",
					params: {
						//fields: ["id", "username", "fullName", "avatar"]
					}
				},
			},
			domain: {
				type: "string",
				required: true,
				populate: {
					action: "v1.domains.resolve",
					params: {
						//fields: ["id", "username", "fullName", "avatar"]
					}
				},
				validate: "validateDomain",
			},
			ingress: {
				type: "array",
				virtual: true,
				populate: {
					action: "v1.ingress.list",
					params: {
						//fields: ["id", "hostname", "port"]
					}
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
		defaultPopulates: ['quota', 'status'],

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

		create: {
			permissions: ['namespaces.create'],
		},
		list: {
			permissions: ['namespaces.list'],
			params: {
				//domain: { type: "string" }
			}
		},

		find: {
			rest: "GET /find",
			permissions: ['namespaces.find'],
			params: {
				//domain: { type: "string" }
			}
		},

		count: {
			rest: "GET /count",
			permissions: ['namespaces.count'],
			params: {
				//domain: { type: "string" }
			}
		},

		get: {
			needEntity: true,
			permissions: ['namespaces.get'],
		},

		update: {
			needEntity: true,
			permissions: ['namespaces.update'],
		},

		replace: false,

		remove: {
			needEntity: true,
			permissions: ['namespaces.remove'],

		},
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
			const name = namespace.name

			const Namespace = {
				apiVersion: "v1",
				kind: "Namespace",
				metadata: {
					name,
					annotations: {
						'k8s.one-host.ca/owner': namespace.owner,
						'k8s.one-host.ca/name': namespace.name,
						'k8s.one-host.ca/id': namespace.id
					},
					labels: {
						name
					}
				}
			}
			const LimitRange = {
				apiVersion: "v1",
				kind: "LimitRange",
				metadata: {
					name: `${name}-limitrange`,
					labels: {
						name: `${name}-limitrange`
					}
				},
				spec: {
					limits: await ctx.call('v1.limitranges.pack')
				}
			}
			const ResourceQuota = {
				apiVersion: "v1",
				kind: "ResourceQuota",
				metadata: {
					name: `${name}-resourcequota`
				},
				spec: {
					hard: await ctx.call('v1.resourcequotas.pack', { id: namespace.resourcequota })
				}
			}

			this.logger.info(`Creating namespace ${namespace.name} on cluster ${namespace.cluster}`)
			await ctx.call('v1.kube.createNamespace', { body: Namespace, cluster: namespace.cluster }).catch(() => null);
			await ctx.call('v1.kube.createNamespacedLimitRange', { namespace: name, body: LimitRange, cluster: namespace.cluster }).catch(() => null);
			await ctx.call('v1.kube.createNamespacedResourceQuota', { namespace: name, body: ResourceQuota, cluster: namespace.cluster }).catch(() => null);
		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const name = namespace.name
			this.logger.info(`Removing namespace ${namespace.name} on cluster ${namespace.cluster}`)
			await ctx.call('v1.kube.deleteNamespace', { name, cluster: namespace.cluster })
			await ctx.call('v1.kube.deleteNamespacedLimitRange', { namespace: name, name: `${name}-limitrange`, cluster: namespace.cluster })
			await ctx.call('v1.kube.deleteNamespacedResourceQuota', { namespace: name, name: `${name}-resourcequota`, cluster: namespace.cluster })
		},
		async "kube.namespaces.added"(ctx) {
			const resource = ctx.params;
			if (resource.metadata.annotations && resource.metadata.annotations['k8s.one-host.ca/id']) {
				const namespace = await ctx.call('v1.namespaces.update', {
					id: resource.metadata.annotations['k8s.one-host.ca/id'],
					uid: resource.metadata.uid
				}, { meta: { userID: resource.metadata.annotations['k8s.one-host.ca/owner'] } })

				this.logger.info(`Kube has created namespace ${namespace.name} on cluster ${namespace.cluster} ${namespace.uid}`)
			}
		},
		async "kube.namespaces.deleted"(ctx) {
			const resource = ctx.params;
			console.log(resource)
			if (resource.metadata.annotations && resource.metadata.annotations['k8s.one-host.ca/id']) {
				const namespace = await ctx.call('v1.namespaces.update', {
					id: resource.metadata.annotations['k8s.one-host.ca/id'],
					uid: null,
					scope: false
				}, { meta: { userID: resource.metadata.annotations['k8s.one-host.ca/owner'] } })

				this.logger.info(`Kube has deleted namespace ${namespace.name} on cluster ${namespace.cluster} ${namespace.uid}`)
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {

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
		//this.actions.startAll().catch(() => null)
	},

	/**
	 * Service stopped lifecycle event handler
	 */
	stopped() {

	}
};
