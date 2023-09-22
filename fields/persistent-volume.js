

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        type: { type: 'enum', values: ['hostPath', 'nfs', 'iscsi', 'glusterfs', 'rbd', 'cephfs', 'cinder', 'fc', 'flocker', 'flexVolume', 'azureFile', 'vsphereVolume', 'quobyte', 'azureDisk', 'portworxVolume', 'scaleIO', 'local', 'storageos', 'csi'], default: 'hostPath', required: true },
        hostPath: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'Directory', required: false },
            }
        },
        nfs: {
            type: 'object',
            properties: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },
    }
};