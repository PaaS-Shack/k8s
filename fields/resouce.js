

module.exports = {
    type: 'object',
    properties: {
        type: 'object',
        limits: {
            type: 'object',
            properties: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        },
        requests: {
            type: 'object',
            properties: {
                cpu: { type: 'number', min: 0, required: false },
                memory: { type: 'number', min: 0, required: false },
            }
        }
    }
};