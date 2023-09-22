

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        rules: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    apiGroups: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    resources: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    verbs: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                    resourceNames: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
                }
            },
            required: false
        },
    }
};