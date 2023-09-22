

module.exports = {
    type: 'array',
    items: {
        type: 'object',
        properties: {
            key: { type: 'string', empty: false, required: true },
            operator: { type: 'enum', values: ['Equal', 'Exists'], default: 'Equal', required: true },
            value: { type: 'string', empty: false, required: true },
            effect: { type: 'enum', values: ['NoSchedule', 'PreferNoSchedule', 'NoExecute'], default: 'NoSchedule', required: true },
        }
    },
    default: [],
    required: false
};