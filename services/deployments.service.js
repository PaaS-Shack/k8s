"use strict";

// External Modules
const Membership = require("membership-mixin");
const DbService = require("db-mixin");
const ConfigLoader = require("config-mixin");
const { MoleculerClientError } = require("moleculer").Errors;


const FIELDS = require('../fields');

/**
 * This service manages the lifecycle of kubernetes deployments
 * 
 * @name k8s.deployments
 * 
 * Deployments are based of a image and are namespaced
 * This service is used to managed the k8s kind Deployment spec
 * https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.18/#deployment-v1-apps
 * 
 * 
 */


module.exports = {
	// name of service
	name: "k8s.deployments",
	// version of service
	version: 1,

	/**
	 * Service Mixins
	 * 
	 * @type {Array}
	 * @property {DbService} DbService - Database mixin
	 * @property {Membership} Membership - Membership mixin
	 * @property {ConfigLoader} ConfigLoader - Config loader mixin
	 */
	mixins: [
		DbService({
			permissions: "k8s.deployments"
		}),
		Membership({
			permissions: "k8s.deployments"
		}),
		ConfigLoader(['k8s.**']),
	],

	/**
	 * Service dependencies
	 */
	dependencies: [

	],

	/**
	 * Service settings
	 * 
	 * @type {Object}
	 */
	settings: {
		rest: "v1/k8s/namespaces/:namespace/deployments",

		fields: {

			...FIELDS.DEPLOYMENT_FIELDS.props,


			...DbService.FIELDS,// inject dbservice fields
			...Membership.FIELDS,// inject membership fields
		},

		// default database populates
		defaultPopulates: [],

		// database scopes
		scopes: {
			...DbService.SCOPE,// inject dbservice scope
			...Membership.SCOPE,// inject membership scope
		},

		// default database scope
		defaultScopes: [
			...DbService.DSCOPE,// inject dbservice dscope
			...Membership.DSCOPE,// inject membership dscope
		],

		// default init config settings
		config: {

		}
	},

	/**
	 * service actions
	 */
	actions: {
		...Membership.ACTIONS,// inject membership actions
		...DbService.ACTIONS,// inject dbservice actions


	},

	/**
	 * service events
	 */
	events: {
		"k8s.namespaces.deployments.created": {
			group: "k8s.namespaces.deployments",
			async handler(ctx) {
				const deployment = ctx.params;
				const namespace = await ctx.call("k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("k8s.images.resolve", { id: deployment.image });

				// after deployment is created create setup all the k8s resources
				await this.setupDeployment(ctx, namespace, deployment, image);
			}
		},
		"k8s.namespaces.deployments.updated": {
			group: "k8s.namespaces.deployments",
			async handler(ctx) {
				const deployment = ctx.params;
				const namespace = await ctx.call("k8s.namespaces.resolve", { id: deployment.namespace });
				const image = await ctx.call("k8s.images.resolve", { id: deployment.image });

				// after deployment is created create setup all the k8s resources
				await this.setupDeployment(ctx, namespace, deployment, image);
			}
		},

		/**
		 * service methods
		 */
		methods: {
			/**
			 * Setup a kubernetes deployment
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Promise} - returns a promise
			 */
			async setupDeployment(ctx, namespace, deployment, image) {
				// create required resources for a deployment

			},

			/**
			 * Create a kubernetes deployment schema
			 * 		 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} deployment
			 */
			async createDeploymentSchema(ctx, namespace, deployment, image) {

				// create a deployment schema
				const schema = {
					apiVersion: "apps/v1",
					kind: "Deployment",
					metadata: await this.generateDeploymentMetadata(ctx, namespace, deployment, image),
					spec: await this.generateDeploymentSpec(ctx, namespace, deployment, image)
				};

				// return the schema
				return schema;
			},

			/**
			 * generate a deployment spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateDeploymentSpec(ctx, namespace, deployment, image) {
				// create a deployment spec

				// deployment lables
				const labels = await this.generateDeploymentLabels(ctx, namespace, deployment, image);
				// deploymant anotations
				const annotations = await this.generateDeploymentAnnotations(ctx, namespace, deployment, image);
				// nodeselector
				const nodeSelector = await this.generateNodeSelectorSpec(ctx, namespace, deployment, image);
				// pod affinity
				const affinity = await this.generateAffinitySpec(ctx, namespace, deployment, image);
				// pod tolerations
				const tolerations = await this.generateTolerationsSpec(ctx, namespace, deployment, image);
				// pod security context
				const securityContext = await this.generateSecurityContextSpec(ctx, namespace, deployment, image);
				// pod dns policy
				const dnsPolicy = await this.generateDnsPolicySpec(ctx, namespace, deployment, image);
				// pod volumes
				const volumes = await this.generateVolumesSpec(ctx, namespace, deployment, image);

				// create a spec
				const spec = {
					replicas: deployment.replicas,
					selector: {
						matchLabels: labels
					},
					template: {
						metadata: {
							labels: labels,
							annotations: annotations
						},
						spec: {
							nodeSelector: nodeSelector,
							affinity: affinity,
							tolerations: tolerations,
							securityContext: securityContext,
							dnsPolicy: dnsPolicy,
							containers: [
								await this.generateContainerSpec(ctx, namespace, deployment, image)
							],
							volumes: volumes
						}
					}
				}

				// return the spec
				return spec;
			},

			/**
			 * generate a conainter lables spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateDeploymentLabels(ctx, namespace, deployment, image) {
				// create a deployment labels spec

				const labels = {
					app: deployment.name,
				};


				// loop over image labels
				for (const label of image.labels) {
					// add the label to the labels
					labels[label.name] = label.value;
				}

				// loop over deployment labales
				for (const label of deployment.labels) {
					// add the label to the labels
					labels[label.name] = label.value;
				}

				// return the labels
				return labels;
			},

			/**
			 * generate a deployment annotations spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateDeploymentAnnotations(ctx, namespace, deployment, image) {
				// create a deployment annotations spec

				const annotations = {
					'k8s.one-host.ca/owner': deployment.owner.id,
					'k8s.one-host.ca/namespace': namespace.id,
					'k8s.one-host.ca/deployment': deployment.id,
					'k8s.one-host.ca/build': deployment.build?.id,
					'k8s.one-host.ca/image': deployment.image.id,
				};

				// loop over image annotations
				for (const annotation of image.annotations) {
					// add the annotation to the annotations
					annotations[annotation.name] = annotation.value;
				}

				// loop over deployment annotations
				for (const annotation of deployment.annotations) {
					// add the annotation to the annotations
					annotations[annotation.name] = annotation.value;
				}

				// return the annotations
				return annotations;
			},

			/**
			 * generate a deployment node selector spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateNodeSelectorSpec(ctx, namespace, deployment, image) {
				// create a deployment node selector spec

				const nodeSelector = {};

				// loop over image node selectors
				for (const selector of image.nodeSelectors) {
					// add the selector to the node selector
					nodeSelector[selector.name] = selector.value;
				}

				// loop over deployment node selectors
				for (const selector of deployment.nodeSelectors) {
					// add the selector to the node selector
					nodeSelector[selector.name] = selector.value;
				}

				// return the node selector
				return nodeSelector;
			},

			/**
			 * generate a deployment affinity spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateAffinitySpec(ctx, namespace, deployment, image) {
				// create a deployment affinity spec

				const affinity = {
					nodeAffinity: {
						requiredDuringSchedulingIgnoredDuringExecution: {
							nodeSelectorTerms: [
								{
									matchExpressions: [

									]
								}
							]
						}
					}
				};

				// loop over image affinities and merge
				for (const affinity of image.affinities) {
					// add the affinity to the affinity
					affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.push(affinity);
				}

				// loop over deployment affinities and merge
				for (const affinity of deployment.affinities) {
					// add the affinity to the affinity
					affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.push(affinity);
				}

				// return the affinity
				return affinity;
			},

			/**
			 * generate a deployment tollerations spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateTolerationsSpec(ctx, namespace, deployment, image) {
				// create a deployment tollerations spec

				const tolerations = [];

				// loop over image tolerations
				for (const toleration of image.tolerations) {
					// add the toleration to the tolerations
					tolerations.push(toleration);
				}

				// loop over deployment tolerations
				for (const toleration of deployment.tolerations) {
					// add the toleration to the tolerations
					tolerations.push(toleration);
				}

				// return the tolerations
				return tolerations;
			},

			/**
			 * generate a deployment security context spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateSecurityContextSpec(ctx, namespace, deployment, image) {
				// create a deployment security context spec

				const securityContext = {
					fsGroup: deployment.securityContext.fsGroup,
					runAsUser: deployment.securityContext.runAsUser,
					runAsGroup: deployment.securityContext.runAsGroup,
					runAsNonRoot: deployment.securityContext.runAsNonRoot,
					supplementalGroups: deployment.securityContext.supplementalGroups,
					allowPrivilegeEscalation: deployment.securityContext.allowPrivilegeEscalation,
					privileged: deployment.securityContext.privileged,
					procMount: deployment.securityContext.procMount,
					readonlyRootFilesystem: deployment.securityContext.readonlyRootFilesystem,
					capabilities: {
						add: deployment.securityContext.capabilities.add,
						drop: deployment.securityContext.capabilities.drop
					}
				};

				// return the security context
				return securityContext;
			},

			/**
			 * generate a container spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateDnsPolicySpec(ctx, namespace, deployment, image) {
				// create a deployment dns policy spec

				const dnsPolicy = deployment.dnsPolicy;

				// return the dns policy
				return dnsPolicy;
			},

			/**
			 * generate a deployment volumes spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateVolumesSpec(ctx, namespace, deployment, image) {
				// create a deployment volumes spec

				//merge image and deployment volumes. deployment volumes take presedent over image volumes
				const volumes = [];

				// loop over deployment volumes
				for (const volume of deployment.volumes) {
					// add the volume to the volumes
					volumes.push(await this.generateVolumeSpec(ctx, namespace, deployment, image, volume));
				}
				// loop over image volumes dont override deployment
				for (const volume of image.volumes) {
					// add the volume to the volumes
					if (volumes.find(v => v.name == volume.name)) {
						continue;
					}
					volumes.push(await this.generateVolumeSpec(ctx, namespace, deployment, image, volume));
				}

				// return the volumes
				return volumes;
			},

			/**
			 * generate a deployment volume spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * @param {Object} volume - image volume object
			 * 
			 * @returns {Object} spec
			 */
			async generateVolumeSpec(ctx, namespace, deployment, image, volume) {
				// create a deployment volume spec

				const spec = {
					name: volume.name,
				};

				if (volume.type == 'emptyDir') {
					spec.emptyDir = {
						medium: volume.medium
					}
				} else if (volume.type == 'hostPath') {
					spec.hostPath = {
						path: volume.hostPath.path,
						type: volume.hostPath.type
					};
				} else if (volume.type == 'secret') {
					spec.secret = {
						secretName: volume.secret.secretName,
						items: volume.secret.items,
						defaultMode: volume.secret.defaultMode
					};
				} else if (volume.type == 'configMap') {
					spec.configMap = {
						name: volume.configMap.name,
						items: volume.configMap.items,
						defaultMode: volume.configMap.defaultMode
					};
				} else if (volume.type == 'persistentVolumeClaim') {
					spec.persistentVolumeClaim = {
						claimName: volume.persistentVolumeClaim.claimName,
						readOnly: volume.persistentVolumeClaim.readOnly
					};
				}

				// return the spec
				return spec;

			},

			/**
			 * generate a container spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerSpec(ctx, namespace, deployment, image) {
				// generate a container spec from image object

				//request and limits
				const resources = await this.generateContainerResourcesSpec(ctx, namespace, deployment, image);
				// container ports
				const ports = await this.generateContainerPortsSpec(ctx, namespace, deployment, image);
				// container volume mounts
				const volumeMounts = await this.generateContainerVolumeMountsSpec(ctx, namespace, deployment, image);
				// container env
				const env = await this.generateContainerEnvSpec(ctx, namespace, deployment, image);

				// create a container spec
				const spec = {
					name: image.name,
					image: `${image.registry}/${image.name}:${image.tag}`,
					imagePullPolicy: image.pullPolicy,
					resources,
					ports,
					volumeMounts,
					env
				};

				// return the spec
				return spec;
			},

			/**
			 * generate a container resources spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerResourcesSpec(ctx, namespace, deployment, image) {
				// create a container resources spec

				// deployment resouces take presedent over image resources
				const spec = {
					requests: {
						cpu: deployment.resources.request.cpu,
						memory: deployment.resources.request.memory
					},
					limits: {
						cpu: deployment.resources.limit.cpu,
						memory: deployment.resources.limit.memory
					}
				};

				// return the spec
				return spec;
			},

			/**
			 * generate a container ports spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Array} spec
			 */
			async generateContainerPortsSpec(ctx, namespace, deployment, image) {
				// create a container ports spec
				const ports = [];

				// loop over image ports
				for (const port of image.ports) {
					// create a port spec
					const spec = await this.generateContainerPortSpec(ctx, namespace, deployment, image, port);

					// add the spec to the ports
					ports.push(spec);
				}

				// loop over deployment ports
				for (const port of deployment.ports) {
					// create a port spec
					const spec = await this.generateContainerPortSpec(ctx, namespace, deployment, image, port);

					// add the spec to the ports
					ports.push(spec);
				}

				// return the ports
				return ports;
			},

			/**
			 * generate a container port schema
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerPortSpec(ctx, namespace, deployment, image, port) {
				// create a container port spec
				const spec = {
					"containerPort": port.targetPort,
					"type": port.type == 'UDP' ? 'UDP' : 'TCP',
					"name": port.name
				};

				// return the spec
				return spec;
			},




			/**
			 * generate a container volume mount spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerVolumeMountsSpec(ctx, namespace, deployment, image) {
				// create a container volume mount spec
				const volumeMounts = [];

				// loop over image volumes
				for (const volume of image.volumes) {
					// create a volume mount spec
					const spec = {
						name: volume.name,
						mountPath: volume.mountPath,
					};

					// add the spec to the volume mounts
					volumeMounts.push(spec);
				}

				// loop over deployment volumes
				for (const volume of deployment.volumes) {
					// create a volume mount spec
					const spec = {
						name: volume.name,
						mountPath: volume.mountPath,
					};

					// add the spec to the volume mounts
					volumeMounts.push(spec);
				}
			},



			/**
			 * generate a container port spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * @param {Object} port - image port object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerPortSpec(ctx, namespace, deployment, image, port) {
				// create a container port spec
				const spec = {
					"containerPort": port.internal,
					"type": port.type == 'udp' ? 'udp' : 'tcp',
					"name": port.name
				};

				// return the spec
				return spec;
			},

			/**
			 * generate a container env spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */
			async generateContainerEnvSpec(ctx, namespace, deployment, image) {

			},

			/**
			 * generate a container volume mount spec
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} spec
			 */

			/**
			 * generate a deployment metadata
			 * 
			 * @param {Object} ctx - context
			 * @param {Object} namespace - namespace Object
			 * @param {Object} deployment - deployment object
			 * @param {Object} image - image object
			 * 
			 * @returns {Object} metadata
			 */
			async generateDeploymentMetadata(ctx, namespace, deployment, image) {
				// create a deployment metadata


				// create a labels
				const labels = await this.generateDeploymentLabels(ctx, namespace, deployment, image);
				//create annotations
				const annotations = await this.generateDeploymentAnnotations(ctx, namespace, deployment, image);

				const metadata = {
					name: deployment.name,
					namespace: namespace.name,
					annotations: annotations,
					labels: labels
				}

				// return the metadata
				return metadata;
			}
		}

	}



