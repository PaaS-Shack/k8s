

module.exports = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            key: { type: 'string', empty: false, required: true },
            value: { type: 'string', empty: false, required: true }
        }
    },
    default: [],
    required: false
};