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

			...FIELDS.VOLUME_FIELDS.props,

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
				const volume = ctx.params;

				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					id: volume.namespace,
				});
				//resolve deployment
				const deployment = volume.deployment && await ctx.call('v1.k8s.deployments.resolve', {
					id: volume.deployment,
				});

				if (volume.type == 'persistentVolumeClaim') {
					// create pvc
					const createdPVC = await this.createPVC(ctx, namespace, volume, deployment);
				} else if (volume.type == 'persistentVolume') {
					// create pv
					const createdPV = await this.createPV(ctx, namespace, volume, deployment);
				}


			}
		},

		/**
		 * volume deleted event
		 * 
		 * @param {Object} volume - volume object
		 */
		"k8s.volumes.removed": {
			async handler(ctx) {
				const volume = ctx.params;

			}
		},

		/**
		 * On namespace created create corresponding resourcequota
		 */
		"k8s.deployments.created": {
			async handler(ctx) {
				const deployment = ctx.params;
				// resolve namespace
				const namespace = await ctx.call('v1.k8s.namespaces.resolve', {
					name: deployment.namespace,
				});

				//resolve image
				const image = await ctx.call('v1.k8s.images.resolve', {
					name: deployment.image,
				});


				// loop image volumes
				for (const volume of image.volumes) {
					// create volume
					const createdVolume = await this.createEntity(ctx, {
						namespace: namespace.id,
						deployment: deployment?.id,
						...volume,
					}, { permissive: true });
				}

				// loop deployment volumes
				for (const volume of deployment.volumes) {
					// create volume
					const createdVolume = await this.createEntity(ctx, {
						namespace: namespace.id,
						deployment: deployment?.id,
						...volume,
					}, { permissive: true });
				}

			}
		},

		/**
		 * On namespace deleted delete corresponding resourcequota
		 */
		"k8s.deployments.deleted": {
			async handler(ctx) {
				// Create a new deployment object


			}
		},
	},

	/**
	 * Methods
	 */
	methods: {
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
			const volumeName = volume.volumeName;

			const ConfigMapVolumeSource = {
				name: volume.name,
				items: volume.items,
				defaultMode: volume.defaultMode,
				optional: volume.optional,
			}

			const Volume = {
				name: volumeName,
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
			const claimName = `${volume.name}-claim`;

			const volumeName = volume.volumeName;

			const PersistentVolumeClaim = {
				apiVersion: "v1",
				kind: "PersistentVolumeClaim",
				metadata: {
					name: claimName,
					namespace: namespace.name,
					labels: {
						app: deployment ? deployment.name : volume.name,
					}
				},
				spec: {
					storageClassName: volume.storageClass,

					volumeName: volumeName,

					accessModes: volume.accessMode,
					resources: {
						requests: {
							storage: `${volume.size}Mi`
						}
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

			const claimName = `${volume.name}-claim`

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
