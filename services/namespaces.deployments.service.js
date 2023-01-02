"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

/**
 * attachments of addons service
 */
module.exports = {
	name: "namespaces.deployments",
	version: 1,

	mixins: [
		DbService({}),
		Cron,
		Membership({
			permissions: 'namespaces.deployments'
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
		rest: "/v1/namespaces/:namespace/deployments",

		fields: {

			name: {
				type: "string",
				required: true,
			},
			uid: {
				type: "string",
				required: false,
			},
			replicas: {
				type: 'number',
				required: false,
				default: 1
			},
			revisionHistoryLimit: {
				type: 'number',
				required: false,
				default: 2
			},
			progressDeadlineSeconds: {
				type: 'number',
				required: false,
				default: 600
			},
			strategy: {
				type: 'enum',
				values: ['Recreate', 'RollingUpdate'],
				default: 'Recreate',
				required: false
			},
			zone: {
				type: 'enum',
				values: ['ca', 'eu'],
				default: 'ca',
				required: false
			},
			tier: {
				type: 'enum',
				values: ['backend', 'frontend'],
				default: 'frontend',
				required: false
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
			size: {
				type: "string",
				required: true,
				populate: {
					action: "v1.sizes.resolve",
					params: {
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			image: {
				type: "string",
				required: true,
				populate: {
					action: "v1.images.resolve",
					params: {
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			build: {
				type: "string",
				required: false,
				populate: {
					action: "v1.builds.resolve",
					params: {
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			routes: {
				type: 'array',
				items: "string",
				optional: true,
				populate: {
					action: "v1.routes.resolve",
					params: {
						fields: ["id", "vHost", "strategy"]
					}
				}
			},

			status: {
				type: "object",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {

							if (entity.uid) {
								return ctx.call('v1.kube.get', { uid: entity.uid })
									.then((deployment) => `${deployment.status.availableReplicas}:${deployment.status.readyReplicas}:${deployment.status.replicas}:${deployment.status.observedGeneration}`)
									.catch((err) => {
										console.log(err)
										return `Error: ${err.type}`
									})
							}

							return ctx.call('v1.namespaces.resolve', { id: entity.namespace })
								.then((namespace) => {
									return ctx.call("v1.kube.readNamespacedDeployment", { name: entity.name, namespace: namespace.name })
										.then((deployment) => `${deployment.status.availableReplicas}:${deployment.status.readyReplicas}:${deployment.status.replicas}:${deployment.status.observedGeneration}`)
										.catch((err) => {
											console.log(err)
											return `Error: ${err.type}`
										})
								})
						})
					);
				}
			},
			statusObject: {
				type: "object",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							if (entity.uid) {
								return ctx.call('v1.kube.get', { uid: entity.uid })
									.then((deployment) => deployment.status)
									.catch((err) => {
										console.log(err)
										return `Error: ${err.type}`
									})
							}
							return ctx.call('v1.namespaces.resolve', { id: entity.namespace })
								.then((namespace) => {
									return ctx.call("v1.kube.readNamespacedDeployment", { name: entity.name, namespace: namespace.name })
										.then((deployment) => deployment.status)
										.catch((err) => {
											console.log(err)
											return `Error: ${err.type}`
										})
								})
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
			async namespace(query, ctx, params) { return this.validateHasPermissions(query, ctx, params) },
			...Membership.SCOPE,
		},

		defaultScopes: ["notDeleted", "namespace", ...Membership.DSCOPE]
	},

	crons: [{
		name: "Starting all services",
		cronTime: "*/30 * * * *",
		onTick: {
			//action: "v1.services.startAll"
		}
	}],
	/**
	 * Actions
	 */

	actions: {
		create: {
			permissions: ['namespaces.deployments.create']
		},
		list: {
			permissions: ['namespaces.deployments.list'],
			permissionsTarget: 'namespace',
			params: {
				namespace: { type: "string" }
			}
		},

		find: {
			rest: "GET /find",
			permissions: ['namespaces.deployments.find'],
			params: {
				namespace: { type: "string" }
			}
		},

		count: {
			rest: "GET /count",
			permissions: ['namespaces.deployments.count'],
			params: {
				namespace: { type: "string" }
			}
		},

		get: {
			needEntity: true,
			permissions: ['namespaces.deployments.get']
		},

		update: {
			needEntity: true,
			permissions: ['namespaces.deployments.update']
		},

		replace: false,

		remove: {
			needEntity: true,
			permissions: ['namespaces.deployments.remove']
		},
		status: {
			params: {
				name: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const namespace = await this.findEntity(ctx, {
					query: { name: params.name },
				});
				if (!namespace) {
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");
				}

				return namespace
			}
		},
		build: {
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const deployment = await this.resolveEntities(ctx, {
					id: params.id
				});
				if (!deployment) {
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");
				}

				const build = await ctx.call('v1.builds.image', {
					id: deployment.image,
					nodeID: this.broker.nodeID
				})

				return this.updateEntity(ctx, {
					id: deployment.id,
					build: build.id
				})
			}
		},
		buildRemote: {
			params: {
				id: { type: "string", optional: false },
				remote: { type: "string", empty: false, optional: false },
				branch: { type: "string", empty: false, optional: false },
				commit: { type: "string", empty: false, optional: true },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);
				const deployment = await this.resolveEntities(ctx, {
					id: params.id,
					populate: ['build', 'namespace']
				});
				if (!deployment) {
					throw new MoleculerClientError("deployment not found.", 400, "ERR_EMAIL_EXISTS");
				}
				const image = await ctx.call('v1.images.resolve', {
					id: deployment.image
				})

				const build = await ctx.call('v1.builds.build', {
					nodeID: deployment.build.nodeID,
					registry: image.registry,
					namespace: deployment.namespace.name,
					name: deployment.name,
					tag: image.tag,
					dockerFile: image.dockerFile,
					remote: params.remote,
					branch: params.branch,
					commit: params.commit,
				})


				return this.updateEntity(ctx, {
					id: deployment.id,
					build: build.id
				})
			}
		},
		deploy: {
			rest: "POST /:id/deploy",
			permissions: ['namespaces.deployments.deploy'],
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, {
					id: params.id,
					populate: ['namespace', 'build']
				});

				if (!deployment) {
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");
				}

				if (deployment.build && deployment.build.phase != 'pushed') {
					throw new MoleculerClientError("build has not pushed yet..", 400, "ERR_EMAIL_EXISTS");
				}

				const spec = await this.actions.podSpec(params, { parentCtx: ctx })

				const found = await ctx.call('v1.kube.readNamespacedDeployment', {
					namespace: deployment.namespace.name,
					name: deployment.name
				}).catch(() => false)

				if (found) {
					return ctx.call('v1.kube.replaceNamespacedDeployment', {
						namespace: deployment.namespace.name,
						name: deployment.name,
						body: spec
					})
				} else {
					return ctx.call('v1.kube.createNamespacedDeployment', {
						namespace: deployment.namespace.name,
						name: deployment.name,
						body: spec
					})
				}
			}
		},
		podSpec: {
			params: {
				id: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, {
					id: params.id,
					populate: ['namespace', 'build', 'image', 'size', 'owner', 'routes']
				});
				if (!deployment) {
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");
				}


				const volumes = []

				const container = {
					"name": `${deployment.image.source}-${deployment.image.process}`,
					"image": `${deployment.image.registry}/${deployment.image.namespace}/${deployment.image.imageName}:${deployment.image.tag}`,
					"imagePullPolicy": deployment.image.pullPolicy,
					"resources": {
						"requests": {
							"memory": `${deployment.size.memory}Mi`,
							"cpu": `${deployment.size.cpu}m`
						},
						"limits": {
							"memory": `${deployment.size.memoryReservation + deployment.size.memory}Mi`,
							"cpu": `${deployment.size.cpuReservation + deployment.size.cpu}m`
						}
					},
					"volumeMounts": [],
					"envFrom": [{
						"configMapRef": {
							"name": `${deployment.name}`
						}
					}],
					"ports": deployment.image.ports.map((port) => {
						return {
							"containerPort": port.internal,
							"type": port.type,
							"name": port.name
						}
					})
				}
				console.log(container)

				if (deployment.image.ports[0]) {
					container.livenessProbe = {
						tcpSocket: {
							port: deployment.image.ports[0].internal
						},
						initialDelaySeconds: 15,
						periodSeconds: 20
					}
					container.readinessProbe = {
						tcpSocket: {
							port: deployment.image.ports[0].internal
						},
						initialDelaySeconds: 5,
						periodSeconds: 10
					}
				}

				for (let index = 0; index < deployment.image.volumes.length; index++) {
					const element = deployment.image.volumes[index];
					const name = `${deployment.name}-${index}`;
					volumes.push({
						name,
						persistentVolumeClaim: {
							claimName: `${name}-pv-claim`
						}
					})
					container.volumeMounts.push({
						name,
						mountPath: element.local
					})
				}
				const selector = {
					app: deployment.name,
					tier: deployment.tier
				}
				const metadata = {
					name: deployment.name,
					annotations: {
						'k8s.one-host.ca/owner': deployment.owner.id,
						'k8s.one-host.ca/namespace': deployment.namespace.id,
						'k8s.one-host.ca/deployment': deployment.id,
						'k8s.one-host.ca/build': deployment.build?.id,
						'k8s.one-host.ca/image': deployment.image.id,
						'k8s.one-host.ca/size': deployment.size.id,
						'k8s.one-host.ca/routes': deployment.routes.map((route) => route.id).join(',')
					},
					labels: selector
				}
				const affinity = {}
				if (deployment.zone) {
					affinity.nodeAffinity = {
						"requiredDuringSchedulingIgnoredDuringExecution": {
							"nodeSelectorTerms": [{
								"matchExpressions": [{
									"key": "topology.kubernetes.io/zone",
									"operator": "In",
									"values": [deployment.zone]
								}]
							}]
						}
					}
				}

				const containers = [container]

				const spec = {
					apiVersion: "apps/v1",
					kind: "Deployment",
					metadata,
					spec: {
						selector: {
							matchLabels: selector
						},
						strategy: {
							type: deployment.strategy
						},
						replicas: deployment.replicas,
						revisionHistoryLimit: deployment.revisionHistoryLimit,
						template: {
							metadata,
							spec: {
								affinity,
								containers,
								volumes
							}
						}
					}
				}

				return spec
			}
		},

	},

	/**
	 * Events
	 */
	events: {
		async "namespaces.created"(ctx) {
			const namespace = ctx.params.data;
			const name = namespace.name;

		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const name = namespace.name;

		},
		async "namespaces.deployments.created"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', { id: deployment.namespace })
			const image = await ctx.call('v1.images.resolve', { id: deployment.image })

			this.logger.info(`Deployment(${deployment.id}) created for image ${image.id}`);

			await ctx.call('v1.envs.create', {
				key: 'DEPLOYMENT',
				value: deployment.id,
				namespace: deployment.namespace,
				deployment: deployment.id,
			})

			for (let index = 0; index < image.envs.length; index++) {
				const element = image.envs[index];
				await ctx.call('v1.envs.create', {
					...element,
					namespace: deployment.namespace,
					deployment: deployment.id,
				})
			}
			for (let index = 0; index < image.volumes.length; index++) {
				const element = image.volumes[index];
				const name = `${deployment.name}-${index}`;
				await ctx.call('v1.namespaces.pvcs.create', {
					namespace: namespace.name,
					name,
					mountPath: element.local,
					type: element.type == 'ssd' ? 'local' : 'remote',
					size: 1000,
				})

				this.logger.info(`Deployment(${deployment.id}) PVC created ${name}`);
			}
		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', { id: deployment.namespace })
			const image = await ctx.call('v1.images.resolve', { id: deployment.image })

			this.logger.info(`Deployment(${deployment.id}) removed for image ${image.id}`);

			await ctx.call('v1.kube.deleteNamespacedDeployment', {
				namespace: namespace.name,
				name: deployment.name
			});


			for (let index = 0; index < image.volumes.length; index++) {
				const element = image.volumes[index];
				const name = `${deployment.name}-${index}`;
				await ctx.call('v1.namespaces.pvcs.deleteNamespacedPVC', {
					namespace: namespace.name,
					name
				})

				this.logger.info(`Deployment(${deployment.id}) PVC removed ${name}`);
			}
		},
		async "builds.pushed"(ctx) {
			const build = ctx.params;
			const deployment = await this.findEntity(null, {
				scope: false,
				query: {
					build: build.id,
					deletedAt: null
				}
			})
			if (deployment) {
				this.logger.info(`Deployment(${deployment.id}) build pushed. Deploying..`);
				await this.actions.deploy({
					id: deployment.id
				}, {
					meta: { userID: deployment.owner }
				})
			}
		},
		async "kube.deployments.added"(ctx) {
			const deployment = ctx.params;
			if (deployment.metadata.annotations['k8s.one-host.ca/deployment'])
				await ctx.call('v1.namespaces.deployments.update', {
					id: deployment.metadata.annotations['k8s.one-host.ca/deployment'],
					uid: deployment.metadata.uid
				}, { meta: { userID: deployment.metadata.annotations['k8s.one-host.ca/owner'] } })
		},
		async "kube.deployments.deleted"(ctx) {
			const deployment = ctx.params;
			if (deployment.metadata.annotations['k8s.one-host.ca/deployment'])
				await ctx.call('v1.namespaces.deployments.update', {
					id: deployment.metadata.annotations['k8s.one-host.ca/deployment'],
					uid: null
				}, { meta: { userID: deployment.metadata.annotations['k8s.one-host.ca/owner'] } })
		},
	},

	/**
	 * Methods
	 */
	methods: {
		async validateHasPermissions(query, ctx, params) {
			// Adapter init
			if (!ctx) return query;

			if (params.namespace) {
				const res = await ctx.call("v1.namespaces.resolve", {
					id: params.namespace,
					fields: ['id']
				});

				if (res) {
					query.namespace = params.namespace;
					return query;
				}
				throw new MoleculerClientError(
					`You have no right for the namespace '${params.namespace}'`,
					403,
					"ERR_NO_PERMISSION",
					{ namespace: params.namespace }
				);
			}
			if (ctx.action.params.namespace && !ctx.action.params.namespace.optional) {
				throw new MoleculerClientError(`namespace is required`, 422, "VALIDATION_ERROR", [
					{ type: "required", field: "namespace" }
				]);
			}
		},

		async validate({ ctx, value, params, id, entity }) {
			return ctx.call("v1.namespaces.resolve", { id: params.namespace, fields: ['id'] })
				.then((res) => res ? true : `No permissions '${value} not found'`)
		},
		async createConfigMap(name, reference, image) {
			for (let index = 0; index < image.envs.length; index++) {
				const element = image.envs[index];
				await ctx.call('v1.envs.create', {
					...element,
					reference,
				})
			}
			return this.getConfigMap(name, reference);
		},
		async getConfigMap(name, reference) {
			const configMap = {
				"apiVersion": "v1",
				"kind": "ConfigMap",
				"metadata": {
					"name": `${name}-configmap`
				},
				"data": await ctx.call('v1.envs.pack', {
					reference
				})
			}
			return configMap
		},

		async podSpec(ctx, namespace, params, image, size) {

			const key = `${params.id}:${params.name}`
			const appName = `${image.source}-${image.process}-${params.name}`
			const volumes = [];

			for (let index = 0; index < image.envs.length; index++) {
				const element = image.envs[index];
				await ctx.call('v1.envs.create', {
					...element,
					reference: key,
				})
			}

			const container = {
				"name": `${image.source}-${image.process}`,
				"image": `${image.name}`,
				"imagePullPolicy": "Always",
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
						"name": `${appName}-configmap`
					}
				}],
				"ports": image.ports.map((port) => {
					return {
						"containerPort": port.internal,
						"type": port.type
					}
				}),
				livenessProbe: {
					tcpSocket: {
						port: image.ports[0].internal
					},
					initialDelaySeconds: 15,
					periodSeconds: 20
				},
				readinessProbe: {
					tcpSocket: {
						port: image.ports[0].internal
					},
					initialDelaySeconds: 5,
					periodSeconds: 10
				},
			}

			for (let index = 0; index < image.volumes.length; index++) {
				const element = image.volumes[index];
				const name = `${appName}-${index}`;
				const options = {
					namespace: namespace.name,
					name,
					type: element.type == 'ssd' ? 'local' : 'remote',
					size: 1000,
				}
				let claim = await ctx.call('v1.namespaces.pvcs.readNamespacedPVC', options).catch(() => null)
				if (!claim) {
					claim = await ctx.call('v1.namespaces.pvcs.createNamespacedPVC', {
						namespace: namespace.name,
						name,
						type: element.type == 'ssd' ? 'local' : 'remote',
						size: 1000,
					})
				}

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

			return {
				appName,
				volumes,
				containers: [container],
				configMap
			}
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
