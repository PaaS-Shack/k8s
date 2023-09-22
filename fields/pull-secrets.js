

module.exports = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            name: { type: 'string', empty: false, required: true },
        }
    },
    default: [],
    required: false
};