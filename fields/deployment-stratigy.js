

module.exports = {
    type: 'object',
    properties: {
        type: {
            type: 'enum',
            values: ['RollingUpdate', 'Recreate'],
            default: 'RollingUpdate',
            required: true
        },
        rollingUpdate: {
            type: 'object',
            properties: {
                maxSurge: { type: 'number', min: 0, max: 100, default: 25, required: false },//percent
                maxUnavailable: { type: 'number', min: 0, mac: 100, default: 25, required: false },// percent
            }
        }
    },
    default: {
        type: 'RollingUpdate',
        rollingUpdate: {
            maxSurge: 25,
            maxUnavailable: 25
        }
    },
    required: false
};