

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        storageClassName: { type: 'string', empty: false, required: true },
        accessModes: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
        resources: {
            type: 'object',
            properties: {
                requests: {
                    type: 'object',
                    properties: {
                        storage: { type: 'string', empty: false, required: true },
                    }
                }
            }
        }
    }
};