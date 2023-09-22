

module.exports={
    type: 'object',
    properties: {
        // image name
        name: { type: 'string', empty: false, required: true },

        // image namespace 
        namespace: { type: 'string', empty: false, required: true },

        // image tag (lastest)
        tag: { type: 'string', empty: false, required: true },

        // image digest
        digest: { type: 'string', empty: false, required: false },
        // image registry (docker.io)
        registry: { type: 'string', empty: false, required: true },
        // image repository
        repository: { type: 'string', empty: false, required: false },
        // image name in string form
        image: { type: 'string', empty: false, required: false },
        // image description
        description: { type: 'string', empty: false, required: false },
        // image pull policy (Always)
        imagePullPolicy: { type: 'enum', values: ['Always', 'Never', 'IfNotPresent'], default: 'Always', required: false },
        // ports
        ports: { type: 'array', items: PORT_FIELDS, default: [], required: false },
        // readiness probe
        readinessProbe: PROBE_FIELDS,
        // liveness probe
        livenessProbe: PROBE_FIELDS,
        // history limit
        revisionHistoryLimit: { type: 'number', min: 0, max: 10, default: 1, required: false },
        // progressDeadlineSeconds
        progressDeadlineSeconds: { type: 'number', min: 0, default: 600, required: false },


        // deployment strategy
        strategy: DEPLOYMENTSTRATEGY_FIELDS,

        // env
        env: { type: 'array', items: ENV_FIELDS, required: false },
        // volumes
        volumes: { type: 'array', items: SHORTVULUME_FIELDS, default: [], required: false },
        // resources
        resources: RESOURCE_FIELDS,

        args: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },

        config: {
            type: 'object',
            required: false,
        },

        // lables
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
        nodeSelector: LABELS_FIELDS,
        affinity: AFFINITY_FIELDS,
        tolerations: TOLERATIONS_FIELDS,
        securityContext: SECURITYCONTEXT_FIELDS,
        // other
        terminationGracePeriodSeconds: { type: 'number', min: 0, required: false },
        dnsPolicy: { type: 'enum', values: ['ClusterFirst', 'Default', 'ClusterFirstWithHostNet', 'None'], default: 'ClusterFirst', required: false },
        restartPolicy: { type: 'enum', values: ['Always', 'OnFailure', 'Never'], default: 'Always', required: false },
        hostAliases: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    ip: { type: 'string', empty: false, required: true },
                    hostnames: { type: 'array', items: { type: 'string', empty: false, required: true } }
                }
            },
            required: false
        },
        hostNetwork: { type: 'boolean', default: false, required: false },
        hostPID: { type: 'boolean', default: false, required: false },
        hostIPC: { type: 'boolean', default: false, required: false },
        shareProcessNamespace: { type: 'boolean', default: false, required: false },
        serviceAccountName: { type: 'string', empty: false, required: false },
        schedulerName: { type: 'string', empty: false, required: false },
        priorityClassName: { type: 'string', empty: false, required: false },
        // build related
        building: { type: 'boolean', default: false, required: false },
        built: { type: 'boolean', default: false, required: false },
        build: {
            type: 'string',
            required: false,
            populate: {
                action: 'v1.k8s.builds.resolve',
            }
        },
    }
};