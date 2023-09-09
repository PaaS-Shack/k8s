
const fields = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        secretName: { type: 'string', empty: false, required: true },
        items: {
            type: 'array',
            items: {
                type: 'object',
                properties: {
                    key: { type: 'string', empty: false, required: true },
                    path: { type: 'string', empty: false, required: true },
                    mode: { type: 'number', min: 0, required: false },
                }
            },
            required: false
        },
        defaultMode: { type: 'number', min: 0, required: false },
        optional: { type: 'boolean', default: false, required: false },
    }
};

module.exports = fields;