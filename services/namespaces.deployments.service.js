"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;
const { PrometheusDriver } = require('prometheus-query')

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
			permissions: 'deployments'
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
				validate: "validateName",
			},
			uid: {
				type: "string",
				required: false,
			},
			replicas: {
				type: 'number',
				required: false,
				default: 0
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
				values: ['ca', 'eu', 'nto'],
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
			repo: {
				type: "string",
				required: false,
				populate: {
					action: "v1.repos.resolve",
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
			vHosts: {
				type: 'array',
				items: "string",
				optional: true,
				default: [],
				populate: {
					action: "v1.routes.resolve",
					params: {
						fields: ["id", "vHost", "strategy"]
					}
				}
			},
			routes: {
				type: 'array',
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							console.log({ query: { namespace: entity.namespace, deployment: entity.id } })
							return ctx.call('v1.namespaces.routes.find', {
								query: { namespace: entity.namespace, deployment: this.encodeID(entity._id), },
							})
						})
					);
				}
			},
			ingress: {
				type: 'string',
				optional: true,
				populate: {
					action: "v1.ingress.resolve",
					params: {

					}
				},
				onCreate: async ({ ctx, params, value }) => {
					if (!params.router) {
						const namespace = await ctx.call('v1.namespaces.resolve', {
							id: params.namespace,
							fields: ['cluster']
						})
						const ingress = await ctx.call('v1.ingress.shared', {
							namespace: params.namespace,
							cluster: namespace.cluster,
							zone: params.zone
						})
						if (ingress) {
							return ingress.id
						}
					}
				}
			},
			router: {
				type: 'string',
				optional: true,
				populate: {
					action: "v1.routers.resolve",
					params: {

					}
				},
				onCreate: async ({ ctx, params, value }) => {
					if (!params.router) {
						const namespace = await ctx.call('v1.namespaces.resolve', {
							id: params.namespace,
							fields: ['cluster']
						})
						const router = await ctx.call('v1.routers.shared', {
							namespace: params.namespace,
							cluster: namespace.cluster,
							zone: params.zone
						})
						if (router) {
							return router.id
						}
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
								return ctx.call('v1.kube.findOne', { _id: entity.uid })
									.then((deployment) => `${deployment.status.availableReplicas ? deployment.status.availableReplicas : 0}:${deployment.status.readyReplicas ? deployment.status.readyReplicas : 0}:${deployment.status.replicas ? deployment.status.replicas : 0}:${deployment.status.observedGeneration}`)
									.catch((err) => {
										return `Error: ${err.type}`
									})
							}

							return ctx.call('v1.namespaces.resolve', { id: entity.namespace, fields: ['name', 'cluster'] })
								.then((namespace) => {
									return ctx.call("v1.kube.readNamespacedDeployment", { name: entity.name, namespace: namespace.name, cluster: namespace.cluster })
										.then((deployment) => `${deployment.status.availableReplicas ? deployment.status.availableReplicas : 0}:${deployment.status.readyReplicas ? deployment.status.readyReplicas : 0}:${deployment.status.replicas ? deployment.status.replicas : 0}:${deployment.status.observedGeneration}`)
										.catch((err) => {
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
								return ctx.call('v1.kube.findOne', { _id: entity.uid })
									.then((deployment) => deployment.status)
									.catch((err) => {
										return `Error: ${err.type}`
									})
							}
							return ctx.call('v1.namespaces.resolve', { id: entity.namespace, fields: ['name', 'cluster'] })
								.then((namespace) => {
									return ctx.call("v1.kube.readNamespacedDeployment", { name: entity.name, namespace: namespace.name, cluster: namespace.cluster })
										.then((deployment) => deployment.status)
										.catch((err) => {
											return `Error: ${err.type}`
										})
								})
						})
					);
				}
			},
			cdi: {
				type: "array",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							return ctx.call('v1.namespaces.cdi.find', {
								query: { namespace: entity.namespace, deployment: this.encodeID(entity._id) },
								populate: ['repo', 'build']
							})
						})
					);
				}
			},
			services: {
				type: "array",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							return ctx.call('v1.namespaces.services.find', {
								query: { namespace: entity.namespace, deployment: this.encodeID(entity._id), },
								populate: ['record']
							})
						})
					);
				}
			},
			envs: {
				type: "array",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							return ctx.call('v1.envs.find', {
								query: { namespace: entity.namespace, deployment: this.encodeID(entity._id), }
							})
						})
					);
				}
			},
			builds: {
				type: "array",
				virtual: true,
				populate(ctx = this.broker, values, entities, field) {
					if (!ctx) return null
					return Promise.all(
						entities.map(async entity => {
							return ctx.call('v1.builds.find', {
								query: { namespaceID: entity.namespace, deploymentID: this.encodeID(entity._id) }
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
		metrics: {
			rest: "GET /:id/metrics",
			permissions: ['namespaces.deployments.remove'],
			params: {
				id: { type: "string" },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, {
					id: params.id
				});
				if (!deployment) {
					throw new MoleculerClientError("deployment not found.", 400, "ERR_EMAIL_EXISTS");
				}

				const dply = await ctx.call('v1.kube.findOne', {
					_id: deployment.uid
				})
				if (!dply || !dply.metadata) {
					return null;
				}
				const pod = await ctx.call('v1.kube.findOne', {
					kind: 'Pod',
					'metadata.labels.app': dply.metadata.labels.app,
					fields: ['metadata.name']
				})
				if (!pod || !pod.metadata) {
					return null;
				}

				const bytesToMB = async (res) => res.result[0] ? (res.result[0].value.value / 1024 / 1024).toFixed(2) : 0
				const q = `sum(container_network_transmit_bytes_total{ pod="${pod.metadata.name}" }) by (pod)`;
				const start = new Date().getTime() - 24 * 60 * 60 * 1000;
				const end = new Date();
				const step =  15 * 60; // 1 point every 6 hours
				const [
					transmit_bytes_total, receive_bytes_total,
					pod_cpu,
					pod_requests_cpu, pod_limits_cpu,
			
					pod_memory,
					pod_requests_memory, pod_limits_memory,
			
			
			
				] = await Promise.all([
					this.prom.rangeQuery(
						`sum(irate(container_network_transmit_bytes_total{pod="${pod.metadata.name}"}[15m])) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(irate(container_network_receive_bytes_total{pod="${pod.metadata.name}"}[15m])) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(node_namespace_pod_container:container_cpu_usage_seconds_total:sum_irate{ pod="${pod.metadata.name}" }) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_requests{ pod="${pod.metadata.name}" }) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(cluster:namespace:pod_cpu:active:kube_pod_container_resource_limits{ pod="${pod.metadata.name}" }) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
			
					this.prom.rangeQuery(
						`sum(container_memory_working_set_bytes{ pod="${pod.metadata.name}" }) by (container)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_requests{ pod="${pod.metadata.name}" }) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values),
					this.prom.rangeQuery(
						`sum(cluster:namespace:pod_memory:active:kube_pod_container_resource_limits{ pod="${pod.metadata.name}" }) by (pod)`, start, end, step
					).then((res)=>res.result.shift()?.values)
				])
			
			
				return {
					transmit_bytes_total, receive_bytes_total,
					pod_cpu,
					pod_requests_cpu, pod_limits_cpu,
			
					pod_memory,
					pod_requests_memory, pod_limits_memory,
				}
				return this.prom.rangeQuery(q, start, end, step)
			}
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
			rest: "POST /:id/build-remote",
			permissions: ['namespaces.deployments.deployBuild'],
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
					populate: ['build', 'namespace', 'owner']
				});
				if (!deployment) {
					throw new MoleculerClientError("deployment not found.", 400, "ERR_EMAIL_EXISTS");
				}
				const image = await ctx.call('v1.images.resolve', {
					id: deployment.image
				})

				const build = await ctx.call('v1.builds.build', {
					registry: 'git.one-host.ca',
					namespaceID: deployment.namespace.id,
					deploymentID: deployment.id,
					namespace: deployment.owner.username,
					name: deployment.name,
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
		deployBuild: {
			rest: "POST /:id/deploy/:build",
			permissions: ['namespaces.deployments.deployBuild'],
			params: {
				id: { type: "string", optional: false },
				build: { type: "string", optional: false },
			},
			async handler(ctx) {
				const params = Object.assign({}, ctx.params);

				const deployment = await this.resolveEntities(ctx, {
					id: params.id,
				});
				const build = await ctx.call('v1.builds.resolve', {
					id: params.build
				})
				await this.updateEntity(ctx, {
					id: deployment.id,
					build: build.id
				})
				return this.actions.deploy(params, { parentCtx: ctx })
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

				if (deployment.build && deployment.build.phase != 'succeeded') {
					throw new MoleculerClientError("build has not succeeded yet..", 400, "ERR_EMAIL_EXISTS");
				}
				if (deployment.replicas == 0)
					await this.updateEntity(ctx, {
						id: deployment.id,
						replicas: 1
					});
				const spec = await this.actions.podSpec(params, { parentCtx: ctx })

				const found = await ctx.call('v1.kube.readNamespacedDeployment', {
					namespace: deployment.namespace.name,
					cluster: deployment.namespace.cluster,
					name: deployment.name
				}).catch(() => false)

				if (found) {
					return ctx.call('v1.kube.replaceNamespacedDeployment', {
						namespace: deployment.namespace.name,
						cluster: deployment.namespace.cluster,
						name: deployment.name,
						body: spec
					})
				} else {
					return ctx.call('v1.kube.createNamespacedDeployment', {
						namespace: deployment.namespace.name,
						cluster: deployment.namespace.cluster,
						name: deployment.name,
						body: spec
					})
				}
			}
		},
		stop: {
			rest: "POST /:id/stop",
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

				await this.updateEntity(ctx, {
					id: deployment.id,
					replicas: 0
				});

				const found = await ctx.call('v1.kube.readNamespacedDeployment', {
					namespace: deployment.namespace.name,
					cluster: deployment.namespace.cluster,
					name: deployment.name
				}).catch(() => false)

				if (found) {
					const spec = await this.actions.podSpec(params, { parentCtx: ctx })
					return ctx.call('v1.kube.replaceNamespacedDeployment', {
						namespace: deployment.namespace.name,
						cluster: deployment.namespace.cluster,
						name: deployment.name,
						body: spec
					})
				} else {
					return found
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
					populate: ['namespace', 'build', 'image', 'size', 'owner']
				});
				if (!deployment) {
					throw new MoleculerClientError("namespace not found.", 400, "ERR_EMAIL_EXISTS");
				}

				let image = `${deployment.image.registry}/${deployment.image.namespace}/${deployment.image.imageName}:${deployment.image.tag}`;
				if (deployment.build) {
					image = deployment.build.tag
				}
				const volumes = []

				const container = {
					"name": `${deployment.image.source}-${deployment.image.process}`,
					"image": image,
					"imagePullPolicy": deployment.image.pullPolicy,
					"resources": {
						"requests": {
							"memory": `${(deployment.size.memory / 2).toFixed(2)}Mi`,
							"cpu": `${(deployment.size.cpu / 2).toFixed(2)}m`
						},
						"limits": {
							"memory": `${deployment.size.memory}Mi`,
							"cpu": `${deployment.size.cpu}m`
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
							"type": port.type == 'udp' ? 'udp' : 'tcp',
							"name": port.name
						}
					})
				}

				console.log(container)

				if (deployment.image.config?.Cmd) {

					container.args = deployment.image.config.Cmd
				}
				if (false && deployment.image.ports[0]) {
					container.livenessProbe = {
						tcpSocket: {
							port: deployment.image.ports[0].internal
						},
						initialDelaySeconds: 30,
						periodSeconds: 20
					}
					container.readinessProbe = {
						tcpSocket: {
							port: deployment.image.ports[0].internal
						},
						initialDelaySeconds: 15,
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
					},
					labels: selector
				}
				const affinity = {}
				if (deployment.zone) {
					affinity.nodeAffinity = {
						"requiredDuringSchedulingIgnoredDuringExecution": {
							"nodeSelectorTerms": [{
								"matchExpressions": [{
									"key": "topology.kubernetes.io/region",
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
								volumes,
								"imagePullSecrets": [{ name: 'registrypullsecret' }],
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
			const namespace = await ctx.call('v1.namespaces.resolve', {
				id: deployment.namespace,
				populate: ['owner', 'domain']
			})
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
					cluster: namespace.cluster,
					name,
					mountPath: element.local,
					type: element.type,
					size: 1000,
				})

				this.logger.info(`Deployment(${deployment.id}) PVC created ${name}`);
			}

			const servicePorts = image.ports.filter((p) => p.type == 'tcp' || p.type == 'udp')

			if (servicePorts.length) {

				const ingress = await ctx.call('v1.ingress.resolve', {
					id: deployment.ingress,
					fields: ['ipv4']
				})
				const fqdn = `${deployment.name}.${namespace.name}.${deployment.zone}.${namespace.domain.domain}`


				let record = await ctx.call('v1.domains.records.resolveRecord', {
					domain: namespace.domain.id,
					fqdn: fqdn,
					type: 'A',
					data: ingress.ipv4,
				})
				if (!record) {
					record = await ctx.call('v1.domains.records.create', {
						domain: namespace.domain.id,
						fqdn: fqdn,
						type: 'A',
						data: ingress.ipv4,
					})
				}
				await ctx.call('v1.namespaces.services.create', {
					name: deployment.name,
					namespace: namespace.id,
					deployment: deployment.id,
					ingress: deployment.ingress,
					record: record.id,
					ports: servicePorts
				})
			}

			if (servicePorts.length) {


			}



			if (image.repo) {

				const repoName = `${namespace.name}-${deployment.name}`

				const repo = await ctx.call('v1.repos.create', {
					name: repoName,
					namespaceID: namespace.id,
					deploymentID: deployment.id,
					url: `https://git.one-host.ca/${namespace.owner.username}/${repoName}.git`,
				})
				await ctx.call('v1.namespaces.deployments.update', {
					id: deployment.id,
					repo: repo.id,
					scope: ['-membership']
				})
				this.logger.info(`Deployment(${deployment.id}) repo(${repo.id}) created ${repo.url}`, repo);

				const trigger = await ctx.call('v1.namespaces.cdi.create', {
					name: 'dev',
					branch: 'main',
					namespace: namespace.id,
					deployment: deployment.id,
					repo: repo.id,
				})
				this.logger.info(`Deployment(${deployment.id}) repo(${repo.id}) trigger created ${trigger.id}`, trigger);
			}



			const spec = await this.actions.podSpec({
				id: deployment.id
			}, { parentCtx: ctx })

			await ctx.call('v1.kube.createNamespacedDeployment', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: deployment.name,
				body: spec
			})
		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', {
				id: deployment.namespace,
				populate: ['domain']
			})
			const image = await ctx.call('v1.images.resolve', { id: deployment.image })

			this.logger.info(`Deployment(${deployment.id}) removed for image ${image.id}`);
			if (deployment.repo) {
				await ctx.call('v1.repos.remove', {
					id: deployment.repo
				})
				this.logger.info(`Deployment(${deployment.id}) removed repo ${deployment.repo}`);
			}

			if (deployment.ingress) {

			}

			await ctx.call('v1.kube.deleteNamespacedDeployment', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: deployment.name
			});


			for (let index = 0; index < image.volumes.length; index++) {
				const name = `${deployment.name}-${index}`;

				const pvcs = await ctx.call('v1.namespaces.pvcs.find', {
					query: {
						namespace: namespace.name,
						name
					}
				})

				for (let index = 0; index < pvcs.length; index++) {
					const pvc = pvcs[index];
					await ctx.call('v1.namespaces.pvcs.remove', {
						id: pvc.id
					})
				}

				this.logger.info(`Deployment(${deployment.id}) PVC removed ${name}`);
			}
		},
		async "builds.succeeded"(ctx) {
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

		async validateName({ ctx, value, params, id, entity }) {
			return ctx.call("v1.namespaces.deployments.find", {
				query: { name: params.name },
				namespace: params.namespace,
			}).then((res) => res.length ? `Name already used in this namespace` : true)
		},
	},
	/**
	 * Service created lifecycle event handler
	 */
	created() {
		this.prom = new PrometheusDriver({
			endpoint: "http://prom.admin.one-host.ca",
		});
	},

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
