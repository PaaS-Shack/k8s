

module.exports = {
    type: 'object',
    properties: {
        name: {
            ftype: 'string',
            empty: false,
            required: true,
            pattern: '^[a-z0-9]([-a-z0-9]*[a-z0-9])?$', // DNS-1123 label
            immutable: true,
        },

        cluster: {
            type: 'string',
            required: false,
            immutable: true,
            default: 'default',
        },

        labels: LABELS_FIELDS,
        annotations: LABELS_FIELDS,

        resourceQuota: {
            type: 'string',
            required: true,
            populate: {
                action: 'v1.k8s.resourceQuotas.resolve',
            }
        },
        domain: {
            type: 'string',
            required: true,
            immutable: true,
            populate: {
                action: 'v1.domains.resolve',
            }
        }
    }
};