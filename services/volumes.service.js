"use strict";



const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const Membership = require("membership-mixin");

const { MoleculerClientError } = require("moleculer").Errors;

const FIELDS = require("../fields");

/**
 * Kubernetes volumes and persistent volumes service
 */
module.exports = {
	/**
	 * Service name
	 */
	name: "k8s.volumes",

	/**
	 * Service version
	 * 1.0.0
	 */
	version: 1,

	/**
	 * Mixins
	 * 
	 * More info: https://moleculer.services/docs/0.14/services.html#Mixins
	 */
	mixins: [
		DbService({
			permissions: "k8s.volumes"
		}),
		Membership({
			permissions: "k8s.volumes"
		}),
		ConfigLoader(['k8s.**'])
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
		rest: "/v1/k8s/volumes/", //  Rest api path

		fields: {// db fields for volume

			...FIELDS.VOLUME_FIELDS.properties,

			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},
		defaultPopulates: [],

		scopes: {
			...DbService.SCOPE,
			...Membership.SCOPE,
		},

		defaultScopes: [
			...DbService.DSCOPE,
			...Membership.DSCOPE
		],

		config: {
			"k8s.volumes.storageClass": "default",
		}
	},

	/**
	 * Actions
	 */

	actions: {
		/**
		 * Create a volume from volume ID
		 * 
		 * @actions
		 * @params {String} id - volume ID
		 * 
		 * @returns {Object} Created volume
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
				const volume = await this.resolveEntities(ctx, { id: params.id });

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: volume.namespace,
				});
				//resolve deployment
				const deployment = volume.deployment && await ctx.call('v1.k8s.deployments.resolve', {
					id: volume.deployment,
				});

				//return volume;
				return this.createVolume(ctx, volume, namespace, deployment);
			}
		},

		/**
		 * Get volume status
		 * 
		 * @actions
		 * @params {String} id - volume ID
		 * 
		 * @returns {Object} Volume status
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

				// resolve volume
				const volume = await this.resolveEntities(ctx, { id: params.id });

				return this.getVolumeStatus(ctx, volume);
			}
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
	},

	/**
	 * Events
	 */
	events: {

		/**
		 * volume created event
		 * 
		 * @param {Object} volume - volume object
		 */
		"k8s.volumes.created": {
			async handler(ctx) {
				const volume = ctx.params.data;
				const options = { meta: { userID: volume.owner } };

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: volume.namespace,
				}, options);

				//resolve deployment
				const deployment = volume.deployment && await ctx.call('v1.k8s.deployments.resolve', {
					id: volume.deployment,
					populate: 'image'
				}, options);

				//return volume;
				await this.createVolume(ctx, volume, namespace, deployment);

				this.logger.info(`volume ${volume.name} created`);

			}
		},

		/**
		 * volume deleted event
		 * 
		 * @param {Object} volume - volume object
		 */
		"k8s.volumes.removed": {
			async handler(ctx) {
				const volume = ctx.params.data;
				const options = { meta: { userID: volume.owner } };

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: volume.namespace,
				}, options);
				//resolve deployment
				const deployment = volume.deployment && await ctx.call('v1.k8s.deployments.resolve', {
					id: volume.deployment,
					scope: '-notDeleted'
				}, options);

				if (volume.type == 'persistentVolumeClaim') {
					// delte pvc
					const deletedPVC = await this.deletePVC(ctx, namespace, volume, deployment);
				} else if (volume.type == 'persistentVolume') {
					// delete pv
					const deletedPV = await this.deletePV(ctx, namespace, volume, deployment);
				} else if (volume.type == 'configMap') {
					// delete configMap
					const deletedVolume = await this.deleteConfigMap(ctx, namespace, volume, deployment);
				}

				this.logger.info(`volume ${volume.name} deleted`);
			}
		},

		/**
		 * On namespace created create corresponding resourcequota
		 */
		"k8s.deployments.created": {
			async handler(ctx) {
				const deployment = ctx.params.data;
				const options = { meta: { userID: deployment.owner } }
				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: deployment.namespace,
				}, options);

				//resolve image
				const image = await ctx.call('v1.k8s.images.resolve', {
					id: deployment.image,
				});

				// loop deployment volumes
				for (const volume of deployment.volumes) {
					// create volume
					const config = {
						namespace: namespace.id,
						deployment: deployment.id,
						...volume,
					};

					const createdVolume = await ctx.call('v1.k8s.volumes.create', config, options)
					this.logger.info(`volume ${volume.name} created from deployment ${deployment.name}`);
				}

				// loop image volumes
				for (const volume of image.volumes) {
					// create volume
					const found = deployment.volumes.find((v) => v.name == volume.name)
					if (found) continue;

					const config = {
						namespace: namespace.id,
						deployment: deployment.id,
						...volume,
					};

					const createdVolume = await ctx.call('v1.k8s.volumes.create', config, options)
					this.logger.info(`volume ${volume.name} created from image ${image.name}`);
				}
			}
		},

		/**
		 * On namespace deleted delete corresponding resourcequota
		 */
		"k8s.deployments.removed": {
			async handler(ctx) {
				const deployment = ctx.params.data;
				const options = { meta: { userID: deployment.owner } }

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: deployment.namespace,
				}, options);

				// resolve volumes
				const volumes = await ctx.call('v1.k8s.volumes.find', {
					query: {
						namespace: namespace.id,
						deployment: deployment?.id,
					}
				}, options)

				// loop deployment volumes
				for (const volume of volumes) {
					await ctx.call('v1.k8s.volumes.remove', {
						id: volume.id
					}, options).then((id) => {
						this.logger.info(`volume ${volume.name} deleted id ${id}`);
					}).catch(() => {
						this.logger.error(`volume ${volume.name} delete failed`);
					});
				}
			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
		/**
		 * get volume status
		 * 
		 * @param {Object} ctx
		 * @param {Object} volume - volume object
		 * 
		 * @returns {Promise} - returns volume status
		 */
		async getVolumeStatus(ctx, volume) {
			// resolve namespace
			const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
				id: volume.namespace,
			});
			//resolve deployment
			const deployment = volume.deployment && await ctx.call('v1.k8s.deployments.resolve', {
				id: volume.deployment,
			});

			if (volume.type == 'persistentVolumeClaim') {
				return ctx.call('v1.kube.readNamespacedPersistentVolumeClaim', {
					namespace: namespace.name,
					cluster: namespace.cluster,
					name: `${namespace.name}-${deployment ? deployment.name : 'shared'}-${volume.name}-claim`
				}).then((res) => {
					return res.status;
				});
			} else if (volume.type == 'persistentVolume') {
				return ctx.call('v1.kube.readNamespacedPersistentVolume', {
					namespace: namespace.name,
					cluster: namespace.cluster,
					name: `${volume.name}`
				}).then((res) => {
					return res.status;
				});
			}
		},
		/**
		 * Create volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} volume - volume object
		 * @param {Object} namespace - namespace object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise} Created volume
		 */
		async createVolume(ctx, volume, namespace, deployment) {
			const volumeName = volume.volumeName;

			let Volume = {};

			switch (volume.type) {
				case 'emptyDir':
					Volume = await this.createEmptyDir(ctx, namespace, volume, deployment);
					break;
				case 'hostPath':
					Volume = await this.createHostPath(ctx, namespace, volume, deployment);
					break;
				case 'configMap':
					Volume = await this.createConfigMap(ctx, namespace, volume, deployment);
					break;
				case 'secret':
					Volume = await this.createSecret(ctx, namespace, volume, deployment);
					break;
				case 'persistentVolumeClaim':
					Volume = await this.createPVC(ctx, namespace, volume, deployment);
					break;
				case 'persistentVolume':
					Volume = await this.createPV(ctx, namespace, volume, deployment);
					break;
				default:
					break;
			};

			return Volume;
		},
		/**
		 * Create emptyDir volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createEmptyDir(ctx, namespace, volume, deployment) {
			const volumeName = volume.volumeName;

			const EmptyDirVolumeSource = {
				medium: volume.emptyDir.medium,
				sizeLimit: volume.emptyDir.sizeLimit,
			}

			const Volume = {
				name: volumeName,
				emptyDir: EmptyDirVolumeSource
			}

			return Volume;
		},

		/**
		 * Delete emptyDir volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deleteEmptyDir(ctx, namespace, volume, deployment) {

		},

		/**
		 * Create hostPath volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createHostPath(ctx, namespace, volume, deployment) {
			const volumeName = volume.volumeName;

			const HostPathVolumeSource = {
				path: volume.path,
				type: volume.type,
			}

			const Volume = {
				name: volumeName,
				hostPath: HostPathVolumeSource
			}

			return Volume;
		},

		/**
		 * Delete hostPath volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deleteHostPath(ctx, namespace, volume, deployment) {

		},

		/**
		 * Create configMap volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createConfigMap(ctx, namespace, volume, deployment) {
			let configMapData = {

			}

			if (deployment.image.configMap) {
				configMapData = Object.assign({}, deployment.image.configMap.data);
			}

			if (deployment.configMap) {
				configMapData = Object.assign({}, configMapData, deployment.configMap.data);
			}

			const configMap = {
				apiVersion: "v1",
				kind: "ConfigMap",
				metadata: {
					name: volume.name,
					namespace: namespace.name,
					labels: {
						app: deployment ? deployment.name : volume.name,
					}
				},
				data: configMapData
			}

			await ctx.call('v1.kube.createNamespacedConfigMap', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				body: configMap
			});

			const ConfigMapVolumeSource = {
				name: volume.name,
				items: volume.items,
				defaultMode: volume.defaultMode,
				optional: volume.optional,
			}

			const Volume = {
				name: volume.name,
				configMap: ConfigMapVolumeSource
			}

			return Volume;
		},

		/**
		 * Delete configMap volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deleteConfigMap(ctx, namespace, volume, deployment) {

			await ctx.call('v1.kube.deleteNamespacedConfigMap', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: volume.name
			});
		},

		/**
		 * Create secret volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createSecret(ctx, namespace, volume, deployment) {
			const volumeName = volume.volumeName;

			const SecretVolumeSource = {
				secretName: volume.name,
				items: volume.items,
				defaultMode: volume.defaultMode,
				optional: volume.optional,
			}

			const Volume = {
				name: volumeName,
				secret: SecretVolumeSource
			}

			return Volume;
		},

		/**
		 * Delete secret volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deleteSecret(ctx, namespace, volume, deployment) {

		},

		/**
		 * Create PVC volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createPVC(ctx, namespace, volume, deployment) {
			const claimName = `${namespace.name}-${deployment ? deployment.name : 'shared'}-${volume.name}-claim`;

			const volumeName = volume.volumeName;

			const annotations = {
				"k8s.one-host.ca/namespace": namespace.id,
				"k8s.one-host.ca/deployment": deployment ? deployment.id : null,
				"k8s.one-host.ca/volume": volume.id,
				"k8s.one-host.ca/storage-zone": deployment?.zone,
				"k8s.one-host.ca/storage-prefix": namespace.name,
			};

			const PersistentVolumeClaim = {
				apiVersion: "v1",
				kind: "PersistentVolumeClaim",
				metadata: {
					name: claimName,
					namespace: namespace.name,
					labels: {
						app: deployment ? deployment.name : volume.name,
					},
					annotations
				},
				spec: {

					accessModes: volume.accessModes,

					resources: {
						requests: {
							storage: `${volume.size}Mi`
						}
					}
				}
			}

			// check for storage class
			if (volume.storageClass) {
				PersistentVolumeClaim.spec.storageClassName = volume.storageClass;
			} else {
				PersistentVolumeClaim.spec.storageClassName = this.config['k8s.volumes.storageClass'];
			}

			// check for claim name
			if (volume.persistentVolumeClaim && volume.persistentVolumeClaim.claimName) {
				// lookup volume by clam name
				const found = await this.findEntity(null, {
					query: {
						namespace: namespace.id,
						name: volume.persistentVolumeClaim.claimName,
					},
					scope: '-membership'
				});

				if (found) {
					const vol = await ctx.call('v1.storage.volumes.resolveK8s', {
						id: found.id
					});
					if (vol) {
						annotations["k8s.one-host.ca/shared-volume-id"] = vol.id;
					}
				}
			}

			return ctx.call('v1.kube.createNamespacedPersistentVolumeClaim', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				body: PersistentVolumeClaim
			})
		},

		/**
		 * Delete PVC volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deletePVC(ctx, namespace, volume, deployment) {

			const claimName = `${namespace.name}-${deployment ? deployment.name : 'shared'}-${volume.name}-claim`;

			return ctx.call('v1.kube.deleteNamespacedPersistentVolumeClaim', {
				namespace: namespace.name,
				cluster: namespace.cluster,
				name: claimName
			})
		},

		/**
		 * Create PV volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async createPV(ctx, namespace, volume, deployment) {

			const PersistentVolume = {
				apiVersion: "v1",
				kind: "PersistentVolume",
				metadata: {
					name: volume.name,
					labels: {
						app: deployment ? deployment.name : volume.name,
					}
				},
				spec: {
					storageClassName: volume.storageClass,

					accessModes: volume.accessMode,
					capacity: {
						storage: `${volume.size}Mi`
					},
					persistentVolumeReclaimPolicy: volume.reclaimPolicy,
				}
			}


			return ctx.call('v1.kube.createPersistentVolume', {
				cluster: namespace.cluster,
				body: PersistentVolume
			})
		},

		/**
		 * Delete PV volume
		 * 
		 * @param {Object} ctx
		 * @param {Object} namespace - namespace object
		 * @param {Object} volume - volume object
		 * @param {Object} deployment - deployment object
		 * 
		 * @returns {Promise}
		 */
		async deletePV(ctx, namespace, volume, deployment) {

			return ctx.call('v1.kube.deletePersistentVolume', {
				cluster: namespace.cluster,
				name: volume.name
			})
		}

	},

	/**
	 * Service created lifecycle event handler
	 */
	created() { },

	/**
	 * Service started lifecycle event handler
	 */
	async started() { },


	/**
	 * Service stopped lifecycle event handler
	 */
	async stopped() { }
};
