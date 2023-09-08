"use strict";

const DbService = require("db-mixin");
const Cron = require("cron-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const C = require("../constants");
/**
 * attachments of addons service
 */
module.exports = {
	name: "namespaces.services",
	version: 1,

	mixins: [
		DbService({}),
		Cron,
		Membership({
			permissions: 'namespaces.services'
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
		rest: "/v1/namespaces/:namespace/deployments/:deployment/services",

		fields: {

			name: {
				type: "string",
				required: true,
			},
			uid: {
				type: "string",
				required: false,
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
			deployment: {
				type: "string",
				required: true,
				populate: {
					action: "v1.namespaces.deployments.resolve",
					params: {
						scaope: false,
						//fields: ["id", "online", "hostname", 'nodeID'],
						//populate: ['network']
					}
				},
			},
			ports: C.ports,

			ingress: {
				type: 'string',
				optional: true,
				populate: {
					action: "v1.ingress.resolve",
					params: {

					}
				}
			},
			record: {
				type: 'string',
				optional: true,
				populate: {
					action: "v1.domains.records.resolve",
					params: {
						fields: ['type', 'data', 'fqdn', 'id']
					}
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
		defaultPopulates: [],

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

	},

	/**
	 * Events
	 */
	events: {
		async "namespaces.services.created"(ctx) {
			const service = ctx.params.data;
			console.log(service)

			const namespace = await ctx.call('v1.namespaces.resolve', { id: service.namespace, fields: ['name', 'cluster'] });
			const deployment = await ctx.call('v1.namespaces.deployments.resolve', { id: service.deployment, fields: ['name', 'tier'] });

			const serviceSpec = await this.genServiceSpec(service, namespace, deployment);

			await this.applyIngress(ctx, service, serviceSpec)

			await ctx.call('v1.kube.createNamespacedService', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				body: serviceSpec
			});

		},
		async "namespaces.services.removed"(ctx) {
			const service = ctx.params.data;
			const namespace = await ctx.call('v1.namespaces.resolve', { id: service.namespace, fields: ['name', 'cluster'] })

			if (service.ingress) {
				for (let index = 0; index < service.ports.length; index++) {
					const specPort = service.ports[index];
					await ctx.call('v1.ingress.removePort', {
						id: service.ingress,
						service: service.id,
						targetPort: specPort.internal
					})
				}
			}
			await ctx.call('v1.kube.deleteNamespacedService', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: service.name
			})
		},
		async "kube.services.added"(ctx) {
			const service = ctx.params;
			if (service.metadata.annotations && service.metadata.annotations['k8s.one-host.ca/service']) {
				await ctx.call('v1.namespaces.services.update', {
					id: service.metadata.annotations['k8s.one-host.ca/service'],
					uid: service.metadata.uid
				}, { meta: { userID: service.metadata.annotations['k8s.one-host.ca/owner'] } })
			}
		},
		async "namespaces.deployments.removed"(ctx) {
			const deployment = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { deployment: deployment.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })
					.then(async () => {
						if (entity.record) {
							await ctx.call('v1.domains.records.remove', {
								id: entity.record,
								scope: '-membership'
							})
						}
					})))
				.then(() =>
					this.logger.info(`Services deployment remove event for ${deployment.name}`))

		},
		async "namespaces.removed"(ctx) {
			const namespace = ctx.params.data;
			const entities = await this.findEntities(ctx, { scope: false, query: { namespace: namespace.id } })
			return Promise.allSettled(entities.map((entity) =>
				this.removeEntity(ctx, { scope: false, id: entity.id })
					.then(async () => {
						if (entity.record) {
							await ctx.call('v1.domains.records.remove', {
								id: entity.record,
								scope: '-membership'
							})
						}
					})))
				.then(() =>
					this.logger.info(`Services namespace remove event for ${namespace.name}`))

		}
	},

	/**
	 * Methods
	 */
	methods: {
		async applyIngress(ctx, service, serviceSpec) {

			if (!service.ingress) {
				return;
			}
			const ingress = await ctx.call('v1.ingress.resolve', {
				id: service.ingress,
				fields: ['ipv4']
			})

			for (let index = 0; index < serviceSpec.spec.ports.length; index++) {
				const specPort = serviceSpec.spec.ports[index];
				const ingressPort = await ctx.call('v1.ingress.freePort', {
					id: service.ingress,
					service: service.id,
					targetPort: specPort.targetPort
				})
				if (ingressPort) {
					specPort.port = ingressPort.port

					if (!serviceSpec.spec.externalIPs.includes(ingress.ipv4)) {
						serviceSpec.spec.externalIPs.push(ingress.ipv4)
					}
				}

			}

		},
		async genServiceSpec(service, namespace, deployment) {
			const serviceSpec = {
				"apiVersion": "v1",
				"kind": "Service",
				"metadata": {
					"name": service.name,
					"annotations": {
						'k8s.one-host.ca/owner': service.owner,
						'k8s.one-host.ca/namespace': namespace.id,
						'k8s.one-host.ca/deployment': deployment.id,
						'k8s.one-host.ca/service': service.id,
					},
				},
				"spec": {
					"externalIPs": [],
					"ports": [],
					"selector": {
						app: deployment.name,
						tier: deployment.tier
					}
				}
			}

			for (let index = 0; index < service.ports.length; index++) {
				const portSpec = service.ports[index];


				const port = {
					"targetPort": portSpec.internal,
					"protocol": portSpec.type == 'udp' ? 'UDP' : 'TCP',
					"name": `${portSpec.type}-${portSpec.internal}`
				}
				if (portSpec.external != 0) {
					port.nodePort = portSpec.external
					serviceSpec.spec.type = 'NodePort'
				}

				serviceSpec.spec.ports.push(port)
			}
			return serviceSpec;
		}
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
