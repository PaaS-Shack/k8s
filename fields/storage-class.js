

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        provisioner: { type: 'string', empty: false, required: true },
        parameters: { type: 'object', required: false },
        reclaimPolicy: { type: 'enum', values: ['Retain', 'Delete', 'Recycle'], default: 'Retain', required: false },
        mountOptions: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        allowVolumeExpansion: { type: 'boolean', default: false, required: false },
        volumeBindingMode: { type: 'enum', values: ['Immediate', 'WaitForFirstConsumer'], default: 'Immediate', required: false },
    }
};