

module.exports = {
    type: 'object',
    properties: {
        name: { type: 'string', empty: false, required: true },
        host: { type: 'string', empty: false, required: true },
        path: { type: 'string', empty: false, required: true },
        serviceName: { type: 'string', empty: false, required: true },
        servicePort: { type: 'number', min: 0, max: 65535, required: true },
        tls: {
            type: 'object',
            properties: {
                secretName: { type: 'string', empty: false, required: true },
                hosts: { type: 'array', items: { type: 'string', empty: false, required: true }, required: false },
            }
        }
    }
};