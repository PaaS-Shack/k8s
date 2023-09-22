

module.exports = {
    type: 'object',
    properties: {
        httpGet: {
            type: 'object',
            properties: {
                path: { type: 'string', empty: false, required: true },
                port: { type: 'number', min: 0, required: true },
                scheme: { type: 'enum', values: ['HTTP', 'HTTPS'], default: 'HTTP', required: false },
                host: { type: 'string', empty: false, required: false },
            },
            required: false,
        },
        exec: {
            type: 'object',
            properties: {
                command: { type: 'array', items: { type: 'string', empty: false, required: true } }
            },
            required: false,
        },
        tcpSocket: {
            type: 'object',
            properties: {
                port: { type: 'number', min: 0, required: true },
                host: { type: 'string', empty: false, required: false },
            },
            required: false,
        },
        initialDelaySeconds: { type: 'number', min: 0, required: false },
        timeoutSeconds: { type: 'number', min: 0, required: false },
        periodSeconds: { type: 'number', min: 0, required: false },
        successThreshold: { type: 'number', min: 0, required: false },
        failureThreshold: { type: 'number', min: 0, required: false },
    },
    required: false
};