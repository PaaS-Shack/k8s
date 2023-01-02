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
		Cron,
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
								return ctx.call('v1.kube.get', { uid: entity.uid })
									.then((namespace) => namespace.status.phase)
									.catch((err) => err.type)
							}
							return (ctx || this.broker)
								.call("v1.kube.readNamespace", { name: entity.name })
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
								return ctx.call('v1.kube.get', {
									kind: 'ResourceQuota',
									namespace: entity.name
								}).then((res) => {
									return res.shift().status
								})
									.catch((err) => err.type)
							}
							return (ctx || this.broker)
								.call('v1.kube.readNamespacedResourceQuota', { namespace: entity.name, name: `${entity.name}-resourcequota` })
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
			zone: {
				type: "string",
				required: true,
				populate: {
					action: "v1.zones.resolve",
					params: {
						//fields: ["id", "username", "fullName", "avatar"]
					}
				},
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
		deployImage: {
			params: {
				id: { type: "string", optional: false },
				name: { type: "string", optional: false },
				size: { type: "string", optional: false },
				image: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const namespace = await this.resolveEntities(ctx, {
					id: params.id,
				});

				if (!namespace)
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");

				const size = await ctx.call('v1.sizes.getSize', { name: params.size })

				const image = await ctx.call('v1.images.resolve', { id: params.image })

				const key = `${params.id}:${params.name}`
				const appName = `${image.source}-${image.process}-${params.name}`

				const selector = {
					app: appName,
					tier: "frontend"
				}
				const metadata = {
					name: appName,
					labels: {
						app: appName
					}
				}

				const deployment = {
					apiVersion: "apps/v1",
					kind: "Deployment",
					metadata,
					spec: {
						selector: {
							matchLabels: selector
						},
						strategy: {
							type: "Recreate"
						},
						template: {
							metadata: {
								labels: selector
							},
							spec: {
								containers: [],
								volumes: []
							}
						}
					}
				}
				const spec = await this.podSpec(ctx, namespace, params, image, size)

				deployment.spec.template.spec.volumes = spec.volumes
				deployment.spec.template.spec.containers = [spec.container]


				return ctx.call('v1.kube.createNamespacedDeployment', {
					namespace: namespace.name,
					body: deployment
				})
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

			await ctx.call('v1.kube.createNamespace', { body: Namespace })
			await ctx.call('v1.kube.createNamespacedLimitRange', { namespace: name, body: LimitRange })
			await ctx.call('v1.kube.createNamespacedResourceQuota', { namespace: name, body: ResourceQuota })

		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const name = namespace.name
			await ctx.call('v1.kube.deleteNamespace', { name })
			await ctx.call('v1.kube.deleteNamespacedLimitRange', { namespace: name, name: `${name}-limitrange` })
			await ctx.call('v1.kube.deleteNamespacedResourceQuota', { namespace: name, name: `${name}-resourcequota` })
		},
		async "kube.namespaces.added"(ctx) {
			const namespace = ctx.params;
			if (namespace.metadata.annotations && namespace.metadata.annotations['k8s.one-host.ca/id'])
				await ctx.call('v1.namespaces.update', {
					id: namespace.metadata.annotations['k8s.one-host.ca/id'],
					uid: namespace.metadata.uid
				}, { meta: { userID: namespace.metadata.annotations['k8s.one-host.ca/owner'] } })
		},
		async "kube.namespaces.deleted"(ctx) {
			const namespace = ctx.params;
			if (namespace.metadata.annotations && namespace.metadata.annotations['k8s.one-host.ca/id'])
				await ctx.call('v1.namespaces.update', {
					id: namespace.metadata.annotations['k8s.one-host.ca/id'],
					uid: null
				}, { meta: { userID: namespace.metadata.annotations['k8s.one-host.ca/owner'] } })
		},
	},

	/**
	 * Methods
	 */
	methods: {

		async podSpec(ctx, namespace, params, image, size) {

			const key = `${params.id}:${params.name}`
			const appName = `${image.source}-${image.process}-${params.name}`
			const volumes = [];

			const container = {
				"name": `${image.source}-${image.process}`,
				"image": `${image.name}`,
				"imagePullPolicy": "Always",
				"ports": image.ports.map((port) => {
					return {
						"containerPort": port.internal,
						"type": port.type
					}
				}),
				"resources": {
					"requests": {
						"memory": `${size.memoryReservation}Mi`,
						"cpu": `${size.cpuReservation}m`
					},
					"limits": {
						"memory": `${size.memory}Mi`,
						"cpu": `${size.cpu}m`
					}
				},
				"volumeMounts": [],
				"envFrom": [{
					"configMapRef": {
						"name": configMap.metadata.name
					}
				}]
			}

			for (let index = 0; index < image.volumes.length; index++) {
				const element = image.volumes[index];
				const name = `${appName}-${index}`
				const claim = await ctx.call('v1.namespaces.pvcs.createNamespacedPVC', {
					namespace: namespace.name,
					name,
					type: element.type == 'ssd' ? 'local' : 'remote',
					size: 1000,
				})

				volumes.push({
					name,
					persistentVolumeClaim: {
						claimName: claim.metadata.name
					}
				})
				container.volumeMounts.push({
					name,
					mountPath: element.local
				})

			}

			for (let index = 0; index < image.envs.length; index++) {
				const element = image.envs[index];
				await ctx.call('v1.envs.create', {
					...element,
					reference: key,
				})
			}

			return {
				appName,
				volumes,
				container
			}
		},
		async generateNamespacedService(ctx, namespace, params) {
			const selector = {
				app: params.name,
				tier: "frontend"
			}
			const metadata = {
				name: params.name,
				labels: {
					app: params.name
				}
			}

			return {
				apiVersion: "v1",
				kind: "Service",
				metadata,
				spec: {
					ports: [{
						port: params.port
					}],
					selector,
					type: "NodePort"
				}
			}
		},
		async generateNamespacedPVC(ctx, namespace, params) {

			const claimName = `${params.name}-pv-claim`

			let storageClassName = ''
			if (params.type == 'local') {
				storageClassName = 'local-path'
			} else if (params.type == 'remote') {
				storageClassName = 'nfs-client'
			}

			return {
				apiVersion: "v1",
				kind: "PersistentVolumeClaim",
				metadata: {
					name: claimName
				},
				spec: {
					storageClassName,
					accessModes: ["ReadWriteMany"],
					resources: {
						requests: {
							storage: `${params.size}Mi`
						}
					}
				}
			}
		},
		async generateNamespace(ctx, namespace) {
			return {
				"apiVersion": "v1",
				"kind": "Namespace",
				"metadata": {
					"name": `${namespace.name}`
				}
			}
		},
		async generateNamespaceResourceQuota(ctx, namespace, size) {
			return {
				"apiVersion": "v1",
				"kind": "ResourceQuota",
				"metadata": {
					"name": `${namespace.name}`
				},
				"spec": {
					"hard": {
						"requests.cpu": `${size.cpu}m`,
						"requests.memory": `${size.cpu}Mi`,
						"limits.cpu": `${size.cpuReservation}m`,
						"limits.memory": `${size.memoryReservation}Mi`
					}
				}
			}
		},

		async validateDomain({ ctx, value, params, id, entity }) {
			return ctx.call("v1.domains.resolve", { id: params.domain })
				.then((res) => res ? true : `No permissions '${value} not found'`)
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
