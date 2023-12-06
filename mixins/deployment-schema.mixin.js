// External Modules

module.exports = {
    methods: {
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

            const [metadata, spec] = await Promise.all([
                this.generateDeploymentMetadata(ctx, namespace, deployment, image),
                this.generateDeploymentSpec(ctx, namespace, deployment, image)
            ])

            // create a deployment schema
            const schema = {
                apiVersion: "apps/v1",
                kind: "Deployment",
                metadata, spec
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

            const [
                labels,
                annotations,
                nodeSelector,
                affinity,
                tolerations,
                securityContext,
                dnsPolicy,
                volumes,
                strategy,
            ] = await Promise.all([
                this.generateDeploymentLabels(ctx, namespace, deployment, image),
                this.generateDeploymentAnnotations(ctx, namespace, deployment, image),
                this.generateNodeSelectorSpec(ctx, namespace, deployment, image),
                this.generateAffinitySpec(ctx, namespace, deployment, image),
                this.generateTolerationsSpec(ctx, namespace, deployment, image),
                this.generateSecurityContextSpec(ctx, namespace, deployment, image),
                this.generateDnsPolicySpec(ctx, namespace, deployment, image),
                this.generateVolumesSpec(ctx, namespace, deployment, image),
                this.generateDeploymentStrategySpec(ctx, namespace, deployment, image)
            ])

            // deployment revision history limit
            const revisionHistoryLimit = deployment.revisionHistoryLimit || image.revisionHistoryLimit;
            // deployment progress deadline seconds
            const progressDeadlineSeconds = deployment.progressDeadlineSeconds || image.progressDeadlineSeconds;

            // create a spec
            const spec = {
                replicas: deployment.replicas,
                strategy,
                revisionHistoryLimit,
                progressDeadlineSeconds,
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
         * deployment strategy spec
         * 
         * @param {Object} ctx - context
         * @param {Object} namespace - namespace Object
         * @param {Object} deployment - deployment object
         * @param {Object} image - image object
         * 
         * @returns {Object} spec
         */
        async generateDeploymentStrategySpec(ctx, namespace, deployment, image) {
            // create a deployment strategy spec

            const strategy = {
                type: deployment.strategy.type,
                rollingUpdate: {
                    maxSurge: deployment.strategy.rollingUpdate.maxSurge,
                    maxUnavailable: deployment.strategy.rollingUpdate.maxUnavailable
                }
            };

            // return the strategy
            return strategy;
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

            };

            // loop over image labels
            for (const label of image.labels) {
                // add the label to the labels
                labels[label.key] = label.value;
            }

            labels.app = deployment.name;

            // loop over deployment labales
            for (const label of deployment.labels) {
                // add the label to the labels
                labels[label.key] = label.value;
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
                'k8s.one-host.ca/owner': deployment.owner,
                'k8s.one-host.ca/namespace': namespace.id,
                'k8s.one-host.ca/deployment': deployment.id,
                'k8s.one-host.ca/image': deployment.image,
            };

            if (deployment.build) {
                annotations['k8s.one-host.ca/build'] = deployment.build;
            }

            // loop over image annotations
            for (const annotation of image.annotations) {
                // add the annotation to the annotations
                annotations[annotation.key] = annotation.value;
            }

            // loop over deployment annotations
            for (const annotation of deployment.annotations) {
                // add the annotation to the annotations
                annotations[annotation.key] = annotation.value;
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

            if (image.nodeSelectors) {
                // loop over image node selectors
                for (const selector of image.nodeSelectors) {
                    // add the selector to the node selector
                    nodeSelector[selector.name] = selector.value;
                }
            }

            if (deployment.nodeSelectors) {
                // loop over deployment node selectors
                for (const selector of deployment.nodeSelectors) {
                    // add the selector to the node selector
                    nodeSelector[selector.name] = selector.value;
                }
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

            if (this.config['k8s.deployments.affinity']) {
                affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.push({
                    key: "k8s.one-host.ca/roles-compute",
                    operator: "In",
                    values: [
                        "true"
                    ]
                })
            }

            if (image.affinities) {
                // loop over image affinities
                for (const affinity of image.affinities) {
                    // add the affinity to the affinity
                    affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.push(affinity);
                }
            }

            if (deployment.affinities) {
                // loop over deployment affinities
                for (const affinity of deployment.affinities) {
                    // add the affinity to the affinity
                    affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.push(affinity);
                }
            }

            if (affinity.nodeAffinity.requiredDuringSchedulingIgnoredDuringExecution.nodeSelectorTerms[0].matchExpressions.length == 0) {
                return {};
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
            if (deployment.securityContext) {
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
            }

            // return empty
            return {};
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

            if (deployment.volumes) {
                // loop over deployment volumes
                for (const volume of deployment.volumes) {
                    // add the volume to the volumes
                    volumes.push(await this.generateVolumeSpec(ctx, namespace, deployment, image, volume));
                }
            }

            if (image.volumes) {
                // loop over image volumes dont override deployment
                for (const volume of image.volumes) {
                    // add the volume to the volumes
                    if (volumes.find(v => v.name == volume.name)) {
                        continue;
                    }
                    volumes.push(await this.generateVolumeSpec(ctx, namespace, deployment, image, volume));
                }
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
                const ConfigMapVolumeSource = {
                    name: volume.name,
                    configMap: volume.configMap.name,
                    items: volume.configMap.items,
                    defaultMode: volume.configMap.defaultMode,
                    optional: volume.configMap.optional,
                }

                spec.configMap = ConfigMapVolumeSource;
            } else if (volume.type == 'persistentVolumeClaim') {
                let claimName = `${namespace.name}-${deployment.name}-${volume.name}-claim`;

                if (volume.persistentVolumeClaim) {
                    claimName = volume.persistentVolumeClaim.claimName;
                }

                spec.persistentVolumeClaim = {
                    claimName: claimName,
                    readOnly: !!volume.persistentVolumeClaim?.readOnly
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
            // container args
            const args = await this.generateContainerArgsSpec(ctx, namespace, deployment, image);
            // container liveness probe
            const livenessProbe = await this.generateContainerLivenessProbeSpec(ctx, namespace, deployment, image);
            // container readiness probe
            const readinessProbe = await this.generateContainerReadinessProbeSpec(ctx, namespace, deployment, image);
            // restartPolicy
            const restartPolicy = deployment.restartPolicy || image.restartPolicy;

            // create a container spec
            const spec = {
                name: image.name,
                image: `${image.registry}/${image.repository}:${image.tag}`,
                imagePullPolicy: image.imagePullPolicy,
                resources,
                ports,
                livenessProbe,
                readinessProbe,
                volumeMounts,
                env,
                args,
                envFrom: [{
                    configMapRef: {
                        name: `${deployment.name}`
                    }
                }],
                restartPolicy,
            };

            // return the spec
            return spec;
        },

        /**
         * generate a contrainer readiness probe spec
         * 
         * @param {Object} ctx - context
         * @param {Object} namespace - namespace Object
         * @param {Object} deployment - deployment object
         * @param {Object} image - image object
         * 
         * @returns {Object} spec
         */
        async generateContainerReadinessProbeSpec(ctx, namespace, deployment, image) {
            // create a container readiness probe spec
            if (deployment.readinessProbe) {
                return deployment.readinessProbe;
            } else if (image.readinessProbe) {
                return image.readinessProbe;
            } else {
                return undefined;
            }
        },

        /**
         * generate a contrainer livness probe spec
         * 
         * @param {Object} ctx - context
         * @param {Object} namespace - namespace Object
         * @param {Object} deployment - deployment object
         * @param {Object} image - image object
         * 
         * @returns {Object} spec
         */
        async generateContainerLivenessProbeSpec(ctx, namespace, deployment, image) {
            // create a container liveness probe spec
            if (deployment.livenessProbe) {
                return deployment.livenessProbe;
            } else if (image.livenessProbe) {
                return image.livenessProbe;
            } else {
                return undefined;
            }
        },

        /**
         * generate a container args spec
         * 
         * @param {Object} ctx - context
         * @param {Object} namespace - namespace Object
         * @param {Object} deployment - deployment object
         * @param {Object} image - image object
         * 
         * @returns {Object} spec
         */
        async generateContainerArgsSpec(ctx, namespace, deployment, image) {
            // create a container args spec
            let args = [];
            if (deployment.args) {
                args = deployment.args;
            } else if (image.args) {
                args = image.args;
            }
            if (args.length == 0) {
                args = undefined;
            }
            return args;
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

            const spec = {
                requests: {
                    cpu: 0,
                    memory: 0
                },
                limits: {
                    cpu: 0,
                    memory: 0
                }
            }

            if (deployment.resources) {
                spec.requests.cpu = `${deployment.resources.requests.cpu}m`;
                spec.requests.memory = `${deployment.resources.requests.memory}Mi`;

                spec.limits.cpu = `${deployment.resources.limits.cpu}m`;
                spec.limits.memory = `${deployment.resources.limits.memory}Mi`;
            } else {
                spec.requests.cpu = `${image.resources.requests.cpu}m`;
                spec.requests.memory = `${image.resources.requests.memory}Mi`;

                spec.limits.cpu = `${image.resources.limits.cpu}m`;
                spec.limits.memory = `${image.resources.limits.memory}Mi`;
            }

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

            if (image.ports) {
                // loop over image ports
                for (const port of image.ports) {
                    // create a port spec
                    const spec = await this.generateContainerPortSpec(ctx, namespace, deployment, image, port);
                    // add the spec to the ports
                    ports.push(spec);
                }
            }

            if (deployment.ports) {
                // loop over deployment ports
                for (const port of deployment.ports) {
                    // create a port spec
                    const spec = await this.generateContainerPortSpec(ctx, namespace, deployment, image, port);
                    // add the spec to the ports
                    ports.push(spec);
                }
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
                "containerPort": port.port,
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

            if (deployment.volumes) {
                // loop over deployment volumes
                for (const volume of deployment.volumes) {
                    // create a volume mount spec
                    const spec = {
                        name: volume.name,
                        mountPath: volume.mountPath,
                    };

                    // subPath is optional
                    if (volume.subPath) {
                        spec.subPath = volume.subPath;
                    }

                    // add the spec to the volume mounts
                    volumeMounts.push(spec);
                }
            }

            if (image.volumes) {
                // loop over image volumes
                for (const volume of image.volumes) {
                    // create a volume mount spec

                    // check if volume exists
                    if (volumeMounts.find(v => v.name == volume.name)) {
                        continue;
                    }

                    const spec = {
                        name: volume.name,
                        mountPath: volume.mountPath,
                    };

                    // add the spec to the volume mounts
                    volumeMounts.push(spec);
                }
            }

            // return the volume mounts
            return volumeMounts;
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
                "containerPort": port.port,
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
            const envs = []

            //return empty
            return envs;
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
};