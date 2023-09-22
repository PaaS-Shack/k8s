

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        port: { type: 'number', empty: false, required: true },
        targetPort: { type: 'number', empty: false, required: false },
        protocol: { type: 'enum', values: ['TCP', 'UDP', 'HTTP'], default: 'TCP', required: false },
        subdomain: { type: 'string', empty: false, required: false },
        nodePort: { type: 'number', min: 0, max: 65535, required: false },

    }
};