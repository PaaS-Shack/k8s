

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        uid: { type: 'string', empty: false, required: false },
        namespace: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.namespaces.resolve',
            },
        },
        deployment: {
            type: 'string', empty: false, required: true,
            populate: {
                action: 'v1.k8s.deployments.resolve',
            }
        },
        type: { type: 'enum', values: ['ClusterIP', 'NodePort', 'LoadBalancer', 'ExternalName'], default: 'ClusterIP', required: false },
        ports: { type: 'array', items: PORT_FIELDS, required: false },
        selector: LABELS_FIELDS,
        externalIPs: { type: 'array', items: { type: 'string', empty: false, required: true }, default: [], required: false },
        loadBalancerIP: { type: 'string', empty: false, required: false },
        loadBalancerSourceRanges: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        externalName: { type: 'string', empty: false, required: false },
        sessionAffinity: { type: 'enum', values: ['None', 'ClientIP'], default: 'None', required: false },
        externalTrafficPolicy: { type: 'enum', values: ['Cluster', 'Local'], default: 'Cluster', required: false },
        healthCheckNodePort: { type: 'number', min: 0, max: 65535, required: false },
        publishNotReadyAddresses: { type: 'boolean', default: false, required: false },
        clusterIP: { type: 'string', empty: false, required: false },
    }
};