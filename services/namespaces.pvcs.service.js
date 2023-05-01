"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "namespaces.pvcs",
	version: 1,

	mixins: [
		DbService({}),
		//Cron,
		Membership({
			permissions: 'namespaces.pvcs'
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
		rest: "/v1/namespaces/:namespace/pvcs",

		fields: {

			name: {
				type: "string",
				required: true,
			},
			namespace: {
				type: "string",
				required: true,
			},
			deployment: {
				type: "string",
				required: false,
			},
			cluster: {
				type: "string",
				required: false,
			},
			size: {
				type: "number",
				convert: true,
				required: true,
			},
			mountPath: {
				type: "string",
				required: true,
			},
			shared: {
				type: "boolean",
				required: false,
				default: false
			},
			type: {
				type: "enum",
				values: ["local", "replica", "default"],
				default: 'default',
				required: false,
			},

			status: {
				type: "object",
				virtual: true,
				populate(ctx, values, entities, field) {
					return Promise.all(
						entities.map(async entity => {
							return (ctx || this.broker)
								.call("v1.namespaces.pvcs.readNamespacedPVC", { name: entity.name, namespace: entity.namespace, cluster: entity.cluster })
								.then((pvc) => pvc.status)
								.catch((err) => err.type)
						})
					);
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
		shared: {
			rest: "GET /shared",
			params: {
				namespace: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				return this.findEntities(ctx, {
					query: {
						namespace:params.namespace,
						shared: true
					}
				});
			}
		},
		deleteNamespacedPVC: {
			params: {
				namespace: { type: "string", optional: false },
				name: { type: "string", optional: false },
				cluster: { type: "string", optional: false },
				shared: { type: "boolean", optional: true, default: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const results = []
				const claimName = `${params.name}-pv-claim${params.shared ? '-shared' : ''}`

				return ctx.call('v1.kube.deleteNamespacedPersistentVolumeClaim', { namespace: params.namespace, cluster: params.cluster, name: claimName })
			}
		},
		readNamespacedPVC: {
			params: {
				namespace: { type: "string", optional: false },
				name: { type: "string", optional: false },
				cluster: { type: "string", optional: false },
				shared: { type: "boolean", optional: true, default: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const results = []
				const claimName = `${params.name}-pv-claim${params.shared ? '-shared' : ''}`

				return ctx.call('v1.kube.readNamespacedPersistentVolumeClaim', { namespace: params.namespace, cluster: params.cluster, name: claimName })
			}
		},
		createNamespacedPVC: {
			params: {
				namespace: { type: "string", optional: false },
				name: { type: "string", optional: false },
				cluster: { type: "string", optional: false },
				shared: { type: "boolean", optional: true, default: false },
				type: { type: "enum", values: ["local", "replica", "default"], default: 'replica', optional: true },
				size: { type: "number", default: 1000, optional: true },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const results = []
				const claimName = `${params.name}-pv-claim${params.shared ? '-shared' : ''}`

				let storageClassName = '';

				switch (params.type) {
					case 'local':
						storageClassName = 'local-path'
						break;
					case 'default':
						storageClassName = 'longhorn'
						break;
					case 'replica':
					default:
						storageClassName = 'longhorn-replica'
						break;
				}

				const PersistentVolumeClaim = {
					apiVersion: "v1",
					kind: "PersistentVolumeClaim",
					metadata: {
						name: claimName
					},
					spec: {
						storageClassName,
						accessModes: [`ReadWrite${params.shared ? 'Many' : 'Once'}`],
						resources: {
							requests: {
								storage: `${params.size}Mi`
							}
						}
					}
				}

				return ctx.call('v1.kube.createNamespacedPersistentVolumeClaim', { namespace: params.namespace, cluster: params.cluster, body: PersistentVolumeClaim })
			}
		},
	},

	/**
	 * Events
	 */
	events: {
		async "namespaces.pvcs.created"(ctx) {
			const pvc = ctx.params.data;

			const namespace = await ctx.call('v1.namespaces.resolve', {
				id: pvc.namespace,
				fields: ['name', 'cluster']
			})


			const claim = await ctx.call('v1.namespaces.pvcs.createNamespacedPVC', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: pvc.name,
				type: pvc.type,
				shared: pvc.shared,
				size: pvc.size,
			})
			this.logger.info(`PVC created ${claim.metadata.name}`, claim.status);
		},
		async "namespaces.pvcs.removed"(ctx) {
			const pvc = ctx.params.data;

			const namespace = await ctx.call('v1.namespaces.resolve', {
				id: pvc.namespace,
				fields: ['name', 'cluster'],
				scope:'-notDeleted'
			})

			const claim = await ctx.call('v1.namespaces.pvcs.deleteNamespacedPVC', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				shared: pvc.shared,
				name: pvc.name
			})
			this.logger.info(`PVC deleted ${claim.metadata.name}`, claim.status);
		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { namespace: namespace.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })))
				.then(() =>
					this.logger.info(`PVC namespace remove event for ${namespace.name}`))
		}
	},

	/**
	 * Methods
	 */
	methods: {

	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {

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
