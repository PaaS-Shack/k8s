

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        roleRef: {
            type: 'object',
            properties: {
                apiGroup: { type: 'string', empty: false, required: true },
                kind: { type: 'string', empty: false, required: true },
                name: { type: 'string', empty: false, required: true },
            }
        },
        subjects: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    kind: { type: 'string', empty: false, required: true },
                    name: { type: 'string', empty: false, required: true },
                    namespace: { type: 'string', empty: false, required: true },
                }
            },
            required: false
        },
    }
};