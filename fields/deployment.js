

module.exports = {
    type: 'object',
    properties: {
        // deployment name
        name: { type: 'string', empty: false, required: true },
        // deployment namespace id
        namespace: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.namespaces.resolve',
            },
        },
        // deployment image id
        image: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.images.resolve',
            }
        },

        // k8s uid
        uid: { type: 'string', empty: false, required: false },

        // deployment vHosts
        vHosts: {
            type: 'array',
            items: 'string',
            default: [],
            required: false,
        },

        // deployment routes
        routes: {
            type: 'array',
            items: 'string',
            required: false,
            default: [],
            populate: {
                action: 'v1.routes.resolve',
            }
        },

        // deployment replicas (1)
        replicas: { type: 'number', default: 1, min: 0, max: 10, required: false },
        // deployment ports. can be used to open abatrairy ports outside of image ports
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
        env: { type: 'array', items: ENV_FIELDS, default: [], required: false },
        // volumes
        volumes: { type: 'array', items: SHORTVULUME_FIELDS, default: [], required: false },
        // resources
        resources: RESOURCE_FIELDS,

        //lables
        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,
        nodeSelector: LABELS_FIELDS,
        affinity: AFFINITY_FIELDS,
        tolerations: TOLERATIONS_FIELDS,
        imagePullSecrets: PULLSECRETS_FIELDS,
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
        serviceAccountName: { type: 'string', empty: false, default: null, required: false },
        schedulerName: { type: 'string', empty: false, default: null, required: false },
        priorityClassName: { type: 'string', empty: false, default: null, required: false },
    }
};