

module.exports = {
    type: 'object',
    properties: {
        // Name of the volume
        name: { type: 'string', empty: false, required: true },

        // Type of the volume
        type: {
            type: 'enum',
            values: [
                'emptyDir',
                'hostPath',
                'secret',
                'configMap',
                'persistentVolumeClaim',
                'persistentVolume'
            ],
            default: 'emptyDir',
            required: true
        },

        // Mount path of the volume
        mountPath: {
            type: 'string',
            empty: false,
            required: false,// a persistentVolume might not have a mount point.
            pattern: '^(/[^/]+)+$', // starts with / and has at least one / in it
        },

        // Sub path of the volume
        subPath: { type: 'string', empty: false, default: null, required: false },

        // Read only flag of the volume
        readOnly: { type: 'boolean', default: false, required: false },

        size: { type: 'number', min: 0, default: 1024, required: false },// default 1GB

        //
        secret: VOLUMESECRET_FIELDS,
        configMap: VOLUMECONFIGMAP_FIELDS,

        // persistent volume config
        persistentVolume: {
            type: 'object',
            properties: {
                name: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['hostPath', 'nfs', 'iscsi', 'glusterfs', 'rbd', 'cephfs', 'cinder', 'fc', 'flocker', 'flexVolume', 'azureFile', 'vsphereVolume', 'quobyte', 'azureDisk', 'portworxVolume', 'scaleIO', 'local', 'storageos', 'csi'], default: 'hostPath', required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // persistent volume claim config
        persistentVolumeClaim: {
            type: 'object',
            properties: {
                claimName: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // host path volume config
        hostPath: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                type: { type: 'enum', values: ['DirectoryOrCreate', 'Directory', 'File', 'Socket', 'CharDevice', 'BlockDevice'], default: 'DirectoryOrCreate', required: false },
            }
        },

        // nfs volume config
        nfs: {
            type: 'object',
            properties: {
                server: { type: 'string', empty: false, required: true },
                path: { type: 'string', empty: false, required: true },
                readOnly: { type: 'boolean', default: false, required: false },
            }
        },

        // Empty dir volume
        emptyDir: {
            type: 'object',
            properties: {
                medium: { type: 'enum', values: ['Memory'], default: 'Memory', required: false },
                sizeLimit: { type: 'number', min: 0, required: false },
            }
        },
    }
}